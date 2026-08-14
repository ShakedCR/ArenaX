import pdfParse from "pdf-parse";
import DocumentChunk from "../models/document-chunk.model";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";
const OLLAMA_EMBED_TIMEOUT_MS = Number(process.env.OLLAMA_EMBED_TIMEOUT_MS) || 30_000;

const CHUNK_SIZE = 300;
const CHUNK_OVERLAP = 50;
const TOP_N_CHUNKS = 5;
const MAX_EMBED_CHARS = 350;

// ── Text extraction ────────────────────────────────────────────────────────────

const extractText = async (buffer: Buffer, mimetype: string): Promise<string> => {
  if (mimetype === "application/pdf") {
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }
  return buffer.toString("utf-8");
};

// ── Chunking ───────────────────────────────────────────────────────────────────

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
        chunks.push(current.trim());
        // Overlap: carry the tail of the previous chunk
        const words = current.split(" ");
        const overlapWords = words.slice(-Math.floor(CHUNK_OVERLAP / 5));
        current = overlapWords.join(" ") + " " + trimmed;
      } else {
        current = trimmed;
      }
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(c => c.length > 20);
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

/**
 * DB-based similarity search — used when chunks are already saved
 * (e.g. for future retrieval after creation).
 */
export const findRelevantChunks = async (
  query: string,
  tournamentId: string,
  topN: number = TOP_N_CHUNKS
): Promise<string[]> => {
  const chunks = await DocumentChunk.find({ tournament: tournamentId })
    .select("text embedding")
    .lean();

  if (chunks.length === 0) return [];

  const queryEmbedding = await getEmbedding(query);

  return chunks
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
