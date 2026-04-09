/**
 * IGameEngine — ממשק אחיד לכל מנועי המשחק בפלטפורמה
 *
 * כל משחק (Blackjack, Chess, Checkers) חייב לממש את ה-interface הזה.
 * כך, קוד ה-Socket.io וניהול הטורניר יכולים לעבוד עם כל משחק
 * בלי לדעת את הפרטים הפנימיים שלו.
 *
 * עקרון: פולימורפיזם — "אל תדע מי אתה, דע מה אתה עושה"
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * מייצג שחקן במשחק
 */
export interface GamePlayer {
  id: string;       // ObjectId של המשתמש ב-MongoDB
  name: string;     // שם תצוגה
}

/**
 * תוצאה אפשרית של משחק
 */
export type GameOutcome = "win" | "loss" | "draw";

/**
 * מידע על תוצאת המשחק
 */
export interface GameResult {
  winnerId: string | null;  // null במקרה של תיקו
  outcome: GameOutcome;
  reason?: string;          // "checkmate" | "timeout" | "surrender" | "rounds-complete" וכו'
}

/**
 * מצב המשחק — כל engine מרחיב type זה לפי הצורך
 */
export interface BaseGameState {
  gameId: string;           // מזהה ייחודי לסשן המשחק
  players: GamePlayer[];    // רשימת השחקנים
  isOver: boolean;          // האם המשחק הסתיים?
  result: GameResult | null; // התוצאה (null אם המשחק עדיין פעיל)
  createdAt: Date;
}

// ─── Interface ────────────────────────────────────────────────────────────────

/**
 * כל מנוע משחק חייב לממש את הפונקציות הבאות:
 *
 * createGame  — יצירת משחק חדש עם שחקנים
 * makeMove    — ביצוע מהלך / פעולה של שחקן
 * getState    — קבלת מצב המשחק הנוכחי
 * isGameOver  — האם המשחק הסתיים?
 * getResult   — קבלת תוצאת המשחק (אחרי שהסתיים)
 */
export interface IGameEngine<TState extends BaseGameState, TMove> {
  /**
   * יוצר משחק חדש ומחזיר את המצב ההתחלתי
   * @param gameId  - מזהה ייחודי (בדרך כלל match._id מ-MongoDB)
   * @param players - רשימת שחקנים לפי סדר (שחקן 0 = לבן בשחמט וכו')
   */
  createGame(gameId: string, players: GamePlayer[]): TState;

  /**
   * מבצע מהלך/פעולה של שחקן ומחזיר את המצב המעודכן
   * זורק שגיאה אם המהלך לא חוקי
   * @param gameId   - מזהה המשחק
   * @param playerId - מי מבצע את המהלך
   * @param move     - פרטי המהלך (שונה לכל משחק)
   */
  makeMove(gameId: string, playerId: string, move: TMove): TState;

  /**
   * מחזיר את מצב המשחק הנוכחי
   * זורק שגיאה אם gameId לא קיים
   */
  getState(gameId: string): TState;

  /**
   * בודק האם המשחק הסתיים
   */
  isGameOver(gameId: string): boolean;

  /**
   * מחזיר את תוצאת המשחק (null אם המשחק עדיין פעיל)
   */
  getResult(gameId: string): GameResult | null;
}
