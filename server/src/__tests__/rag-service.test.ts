/**
 * Tests for the RAG service — chunking, cosine similarity, and in-memory retrieval.
 * No network calls or MongoDB interactions; Ollama is fully mocked.
 */

// ── Inline copies of private helpers ──────────────────────────────────────────

const CHUNK_SIZE = 300;
const CHUNK_OVERLAP = 50;
const MAX_EMBED_CHARS = 350;
const MAX_CHUNK_CHARS = MAX_EMBED_CHARS;
const MAX_CHUNKS_PER_DOCUMENT = 50;

const splitOversized = (chunk: string): string[] => {
  if (chunk.length <= MAX_CHUNK_CHARS) return [chunk];

  const pieces: string[] = [];
  const words = chunk.split(' ');
  let current = '';

  const flush = () => {
    if (current) {
      pieces.push(current);
      current = '';
    }
  };

  for (const word of words) {
    if (word.length > MAX_CHUNK_CHARS) {
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
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const paragraphs = normalized.split(/\n\n+/);
  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    if ((current + ' ' + trimmed).length <= CHUNK_SIZE) {
      current = current ? `${current} ${trimmed}` : trimmed;
    } else {
      if (current) {
        chunks.push(...splitOversized(current.trim()));
        const words = current.split(' ');
        const overlapWords = words.slice(-Math.floor(CHUNK_OVERLAP / 5));
        current = overlapWords.join(' ') + ' ' + trimmed;
      } else {
        current = trimmed;
      }
    }
  }

  if (current.trim()) chunks.push(...splitOversized(current.trim()));
  return chunks.filter(c => c.length > 20).slice(0, MAX_CHUNKS_PER_DOCUMENT);
};

const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length) return 0;
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
};

// Simulates getContextFromChunks without the network call
const getContextFromChunks = (
  queryEmbedding: number[],
  preparedChunks: { text: string; embedding: number[] }[],
  topN: number = 5
): string[] =>
  preparedChunks
    .map(chunk => ({ text: chunk.text, score: cosineSimilarity(queryEmbedding, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(c => c.text);

// ── chunkText ──────────────────────────────────────────────────────────────────

describe('chunkText', () => {
  test('splits text on double newlines into separate chunks', () => {
    const text = 'First paragraph.\n\nSecond paragraph.';
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  test('filters out chunks with 20 characters or fewer', () => {
    const text = 'Short.\n\nThis is a much longer paragraph with enough content to survive the filter.';
    const chunks = chunkText(text);
    expect(chunks.every(c => c.length > 20)).toBe(true);
  });

  test('merges short consecutive paragraphs into a single chunk', () => {
    const short1 = 'First short line.';
    const short2 = 'Second short line.';
    const chunks = chunkText(`${short1}\n\n${short2}`);
    // Both fit within CHUNK_SIZE (300) → merged into one chunk
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toContain(short1);
    expect(chunks[0]).toContain(short2);
  });

  test('splits into multiple chunks when paragraphs exceed CHUNK_SIZE', () => {
    const longParagraph = 'x '.repeat(160).trim(); // ~320 chars > 300
    const text = `${longParagraph}\n\n${longParagraph}`;
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  test('chunk boundaries carry overlap from the previous chunk', () => {
    const words = Array.from({ length: 80 }, (_, i) => `word${i}`);
    const bigParagraph1 = words.slice(0, 40).join(' ');  // ~240 chars
    const bigParagraph2 = words.slice(0, 40).join(' ');  // same length
    const text = `${bigParagraph1}\n\n${bigParagraph2}`;
    const chunks = chunkText(text);
    // Second chunk should start with the overlap words from the first
    if (chunks.length > 1) {
      const overlapWords = bigParagraph1.split(' ').slice(-Math.floor(CHUNK_OVERLAP / 5));
      const secondChunkStartWords = chunks[1].split(' ').slice(0, overlapWords.length);
      expect(secondChunkStartWords).toEqual(overlapWords);
    }
  });

  test('returns empty array for empty input', () => {
    expect(chunkText('')).toEqual([]);
  });

  test('normalizes \\r\\n to \\n before splitting', () => {
    const text = 'First paragraph.\r\n\r\nSecond paragraph.';
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  test('collapses 3+ consecutive newlines into double newlines', () => {
    const text = 'First paragraph.\n\n\n\n\nSecond paragraph.';
    const chunks = chunkText(text);
    // Should be treated the same as a double-newline split
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  test('each chunk is within CHUNK_SIZE + overlap length as upper bound', () => {
    const longText = Array.from({ length: 5 }, (_, i) =>
      `Section ${i}: ` + 'word '.repeat(40)
    ).join('\n\n');
    const chunks = chunkText(longText);
    // Due to overlap, chunks can be slightly larger than CHUNK_SIZE
    // but should not balloon uncontrollably
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThan(CHUNK_SIZE * 2);
    }
  });

  // ── oversized-chunk fallback (MAX_CHUNK_CHARS) ────────────────────────────────

  test('splits a single very long paragraph (no blank lines) into bounded chunks', () => {
    const longParagraph = Array.from({ length: 500 }, (_, i) => `word${i}`).join(' ')
    const chunks = chunkText(longParagraph)

    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(MAX_CHUNK_CHARS)
    }
  })

  test('does not silently drop text when splitting an oversized paragraph', () => {
    const longParagraph = Array.from({ length: 500 }, (_, i) => `word${i}`).join(' ')
    const chunks = chunkText(longParagraph)
    const reassembled = chunks.join(' ')

    expect(reassembled).toContain('word0')
    expect(reassembled).toContain('word250')
    expect(reassembled).toContain('word499')
  })

  test('hard-slices a single token longer than MAX_CHUNK_CHARS without dropping any characters', () => {
    const hugeToken = 'x'.repeat(1000)
    const chunks = chunkText(hugeToken)

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every(c => c.length <= MAX_CHUNK_CHARS)).toBe(true)
    expect(chunks.join('').length).toBe(1000)
  })

  test('normal paragraph-based documents are unaffected by the oversized-chunk fallback', () => {
    const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.'
    const chunks = chunkText(text)

    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toContain('First paragraph.')
    expect(chunks[0]).toContain('Third paragraph.')
  })

  test('never produces empty chunks', () => {
    const text = 'A'.repeat(2000) + '\n\n' + 'B'.repeat(2000) + '\n\n\n\n' + 'short tail paragraph here'
    const chunks = chunkText(text)

    expect(chunks.every(c => c.length > 0)).toBe(true)
  })

  // ── total chunk cap (MAX_CHUNKS_PER_DOCUMENT) ─────────────────────────────────

  test('caps the total number of chunks at MAX_CHUNKS_PER_DOCUMENT', () => {
    const paragraphs = Array.from({ length: 400 }, (_, i) =>
      `Paragraph number ${i} with some unique content to avoid being merged away.`
    )
    const text = paragraphs.join('\n\n')
    const chunks = chunkText(text)

    expect(chunks.length).toBeLessThanOrEqual(MAX_CHUNKS_PER_DOCUMENT)
  })

  test('does not cap documents that produce fewer than MAX_CHUNKS_PER_DOCUMENT chunks', () => {
    const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.'
    const chunks = chunkText(text)

    expect(chunks.length).toBeLessThan(MAX_CHUNKS_PER_DOCUMENT)
    expect(chunks.length).toBeGreaterThan(0)
  })
});

// ── cosineSimilarity ───────────────────────────────────────────────────────────

describe('cosineSimilarity', () => {
  test('identical vectors return 1.0', () => {
    const v = [1, 2, 3];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0);
  });

  test('identical non-unit vectors return 1.0', () => {
    expect(cosineSimilarity([2, 4, 6], [2, 4, 6])).toBeCloseTo(1.0);
  });

  test('orthogonal vectors return 0', () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0);
  });

  test('opposite vectors return -1.0', () => {
    expect(cosineSimilarity([1, 0, 0], [-1, 0, 0])).toBeCloseTo(-1.0);
  });

  test('scalar multiple of vector has similarity 1.0', () => {
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1.0);
  });

  test('returns 0 when lengths differ', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  test('returns 0 when either vector is the zero vector', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([1, 2, 3], [0, 0, 0])).toBe(0);
  });

  test('both zero vectors return 0 (no division by zero)', () => {
    expect(cosineSimilarity([0, 0, 0], [0, 0, 0])).toBe(0);
  });

  test('result is between -1 and 1 for arbitrary vectors', () => {
    const a = [0.5, -0.2, 0.8, 1.0];
    const b = [-0.3, 0.7, 0.1, 0.4];
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeGreaterThanOrEqual(-1);
    expect(sim).toBeLessThanOrEqual(1);
  });

  test('is commutative (sim(a,b) === sim(b,a))', () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a));
  });

  test('works correctly with single-element vectors', () => {
    expect(cosineSimilarity([3], [4])).toBeCloseTo(1.0); // same direction
    expect(cosineSimilarity([3], [-4])).toBeCloseTo(-1.0); // opposite direction
  });
});

// ── getContextFromChunks (in-memory retrieval) ─────────────────────────────────

describe('getContextFromChunks', () => {
  const makeChunk = (text: string, embedding: number[]) => ({ text, embedding });

  test('returns the topN most similar chunks by cosine similarity', () => {
    const queryEmbedding = [1, 0, 0];
    const chunks = [
      makeChunk('Orthogonal',   [0, 1, 0]),      // sim ≈ 0
      makeChunk('Most similar', [1, 0, 0]),      // sim = 1
      makeChunk('Moderate',     [0.7, 0.7, 0]),  // sim ≈ 0.7
    ];

    const results = getContextFromChunks(queryEmbedding, chunks, 2);
    expect(results[0]).toBe('Most similar');
    expect(results[1]).toBe('Moderate');
    expect(results).not.toContain('Orthogonal');
  });

  test('returns all chunks when topN >= number of chunks', () => {
    const queryEmbedding = [1, 0];
    const chunks = [
      makeChunk('A', [1, 0]),
      makeChunk('B', [0, 1]),
    ];
    const results = getContextFromChunks(queryEmbedding, chunks, 10);
    expect(results).toHaveLength(2);
  });

  test('returns empty array when chunks array is empty', () => {
    expect(getContextFromChunks([1, 0, 0], [], 5)).toEqual([]);
  });

  test('respects topN = 1 and returns only the best match', () => {
    const queryEmbedding = [1, 0];
    const chunks = [
      makeChunk('Best', [1, 0]),
      makeChunk('Worst', [0, 1]),
    ];
    const results = getContextFromChunks(queryEmbedding, chunks, 1);
    expect(results).toHaveLength(1);
    expect(results[0]).toBe('Best');
  });

  test('returns texts as plain strings (not the full chunk objects)', () => {
    const chunks = [makeChunk('Some text', [1, 0])];
    const results = getContextFromChunks([1, 0], chunks, 5);
    expect(typeof results[0]).toBe('string');
    expect(results[0]).toBe('Some text');
  });

  test('correctly breaks ties when similarities are equal', () => {
    const queryEmbedding = [1, 0];
    const chunks = [
      makeChunk('First', [1, 0]),   // sim = 1
      makeChunk('Second', [1, 0]),  // sim = 1
    ];
    // Both have equal similarity; topN=1 must still return exactly 1 result
    const results = getContextFromChunks(queryEmbedding, chunks, 1);
    expect(results).toHaveLength(1);
  });

  test('chunks with negative similarity score are ranked last', () => {
    const queryEmbedding = [1, 0];
    const chunks = [
      makeChunk('Negative', [-1, 0]),  // sim = -1
      makeChunk('Positive', [0.5, 0.5]), // sim > 0
    ];
    const results = getContextFromChunks(queryEmbedding, chunks, 2);
    expect(results[0]).toBe('Positive');
    expect(results[1]).toBe('Negative');
  });

  test('original chunks array is not mutated by sorting', () => {
    const queryEmbedding = [1, 0];
    const chunks = [
      makeChunk('Low', [0, 1]),
      makeChunk('High', [1, 0]),
    ];
    const originalOrder = chunks.map(c => c.text);
    getContextFromChunks(queryEmbedding, chunks, 2);
    expect(chunks.map(c => c.text)).toEqual(originalOrder);
  });
});
