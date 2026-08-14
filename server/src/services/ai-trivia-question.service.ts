export type TriviaDifficulty = "easy" | "medium" | "hard";

export type GeneratedTriviaQuestion = {
  question: string;
  answers: string[];
  correctAnswerIndex: number;
  explanation: string;
};

type GenerateTriviaQuestionsParams = {
  topic: string;
  category?: string;
  difficulty: TriviaDifficulty;
  questionCount: number;
  context?: string[];
};

const OLLAMA_URL = process.env.OLLAMA_HOST || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";
const OLLAMA_GENERATE_TIMEOUT_MS = Number(process.env.OLLAMA_GENERATE_TIMEOUT_MS) || 120_000;

const normalizeText = (value: unknown): string => {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
};

const normalizeForCompare = (value: string): string => {
  return normalizeText(value).toLowerCase();
};

const buildPrompt = ({
  topic,
  category,
  difficulty,
  questionCount,
  context,
}: GenerateTriviaQuestionsParams): string => {
  const contextSection = context && context.length > 0
    ? `
The following is relevant content from an uploaded document. Base your questions ONLY on this material, and focus specifically on content related to "${category || topic}":

---
${context.join("\n\n---\n\n")}
---

Important: questions must be directly answerable from the content above.
Important: even if the document covers broader topics, only generate questions about "${category || topic}" specifically.`
    : "";

  const languageInstruction = context && context.length > 0
    ? "Important: Generate ALL questions, answers, and explanations in the same language as the document content above."
    : "";

  return `
You are generating trivia questions for a competitive multiplayer quiz game.

Generate exactly ${questionCount} trivia questions.

Topic: ${topic}
Category: ${category || "General"}
Difficulty: ${difficulty}
${contextSection}
${languageInstruction}

Return JSON only.
Do not include markdown.
Do not include code fences.
Do not include explanations outside the JSON.

Required JSON format:
[
  {
    "question": "Question text",
    "answers": ["Answer A", "Answer B", "Answer C", "Answer D"],
    "correctAnswerIndex": 0,
    "explanation": "Explain in one short sentence why the correct answer is correct."
  }
]

Rules:
- Generate exactly ${questionCount} questions.
- Each question must have exactly 4 answers.
- correctAnswerIndex must be 0, 1, 2, or 3.
- Every question MUST include a non-empty "explanation" field.
- The explanation MUST be specific to the correct answer.
- Do NOT use generic explanations.
- Only one answer may be correct.
- Avoid duplicate questions.
- Avoid duplicate answers in the same question.
- Keep questions clear and not ambiguous.
- Make the questions suitable for ${difficulty} difficulty.

Bad explanation example:
"AI generated trivia question."

Good explanation example:
"RADIUS is commonly used to authenticate and authorize users or devices before granting network access."
`;
};

const extractJsonArray = (content: string): unknown => {
  const trimmed = content.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("[");
    const end = trimmed.lastIndexOf("]");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("AI response does not contain a JSON array");
    }

    const jsonText = trimmed.slice(start, end + 1);
    return JSON.parse(jsonText);
  }
};

const hasDuplicateAnswers = (answers: string[]): boolean => {
  const normalizedAnswers = answers.map(normalizeForCompare);
  return new Set(normalizedAnswers).size !== normalizedAnswers.length;
};

const buildFallbackExplanation = (
  question: string,
  correctAnswer: string
): string => {
  return `The correct answer is "${correctAnswer}" for the question: ${question}`;
};

const normalizeQuestion = (rawQuestion: any): GeneratedTriviaQuestion | null => {
  const question = normalizeText(rawQuestion?.question);
  const rawAnswers = rawQuestion?.answers || rawQuestion?.options;

  if (!question) {
    return null;
  }

  if (!Array.isArray(rawAnswers)) {
    return null;
  }

  const answers = rawAnswers
    .map((answer: unknown) => normalizeText(answer))
    .filter((answer: string) => answer.length > 0);

  if (answers.length !== 4) {
    return null;
  }

  if (hasDuplicateAnswers(answers)) {
    return null;
  }

  let correctAnswerIndex = rawQuestion?.correctAnswerIndex;

  if (
    correctAnswerIndex === undefined &&
    typeof rawQuestion?.answer === "string"
  ) {
    const normalizedAnswer = normalizeForCompare(rawQuestion.answer);

    correctAnswerIndex = answers.findIndex(
      (answer) => normalizeForCompare(answer) === normalizedAnswer
    );
  }

  if (
    typeof correctAnswerIndex !== "number" ||
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

  if (
    !explanation ||
    explanation.toLowerCase() === "ai generated trivia question."
  ) {
    explanation = buildFallbackExplanation(question, correctAnswer);
  }

  return {
    question,
    answers,
    correctAnswerIndex,
    explanation
  };
};

const validateAndNormalizeQuestions = (
  rawData: unknown,
  questionCount: number
): GeneratedTriviaQuestion[] => {
  if (!Array.isArray(rawData)) {
    throw new Error("AI response is not an array");
  }

  const seenQuestions = new Set<string>();
  const validQuestions: GeneratedTriviaQuestion[] = [];

  for (const rawQuestion of rawData) {
    const normalizedQuestion = normalizeQuestion(rawQuestion);

    if (!normalizedQuestion) {
      continue;
    }

    const questionKey = normalizeForCompare(normalizedQuestion.question);

    if (seenQuestions.has(questionKey)) {
      continue;
    }

    seenQuestions.add(questionKey);
    validQuestions.push(normalizedQuestion);
  }

  if (validQuestions.length < questionCount) {
    throw new Error("AI did not return enough valid unique questions");
  }

  return validQuestions.slice(0, questionCount);
};

const callOllama = async (prompt: string): Promise<string> => {
  let response: Response;
  try {
    response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [{ role: "user", content: prompt }],
        stream: false,
      }),
      signal: AbortSignal.timeout(OLLAMA_GENERATE_TIMEOUT_MS),
    });
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      throw new Error(`Ollama generate timed out after ${OLLAMA_GENERATE_TIMEOUT_MS}ms`);
    }
    throw err;
  }

  if (!response.ok) {
    throw new Error(`Ollama request failed with status ${response.status}`);
  }

  const data = await response.json();
  const content = data?.message?.content;

  if (!content || typeof content !== "string") {
    throw new Error("Ollama response content is empty");
  }

  return content;
};

export const generateTriviaQuestionsWithAI = async (
  params: GenerateTriviaQuestionsParams
): Promise<GeneratedTriviaQuestion[]> => {
  const prompt = buildPrompt(params);

  try {
    const content = await callOllama(prompt);
    const rawJson = extractJsonArray(content);

    return validateAndNormalizeQuestions(rawJson, params.questionCount);
  } catch (firstError) {
    console.error("AI trivia generation failed, retrying:", firstError);

    try {
      const retryPrompt = `${prompt}

Important correction:
Return ONLY a valid JSON array.
Use "answers", not "options".
Use "correctAnswerIndex", not "answer".
Every question MUST include a specific non-empty "explanation".
Do not repeat questions.
Do not repeat answers inside the same question.
`;

      const content = await callOllama(retryPrompt);
      const rawJson = extractJsonArray(content);

      return validateAndNormalizeQuestions(rawJson, params.questionCount);
    } catch (secondError) {
      console.error("AI trivia generation failed again:", secondError);
      throw new Error("Failed to generate trivia questions after two attempts. Make sure Ollama is running.");
    }
  }
};