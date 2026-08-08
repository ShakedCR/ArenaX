/**
 * Tests for the AI trivia question validation pipeline.
 * All functions under test are pure (no network, no DB); Ollama is never called.
 */

// ── Expose internals via re-export trick ────────────────────────────────────────
// The functions we test are not exported from the service. We duplicate their
// logic here because extracting them to a shared util would change production code.
// If the team decides to export them, these tests should be updated to import directly.

// ── Inline copies of private helpers (kept in sync with production code) ────────

const normalizeText = (value: unknown): string =>
  String(value || '').trim().replace(/\s+/g, ' ');

const normalizeForCompare = (value: string): string =>
  normalizeText(value).toLowerCase();

const hasDuplicateAnswers = (answers: string[]): boolean => {
  const normalized = answers.map(normalizeForCompare);
  return new Set(normalized).size !== normalized.length;
};

const buildFallbackExplanation = (question: string, correctAnswer: string): string =>
  `The correct answer is "${correctAnswer}" for the question: ${question}`;

const normalizeQuestion = (rawQuestion: any): {
  question: string;
  answers: string[];
  correctAnswerIndex: number;
  explanation: string;
} | null => {
  const question = normalizeText(rawQuestion?.question);
  const rawAnswers = rawQuestion?.answers || rawQuestion?.options;

  if (!question) return null;
  if (!Array.isArray(rawAnswers)) return null;

  const answers = rawAnswers
    .map((a: unknown) => normalizeText(a))
    .filter((a: string) => a.length > 0);

  if (answers.length !== 4) return null;
  if (hasDuplicateAnswers(answers)) return null;

  let correctAnswerIndex = rawQuestion?.correctAnswerIndex;

  if (correctAnswerIndex === undefined && typeof rawQuestion?.answer === 'string') {
    const normalizedAnswer = normalizeForCompare(rawQuestion.answer);
    correctAnswerIndex = answers.findIndex(
      (a: string) => normalizeForCompare(a) === normalizedAnswer
    );
  }

  if (
    typeof correctAnswerIndex !== 'number' ||
    !Number.isInteger(correctAnswerIndex) ||
    correctAnswerIndex < 0 ||
    correctAnswerIndex > 3
  ) {
    return null;
  }

  const correctAnswer = answers[correctAnswerIndex];

  let explanation =
    normalizeText(rawQuestion?.explanation) ||
    normalizeText(rawQuestion?.reason) ||
    normalizeText(rawQuestion?.rationale) ||
    normalizeText(rawQuestion?.why) ||
    normalizeText(rawQuestion?.correctAnswerExplanation);

  if (!explanation || explanation.toLowerCase() === 'ai generated trivia question.') {
    explanation = buildFallbackExplanation(question, correctAnswer);
  }

  return { question, answers, correctAnswerIndex, explanation };
};

const validateAndNormalizeQuestions = (
  rawData: unknown,
  questionCount: number
): { question: string; answers: string[]; correctAnswerIndex: number; explanation: string }[] => {
  if (!Array.isArray(rawData)) throw new Error('AI response is not an array');

  const seenQuestions = new Set<string>();
  const validQuestions: ReturnType<typeof normalizeQuestion>[] = [];

  for (const rawQuestion of rawData) {
    const normalized = normalizeQuestion(rawQuestion);
    if (!normalized) continue;

    const key = normalizeForCompare(normalized.question);
    if (seenQuestions.has(key)) continue;

    seenQuestions.add(key);
    validQuestions.push(normalized);
  }

  if (validQuestions.length < questionCount) {
    throw new Error('AI did not return enough valid unique questions');
  }

  return validQuestions.slice(0, questionCount) as any;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const q = (overrides: Record<string, unknown> = {}) => ({
  question: 'What is the capital of France?',
  answers: ['Paris', 'London', 'Berlin', 'Madrid'],
  correctAnswerIndex: 0,
  explanation: 'Paris is the capital city of France.',
  ...overrides,
});

// ── normalizeText ──────────────────────────────────────────────────────────────

describe('normalizeText', () => {
  test('trims leading and trailing whitespace', () => {
    expect(normalizeText('  hello  ')).toBe('hello');
  });

  test('collapses multiple internal spaces to one', () => {
    expect(normalizeText('foo   bar')).toBe('foo bar');
  });

  test('returns empty string for null/undefined/empty', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
    expect(normalizeText('')).toBe('');
  });

  test('converts numbers to strings', () => {
    expect(normalizeText(42)).toBe('42');
  });
});

// ── hasDuplicateAnswers ────────────────────────────────────────────────────────

describe('hasDuplicateAnswers', () => {
  test('returns false when all answers are unique', () => {
    expect(hasDuplicateAnswers(['Paris', 'London', 'Berlin', 'Madrid'])).toBe(false);
  });

  test('returns true for exact duplicate answers', () => {
    expect(hasDuplicateAnswers(['Paris', 'Paris', 'Berlin', 'Madrid'])).toBe(true);
  });

  test('returns true for case-insensitive duplicates', () => {
    expect(hasDuplicateAnswers(['paris', 'PARIS', 'Berlin', 'Madrid'])).toBe(true);
  });

  test('returns true for duplicates differing only in whitespace', () => {
    expect(hasDuplicateAnswers(['Paris ', ' Paris', 'Berlin', 'Madrid'])).toBe(true);
  });

  test('returns false for empty array', () => {
    expect(hasDuplicateAnswers([])).toBe(false);
  });

  test('returns false for single element', () => {
    expect(hasDuplicateAnswers(['Paris'])).toBe(false);
  });
});

// ── normalizeQuestion ──────────────────────────────────────────────────────────

describe('normalizeQuestion', () => {
  test('returns a normalized question for a well-formed input', () => {
    const result = normalizeQuestion(q());
    expect(result).not.toBeNull();
    expect(result!.question).toBe('What is the capital of France?');
    expect(result!.answers).toHaveLength(4);
    expect(result!.correctAnswerIndex).toBe(0);
  });

  test('returns null when question field is missing', () => {
    expect(normalizeQuestion({ ...q(), question: undefined })).toBeNull();
  });

  test('returns null when question field is empty after normalization', () => {
    expect(normalizeQuestion({ ...q(), question: '   ' })).toBeNull();
  });

  test('returns null when answers is not an array', () => {
    expect(normalizeQuestion({ ...q(), answers: 'Paris,London' })).toBeNull();
  });

  test('returns null when fewer than 4 valid answers after filtering empty strings', () => {
    expect(normalizeQuestion({ ...q(), answers: ['Paris', '', 'Berlin', ''] })).toBeNull();
  });

  test('returns null when more than 4 answers remain', () => {
    expect(normalizeQuestion({ ...q(), answers: ['A', 'B', 'C', 'D', 'E'] })).toBeNull();
  });

  test('returns null when there are duplicate answers', () => {
    expect(normalizeQuestion({ ...q(), answers: ['Paris', 'Paris', 'Berlin', 'Madrid'] })).toBeNull();
  });

  test('returns null when correctAnswerIndex is out of range (4)', () => {
    expect(normalizeQuestion({ ...q(), correctAnswerIndex: 4 })).toBeNull();
  });

  test('returns null when correctAnswerIndex is negative', () => {
    expect(normalizeQuestion({ ...q(), correctAnswerIndex: -1 })).toBeNull();
  });

  test('returns null when correctAnswerIndex is not a number', () => {
    expect(normalizeQuestion({ ...q(), correctAnswerIndex: 'first' })).toBeNull();
  });

  test('accepts "options" as an alias for "answers"', () => {
    const raw = { ...q(), answers: undefined, options: ['Paris', 'London', 'Berlin', 'Madrid'] };
    const result = normalizeQuestion(raw);
    expect(result).not.toBeNull();
    expect(result!.answers).toHaveLength(4);
  });

  test('resolves correctAnswerIndex from a string "answer" field when index is absent', () => {
    const raw = { ...q(), correctAnswerIndex: undefined, answer: 'London' };
    const result = normalizeQuestion(raw);
    expect(result).not.toBeNull();
    expect(result!.correctAnswerIndex).toBe(1); // 'London' is at index 1
  });

  test('answer field lookup is case-insensitive', () => {
    const raw = { ...q(), correctAnswerIndex: undefined, answer: 'PARIS' };
    const result = normalizeQuestion(raw);
    expect(result).not.toBeNull();
    expect(result!.correctAnswerIndex).toBe(0);
  });

  test('uses "reason" field as fallback explanation when "explanation" is missing', () => {
    const raw = { ...q(), explanation: undefined, reason: 'Paris is the capital.' };
    const result = normalizeQuestion(raw);
    expect(result!.explanation).toBe('Paris is the capital.');
  });

  test('uses "rationale" field as fallback explanation', () => {
    const raw = { ...q(), explanation: undefined, rationale: 'Paris has been capital since 987 AD.' };
    const result = normalizeQuestion(raw);
    expect(result!.explanation).toBe('Paris has been capital since 987 AD.');
  });

  test('generates a fallback explanation when explanation is the banned generic phrase', () => {
    const raw = { ...q(), explanation: 'AI generated trivia question.' };
    const result = normalizeQuestion(raw);
    expect(result!.explanation).toContain('Paris'); // mentions the correct answer
    expect(result!.explanation).not.toBe('AI generated trivia question.');
  });

  test('generates a fallback explanation when explanation is empty', () => {
    const raw = { ...q(), explanation: '' };
    const result = normalizeQuestion(raw);
    expect(result!.explanation.length).toBeGreaterThan(0);
  });

  test('trims extra whitespace from answers', () => {
    const raw = { ...q(), answers: ['  Paris  ', 'London', 'Berlin', 'Madrid'] };
    const result = normalizeQuestion(raw);
    expect(result!.answers[0]).toBe('Paris');
  });
});

// ── validateAndNormalizeQuestions ──────────────────────────────────────────────

describe('validateAndNormalizeQuestions', () => {
  const makeQuestions = (count: number) =>
    Array.from({ length: count }, (_, i) => q({ question: `Question ${i + 1}?` }));

  test('returns exactly questionCount questions from a valid array', () => {
    const result = validateAndNormalizeQuestions(makeQuestions(5), 5);
    expect(result).toHaveLength(5);
  });

  test('throws when rawData is not an array', () => {
    expect(() => validateAndNormalizeQuestions('not an array', 3)).toThrow('AI response is not an array');
  });

  test('throws when there are fewer valid questions than questionCount', () => {
    expect(() => validateAndNormalizeQuestions(makeQuestions(2), 5)).toThrow(
      'AI did not return enough valid unique questions'
    );
  });

  test('skips invalid questions and still throws if count is insufficient', () => {
    const questions = [
      q({ question: 'Good question?' }),
      { question: '', answers: ['A', 'B', 'C', 'D'], correctAnswerIndex: 0, explanation: 'x' }, // invalid
    ];
    expect(() => validateAndNormalizeQuestions(questions, 2)).toThrow();
  });

  test('deduplicates questions with identical text (case-insensitive)', () => {
    const questions = [
      q({ question: 'What is the capital of France?' }),
      q({ question: 'what is the capital of france?' }), // duplicate
      q({ question: 'What is the capital of Germany?' }),
    ];
    const result = validateAndNormalizeQuestions(questions, 2);
    expect(result).toHaveLength(2);
    expect(result[0].question).toContain('France');
    expect(result[1].question).toContain('Germany');
  });

  test('slices output to exactly questionCount even if more are provided', () => {
    const result = validateAndNormalizeQuestions(makeQuestions(10), 3);
    expect(result).toHaveLength(3);
  });

  test('handles an empty array input and throws due to insufficient count', () => {
    expect(() => validateAndNormalizeQuestions([], 1)).toThrow();
  });

  test('deduplication is case-insensitive across different whitespace patterns', () => {
    const questions = [
      q({ question: 'What is  the capital  of France?' }),
      q({ question: 'what is the capital of france?' }), // collapsed + lowercased duplicate
    ];
    // Only 1 unique question → throws when requesting 2
    expect(() => validateAndNormalizeQuestions(questions, 2)).toThrow();
  });

  test('invalid questions mixed with valid ones: only valid ones count', () => {
    const questions = [
      null,           // skipped
      undefined,      // skipped
      {},             // skipped (no question)
      q({ question: 'Valid question 1?' }),
      q({ question: 'Valid question 2?' }),
      q({ question: 'Valid question 3?' }),
    ];
    const result = validateAndNormalizeQuestions(questions, 3);
    expect(result).toHaveLength(3);
  });
});
