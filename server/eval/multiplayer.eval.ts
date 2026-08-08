/**
 * eval/multiplayer.eval.ts
 *
 * Stage 3 evaluation — RT-1, RT-2, RT-3, RT-4, REL-1.
 * Spins up two socket.io-client connections against a running ArenaX server,
 * runs a complete 1-question trivia game, and records all event timings.
 *
 * Prerequisites:
 *   - ArenaX server running on http://localhost:3000
 *   - MongoDB available
 *   - Ollama running (needed for tournament creation, 1-question game)
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node"}' \
 *     eval/multiplayer.eval.ts
 */

import { io as ioClient, Socket } from "socket.io-client";

const BASE_URL = "http://localhost:3000";
const EVAL_SUFFIX = `_eval_${Date.now()}`;

// ── HTTP helpers (native fetch, Node ≥ 18) ────────────────────────────────────

async function api(
  method: string,
  path: string,
  body?: object,
  token?: string
): Promise<{ status: number; data: any }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// ── Socket helpers ─────────────────────────────────────────────────────────────

function connectSocket(token: string): Socket {
  return ioClient(BASE_URL, {
    auth: { token },
    transports: ["websocket"],
    reconnection: false,
  });
}

function waitForEvent(
  socket: Socket,
  event: string,
  timeoutMs = 60_000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`Timeout waiting for event "${event}" after ${timeoutMs}ms`)),
      timeoutMs
    );
    socket.once(event, (data: any) => { clearTimeout(t); resolve(data); });
  });
}

function emitAck(
  socket: Socket,
  event: string,
  payload: object,
  timeoutMs = 10_000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`Timeout waiting for ack on "${event}" after ${timeoutMs}ms`)),
      timeoutMs
    );
    socket.emit(event, payload, (ack: any) => { clearTimeout(t); resolve(ack); });
  });
}

// ── Statistics ─────────────────────────────────────────────────────────────────

function stats(values: number[]): { mean: number; min: number; max: number; sd: number } {
  const n = values.length;
  if (n === 0) return { mean: 0, min: 0, max: 0, sd: 0 };
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
  return { mean: +mean.toFixed(1), min: Math.min(...values), max: Math.max(...values), sd: +sd.toFixed(1) };
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Stage 3 — Real-time Multiplayer & Reliability Evaluation ===");
  console.log(`Server : ${BASE_URL}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  // ── Step 1: Register and login two users ───────────────────────────────────
  console.log("--- Step 1: Register and login two test users ---");

  const u1 = { username: `eval_u1${EVAL_SUFFIX}`, email: `eval_u1${EVAL_SUFFIX}@test.local`, password: "Test@12345", fullName: "Eval User One" };
  const u2 = { username: `eval_u2${EVAL_SUFFIX}`, email: `eval_u2${EVAL_SUFFIX}@test.local`, password: "Test@12345", fullName: "Eval User Two" };

  const reg1 = await api("POST", "/api/auth/register", u1);
  if (reg1.status !== 201) throw new Error(`User1 register failed: ${JSON.stringify(reg1.data)}`);
  const token1: string = reg1.data.token;
  const userId1: string = reg1.data.user._id;
  console.log(`  User1 registered: ${u1.username} (${userId1})`);

  const reg2 = await api("POST", "/api/auth/register", u2);
  if (reg2.status !== 201) throw new Error(`User2 register failed: ${JSON.stringify(reg2.data)}`);
  const token2: string = reg2.data.token;
  const userId2: string = reg2.data.user._id;
  console.log(`  User2 registered: ${u2.username} (${userId2})`);

  // ── Step 2: User1 creates a trivia tournament (1 question, 15s timer) ─────
  console.log("\n--- Step 2: Create trivia tournament (1 question) ---");

  const createRes = await api("POST", "/api/trivia/tournaments", {
    title: `Eval Tournament ${EVAL_SUFFIX}`,
    description: "Multiplayer evaluation run",
    category: "Science",
    difficulty: "easy",
    questionCount: 1,
    timePerQuestion: 15,
    maxParticipants: 2,
    entryFee: 0,
    isPrivate: false,
  }, token1);

  if (createRes.status !== 201) throw new Error(`Tournament creation failed: ${JSON.stringify(createRes.data)}`);

  const tournamentId: string = createRes.data.tournament._id;
  const triviaGameId: string = createRes.data.triviaGame._id;

  console.log(`  Tournament ID  : ${tournamentId}`);
  console.log(`  TriviaGame ID  : ${triviaGameId}`);
  console.log(`  Questions count: ${createRes.data.triviaGame.questions.length}`);

  // ── Step 3: User2 joins the tournament ─────────────────────────────────────
  console.log("\n--- Step 3: User2 joins tournament ---");

  const joinRes = await api("POST", `/api/tournaments/${tournamentId}/join`, {}, token2);
  if (joinRes.status !== 200) throw new Error(`Join failed: ${JSON.stringify(joinRes.data)}`);
  console.log(`  Joined: ${joinRes.data.message}`);

  // ── Step 4: Both sockets connect and join the trivia room ──────────────────
  console.log("\n--- Step 4: Connect two sockets and join trivia room ---");

  const sock1 = connectSocket(token1);
  const sock2 = connectSocket(token2);

  await new Promise<void>((resolve, reject) => {
    let connected = 0;
    const done = () => { if (++connected === 2) resolve(); };
    sock1.once("connect", done);
    sock2.once("connect", done);
    sock1.once("connect_error", reject);
    sock2.once("connect_error", reject);
    setTimeout(() => reject(new Error("Socket connection timeout")), 10_000);
  });
  console.log("  Both sockets connected.");

  const ack1 = await emitAck(sock1, "trivia:join", { triviaGameId });
  const ack2 = await emitAck(sock2, "trivia:join", { triviaGameId });
  if (!ack1.ok) throw new Error(`sock1 join ack failed: ${ack1.message}`);
  if (!ack2.ok) throw new Error(`sock2 join ack failed: ${ack2.message}`);
  console.log(`  sock1 join ack: ok=${ack1.ok}`);
  console.log(`  sock2 join ack: ok=${ack2.ok}`);

  // ── Step 5: Set up listeners on both sockets BEFORE starting ───────────────
  console.log("\n--- Step 5: Register event listeners ---");

  // question-started
  const sock1QuestionStartedPromise = waitForEvent(sock1, "trivia:question-started", 20_000);
  const sock2QuestionStartedPromise = waitForEvent(sock2, "trivia:question-started", 20_000);
  const sock1ReceivedAt: Record<string, number> = {};
  const sock2ReceivedAt: Record<string, number> = {};

  sock1.once("trivia:question-started", () => { sock1ReceivedAt["question-started"] = Date.now(); });
  sock2.once("trivia:question-started", () => { sock2ReceivedAt["question-started"] = Date.now(); });

  // question-ended
  const sock1QuestionEndedPromise = waitForEvent(sock1, "trivia:question-ended", 30_000);
  const sock2QuestionEndedPromise = waitForEvent(sock2, "trivia:question-ended", 30_000);
  sock1.once("trivia:question-ended", () => { sock1ReceivedAt["question-ended"] = Date.now(); });
  sock2.once("trivia:question-ended", () => { sock2ReceivedAt["question-ended"] = Date.now(); });

  // game-completed
  const sock1GameCompletedPromise = waitForEvent(sock1, "trivia:game-completed", 60_000);
  const sock2GameCompletedPromise = waitForEvent(sock2, "trivia:game-completed", 60_000);
  sock1.once("trivia:game-completed", () => { sock1ReceivedAt["game-completed"] = Date.now(); });
  sock2.once("trivia:game-completed", () => { sock2ReceivedAt["game-completed"] = Date.now(); });

  console.log("  Listeners registered on both sockets.");

  // ── Step 6: User1 (creator) starts the game ────────────────────────────────
  console.log("\n--- Step 6: Start trivia game ---");
  const startRes = await api("POST", `/api/trivia/${triviaGameId}/start`, {}, token1);
  if (startRes.status !== 200) throw new Error(`Start failed: ${JSON.stringify(startRes.data)}`);
  console.log(`  Start response: ${startRes.data.message}`);

  // ── Step 7: Capture question-started on both sockets (RT-1, RT-4) ─────────
  console.log("\n--- Step 7: Waiting for trivia:question-started on both sockets ---");
  const [qs1, qs2] = await Promise.all([sock1QuestionStartedPromise, sock2QuestionStartedPromise]);
  const qs1ReceivedMs = sock1ReceivedAt["question-started"];
  const qs2ReceivedMs = sock2ReceivedAt["question-started"];

  console.log(`\n  sock1 payload:`);
  console.log(`    questionIndex : ${qs1.currentQuestionIndex}`);
  console.log(`    timePerQuestion: ${qs1.timePerQuestion}`);
  console.log(`    question text : "${qs1.question?.question}"`);
  console.log(`    serverStartedAt: ${qs1.serverStartedAt}`);
  console.log(`  sock2 payload:`);
  console.log(`    questionIndex : ${qs2.currentQuestionIndex}`);
  console.log(`    timePerQuestion: ${qs2.timePerQuestion}`);
  console.log(`    question text : "${qs2.question?.question}"`);
  console.log(`    serverStartedAt: ${qs2.serverStartedAt}`);

  // RT-4 latency: arrival time − server timestamp
  const serverStartMs = new Date(qs1.serverStartedAt).getTime();
  const latency1_start = qs1ReceivedMs - serverStartMs;
  const latency2_start = qs2ReceivedMs - serverStartMs;
  console.log(`\n  RT-4 (question-started latency):`);
  console.log(`    sock1: ${latency1_start} ms after serverStartedAt`);
  console.log(`    sock2: ${latency2_start} ms after serverStartedAt`);

  // RT-1: payloads must be identical
  const rt1_questionMatch = qs1.question?.question === qs2.question?.question;
  const rt1_indexMatch    = qs1.currentQuestionIndex === qs2.currentQuestionIndex;
  const rt1_serverMatch   = qs1.serverStartedAt === qs2.serverStartedAt;
  console.log(`\n  RT-1 assertions:`);
  console.log(`    question text identical : ${rt1_questionMatch}`);
  console.log(`    questionIndex identical : ${rt1_indexMatch}`);
  console.log(`    serverStartedAt identical: ${rt1_serverMatch}`);

  // ── Step 8: Submit answers from both sockets (RT-2, REL-1) ────────────────
  console.log("\n--- Step 8: Submit answers ---");

  // User1 submits answer 0 at ~3000ms response time
  const submitPayload1 = {
    triviaGameId,
    questionIndex: 0,
    selectedAnswerIndex: 0,
    responseTimeMs: 3000,
  };
  const answerAck1 = await emitAck(sock1, "trivia:submit-answer", submitPayload1);
  console.log(`  sock1 answer ack: ok=${answerAck1.ok}  isCorrect=${answerAck1.data?.isCorrect}  scoreEarned=${answerAck1.data?.scoreEarned}`);

  // User2 submits same answer immediately after
  const submitPayload2 = {
    triviaGameId,
    questionIndex: 0,
    selectedAnswerIndex: 1,
    responseTimeMs: 5000,
  };
  const answerAck2 = await emitAck(sock2, "trivia:submit-answer", submitPayload2);
  console.log(`  sock2 answer ack: ok=${answerAck2.ok}  isCorrect=${answerAck2.data?.isCorrect}  scoreEarned=${answerAck2.data?.scoreEarned}`);

  // REL-1: User1 tries to submit a second time for the same question
  console.log("\n--- Step 8b: REL-1 — Duplicate answer attempt ---");
  const duplicateAck = await emitAck(sock1, "trivia:submit-answer", submitPayload1);
  console.log(`  Duplicate submit ack: ok=${duplicateAck.ok}  message="${duplicateAck.message}"`);
  const rel1Pass = duplicateAck.ok === false && duplicateAck.message?.toLowerCase().includes("already answered");
  console.log(`  REL-1 assertion (ok=false + "already answered"): ${rel1Pass}`);

  // ── Step 9: Capture question-ended on both sockets (RT-2) ─────────────────
  console.log("\n--- Step 9: Waiting for trivia:question-ended on both sockets ---");
  const [qe1, qe2] = await Promise.all([sock1QuestionEndedPromise, sock2QuestionEndedPromise]);
  const qe1ReceivedMs = sock1ReceivedAt["question-ended"];
  const qe2ReceivedMs = sock2ReceivedAt["question-ended"];
  const qeServerMs = new Date(qe1.at).getTime();

  console.log(`\n  sock1 question-ended payload:`);
  console.log(`    questionIndex       : ${qe1.questionIndex}`);
  console.log(`    correctAnswerIndex  : ${qe1.correctAnswerIndex}`);
  console.log(`    correctAnswer       : "${qe1.correctAnswer}"`);
  console.log(`    leaderboard entries : ${qe1.leaderboard?.length}`);
  console.log(`    at                  : ${qe1.at}`);
  console.log(`  sock2 question-ended payload:`);
  console.log(`    questionIndex       : ${qe2.questionIndex}`);
  console.log(`    correctAnswerIndex  : ${qe2.correctAnswerIndex}`);
  console.log(`    correctAnswer       : "${qe2.correctAnswer}"`);
  console.log(`    leaderboard entries : ${qe2.leaderboard?.length}`);

  const rt2_answerMatch      = qe1.correctAnswerIndex === qe2.correctAnswerIndex;
  const rt2_correctTextMatch = qe1.correctAnswer === qe2.correctAnswer;
  const rt2_lbLengthMatch    = qe1.leaderboard?.length === qe2.leaderboard?.length;
  const rt2_lbContentMatch   = JSON.stringify(
    qe1.leaderboard?.map((e: any) => ({ user: e.user?.toString?.() ?? e.user, totalScore: e.totalScore, rank: e.rank })).sort((a: any,b: any) => a.rank - b.rank)
  ) === JSON.stringify(
    qe2.leaderboard?.map((e: any) => ({ user: e.user?.toString?.() ?? e.user, totalScore: e.totalScore, rank: e.rank })).sort((a: any,b: any) => a.rank - b.rank)
  );

  console.log(`\n  RT-2 assertions:`);
  console.log(`    correctAnswerIndex identical : ${rt2_answerMatch}`);
  console.log(`    correctAnswer text identical : ${rt2_correctTextMatch}`);
  console.log(`    leaderboard length identical : ${rt2_lbLengthMatch}`);
  console.log(`    leaderboard content identical: ${rt2_lbContentMatch}`);

  const latency1_end = qe1ReceivedMs - qeServerMs;
  const latency2_end = qe2ReceivedMs - qeServerMs;
  console.log(`\n  RT-4 (question-ended latency):`);
  console.log(`    sock1: ${latency1_end} ms after server "at" timestamp`);
  console.log(`    sock2: ${latency2_end} ms after server "at" timestamp`);

  // ── Step 10: Capture game-completed (RT-3) ─────────────────────────────────
  console.log("\n--- Step 10: Waiting for trivia:game-completed on both sockets ---");
  const [gc1, gc2] = await Promise.all([sock1GameCompletedPromise, sock2GameCompletedPromise]);

  console.log(`\n  sock1 game-completed leaderboard:`);
  (gc1.leaderboard ?? []).forEach((e: any) => {
    console.log(`    Rank ${e.rank}: userId=${e.user?._id ?? e.user}  totalScore=${e.totalScore}  correct=${e.correctAnswers}`);
  });
  console.log(`  sock2 game-completed leaderboard:`);
  (gc2.leaderboard ?? []).forEach((e: any) => {
    console.log(`    Rank ${e.rank}: userId=${e.user?._id ?? e.user}  totalScore=${e.totalScore}  correct=${e.correctAnswers}`);
  });

  // RT-3: compare socket leaderboard to DB
  const dbLbRes = await api("GET", `/api/trivia/${triviaGameId}/leaderboard`);
  console.log(`\n  DB leaderboard (GET /api/trivia/${triviaGameId}/leaderboard):`);
  (dbLbRes.data.leaderboard ?? []).forEach((e: any) => {
    console.log(`    Rank ${e.rank}: userId=${e.user?._id ?? e.user}  totalScore=${e.totalScore}  correct=${e.correctAnswers}`);
  });

  const gcLbNorm = (lb: any[]) =>
    JSON.stringify(
      lb.map(e => ({
        user: e.user?._id?.toString() ?? e.user?.toString(),
        totalScore: e.totalScore,
        rank: e.rank,
      })).sort((a, b) => a.rank - b.rank)
    );

  const rt3_socketsMatch = gcLbNorm(gc1.leaderboard ?? []) === gcLbNorm(gc2.leaderboard ?? []);
  const rt3_sock1DbMatch = gcLbNorm(gc1.leaderboard ?? []) === gcLbNorm(dbLbRes.data.leaderboard ?? []);
  console.log(`\n  RT-3 assertions:`);
  console.log(`    sock1 leaderboard === sock2 leaderboard : ${rt3_socketsMatch}`);
  console.log(`    sock1 leaderboard === DB leaderboard   : ${rt3_sock1DbMatch}`);

  // ── Summary of RT-4 latencies ──────────────────────────────────────────────
  const allLatencies = [latency1_start, latency2_start, latency1_end, latency2_end];
  const latStats = stats(allLatencies);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  sock1.disconnect();
  sock2.disconnect();

  // ── Final consolidated output ──────────────────────────────────────────────
  console.log("\n=== CONSOLIDATED RESULTS — STAGE 3 ===\n");

  const pass = (v: boolean) => v ? "PASS" : "FAIL";

  console.log(`RT-1  Question progression synchronisation`);
  console.log(`  question text identical  : ${pass(rt1_questionMatch)}`);
  console.log(`  questionIndex identical  : ${pass(rt1_indexMatch)}`);
  console.log(`  serverStartedAt identical: ${pass(rt1_serverMatch)}`);

  console.log(`\nRT-2  Answer-reveal synchronisation`);
  console.log(`  correctAnswerIndex identical : ${pass(rt2_answerMatch)}`);
  console.log(`  correctAnswer text identical : ${pass(rt2_correctTextMatch)}`);
  console.log(`  leaderboard length identical : ${pass(rt2_lbLengthMatch)}`);
  console.log(`  leaderboard content identical: ${pass(rt2_lbContentMatch)}`);

  console.log(`\nRT-3  Leaderboard consistency`);
  console.log(`  sock1 === sock2 : ${pass(rt3_socketsMatch)}`);
  console.log(`  sock1 === DB    : ${pass(rt3_sock1DbMatch)}`);

  console.log(`\nRT-4  Client-perceived event latency (all events, both clients)`);
  console.log(`  Raw latencies (ms): ${allLatencies.join(", ")}`);
  console.log(`  Mean: ${latStats.mean} ms  Min: ${latStats.min} ms  Max: ${latStats.max} ms  SD: ${latStats.sd} ms`);
  console.log(`  (question-started) sock1: ${latency1_start} ms  sock2: ${latency2_start} ms`);
  console.log(`  (question-ended)   sock1: ${latency1_end} ms  sock2: ${latency2_end} ms`);

  console.log(`\nREL-1 Duplicate-answer prevention`);
  console.log(`  Duplicate submit rejected with ok=false : ${pass(rel1Pass)}`);
  console.log(`  Server message                          : "${duplicateAck.message}"`);

  const allPassed = rt1_questionMatch && rt1_indexMatch && rt1_serverMatch
    && rt2_answerMatch && rt2_correctTextMatch && rt2_lbLengthMatch && rt2_lbContentMatch
    && rt3_socketsMatch && rt3_sock1DbMatch && rel1Pass;
  console.log(`\nOverall: ${allPassed ? "ALL PASS" : "SOME FAILURES"}`);
  console.log(`Completed: ${new Date().toISOString()}`);
}

main().catch(err => {
  console.error("\nEvaluation script failed:", err);
  process.exit(1);
});
