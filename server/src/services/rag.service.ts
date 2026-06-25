import * as pdfParseLib from "pdf-parse";
const pdfParse = (pdfParseLib as any).default ?? pdfParseLib;
import DocumentChunk from "../models/document-chunk.model";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 100;
const TOP_N_CHUNKS = 5;

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
  const response = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: OLLAMA_EMBED_MODEL, prompt: text }),
  });

  if (!response.ok) {
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

export const processDocument = async (
  buffer: Buffer,
  mimetype: string,
  filename: string,
  tournamentId: string
): Promise<number> => {
  const text = await extractText(buffer, mimetype);
  const chunks = chunkText(text);

  if (chunks.length === 0) {
    throw new Error("Document appears to be empty or unreadable");
  }

  // Delete any existing chunks for this tournament (re-upload scenario)
  await DocumentChunk.deleteMany({ tournament: tournamentId });

  const docs = await Promise.all(
    chunks.map(async (chunkText, index) => ({
      tournament: tournamentId,
      text: chunkText,
      embedding: await getEmbedding(chunkText),
      source: filename,
      chunkIndex: index,
    }))
  );

  await DocumentChunk.insertMany(docs);
  return chunks.length;
};

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

  const scored = chunks.map(chunk => ({
    text: chunk.text,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(c => c.text);
};

export const deleteDocumentChunks = async (tournamentId: string): Promise<void> => {
  await DocumentChunk.deleteMany({ tournament: tournamentId });
};
