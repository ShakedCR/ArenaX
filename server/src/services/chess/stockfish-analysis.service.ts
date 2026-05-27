import { Chess } from "chess.js";

type StockfishEvaluation = {
  bestMove: string;
  evaluation: string;
  fen: string;
  depth: number;
};

const createStockfishEngine = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Stockfish = require("stockfish");
  return Stockfish();
};

const applyMove = (chess: Chess, move: string): void => {
  const cleanMove = move.trim();

  // UCI format: e2e4 / e7e8q
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

  // SAN format: e4 / Nf3 / O-O
  const result = chess.move(cleanMove);

  if (!result) {
    throw new Error(`Invalid chess move: ${move}`);
  }
};

const buildFenFromMoves = (moves: string[]): string => {
  const chess = new Chess();

  for (const move of moves) {
    applyMove(chess, move);
  }

  return chess.fen();
};

const parseEvaluation = (line: string): string | null => {
  const cpMatch = line.match(/score cp (-?\d+)/);

  if (cpMatch) {
    const value = Number(cpMatch[1]) / 100;
    return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
  }

  const mateMatch = line.match(/score mate (-?\d+)/);

  if (mateMatch) {
    return `Mate in ${mateMatch[1]}`;
  }

  return null;
};

const parseDepth = (line: string): number | null => {
  const depthMatch = line.match(/depth (\d+)/);
  return depthMatch ? Number(depthMatch[1]) : null;
};

export const analyzeChessPositionWithStockfish = async (
  moves: string[],
  depth = 10
): Promise<StockfishEvaluation> => {
  const fen = buildFenFromMoves(moves);

  return new Promise((resolve, reject) => {
    const engine = createStockfishEngine();

    let bestMove = "";
    let evaluation = "0.00";
    let lastDepth = 0;

    const timeout = setTimeout(() => {
      try {
        engine.postMessage("quit");
      } catch {
        // ignore
      }

      reject(new Error("Stockfish analysis timeout"));
    }, 15000);

    engine.onmessage = (event: string | { data: string }) => {
      const line = typeof event === "string" ? event : event.data;

      if (line.includes("score")) {
        const parsedEvaluation = parseEvaluation(line);
        const parsedDepth = parseDepth(line);

        if (parsedEvaluation) {
          evaluation = parsedEvaluation;
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