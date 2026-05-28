export type TriviaDifficulty = "easy" | "medium" | "hard";

export type GeneratedTriviaQuestion = {
  question: string;
  answers: string[];
  correctAnswerIndex: number;
  explanation: string;
};

type GenerateTriviaQuestionsParams = {
  topic: string;
  difficulty: TriviaDifficulty;
  questionCount: number;
};

const OLLAMA_URL = process.env.OLLAMA_HOST || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";

const buildPrompt = ({
  topic,
  difficulty,
  questionCount
}: GenerateTriviaQuestionsParams): string => {
  return `
Generate exactly ${questionCount} trivia questions.

Topic: ${topic}
Difficulty: ${difficulty}

Return JSON only.
Do not include markdown.
Do not include explanations outside the JSON.

Required JSON format:
[
  {
    "question": "Question text",
    "answers": ["Answer A", "Answer B", "Answer C", "Answer D"],
    "correctAnswerIndex": 0,
    "explanation": "Short explanation"
  }
]

Rules:
- Generate exactly ${questionCount} questions.
- Each question must have exactly 4 answers.
- correctAnswerIndex must be 0, 1, 2, or 3.
- Only one answer may be correct.
- Avoid duplicate questions.
- Keep questions clear and not ambiguous.
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

const normalizeQuestion = (rawQuestion: any): GeneratedTriviaQuestion | null => {
  const question = rawQuestion?.question;

  const answers = rawQuestion?.answers || rawQuestion?.options;

  let correctAnswerIndex = rawQuestion?.correctAnswerIndex;

  if (
    correctAnswerIndex === undefined &&
    typeof rawQuestion?.answer === "string" &&
    Array.isArray(answers)
  ) {
    correctAnswerIndex = answers.findIndex(
      (answer: string) =>
        answer.trim().toLowerCase() === rawQuestion.answer.trim().toLowerCase()
    );
  }

  const explanation =
    rawQuestion?.explanation ||
    rawQuestion?.reason ||
    "AI generated trivia question.";

  if (typeof question !== "string" || question.trim() === "") {
    return null;
  }

  if (!Array.isArray(answers) || answers.length !== 4) {
    return null;
  }

  if (
    typeof correctAnswerIndex !== "number" ||
    correctAnswerIndex < 0 ||
    correctAnswerIndex > 3
  ) {
    return null;
  }

  return {
    question: question.trim(),
    answers: answers.map((answer: unknown) => String(answer).trim()),
    correctAnswerIndex,
    explanation: String(explanation).trim()
  };
};

const validateAndNormalizeQuestions = (
  rawData: unknown,
  questionCount: number
): GeneratedTriviaQuestion[] => {
  if (!Array.isArray(rawData)) {
    throw new Error("AI response is not an array");
  }

  const normalizedQuestions = rawData
    .map(normalizeQuestion)
    .filter(Boolean) as GeneratedTriviaQuestion[];

  if (normalizedQuestions.length < questionCount) {
    throw new Error("AI did not return enough valid questions");
  }

  return normalizedQuestions.slice(0, questionCount);
};

const generateFallbackQuestions = (
  topic: string,
  questionCount: number
): GeneratedTriviaQuestion[] => {
  return Array.from({ length: questionCount }).map((_, index) => ({
    question: `Sample question ${index + 1} about ${topic}?`,
    answers: [
      `Correct answer ${index + 1}`,
      `Wrong answer A ${index + 1}`,
      `Wrong answer B ${index + 1}`,
      `Wrong answer C ${index + 1}`
    ],
    correctAnswerIndex: 0,
    explanation: `Fallback question generated for ${topic}.`
  }));
};

const callOllama = async (prompt: string): Promise<string> => {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      stream: false
    })
  });

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

Important:
Return ONLY a valid JSON array.
Use "answers", not "options".
Use "correctAnswerIndex", not "answer".
`;

      const content = await callOllama(retryPrompt);
      const rawJson = extractJsonArray(content);

      return validateAndNormalizeQuestions(rawJson, params.questionCount);
    } catch (secondError) {
      console.error("AI trivia generation failed again:", secondError);

      return generateFallbackQuestions(params.topic, params.questionCount);
    }
  }
};