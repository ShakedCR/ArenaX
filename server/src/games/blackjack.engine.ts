/**
 * BlackjackEngine — wrapper מעל ספריית engine-blackjack
 *
 * הספריה engine-blackjack מנהלת משחק Blackjack רגיל (שחקן אחד מול דילר).
 * ה-wrapper הזה מאפשר לנהל טורניר עם מספר שחקנים:
 *  - כל שחקן מקבל Game instance משלו (משחק מול דילר בנפרד)
 *  - בכל סיבוב: כל שחקן מהמר, מקבל קלפים, ומחליט Hit/Stand/Double
 *  - אחרי שכולם סיימו: הדילר מגלה את קלפיו ומחשב תוצאות
 *  - המשחק נמשך TOTAL_ROUNDS סיבובים
 *  - מנצח מי שצבר הכי הרבה ז'טונים
 *
 * API של engine-blackjack:
 *   const game = new Game()
 *   game.dispatch(actions.deal({ bet: 100 }))   — חלוקת קלפים
 *   game.dispatch(actions.hit())                 — לקחת קלף
 *   game.dispatch(actions.stand())               — עמוד
 *   game.dispatch(actions.double())              — הכפלה
 *   game.dispatch(actions.showdown())            — גילוי קלפי הדילר
 *   game.getState()                              — מצב נוכחי
 *     .stage: "ready"|"player-turn-right"|"dealer-turn"|"done"
 *     .handInfo.right.cards                      — קלפי השחקן
 *     .dealerCards                               — קלפי הדילר
 *     .finalWin                                  — כמה השחקן זכה (שלילי = הפסד)
 */

import { Game, actions } from "engine-blackjack";
import {
  IGameEngine,
  BaseGameState,
  GamePlayer,
  GameResult
} from "./IGameEngine";

// ─── Constants ────────────────────────────────────────────────────────────────

/** מספר הסיבובים בכל משחק טורניר */
const TOTAL_ROUNDS = 5;

/** הימור קבוע לכל סיבוב (בז'טונים) */
const ROUND_BET = 100;

// ─── Types ────────────────────────────────────────────────────────────────────

/** קלף בודד */
export interface Card {
  text: string;   // "A", "2"–"10", "J", "Q", "K"
  suite: string;  // "hearts", "diamonds", "clubs", "spades"
  value: number;  // ערך מספרי (1–10)
  color: string;  // "R" | "B"
}

/** מצב הידיים של שחקן בסיבוב הנוכחי */
export interface PlayerHandState {
  playerId: string;
  cards: Card[];
  bet: number;
  stage: string;            // "player-turn-right" | "dealer-turn" | "done"
  playerValue: { hi: number; lo: number };
  playerHasBusted: boolean;
  playerHasBlackjack: boolean;
  availableActions: Record<string, boolean>;
  roundDelta: number;       // שינוי ז'טונים בסיבוב זה (חיובי = ניצחון)
}

/** מצב שחקן לאורך כל המשחק */
export interface PlayerTournamentState {
  playerId: string;
  tokens: number;           // ז'טונים נוכחיים
  currentHand: PlayerHandState | null;
  hasActed: boolean;        // האם כבר פעל בסיבוב הנוכחי?
  gameInstance: InstanceType<typeof Game>; // Game instance פרטי
}

/** מצב מלא של משחק Blackjack בטורניר */
export interface BlackjackGameState extends BaseGameState {
  currentRound: number;         // סיבוב נוכחי (1–TOTAL_ROUNDS)
  totalRounds: number;          // סה"כ סיבובים (= TOTAL_ROUNDS)
  dealerCards: Card[];          // קלפי הדילר הנוכחיים
  playerStates: PlayerTournamentState[]; // מצב כל שחקן
  roundActive: boolean;         // האם סיבוב פעיל כרגע?
}

/** פעולה אפשרית של שחקן */
export type BlackjackMove = "hit" | "stand" | "double";

// ─── Engine ───────────────────────────────────────────────────────────────────

export class BlackjackEngine
  implements IGameEngine<BlackjackGameState, BlackjackMove>
{
  /**
   * מפת כל המשחקים הפעילים: gameId → BlackjackGameState
   * שמורה ב-memory של השרת (עבור production רצוי להשתמש ב-Redis)
   */
  private games: Map<string, BlackjackGameState> = new Map();

  // ── createGame ──────────────────────────────────────────────────────────────

  /**
   * יוצר משחק Blackjack חדש עבור קבוצת שחקנים.
   * כל שחקן מקבל 1000 ז'טונים התחלתיים ו-Game instance משלו.
   */
  createGame(gameId: string, players: GamePlayer[]): BlackjackGameState {
    if (players.length < 2) {
      throw new Error("Blackjack requires at least 2 players");
    }

    // יצירת מצב ראשוני לכל שחקן
    const playerStates: PlayerTournamentState[] = players.map((p) => ({
      playerId: p.id,
      tokens: 1000,                // ז'טונים התחלתיים לכל שחקן
      currentHand: null,
      hasActed: false,
      gameInstance: new Game(),    // כל שחקן מקבל Game משלו מול הדילר
    }));

    const state: BlackjackGameState = {
      gameId,
      players,
      currentRound: 0,        // יתעדכן כשהסיבוב הראשון יתחיל
      totalRounds: TOTAL_ROUNDS,
      dealerCards: [],
      playerStates,
      roundActive: false,
      isOver: false,
      result: null,
      createdAt: new Date(),
    };

    this.games.set(gameId, state);
    return state;
  }

  // ── startRound ──────────────────────────────────────────────────────────────

  /**
   * מתחיל סיבוב חדש: מחלק קלפים לכל שחקן.
   * קורא ל-deal() על כל Game instance — כל שחקן מקבל 2 קלפים.
   */
  startRound(gameId: string): BlackjackGameState {
    const state = this.getState(gameId);

    if (state.isOver) throw new Error("Game is already over");

    state.currentRound += 1;
    state.roundActive = true;
    state.dealerCards = [];

    // חלוקת קלפים לכל שחקן בנפרד
    for (const ps of state.playerStates) {
      const bet = Math.min(ROUND_BET, ps.tokens); // לא ניתן להמר יותר ממה שיש
      if (bet <= 0) {
        // שחקן ללא ז'טונים — דלג עליו
        ps.hasActed = true;
        ps.currentHand = null;
        continue;
      }

      // dispatch deal מתחיל סיבוב חדש בתוך ה-Game instance
      ps.gameInstance.dispatch(actions.deal({ bet }));

      const engineState = ps.gameInstance.getState();
      const hand = engineState.handInfo.right; // ספריית engine-blackjack משתמשת ב-"right" כברירת מחדל

      ps.currentHand = {
        playerId: ps.playerId,
        cards: hand.cards,
        bet: hand.bet,
        stage: engineState.stage,
        playerValue: hand.playerValue,
        playerHasBusted: hand.playerHasBusted,
        playerHasBlackjack: hand.playerHasBlackjack,
        availableActions: hand.availableActions,
        roundDelta: 0,
      };
      ps.hasActed = false;

      // שמירת קלפי הדילר — כל שחקן מקבל אותם דילר (מספיק לשמור מהאחרון)
      state.dealerCards = engineState.dealerCards;
    }

    this.games.set(gameId, state);
    return state;
  }

  // ── makeMove ────────────────────────────────────────────────────────────────

  /**
   * מבצע פעולה של שחקן: hit / stand / double.
   * אחרי שכל השחקנים פעלו → מפעיל showdown() אוטומטית.
   */
  makeMove(
    gameId: string,
    playerId: string,
    move: BlackjackMove
  ): BlackjackGameState {
    const state = this.getState(gameId);

    if (!state.roundActive) throw new Error("No active round");

    const ps = state.playerStates.find((p) => p.playerId === playerId);
    if (!ps) throw new Error(`Player ${playerId} not found in game`);
    if (ps.hasActed) throw new Error(`Player ${playerId} already acted this round`);
    if (!ps.currentHand) throw new Error(`Player ${playerId} has no active hand`);

    // מיפוי פעולת השחקן לפעולת ה-engine
    const actionMap: Record<BlackjackMove, () => void> = {
      hit: () => ps.gameInstance.dispatch(actions.hit()),
      stand: () => ps.gameInstance.dispatch(actions.stand()),
      double: () => ps.gameInstance.dispatch(actions.double()),
    };
    actionMap[move]();

    const engineState = ps.gameInstance.getState();
    const hand = engineState.handInfo.right;

    // עדכון מצב הידיים
    ps.currentHand.cards = hand.cards;
    ps.currentHand.stage = engineState.stage;
    ps.currentHand.playerValue = hand.playerValue;
    ps.currentHand.playerHasBusted = hand.playerHasBusted;
    ps.currentHand.availableActions = hand.availableActions;

    // אם השחקן עבר (bust) או stand — סמן כ"פעל"
    if (move === "stand" || move === "double" || hand.playerHasBusted) {
      ps.hasActed = true;
    }

    this.games.set(gameId, state);

    // בדוק אם כל השחקנים פעלו → הפעל showdown אוטומטי
    const allActed = state.playerStates.every((p) => p.hasActed || !p.currentHand);
    if (allActed) {
      return this.resolveRound(gameId);
    }

    return state;
  }

  // ── resolveRound ────────────────────────────────────────────────────────────

  /**
   * גמר את הסיבוב: חושב תוצאות לכל שחקן ומעדכן ז'טונים.
   * קורא ל-showdown() על כל Game instance.
   */
  resolveRound(gameId: string): BlackjackGameState {
    const state = this.getState(gameId);

    for (const ps of state.playerStates) {
      if (!ps.currentHand) continue;

      // showdown — מגלה את קלפי הדילר ומחשב תוצאה
      ps.gameInstance.dispatch(actions.showdown());

      const engineState = ps.gameInstance.getState();

      // finalWin = רווח נקי (שלילי = הפסד, 0 = החזרת ההימור, חיובי = ניצחון)
      const delta = engineState.finalWin;

      ps.currentHand.roundDelta = delta;
      ps.tokens = Math.max(0, ps.tokens + delta);   // ז'טונים לא יורדים מתחת לאפס
      ps.hasActed = true;

      // שמירת קלפי הדילר הסופיים
      state.dealerCards = engineState.dealerCards;
    }

    state.roundActive = false;

    // בדוק אם המשחק כולו הסתיים
    if (state.currentRound >= TOTAL_ROUNDS) {
      this.finalizeGame(gameId);
    }

    this.games.set(gameId, state);
    return state;
  }

  // ── finalizeGame ─────────────────────────────────────────────────────────────

  /**
   * מסיים את המשחק: קובע מנצח לפי מי שיש לו הכי הרבה ז'טונים.
   */
  private finalizeGame(gameId: string): void {
    const state = this.getState(gameId);

    // מיין שחקנים לפי ז'טונים (יורד)
    const sorted = [...state.playerStates].sort((a, b) => b.tokens - a.tokens);
    const winner = sorted[0];

    state.isOver = true;
    state.result = {
      winnerId: winner.tokens > 0 ? winner.playerId : null,
      outcome: "win",
      reason: "rounds-complete",
    };

    this.games.set(gameId, state);
  }

  // ── getState ────────────────────────────────────────────────────────────────

  /** מחזיר את מצב המשחק הנוכחי */
  getState(gameId: string): BlackjackGameState {
    const state = this.games.get(gameId);
    if (!state) throw new Error(`Game ${gameId} not found`);
    return state;
  }

  // ── isGameOver ──────────────────────────────────────────────────────────────

  isGameOver(gameId: string): boolean {
    return this.getState(gameId).isOver;
  }

  // ── getResult ───────────────────────────────────────────────────────────────

  getResult(gameId: string): GameResult | null {
    return this.getState(gameId).result;
  }

  // ── handleTimeout ────────────────────────────────────────────────────────────

  /**
   * מטפל בשחקן שלא הגיב תוך הזמן הקצוב (60 שניות).
   * מבצע אוטומטית "stand" בשמו.
   */
  handleTimeout(gameId: string, playerId: string): BlackjackGameState {
    const state = this.getState(gameId);
    const ps = state.playerStates.find((p) => p.playerId === playerId);

    if (!ps || ps.hasActed) return state; // כבר פעל — לא צריך לטפל

    return this.makeMove(gameId, playerId, "stand");
  }

  // ── getLeaderboard ────────────────────────────────────────────────────────────

  /**
   * מחזיר את הדירוג הנוכחי של השחקנים לפי ז'טונים
   */
  getLeaderboard(gameId: string): { playerId: string; tokens: number; rank: number }[] {
    const state = this.getState(gameId);
    return [...state.playerStates]
      .sort((a, b) => b.tokens - a.tokens)
      .map((ps, index) => ({
        playerId: ps.playerId,
        tokens: ps.tokens,
        rank: index + 1,
      }));
  }
}

// Singleton — instance אחד משותף לכל ה-Socket.io handlers
export const blackjackEngine = new BlackjackEngine();
