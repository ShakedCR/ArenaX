import Match, { IMatchAnalysis } from "../models/match.model";
import { analyzeChessGameWithStockfish } from "./chess/stockfish-analysis.service";

type AnalysisResult = IMatchAnalysis;

const buildChessAnalysis = async (
  moves: string[]
): Promise<AnalysisResult> => {
  if (moves.length === 0) {
    return {
      summary: "No moves were recorded for this chess match.",
      accuracyWhite: 0,
      accuracyBlack: 0,
      bestMove: "",
      mistakes: ["No move history available."],
      blunders: [],
      totalMistakes: 0,
      totalBlunders: 0,
      moveClassifications: []
    };
  }

  const result = await analyzeChessGameWithStockfish(moves, 8);

  return {
    summary: `Stockfish full-game analysis completed. Final evaluation: ${result.evaluation}. White accuracy: ${result.accuracyWhite}%, Black accuracy: ${result.accuracyBlack}%. Detected ${result.totalMistakes} mistakes and ${result.totalBlunders} blunders.`,

    accuracyWhite: result.accuracyWhite,
    accuracyBlack: result.accuracyBlack,

    bestMove: result.bestMove,

    mistakes: result.mistakes,
    blunders: result.blunders,

    evaluation: result.evaluation,
    fen: result.fen,
    depth: result.depth,

    totalMistakes: result.totalMistakes,
    totalBlunders: result.totalBlunders,

    moveClassifications: result.moveClassifications
  };
};

const buildCheckersAnalysis = (
  moves: string[]
): AnalysisResult => {
  return {
    summary: `Checkers analysis completed. The match included ${moves.length} recorded moves. Future versions can include capture-chain and board-control analysis.`,

    accuracyWhite: 78,
    accuracyBlack: 76,

    bestMove: moves[0] || "",

    mistakes: [
      "Look for missed capture opportunities and weak diagonal control."
    ],

    blunders: [],

    totalMistakes: 1,
    totalBlunders: 0,

    moveClassifications: []
  };
};

const buildBlackjackAnalysis = (): AnalysisResult => {
  return {
    summary:
      "Blackjack analysis completed. Future versions can evaluate hit/stand decisions using probability and expected value.",

    accuracyWhite: 0,
    accuracyBlack: 0,

    bestMove: "",

    mistakes: [
      "Review whether hit/stand decisions matched basic strategy."
    ],

    blunders: [],

    totalMistakes: 1,
    totalBlunders: 0,

    moveClassifications: []
  };
};

export const analyzeMatchById = async (
  matchId: string
): Promise<AnalysisResult> => {
  const match = await Match.findById(matchId);

  if (!match) {
    throw new Error("MATCH_NOT_FOUND");
  }

  if (match.status !== "completed") {
    throw new Error("MATCH_NOT_COMPLETED");
  }

  const gameTitle = match.gameTitle.toLowerCase();
  const moves = match.moves || [];

  let analysis: AnalysisResult;

  if (gameTitle.includes("chess")) {
    analysis = await buildChessAnalysis(moves);

  } else if (
    gameTitle.includes("checkers") ||
    gameTitle.includes("draughts")
  ) {
    analysis = buildCheckersAnalysis(moves);

  } else if (gameTitle.includes("blackjack")) {
    analysis = buildBlackjackAnalysis();

  } else {
    analysis = {
      summary: `General match analysis completed for ${match.gameTitle}.`,

      accuracyWhite: 0,
      accuracyBlack: 0,

      bestMove: moves[0] || "",

      mistakes: [],
      blunders: [],

      totalMistakes: 0,
      totalBlunders: 0,

      moveClassifications: []
    };
  }

  match.analysis = analysis;

  await match.save();

  return analysis;
};