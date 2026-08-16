import pdfParse from "pdf-parse";
import DocumentChunk from "../models/document-chunk.model";

const OLLAMA_HOST =
  process.env.OLLAMA_HOST || "http://localhost:11434";

const OLLAMA_EMBED_MODEL =
  process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";

const OLLAMA_EMBED_TIMEOUT_MS =
  Number(process.env.OLLAMA_EMBED_TIMEOUT_MS) || 30_000;

const CHUNK_SIZE = 300;
const CHUNK_OVERLAP = 50;
const TOP_N_CHUNKS = 5;
const MAX_EMBED_CHARS = 350;
const MAX_CHUNK_CHARS = MAX_EMBED_CHARS;
const MAX_CHUNKS_PER_DOCUMENT = 50;

/**
 * Hybrid retrieval weights.
 *
 * Semantic similarity remains the primary retrieval signal,
 * while lexical relevance receives a stronger reranking weight
 * to favor chunks that explicitly match the requested category.
 */
const SEMANTIC_WEIGHT = 0.7;
const LEXICAL_WEIGHT = 0.3;

// ── Text extraction ────────────────────────────────────────────────────────────

const extractText = async (
  buffer: Buffer,
  mimetype: string
): Promise<string> => {
  if (mimetype === "application/pdf") {
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }

  return buffer.toString("utf-8");
};

// ── Chunking ───────────────────────────────────────────────────────────────────

const splitOversized = (
  chunk: string
): string[] => {
  if (chunk.length <= MAX_CHUNK_CHARS) {
    return [chunk];
  }

  const pieces: string[] = [];
  const words = chunk.split(/\s+/);
  let current = "";

  const flush = () => {
    if (current.trim()) {
      pieces.push(current.trim());
      current = "";
    }
  };

  for (const word of words) {
    if (word.length > MAX_CHUNK_CHARS) {
      flush();

      for (
        let i = 0;
        i < word.length;
        i += MAX_CHUNK_CHARS
      ) {
        pieces.push(
          word.slice(
            i,
            i + MAX_CHUNK_CHARS
          )
        );
      }

      continue;
    }

    const candidate =
      current.length > 0
        ? `${current} ${word}`
        : word;

    if (
      candidate.length <= MAX_CHUNK_CHARS
    ) {
      current = candidate;
    } else {
      flush();
      current = word;
    }
  }

  flush();

  return pieces;
};

const chunkText = (
  text: string
): string[] => {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const paragraphs =
    normalized.split(/\n\n+/);

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();

    if (!trimmed) {
      continue;
    }

    const candidate =
      current.length > 0
        ? `${current} ${trimmed}`
        : trimmed;

    if (candidate.length <= CHUNK_SIZE) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(
        ...splitOversized(
          current.trim()
        )
      );

      const previousWords =
        current.split(/\s+/);

      const overlapWords =
        previousWords.slice(
          -Math.floor(
            CHUNK_OVERLAP / 5
          )
        );

      current =
        `${overlapWords.join(" ")} ${trimmed}`.trim();
    } else {
      current = trimmed;
    }
  }

  if (current.trim()) {
    chunks.push(
      ...splitOversized(
        current.trim()
      )
    );
  }

  return chunks
    .map((chunk) => chunk.trim())
    .filter(
      (chunk) =>
        chunk.length > 20
    )
    .slice(
      0,
      MAX_CHUNKS_PER_DOCUMENT
    );
};

// ── Embeddings ─────────────────────────────────────────────────────────────────

const getEmbedding = async (
  text: string
): Promise<number[]> => {
  const safeText =
    text.slice(
      0,
      MAX_EMBED_CHARS
    );

  let response: Response;

  try {
    response = await fetch(
      `${OLLAMA_HOST}/api/embeddings`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          model: OLLAMA_EMBED_MODEL,
          prompt: safeText,
        }),

        signal:
          AbortSignal.timeout(
            OLLAMA_EMBED_TIMEOUT_MS
          ),
      }
    );
  } catch (err: any) {
    if (
      err?.name === "TimeoutError" ||
      err?.name === "AbortError"
    ) {
      throw new Error(
        `Ollama embeddings timed out after ${OLLAMA_EMBED_TIMEOUT_MS}ms`
      );
    }

    throw err;
  }

  if (!response.ok) {
    const body = await response
      .text()
      .catch(
        () => "(unreadable)"
      );

    console.error(
      `[RAG] Ollama embeddings error ${response.status}:`,
      body
    );

    throw new Error(
      `Ollama embeddings request failed: ${response.status}`
    );
  }

  const data =
    (await response.json()) as {
      embedding: number[];
    };

  if (
    !Array.isArray(data.embedding) ||
    data.embedding.length === 0
  ) {
    throw new Error(
      "Ollama returned empty embedding"
    );
  }

  return data.embedding;
};

// ── Cosine similarity ──────────────────────────────────────────────────────────

const cosineSimilarity = (
  a: number[],
  b: number[]
): number => {
  if (a.length !== b.length) {
    return 0;
  }

  const dot = a.reduce(
    (sum, value, index) =>
      sum +
      value * b[index],
    0
  );

  const magnitudeA =
    Math.sqrt(
      a.reduce(
        (sum, value) =>
          sum +
          value * value,
        0
      )
    );

  const magnitudeB =
    Math.sqrt(
      b.reduce(
        (sum, value) =>
          sum +
          value * value,
        0
      )
    );

  if (
    magnitudeA === 0 ||
    magnitudeB === 0
  ) {
    return 0;
  }

  return (
    dot /
    (magnitudeA * magnitudeB)
  );
};

// ── Lexical reranking ──────────────────────────────────────────────────────────

const normalizeSearchText = (
  value: string
): string => {
  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9\u0590-\u05ff\s]/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
};

const getQueryTerms = (
  query: string
): string[] => {
  return normalizeSearchText(query)
    .split(" ")
    .filter(
      (term) =>
        term.length >= 4
    );
};

const queryTermMatchesText = (
  queryTerm: string,
  textTerms: string[]
): number => {
  if (
    textTerms.includes(queryTerm)
  ) {
    return 1;
  }

  if (queryTerm.length < 5) {
    return 0;
  }

  const prefix =
    queryTerm.slice(0, 4);

  const prefixMatch =
    textTerms.some(
      (textTerm) =>
        textTerm.length >= 5 &&
        textTerm.startsWith(prefix)
    );

  return prefixMatch
    ? 0.8
    : 0;
};

const lexicalRelevance = (
  query: string,
  text: string
): number => {
  const queryTerms =
    getQueryTerms(query);

  if (
    queryTerms.length === 0
  ) {
    return 0;
  }

  const textTerms =
    normalizeSearchText(text)
      .split(" ")
      .filter(Boolean);

  let score = 0;

  for (
    const queryTerm of queryTerms
  ) {
    score +=
      queryTermMatchesText(
        queryTerm,
        textTerms
      );
  }

  return Math.min(
    1,
    score /
      queryTerms.length
  );
};

// ── Public API ─────────────────────────────────────────────────────────────────

export type PreparedChunk = {
  text: string;
  embedding: number[];
};

export const prepareDocumentChunks =
  async (
    buffer: Buffer,
    mimetype: string
  ): Promise<PreparedChunk[]> => {
    const text =
      await extractText(
        buffer,
        mimetype
      );

    const chunks =
      chunkText(text);

    if (
      chunks.length === 0
    ) {
      throw new Error(
        "Document appears to be empty or unreadable"
      );
    }

    const results:
      PreparedChunk[] = [];

    for (
      const chunk of chunks
    ) {
      const embedding =
        await getEmbedding(
          chunk
        );

      results.push({
        text: chunk,
        embedding,
      });
    }

    return results;
  };

export const saveDocumentChunks =
  async (
    preparedChunks:
      PreparedChunk[],
    filename: string,
    tournamentId: string
  ): Promise<void> => {
    await DocumentChunk.deleteMany(
      {
        tournament:
          tournamentId,
      }
    );

    await DocumentChunk.insertMany(
      preparedChunks.map(
        (
          chunk,
          index
        ) => ({
          tournament:
            tournamentId,
          text: chunk.text,
          embedding:
            chunk.embedding,
          source:
            filename,
          chunkIndex:
            index,
        })
      )
    );
  };

export const getContextFromChunks =
  async (
    query: string,
    preparedChunks:
      PreparedChunk[],
    topN: number =
      TOP_N_CHUNKS
  ): Promise<string[]> => {
    const queryEmbedding =
      await getEmbedding(query);

    const scoredChunks =
      preparedChunks.map(
        (
          chunk,
          index
        ) => {
          const semanticScore =
            cosineSimilarity(
              queryEmbedding,
              chunk.embedding
            );

          const lexicalScore =
            lexicalRelevance(
              query,
              chunk.text
            );

          const finalScore =
            semanticScore *
              SEMANTIC_WEIGHT +
            lexicalScore *
              LEXICAL_WEIGHT;

          return {
            chunkIndex:
              index,
            text:
              chunk.text,
            semanticScore,
            lexicalScore,
            score:
              finalScore,
          };
        }
      );

    const topChunks =
      scoredChunks
        .sort(
          (a, b) =>
            b.score -
            a.score
        )
        .slice(
          0,
          topN
        );

    console.log(
      `\n[RAG] Query: "${query}"`
    );

    console.log(
      `[RAG] Selected top ${topChunks.length} of ${preparedChunks.length} chunks:`
    );

    topChunks.forEach(
      (
        chunk,
        index
      ) => {
        const preview =
          chunk.text
            .replace(
              /\s+/g,
              " "
            )
            .trim()
            .slice(
              0,
              180
            );

        console.log(
          `[RAG] #${index + 1}` +
            ` | chunkIndex=${chunk.chunkIndex}` +
            ` | semantic=${chunk.semanticScore.toFixed(4)}` +
            ` | lexical=${chunk.lexicalScore.toFixed(4)}` +
            ` | final=${chunk.score.toFixed(4)}`
        );

        console.log(
          `[RAG] text: ${preview}${chunk.text.length > 180 ? "..." : ""}`
        );
      }
    );

    console.log(
      "[RAG] End retrieval\n"
    );

    return topChunks.map(
      (chunk) =>
        chunk.text
    );
  };

export const deleteDocumentChunks =
  async (
    tournamentId: string
  ): Promise<void> => {
    await DocumentChunk.deleteMany(
      {
        tournament:
          tournamentId,
      }
    );
  };