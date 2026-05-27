import { Chess } from "chess.js";

export type MoveClassification =
  | "best"
  | "excellent"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export type ChessMoveAnalysis = {
  moveNumber: number;
  ply: number;
  playerColor: "white" | "black";
  playedMove: string;
  bestMove: string;
  evaluationBefore: string;
  evaluationAfter: string;
  centipawnLoss: number;
  classification: MoveClassification;
  comment: string;
};

export type StockfishGameAnalysis = {
  bestMove: string;
  evaluation: string;
  fen: string;
  depth: number;
  accuracyWhite: number;
  accuracyBlack: number;
  mistakes: string[];
  blunders: string[];
  totalMistakes: number;
  totalBlunders: number;
  moveClassifications: ChessMoveAnalysis[];
};

type StockfishPositionAnalysis = {
  bestMove: string;
  evaluation: string;
  evaluationCp: number;
  fen: string;
  depth: number;
};

const createStockfishEngine = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Stockfish = require("stockfish");
  return Stockfish();
};

const parseEvaluation = (line: string): { text: string; cp: number } | null => {
  const cpMatch = line.match(/score cp (-?\d+)/);

  if (cpMatch) {
    const cp = Number(cpMatch[1]);
    const pawns = cp / 100;

    return {
      text: pawns > 0 ? `+${pawns.toFixed(2)}` : pawns.toFixed(2),
      cp
    };
  }

  const mateMatch = line.match(/score mate (-?\d+)/);

  if (mateMatch) {
    const mate = Number(mateMatch[1]);

    return {
      text: `Mate in ${mate}`,
      cp: mate > 0 ? 100000 : -100000
    };
  }

  return null;
};

const parseDepth = (line: string): number | null => {
  const depthMatch = line.match(/depth (\d+)/);
  return depthMatch ? Number(depthMatch[1]) : null;
};

export const analyzeChessPositionWithStockfish = async (
  fen: string,
  depth = 10
): Promise<StockfishPositionAnalysis> => {
  return new Promise((resolve, reject) => {
    const engine = createStockfishEngine();

    let bestMove = "";
    let evaluation = "0.00";
    let evaluationCp = 0;
    let lastDepth = 0;

    const timeout = setTimeout(() => {
      try {
        engine.postMessage("quit");
      } catch {
        // ignore
      }

      reject(new Error("Stockfish analysis timeout"));
    }, 20000);

    engine.onmessage = (event: string | { data: string }) => {
      const line = typeof event === "string" ? event : event.data;

      if (line.includes("score")) {
        const parsedEvaluation = parseEvaluation(line);
        const parsedDepth = parseDepth(line);

        if (parsedEvaluation) {
          evaluation = parsedEvaluation.text;
          evaluationCp = parsedEvaluation.cp;
        }

        if (parsedDepth) {
          lastDepth = parsedDepth;
        }
      }

      if (line.startsWith("bestmove")) {
        clearTimeout(timeout);
        bestMove = line.split(" ")[1] || "";

        try {
          engine.postMessage("quit");
        } catch {
          // ignore
        }

        resolve({
          bestMove,
          evaluation,
          evaluationCp,
          fen,
          depth: lastDepth
        });
      }
    };

    engine.postMessage("uci");
    engine.postMessage("isready");
    engine.postMessage(`position fen ${fen}`);
    engine.postMessage(`go depth ${depth}`);
  });
};

const applyMove = (chess: Chess, move: string): void => {
  const cleanMove = move.trim();

  if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(cleanMove)) {
    const result = chess.move({
      from: cleanMove.slice(0, 2),
      to: cleanMove.slice(2, 4),
      promotion: cleanMove[4] || "q"
    });

    if (!result) {
      throw new Error(`Invalid chess move: ${move}`);
    }

    return;
  }

  const result = chess.move(cleanMove);

  if (!result) {
    throw new Error(`Invalid chess move: ${move}`);
  }
};

const classifyMove = (centipawnLoss: number): MoveClassification => {
  if (centipawnLoss <= 10) return "best";
  if (centipawnLoss <= 25) return "excellent";
  if (centipawnLoss <= 50) return "good";
  if (centipawnLoss <= 100) return "inaccuracy";
  if (centipawnLoss <= 200) return "mistake";
  return "blunder";
};

const buildMoveComment = (
  classification: MoveClassification,
  playedMove: string,
  bestMove: string
): string => {
  if (classification === "best") {
    return `Best move. ${playedMove} matched the engine recommendation.`;
  }

  if (classification === "excellent") {
    return `Excellent move. ${playedMove} was very close to the best engine move.`;
  }

  if (classification === "good") {
    return `Good move. ${playedMove} kept the position stable.`;
  }

  if (classification === "inaccuracy") {
    return `Inaccuracy. Consider ${bestMove} instead of ${playedMove}.`;
  }

  if (classification === "mistake") {
    return `Mistake. ${playedMove} lost some advantage. Better was ${bestMove}.`;
  }

  return `Blunder. ${playedMove} caused a major drop. Best move was ${bestMove}.`;
};

const calculateMoveAccuracy = (centipawnLoss: number): number => {
  return Math.max(0, Math.round(100 - centipawnLoss / 3));
};

export const analyzeChessGameWithStockfish = async (
  moves: string[],
  depth = 8
): Promise<StockfishGameAnalysis> => {
  const chess = new Chess();
  const cache = new Map<string, StockfishPositionAnalysis>();

  const getAnalysis = async (fen: string) => {
    if (!cache.has(fen)) {
      const analysis = await analyzeChessPositionWithStockfish(fen, depth);
      cache.set(fen, analysis);
    }

    return cache.get(fen)!;
  };

  const moveClassifications: ChessMoveAnalysis[] = [];
  const whiteAccuracies: number[] = [];
  const blackAccuracies: number[] = [];

  for (let i = 0; i < moves.length; i++) {
    const playedMove = moves[i];
    const fenBefore = chess.fen();
    const playerColor = chess.turn() === "w" ? "white" : "black";
    const moveNumber = Math.floor(i / 2) + 1;

    const beforeAnalysis = await getAnalysis(fenBefore);

    applyMove(chess, playedMove);

    const fenAfter = chess.fen();
    const afterAnalysis = await getAnalysis(fenAfter);

    const evaluationForMoverBefore = beforeAnalysis.evaluationCp;
    const evaluationForMoverAfter = -afterAnalysis.evaluationCp;

    const centipawnLoss = Math.max(
      0,
      evaluationForMoverBefore - evaluationForMoverAfter
    );

    const classification = classifyMove(centipawnLoss);
    const moveAccuracy = calculateMoveAccuracy(centipawnLoss);

    if (playerColor === "white") {
      whiteAccuracies.push(moveAccuracy);
    } else {
      blackAccuracies.push(moveAccuracy);
    }

    moveClassifications.push({
      moveNumber,
      ply: i + 1,
      playerColor,
      playedMove,
      bestMove: beforeAnalysis.bestMove,
      evaluationBefore: beforeAnalysis.evaluation,
      evaluationAfter: afterAnalysis.evaluation,
      centipawnLoss,
      classification,
      comment: buildMoveComment(
        classification,
        playedMove,
        beforeAnalysis.bestMove
      )
    });
  }

  const finalFen = chess.fen();
  const finalAnalysis = await getAnalysis(finalFen);

  const mistakes = moveClassifications
    .filter((move) => move.classification === "mistake")
    .map((move) => `Move ${move.moveNumber}: ${move.comment}`);

  const blunders = moveClassifications
    .filter((move) => move.classification === "blunder")
    .map((move) => `Move ${move.moveNumber}: ${move.comment}`);

  const average = (values: number[]) => {
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  };

  return {
    bestMove: finalAnalysis.bestMove,
    evaluation: finalAnalysis.evaluation,
    fen: finalFen,
    depth: finalAnalysis.depth,
    accuracyWhite: average(whiteAccuracies),
    accuracyBlack: average(blackAccuracies),
    mistakes,
    blunders,
    totalMistakes: mistakes.length,
    totalBlunders: blunders.length,
    moveClassifications
  };
};