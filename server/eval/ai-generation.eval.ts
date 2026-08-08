/**
 * eval/ai-generation.eval.ts
 *
 * Stage 2 evaluation script — AI-1, AI-2, AI-3, AI-4.
 * Calls generateTriviaQuestionsWithAI directly; no HTTP server or auth needed.
 * Run:  npx ts-node --project tsconfig.json eval/ai-generation.eval.ts
 */

import { generateTriviaQuestionsWithAI, GeneratedTriviaQuestion } from "../src/services/ai-trivia-question.service";

// ── Structural validator (mirrors production normalizeQuestion logic) ───────────

function validateStructure(questions: GeneratedTriviaQuestion[]): {
  passed: number;
  failed: number;
  violations: string[];
} {
  const violations: string[] = [];
  let failed = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const prefix = `Q${i + 1}`;

    if (!q.question || q.question.trim() === "") {
      violations.push(`${prefix}: empty question`); failed++; continue;
    }
    if (!Array.isArray(q.answers) || q.answers.length !== 4) {
      violations.push(`${prefix}: ${q.answers?.length ?? 0} answers (need 4)`); failed++; continue;
    }
    const uniq = new Set(q.answers.map(a => a.trim().toLowerCase()));
    if (uniq.size !== 4) {
      violations.push(`${prefix}: duplicate answers`); failed++; continue;
    }
    if (typeof q.correctAnswerIndex !== "number" || q.correctAnswerIndex < 0 || q.correctAnswerIndex > 3) {
      violations.push(`${prefix}: correctAnswerIndex=${q.correctAnswerIndex} out of range`); failed++; continue;
    }
    if (!q.explanation || q.explanation.trim() === "") {
      violations.push(`${prefix}: missing explanation`); failed++;
    }
  }

  return { passed: questions.length - failed, failed, violations };
}

// ── Run configuration ──────────────────────────────────────────────────────────

const RUNS: Array<{ topic: string; category: string; difficulty: "easy" | "medium" | "hard"; questionCount: number }> = [
  { topic: "Science", category: "Science", difficulty: "easy",   questionCount: 5  },
  { topic: "Science", category: "Science", difficulty: "medium", questionCount: 5  },
  { topic: "Science", category: "Science", difficulty: "hard",   questionCount: 5  },
  { topic: "History", category: "History", difficulty: "medium", questionCount: 5  },
  { topic: "History", category: "History", difficulty: "hard",   questionCount: 5  },
  { topic: "Technology", category: "Technology", difficulty: "medium", questionCount: 10 },
];

// ── Statistics helper ──────────────────────────────────────────────────────────

function stats(values: number[]): { mean: number; min: number; max: number; sd: number } {
  const n = values.length;
  if (n === 0) return { mean: 0, min: 0, max: 0, sd: 0 };
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
  return { mean: +mean.toFixed(0), min: Math.min(...values), max: Math.max(...values), sd: +sd.toFixed(0) };
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Stage 2 — AI Generation Evaluation ===");
  console.log(`Runs: ${RUNS.length} | Started: ${new Date().toISOString()}\n`);

  const results: Array<{
    run: number;
    topic: string;
    difficulty: string;
    questionCount: number;
    success: boolean;
    returned: number;
    ollamaMs: number | null;
    retried: boolean;
    structPassed: number;
    structFailed: number;
    violations: string[];
    errorMsg: string | null;
  }> = [];

  for (let i = 0; i < RUNS.length; i++) {
    const cfg = RUNS[i];
    console.log(`--- Run ${i + 1}/${RUNS.length}: ${cfg.topic} / ${cfg.difficulty} / ${cfg.questionCount}q ---`);

    // Capture stdout lines emitted by [EVAL-TEMP] instrumentation
    const capturedLines: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    (process.stdout as any).write = (chunk: any, ...args: any[]) => {
      const str = typeof chunk === "string" ? chunk : chunk.toString();
      capturedLines.push(str);
      return origWrite(chunk, ...args);
    };

    let questions: GeneratedTriviaQuestion[] = [];
    let success = false;
    let errorMsg: string | null = null;
    const wallStart = Date.now();

    try {
      questions = await generateTriviaQuestionsWithAI(cfg);
      success = true;
    } catch (err: any) {
      errorMsg = err?.message ?? String(err);
      console.error(`  ERROR: ${errorMsg}`);
    }

    const wallMs = Date.now() - wallStart;

    // Restore stdout
    (process.stdout as any).write = origWrite;

    // Parse instrumentation output
    const evalLines = capturedLines.join("").split("\n").filter(l => l.includes("[EVAL]"));
    const ollamaMatches = evalLines.filter(l => l.includes("ollama_ms="));
    const ollamaMs = ollamaMatches.length > 0
      ? ollamaMatches.reduce((s, l) => {
          const m = l.match(/ollama_ms=(\d+)/);
          return s + (m ? parseInt(m[1]) : 0);
        }, 0)
      : null;

    const retried = capturedLines.join("").includes("AI trivia generation failed, retrying");

    const validation = success ? validateStructure(questions) : { passed: 0, failed: 0, violations: [] };

    const row = {
      run: i + 1,
      topic: cfg.topic,
      difficulty: cfg.difficulty,
      questionCount: cfg.questionCount,
      success,
      returned: questions.length,
      ollamaMs: ollamaMs !== null ? ollamaMs : (success ? wallMs : null),
      retried,
      structPassed: validation.passed,
      structFailed: validation.failed,
      violations: validation.violations,
      errorMsg,
    };
    results.push(row);

    console.log(`  success=${success}  returned=${questions.length}/${cfg.questionCount}  ollama_ms=${ollamaMs ?? "n/a"}  retried=${retried}`);
    if (validation.violations.length > 0) {
      console.log(`  violations: ${validation.violations.join("; ")}`);
    }
    console.log();
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  console.log("=== RESULTS SUMMARY ===\n");

  const successRuns = results.filter(r => r.success);
  const failRuns = results.filter(r => !r.success);
  const retriedRuns = results.filter(r => r.retried);

  console.log("AI-1 Generation Success Rate");
  console.log(`  Total runs: ${results.length}`);
  console.log(`  Succeeded:  ${successRuns.length} / ${results.length}`);
  console.log(`  Failed:     ${failRuns.length} / ${results.length}`);
  if (failRuns.length > 0) {
    failRuns.forEach(r => console.log(`    Run ${r.run} error: ${r.errorMsg}`));
  }

  console.log("\nAI-2 Structural Validity (of successful runs)");
  const totalQExpected = successRuns.reduce((s, r) => s + r.questionCount, 0);
  const totalQReturned = successRuns.reduce((s, r) => s + r.returned, 0);
  const totalQPassed   = successRuns.reduce((s, r) => s + r.structPassed, 0);
  const totalQFailed   = successRuns.reduce((s, r) => s + r.structFailed, 0);
  console.log(`  Questions expected:  ${totalQExpected}`);
  console.log(`  Questions returned:  ${totalQReturned}`);
  console.log(`  Structurally valid:  ${totalQPassed} / ${totalQReturned}`);
  console.log(`  Structural failures: ${totalQFailed}`);
  const allViolations = successRuns.flatMap(r => r.violations);
  if (allViolations.length > 0) {
    console.log(`  Violations: ${allViolations.join("; ")}`);
  }

  console.log("\nAI-3 Generation Time (no document)");
  const validTimes = successRuns.map(r => r.ollamaMs).filter(t => t !== null) as number[];
  if (validTimes.length > 0) {
    const s = stats(validTimes);
    console.log(`  Runs with timing: ${validTimes.length}`);
    console.log(`  Raw values (ms):  ${validTimes.join(", ")}`);
    console.log(`  Mean: ${s.mean} ms  Min: ${s.min} ms  Max: ${s.max} ms  SD: ${s.sd} ms`);
  } else {
    console.log("  No timing data captured.");
  }

  console.log("\nAI-4 Retry Frequency");
  console.log(`  Runs that triggered retry: ${retriedRuns.length} / ${results.length}`);
  if (retriedRuns.length > 0) {
    retriedRuns.forEach(r => console.log(`    Run ${r.run}: ${r.topic}/${r.difficulty}`));
  }

  console.log("\n=== RAW TABLE ===");
  console.log("run | topic      | diff   | nQ | ok | returned | ms     | retry | valid | violations");
  results.forEach(r => {
    console.log(
      `${String(r.run).padStart(3)} | ${r.topic.padEnd(10)} | ${r.difficulty.padEnd(6)} | ${String(r.questionCount).padStart(2)} | ` +
      `${r.success ? "Y" : "N"}  | ${String(r.returned).padStart(8)} | ` +
      `${r.ollamaMs !== null ? String(r.ollamaMs).padStart(6) : "   n/a"} | ` +
      `${r.retried ? "Y" : "N"}     | ` +
      `${String(r.structPassed).padStart(5)} | ` +
      `${r.violations.length > 0 ? r.violations.join("; ") : "none"}`
    );
  });

  console.log(`\nCompleted: ${new Date().toISOString()}`);
}

main().catch(err => {
  console.error("Evaluation script failed:", err);
  process.exit(1);
});
