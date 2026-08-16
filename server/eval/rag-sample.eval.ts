/**
 * eval/rag-sample.eval.ts
 *
 * 5-run, 25-question PDF-production-accurate RAG evaluation.
 *
 * Setup:
 *   - Original PDF binary → pdf-parse (application/pdf)
 *   - prepareDocumentChunks → getContextFromChunks (TOP_N_CHUNKS = 5)
 *   - topic = category = "Childhood Obesity"  (mirrors controller: safeTopic = safeCategory)
 *   - difficulty = "medium", questionCount = 5
 *   - nomic-embed-text + llama3, no production code modified
 *
 * The preliminary 3/5 PDF verification run is NOT included here.
 * These are 5 fresh, independent runs.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node"}' \
 *     eval/rag-sample.eval.ts
 */

import fs from "fs";
import path from "path";
import {
  prepareDocumentChunks,
  getContextFromChunks,
  PreparedChunk,
} from "../src/services/rag.service";
import {
  generateTriviaQuestionsWithAI,
  GeneratedTriviaQuestion,
} from "../src/services/ai-trivia-question.service";

// ── Config ────────────────────────────────────────────────────────────────────
const PDF_PATH      = "/Users/shakedcrissy/Desktop/Weight Loss Facts and Childhood Obesity.pdf";
const MIME_TYPE     = "application/pdf";
const CATEGORY      = "Childhood Obesity";
const SAFE_TOPIC    = CATEGORY;         // controller: safeTopic = safeCategory
const DIFFICULTY: "easy" | "medium" | "hard" = "medium";
const Q_PER_RUN     = 5;
const NUM_RUNS      = 5;

// ── Category-relevance rules ──────────────────────────────────────────────────
// RELEVANT: question explicitly concerns children, adolescents, childhood obesity,
//   child-specific nutrition/activity/health guidance, childhood-obesity risks,
//   or family-based childhood interventions.
// NOT RELEVANT: adult/general weight-loss, calorie deficits, BMI (adult classification),
//   Mediterranean diet, general walking/calorie, general hydration, etc.
//
// AMBIGUOUS flag: if the question could be interpreted either way, it is flagged
//   for manual review and NOT automatically counted as relevant.

type Relevance = "RELEVANT" | "GENERAL" | "AMBIGUOUS";

function classifyRelevance(q: GeneratedTriviaQuestion): Relevance {
  const combined = (q.question + " " + q.answers.join(" ") + " " + q.explanation).toLowerCase();

  // Hard relevant signals — child-specific concepts
  const relevantSignals = [
    "child",        // children, childhood, child's
    "adolescent",
    "school",
    "screen time",
    "pediatric",
    "youth",
    "family involvement",
    "family-based",
    "family based",
    "healthcare professional",
    "who recommends",
    "5 to 17",
    "5-17",
    "overweight or obese",  // in context of children
    "brain development",
    "normal growth",
    "active play",
  ];

  // Hard general signals — adult/general weight-loss concepts not tied to children
  const generalSignals = [
    "mediterranean diet",
    "intermittent fasting",
    "crash diet",
    "calorie deficit",
    "ghrelin",
    "leptin",
    "cortisol",
    "adults who",
    "seven hours per night",
    "aerobic exercise",
    "resistance training",
    "olive oil",
    "avocado",
    "walking for 30",
    "walking 30",
    "30 minutes",    // walking calorie burn fact
    "7,700 calories",
    "7700 calories",
  ];

  const hasRelevant = relevantSignals.some(s => combined.includes(s));
  const hasGeneral  = generalSignals.some(s => combined.includes(s));

  if (hasRelevant && !hasGeneral) return "RELEVANT";
  if (hasGeneral && !hasRelevant) return "GENERAL";
  if (!hasRelevant && !hasGeneral) {
    // Check for BMI without child context — BMI alone is GENERAL
    if (combined.includes("bmi") && !combined.includes("child")) return "GENERAL";
    return "AMBIGUOUS";
  }
  // Both signals present — flag as AMBIGUOUS for manual review
  return "AMBIGUOUS";
}

// ── Groundedness check ────────────────────────────────────────────────────────
// A question is GROUNDED if its correct answer text is directly supported
// by one of the retrieved chunks (case-insensitive substring or near-match).
// AMBIGUOUS: if the correct answer could be from training knowledge.

type Groundedness = "GROUNDED" | "UNGROUNDED" | "AMBIGUOUS";

function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function checkGroundedness(
  q: GeneratedTriviaQuestion,
  retrievedChunks: string[]
): { status: Groundedness; supportingChunkIndex: number | null; note: string } {
  const correctAnswer = q.answers[q.correctAnswerIndex];
  const normAnswer    = normalizeForMatch(correctAnswer);
  const normQuestion  = normalizeForMatch(q.question);
  const combinedNorm  = normalizeForMatch(q.question + " " + q.explanation);

  const allChunkText  = retrievedChunks.join(" ");
  const normChunks    = normalizeForMatch(allChunkText);

  // Check 1: correct answer text appears in any chunk
  if (normChunks.includes(normAnswer) && normAnswer.length > 3) {
    const chunkIdx = retrievedChunks.findIndex(c =>
      normalizeForMatch(c).includes(normAnswer)
    );
    return { status: "GROUNDED", supportingChunkIndex: chunkIdx + 1, note: "Correct answer found verbatim in context" };
  }

  // Check 2: key words from the explanation appear in chunks
  // Extract words longer than 5 chars from explanation, check 4+ appear in chunks
  const expWords = normalizeForMatch(q.explanation).split(" ").filter(w => w.length > 5);
  const matchCount = expWords.filter(w => normChunks.includes(w)).length;
  if (matchCount >= 4) {
    const chunkIdx = retrievedChunks.findIndex(c => {
      const nc = normalizeForMatch(c);
      return expWords.filter(w => nc.includes(w)).length >= 3;
    });
    return {
      status: "GROUNDED",
      supportingChunkIndex: chunkIdx >= 0 ? chunkIdx + 1 : null,
      note: `${matchCount} explanation keywords found in context`,
    };
  }

  // Check 3: if the question asks about a specific number/fact, look for it
  const numbers = correctAnswer.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    const numFound = numbers.some(n => normChunks.includes(n));
    if (numFound && matchCount >= 2) {
      const chunkIdx = retrievedChunks.findIndex(c =>
        numbers.some(n => normalizeForMatch(c).includes(n))
      );
      return {
        status: "AMBIGUOUS",
        supportingChunkIndex: chunkIdx >= 0 ? chunkIdx + 1 : null,
        note: `Number ${numbers[0]} found in context but insufficient text match — flag for manual review`,
      };
    }
  }

  // Could not find support in context
  return {
    status: "UNGROUNDED",
    supportingChunkIndex: null,
    note: `Correct answer not found in retrieved context (${matchCount} explanation words matched)`,
  };
}

// ── Structural validator ──────────────────────────────────────────────────────
function validateStructure(q: GeneratedTriviaQuestion): string | null {
  if (!q.question?.trim())                                   return "empty question";
  if (!Array.isArray(q.answers) || q.answers.length !== 4)  return `${q.answers?.length ?? 0} answers`;
  if (new Set(q.answers.map(a => a.trim().toLowerCase())).size !== 4) return "duplicate answers";
  if (typeof q.correctAnswerIndex !== "number" || q.correctAnswerIndex < 0 || q.correctAnswerIndex > 3)
    return `correctAnswerIndex=${q.correctAnswerIndex}`;
  if (!q.explanation?.trim())                                return "missing explanation";
  return null;
}

// ── Standard deviation ────────────────────────────────────────────────────────
function stddev(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length);
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface QuestionRecord {
  run: number;
  qNum: number;
  question: string;
  answers: string[];
  correctAnswerIndex: number;
  correctAnswer: string;
  explanation: string;
  structValid: boolean;
  structViolation: string | null;
  relevance: Relevance;
  groundedness: Groundedness;
  groundednessNote: string;
  supportingChunk: number | null;
}

interface RunRecord {
  run: number;
  success: boolean;
  retried: boolean;
  genMs: number;
  totalGenerated: number;
  structValid: number;
  relevant: number;
  grounded: number;
  ambiguousRelevance: number;
  ambiguousGroundedness: number;
  error: string | null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("=== ArenaX RAG 5-Run Sample Evaluation (PDF Production-Accurate) ===");
  console.log(`PDF        : ${PDF_PATH}`);
  console.log(`MIME type  : ${MIME_TYPE}`);
  console.log(`Category   : ${CATEGORY}`);
  console.log(`Topic      : ${SAFE_TOPIC}  (safeTopic = safeCategory, mirrors controller)`);
  console.log(`Difficulty : ${DIFFICULTY}`);
  console.log(`Per run    : ${Q_PER_RUN} questions`);
  console.log(`Runs       : ${NUM_RUNS}`);
  console.log(`Total      : ${NUM_RUNS * Q_PER_RUN} questions`);
  console.log(`Started    : ${new Date().toISOString()}\n`);

  // ── One-time: prepare chunks and retrieval ────────────────────────────────
  console.log("=== Setup: PDF Extraction + Embedding + Retrieval ===");
  const pdfBuffer = fs.readFileSync(PDF_PATH);
  console.log(`PDF size   : ${pdfBuffer.length} bytes`);

  const setupStart = Date.now();
  const preparedChunks = await prepareDocumentChunks(pdfBuffer, MIME_TYPE);
  const setupMs = Date.now() - setupStart;
  console.log(`Chunks     : ${preparedChunks.length}  (prepare time: ${setupMs} ms)`);
  preparedChunks.forEach((c, i) =>
    console.log(`  Chunk ${i + 1}: ${c.text.length} chars | "${c.text.slice(0, 70).replace(/\n/g, " ")}..."`)
  );

  const retrievedChunks = await getContextFromChunks(CATEGORY, preparedChunks);
  console.log(`\nRetrieved  : ${retrievedChunks.length} chunk(s) (query = "${CATEGORY}")`);
  retrievedChunks.forEach((text, i) =>
    console.log(`  CTX-${i + 1} (${text.length} chars): "${text.slice(0, 80).replace(/\n/g, " ")}..."`)
  );
  console.log();

  // ── 5 independent generation runs ────────────────────────────────────────
  const allQuestions: QuestionRecord[] = [];
  const runRecords:   RunRecord[]      = [];

  for (let run = 1; run <= NUM_RUNS; run++) {
    console.log(`${"=".repeat(60)}`);
    console.log(`Run ${run} / ${NUM_RUNS}`);
    console.log(`${"=".repeat(60)}`);

    let questions: GeneratedTriviaQuestion[] = [];
    let genError: string | null = null;
    let retried = false;

    const origErr = console.error.bind(console);
    (console as any).error = (...args: any[]) => {
      if (args.join(" ").includes("retrying")) retried = true;
      origErr(...args);
    };

    const genStart = Date.now();
    try {
      questions = await generateTriviaQuestionsWithAI({
        topic:         SAFE_TOPIC,
        category:      CATEGORY,
        difficulty:    DIFFICULTY,
        questionCount: Q_PER_RUN,
        context:       retrievedChunks,
      });
    } catch (err: any) {
      genError = err?.message ?? String(err);
    }
    const genMs = Date.now() - genStart;
    (console as any).error = origErr;

    console.log(`  success      : ${!genError}`);
    console.log(`  gen time     : ${genMs} ms`);
    console.log(`  retried      : ${retried}`);
    if (genError) {
      console.log(`  error        : ${genError}`);
      runRecords.push({ run, success: false, retried, genMs, totalGenerated: 0,
        structValid: 0, relevant: 0, grounded: 0, ambiguousRelevance: 0,
        ambiguousGroundedness: 0, error: genError });
      continue;
    }

    console.log(`  questions    : ${questions.length}`);
    console.log();

    let runStructValid = 0, runRelevant = 0, runGrounded = 0;
    let runAmbigRel = 0, runAmbigGnd = 0;

    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const structViolation = validateStructure(q);
      const structValid     = structViolation === null;
      const relevance       = classifyRelevance(q);
      const gnd             = checkGroundedness(q, retrievedChunks);

      if (structValid)                 runStructValid++;
      if (relevance === "RELEVANT")    runRelevant++;
      if (relevance === "AMBIGUOUS")   runAmbigRel++;
      if (gnd.status === "GROUNDED")   runGrounded++;
      if (gnd.status === "AMBIGUOUS")  runAmbigGnd++;

      const rec: QuestionRecord = {
        run,
        qNum: qi + 1,
        question: q.question,
        answers: q.answers,
        correctAnswerIndex: q.correctAnswerIndex,
        correctAnswer: q.answers[q.correctAnswerIndex],
        explanation: q.explanation,
        structValid,
        structViolation,
        relevance,
        groundedness: gnd.status,
        groundednessNote: gnd.note,
        supportingChunk: gnd.supportingChunkIndex,
      };
      allQuestions.push(rec);

      const relLabel = relevance === "RELEVANT" ? "[RELEVANT ]"
                     : relevance === "GENERAL"  ? "[GENERAL  ]"
                     :                            "[AMBIGUOUS]";
      const gndLabel = gnd.status === "GROUNDED"   ? "[GROUNDED  ]"
                     : gnd.status === "UNGROUNDED" ? "[UNGROUNDED]"
                     :                               "[AMBIGUOUS ]";

      console.log(`  Q${qi + 1} ${relLabel} ${gndLabel}`);
      console.log(`     Q: ${q.question}`);
      q.answers.forEach((a, ai) => {
        const m = ai === q.correctAnswerIndex ? "✓" : " ";
        console.log(`     ${m} [${ai}] ${a}`);
      });
      console.log(`     Exp: ${q.explanation}`);
      console.log(`     Struct: ${structValid ? "PASS" : "FAIL — " + structViolation}`);
      console.log(`     Relevance: ${relevance}`);
      console.log(`     Groundedness: ${gnd.status} | chunk=${gnd.supportingChunkIndex ?? "—"} | ${gnd.note}`);
      console.log();
    }

    runRecords.push({
      run, success: true, retried, genMs,
      totalGenerated: questions.length,
      structValid: runStructValid,
      relevant: runRelevant,
      grounded: runGrounded,
      ambiguousRelevance: runAmbigRel,
      ambiguousGroundedness: runAmbigGnd,
      error: null,
    });

    console.log(`  Run ${run} summary: ${runRelevant}/${questions.length} relevant | ${runGrounded}/${questions.length} grounded | ${runAmbigRel} ambiguous-relevance | ${runAmbigGnd} ambiguous-groundedness\n`);
  }

  // ── Aggregated statistics ─────────────────────────────────────────────────
  const successfulRuns    = runRecords.filter(r => r.success);
  const totalGenerated    = successfulRuns.reduce((s, r) => s + r.totalGenerated, 0);
  const totalStructValid  = successfulRuns.reduce((s, r) => s + r.structValid,    0);
  const totalRelevant     = successfulRuns.reduce((s, r) => s + r.relevant,       0);
  const totalGrounded     = successfulRuns.reduce((s, r) => s + r.grounded,       0);
  const totalAmbigRel     = successfulRuns.reduce((s, r) => s + r.ambiguousRelevance, 0);
  const totalAmbigGnd     = successfulRuns.reduce((s, r) => s + r.ambiguousGroundedness, 0);
  const totalRetried      = successfulRuns.filter(r => r.retried).length;
  const genTimes          = successfulRuns.map(r => r.genMs);

  const meanTime  = genTimes.reduce((a, b) => a + b, 0) / genTimes.length;
  const minTime   = Math.min(...genTimes);
  const maxTime   = Math.max(...genTimes);
  const sdTime    = stddev(genTimes);

  console.log("\n" + "=".repeat(70));
  console.log("FINAL RESULTS");
  console.log("=".repeat(70));

  // Table 1: Per-run summary
  console.log("\n── Table 1: Per-Run Results ─────────────────────────────────────────");
  console.log("Run | Success | Retried | GenMs  | Struct  | Relevant | Grounded | AmbRel | AmbGnd");
  console.log("────|─────────|─────────|────────|─────────|──────────|──────────|────────|────────");
  runRecords.forEach(r => {
    const sv  = r.success ? `${r.structValid}/${r.totalGenerated}` : "—";
    const rel = r.success ? `${r.relevant}/${r.totalGenerated}`    : "—";
    const gnd = r.success ? `${r.grounded}/${r.totalGenerated}`    : "—";
    console.log(
      ` ${r.run}  | ${r.success ? "YES    " : "NO     "} | ${r.retried ? "YES    " : "NO     "} | ${String(r.genMs).padStart(6)} | ${sv.padEnd(7)} | ${rel.padEnd(8)} | ${gnd.padEnd(8)} | ${String(r.ambiguousRelevance).padEnd(6)} | ${r.ambiguousGroundedness}`
    );
  });

  // Table 2: Consolidated metrics
  console.log("\n── Table 2: Consolidated Metrics ───────────────────────────────────");
  console.log(`Runs attempted                 : ${NUM_RUNS}`);
  console.log(`Runs succeeded                 : ${successfulRuns.length} / ${NUM_RUNS}  (${(successfulRuns.length/NUM_RUNS*100).toFixed(0)}%)`);
  console.log(`Total questions generated      : ${totalGenerated}`);
  console.log(`Structural validity            : ${totalStructValid} / ${totalGenerated}  (${(totalStructValid/totalGenerated*100).toFixed(1)}%)`);
  console.log(`Retry rate                     : ${totalRetried} / ${successfulRuns.length} runs  (${(totalRetried/successfulRuns.length*100).toFixed(0)}%)`);
  console.log(`Category Relevance Rate        : ${totalRelevant} / ${totalGenerated}  (${(totalRelevant/totalGenerated*100).toFixed(1)}%)  [excludes AMBIGUOUS]`);
  console.log(`  + AMBIGUOUS (flagged)        : ${totalAmbigRel} questions`);
  console.log(`  Upper bound (AMBIGUOUS→REL)  : ${totalRelevant + totalAmbigRel} / ${totalGenerated}  (${((totalRelevant+totalAmbigRel)/totalGenerated*100).toFixed(1)}%)`);
  console.log(`Groundedness Rate              : ${totalGrounded} / ${totalGenerated}  (${(totalGrounded/totalGenerated*100).toFixed(1)}%)  [excludes AMBIGUOUS]`);
  console.log(`  + AMBIGUOUS (flagged)        : ${totalAmbigGnd} questions`);
  console.log(`  Upper bound (AMBIGUOUS→GND)  : ${totalGrounded + totalAmbigGnd} / ${totalGenerated}  (${((totalGrounded+totalAmbigGnd)/totalGenerated*100).toFixed(1)}%)`);
  console.log(`Generation time — mean         : ${meanTime.toFixed(0)} ms`);
  console.log(`Generation time — min          : ${minTime} ms`);
  console.log(`Generation time — max          : ${maxTime} ms`);
  console.log(`Generation time — SD           : ${sdTime.toFixed(0)} ms`);

  // Table 3: Per-question classification
  console.log("\n── Table 3: Per-Question Classification (all 25 questions) ─────────");
  console.log("Run | Q# | Struct | Relevance  | Grounded   | Chunk | Question (truncated)");
  console.log("────|────|────────|────────────|────────────|───────|──────────────────────");
  allQuestions.forEach(r => {
    const struct = r.structValid ? "PASS" : "FAIL";
    const rel    = r.relevance.padEnd(10);
    const gnd    = r.groundedness.padEnd(10);
    const chunk  = String(r.supportingChunk ?? "—").padEnd(5);
    const qShort = r.question.slice(0, 45).replace(/\n/g, " ");
    console.log(` ${r.run}  |  ${r.qNum} | ${struct}   | ${rel} | ${gnd} | ${chunk} | ${qShort}...`);
  });

  // Category relevance per run (for variance observation)
  console.log("\n── Category Relevance Rate per Run ─────────────────────────────────");
  successfulRuns.forEach(r => {
    const rate = (r.relevant / r.totalGenerated * 100).toFixed(0);
    const bar  = "█".repeat(r.relevant) + "░".repeat(r.totalGenerated - r.relevant);
    console.log(`  Run ${r.run}: ${r.relevant}/${r.totalGenerated}  (${rate}%)  ${bar}`);
  });

  // Factual summary
  console.log("\n── Factual Summary ──────────────────────────────────────────────────");
  console.log(`The evaluation used the original PDF (68 824 bytes) processed through`);
  console.log(`pdf-parse, producing ${preparedChunks.length} chunks (one per page). All ${retrievedChunks.length} chunks were`);
  console.log(`retrieved (${retrievedChunks.length} < TOP_N_CHUNKS=5), giving the LLM access to the full document`);
  console.log(`including the childhood obesity section on pages 2–3.`);
  console.log();
  console.log(`Across ${successfulRuns.length} runs and ${totalGenerated} questions:`);
  console.log(`  Structural validity  : ${(totalStructValid/totalGenerated*100).toFixed(1)}%  (${totalStructValid}/${totalGenerated})`);
  console.log(`  Category relevance   : ${(totalRelevant/totalGenerated*100).toFixed(1)}%  (${totalRelevant}/${totalGenerated}, excluding ${totalAmbigRel} flagged as AMBIGUOUS)`);
  console.log(`  Groundedness         : ${(totalGrounded/totalGenerated*100).toFixed(1)}%  (${totalGrounded}/${totalGenerated}, excluding ${totalAmbigGnd} flagged as AMBIGUOUS)`);
  console.log(`  Retry rate           : ${(totalRetried/successfulRuns.length*100).toFixed(0)}%`);
  console.log(`  Mean gen time        : ${meanTime.toFixed(0)} ms  (SD ${sdTime.toFixed(0)} ms)`);
  console.log();
  console.log(`AMBIGUOUS questions require manual review before being counted.`);
  console.log(`The raw question text, correct answer, and supporting chunk reference`);
  console.log(`for all ${totalGenerated} questions are preserved in Table 3 above.`);
  console.log(`\nCompleted: ${new Date().toISOString()}`);
}

main().catch(err => {
  console.error("Sample evaluation failed:", err);
  process.exit(1);
});
