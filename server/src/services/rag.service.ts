import pdfParse from "pdf-parse";
import DocumentChunk from "../models/document-chunk.model";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";
const OLLAMA_EMBED_TIMEOUT_MS = Number(process.env.OLLAMA_EMBED_TIMEOUT_MS) || 30_000;

const CHUNK_SIZE = 300;
const CHUNK_OVERLAP = 50;
const TOP_N_CHUNKS = 5;
const MAX_EMBED_CHARS = 350;

// Hard fallback cap for chunks that can't rely on blank-line paragraph breaks
// (e.g. a poorly-parsed PDF with no double-newlines at all). Set equal to
// MAX_EMBED_CHARS so every chunk that reaches getEmbedding() is represented
// in full — never silently truncated.
const MAX_CHUNK_CHARS = MAX_EMBED_CHARS;

// Only the top TOP_N_CHUNKS chunks are ever read back for a given document,
// so there is no benefit to embedding more than a small bounded number of
// them — this keeps upload processing time bounded for large documents.
const MAX_CHUNKS_PER_DOCUMENT = 50;

// ── Text extraction ────────────────────────────────────────────────────────────

const extractText = async (buffer: Buffer, mimetype: string): Promise<string> => {
  if (mimetype === "application/pdf") {
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }
  return buffer.toString("utf-8");
};

// ── Chunking ───────────────────────────────────────────────────────────────────

/**
 * Hard fallback for a chunk that exceeds MAX_CHUNK_CHARS even after normal
 * paragraph merging (e.g. one huge paragraph, or text with no blank-line
 * breaks at all). Splits on word boundaries so no text is silently dropped,
 * and preserves original order. Below MAX_CHUNK_CHARS this is a no-op.
 */
const splitOversized = (chunk: string): string[] => {
  if (chunk.length <= MAX_CHUNK_CHARS) return [chunk];

  const pieces: string[] = [];
  const words = chunk.split(" ");
  let current = "";

  const flush = () => {
    if (current) {
      pieces.push(current);
      current = "";
    }
  };

  for (const word of words) {
    if (word.length > MAX_CHUNK_CHARS) {
      // A single "word" longer than the cap (e.g. a URL) — hard-slice by
      // character count rather than dropping it.
      flush();
      for (let i = 0; i < word.length; i += MAX_CHUNK_CHARS) {
        pieces.push(word.slice(i, i + MAX_CHUNK_CHARS));
      }
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= MAX_CHUNK_CHARS) {
      current = candidate;
    } else {
      flush();
      current = word;
    }
  }

  flush();
  return pieces;
};

const chunkText = (text: string): string[] => {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const paragraphs = normalized.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    if ((current + " " + trimmed).length <= CHUNK_SIZE) {
      current = current ? `${current} ${trimmed}` : trimmed;
    } else {
      if (current) {
        chunks.push(...splitOversized(current.trim()));
        // Overlap: carry the tail of the previous chunk
        const words = current.split(" ");
        const overlapWords = words.slice(-Math.floor(CHUNK_OVERLAP / 5));
        current = overlapWords.join(" ") + " " + trimmed;
      } else {
        current = trimmed;
      }
    }
  }

  if (current.trim()) chunks.push(...splitOversized(current.trim()));
  return chunks.filter(c => c.length > 20).slice(0, MAX_CHUNKS_PER_DOCUMENT);
};

// ── Embeddings ─────────────────────────────────────────────────────────────────

const getEmbedding = async (text: string): Promise<number[]> => {
  const safeText = text.slice(0, MAX_EMBED_CHARS);

  let response: Response;
  try {
    response = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_EMBED_MODEL, prompt: safeText }),
      signal: AbortSignal.timeout(OLLAMA_EMBED_TIMEOUT_MS),
    });
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      throw new Error(`Ollama embeddings timed out after ${OLLAMA_EMBED_TIMEOUT_MS}ms`);
    }
    throw err;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "(unreadable)");
    console.error(`[RAG] Ollama embeddings error ${response.status}:`, body);
    throw new Error(`Ollama embeddings request failed: ${response.status}`);
  }

  const data = await response.json() as { embedding: number[] };

  if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
    throw new Error("Ollama returned empty embedding");
  }

  return data.embedding;
};

// ── Cosine similarity ──────────────────────────────────────────────────────────

const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length) return 0;
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
};

// ── Public API ─────────────────────────────────────────────────────────────────

export type PreparedChunk = { text: string; embedding: number[] };

/**
 * Phase 1 — extract text, chunk, embed (all in-memory, no DB).
 * Call this BEFORE creating the tournament so we can use the context
 * for question generation without needing a tournamentId yet.
 */
export const prepareDocumentChunks = async (
  buffer: Buffer,
  mimetype: string
): Promise<PreparedChunk[]> => {
  const text = await extractText(buffer, mimetype);
  const chunks = chunkText(text);

  if (chunks.length === 0) {
    throw new Error("Document appears to be empty or unreadable");
  }

  const results: PreparedChunk[] = [];
  for (const text of chunks) {
    const embedding = await getEmbedding(text);
    results.push({ text, embedding });
  }
  return results;
};

/**
 * Phase 2 — save prepared chunks to DB once we have a tournamentId.
 */
export const saveDocumentChunks = async (
  preparedChunks: PreparedChunk[],
  filename: string,
  tournamentId: string
): Promise<void> => {
  await DocumentChunk.deleteMany({ tournament: tournamentId });

  await DocumentChunk.insertMany(
    preparedChunks.map((chunk, index) => ({
      tournament: tournamentId,
      text: chunk.text,
      embedding: chunk.embedding,
      source: filename,
      chunkIndex: index,
    }))
  );
};

/**
 * In-memory similarity search — used right after prepareDocumentChunks
 * when we already have the chunks in memory.
 */
export const getContextFromChunks = async (
  query: string,
  preparedChunks: PreparedChunk[],
  topN: number = TOP_N_CHUNKS
): Promise<string[]> => {
  const queryEmbedding = await getEmbedding(query);

  return preparedChunks
    .map(chunk => ({
      text: chunk.text,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(c => c.text);
};

export const deleteDocumentChunks = async (tournamentId: string): Promise<void> => {
  await DocumentChunk.deleteMany({ tournament: tournamentId });
};
