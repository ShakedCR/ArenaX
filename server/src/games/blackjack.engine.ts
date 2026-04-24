import { IGameEngine, BaseGameState, GamePlayer, GameResult } from "./IGameEngine";

const TOTAL_ROUNDS = 5;
const STARTING_TOKENS = 1000;
const MIN_BET = 10;

export interface Card {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  rank: string;
  value: number;
}

export interface Hand {
  cards: Card[];
  bet: number;
  status: "playing" | "stand" | "bust" | "done" | "blackjack";
  roundDelta: number;
  isDoubled: boolean;
  isSplit: boolean;
  splitFromAce: boolean;
}

export interface PlayerState {
  playerId: string;
  name: string;
  tokens: number;
  hands: Hand[];
  activeHandIndex: number;
  status: "waiting" | "betting" | "playing" | "stand" | "bust" | "done";
  roundDelta: number;
  hasBet: boolean;
  cards: Card[];
  bet: number;
  initialBet: number;
}

export interface BlackjackGameState extends BaseGameState {
  currentRound: number;
  totalRounds: number;
  phase: "waiting" | "betting" | "playing" | "dealer-turn" | "round-over" | "game-over";
  deck: Card[];
  dealerCards: Card[];
  dealerHidden: boolean;
  playerStates: PlayerState[];
  currentPlayerIndex: number;
  roundActive: boolean;
}

export type BlackjackMove = "hit" | "stand" | "double" | "split";

const SUITS = ["hearts", "diamonds", "clubs", "spades"] as const;
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const rankValue = (rank: string): number => {
  if (rank === "A") return 11;
  if (["J", "Q", "K"].includes(rank)) return 10;
  return parseInt(rank);
};

const shuffle = (deck: Card[]): Card[] => {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
};

const buildDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, value: rankValue(rank) });
    }
  }
  return shuffle(deck);
};

export const handValue = (cards: Card[]): { hi: number; lo: number; soft: boolean } => {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.rank === "A") {
      aces++;
      total += 11;
    } else {
      total += card.value;
    }
  }

  const lo = total - aces * 10;
  const initiallySoft = aces > 0 && total <= 21;

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return {
    hi: total,
    lo,
    soft: initiallySoft && total <= 21
  };
};

const isBust = (cards: Card[]): boolean => handValue(cards).hi > 21;

const isBlackjack = (cards: Card[]): boolean =>
  cards.length === 2 && handValue(cards).hi === 21;

const isSoftSeventeen = (cards: Card[]): boolean => {
  const { hi, soft } = handValue(cards);
  return hi === 17 && soft;
};

const canSplit = (ps: PlayerState): boolean => {
  const activeHand = ps.hands[ps.activeHandIndex];
  if (!activeHand) return false;

  const availableTokens = ps.tokens - ps.initialBet;
  return (
    activeHand.cards.length === 2 &&
    activeHand.cards[0].rank === activeHand.cards[1].rank &&
    availableTokens >= activeHand.bet &&
    ps.hands.length < 4
  );
};

const canDouble = (ps: PlayerState): boolean => {
  const activeHand = ps.hands[ps.activeHandIndex];
  if (!activeHand) return false;

  const availableTokens = ps.tokens - ps.initialBet;
  return activeHand.cards.length === 2 && availableTokens >= activeHand.bet;
};

const buildPlayerHelper = (ps: PlayerState): void => {
  const activeHand = ps.hands[ps.activeHandIndex];
  ps.cards = activeHand?.cards ?? [];
  ps.bet = activeHand?.bet ?? 0;
};

const createHand = (bet: number): Hand => ({
  cards: [],
  bet,
  status: "playing",
  roundDelta: 0,
  isDoubled: false,
  isSplit: false,
  splitFromAce: false
});

export class BlackjackEngine implements IGameEngine<BlackjackGameState, BlackjackMove> {
  private games: Map<string, BlackjackGameState> = new Map();

  createGame(gameId: string, players: GamePlayer[]): BlackjackGameState {
    if (players.length < 2) {
      throw new Error("Need at least 2 players");
    }

    const playerStates: PlayerState[] = players.map((p) => ({
      playerId: p.id,
      name: p.name,
      tokens: STARTING_TOKENS,
      hands: [],
      activeHandIndex: 0,
      status: "waiting",
      roundDelta: 0,
      hasBet: false,
      cards: [],
      bet: 0,
      initialBet: 0
    }));

    const state: BlackjackGameState = {
      gameId,
      players,
      currentRound: 0,
      totalRounds: TOTAL_ROUNDS,
      phase: "waiting",
      deck: buildDeck(),
      dealerCards: [],
      dealerHidden: true,
      playerStates,
      currentPlayerIndex: 0,
      roundActive: false,
      isOver: false,
      result: null,
      createdAt: new Date()
    };

    this.games.set(gameId, state);
    return state;
  }

  startBettingPhase(gameId: string): BlackjackGameState {
    const state = this.getState(gameId);

    if (state.isOver) {
      throw new Error("Game is over");
    }

    state.currentRound += 1;
    state.phase = "betting";
    state.roundActive = false;
    state.dealerCards = [];
    state.dealerHidden = true;

    if (state.deck.length < 20) {
      state.deck = buildDeck();
    }

    for (const ps of state.playerStates) {
      ps.hands = [];
      ps.activeHandIndex = 0;
      ps.roundDelta = 0;
      ps.hasBet = false;
      ps.cards = [];
      ps.bet = 0;
      ps.initialBet = 0;

      if (ps.tokens > 0) {
        ps.status = "betting";
      } else {
        ps.status = "done";
      }
    }

    this.games.set(gameId, state);
    return state;
  }

  placeBet(gameId: string, playerId: string, bet: number): { state: BlackjackGameState; allBetsPlaced: boolean } {
    const state = this.getState(gameId);

    if (state.phase !== "betting") {
      throw new Error("Not in betting phase");
    }

    const ps = state.playerStates.find((p) => p.playerId === playerId);
    if (!ps) {
      throw new Error(`Player ${playerId} not found`);
    }
    if (ps.hasBet) {
      throw new Error("Already placed bet");
    }
    if (ps.tokens <= 0) {
      throw new Error("Player has no tokens left");
    }

    const clampedBet =
      ps.tokens < MIN_BET
        ? ps.tokens
        : Math.max(MIN_BET, Math.min(bet, ps.tokens));

    ps.hands = [createHand(clampedBet)];
    ps.bet = clampedBet;
    ps.initialBet = clampedBet;
    ps.hasBet = true;

    this.games.set(gameId, state);

    const allBetsPlaced = state.playerStates
      .filter((p) => p.tokens > 0)
      .every((p) => p.hasBet);

    return { state, allBetsPlaced };
  }

  dealCards(gameId: string): BlackjackGameState {
    const state = this.getState(gameId);

    state.roundActive = true;
    state.currentPlayerIndex = 0;
    state.dealerCards = [];
    state.dealerHidden = true;

    for (const ps of state.playerStates) {
      if (ps.tokens <= 0 || !ps.hasBet || !ps.hands[0]) {
        ps.status = "done";
        buildPlayerHelper(ps);
        continue;
      }

      ps.hands[0].cards.push(this.drawCard(state));
      ps.hands[0].cards.push(this.drawCard(state));
      ps.status = "waiting";
      buildPlayerHelper(ps);
    }

    state.dealerCards.push(this.drawCard(state));
    state.dealerCards.push(this.drawCard(state));

    state.phase = "playing";

    const firstActiveIndex = state.playerStates.findIndex(
      (ps) => ps.tokens > 0 && ps.hasBet && ps.status === "waiting"
    );

    if (firstActiveIndex === -1) {
      this.resolveRound(gameId);
      return this.getState(gameId);
    }

    state.currentPlayerIndex = firstActiveIndex;
    state.playerStates[firstActiveIndex].status = "playing";

    this.games.set(gameId, state);
    return state;
  }

  makeMove(gameId: string, playerId: string, move: BlackjackMove): BlackjackGameState {
    const state = this.getState(gameId);

    if (!state.roundActive) {
      throw new Error("No active round");
    }

    const currentPlayer = state.playerStates[state.currentPlayerIndex];
    if (!currentPlayer) {
      throw new Error("No current player");
    }
    if (currentPlayer.playerId !== playerId) {
      throw new Error("Not your turn");
    }
    if (currentPlayer.status !== "playing") {
      throw new Error("Player already acted");
    }

    const activeHand = currentPlayer.hands[currentPlayer.activeHandIndex];
    if (!activeHand) {
      throw new Error("No active hand");
    }

    if (move === "hit") {
      if (activeHand.splitFromAce) {
        throw new Error("Cannot hit after splitting Aces");
      }
      activeHand.cards.push(this.drawCard(state));
      buildPlayerHelper(currentPlayer);

      if (isBust(activeHand.cards)) {
        activeHand.status = "bust";
        this.advanceHand(state, currentPlayer);
      }
    } else if (move === "stand") {
      activeHand.status = "stand";
      this.advanceHand(state, currentPlayer);
    } else if (move === "double") {
      if (!canDouble(currentPlayer)) {
        throw new Error("Cannot double at this point");
      }

      const extraBet = activeHand.bet;
      currentPlayer.tokens -= extraBet;
      activeHand.bet += extraBet;
      activeHand.isDoubled = true;
      activeHand.cards.push(this.drawCard(state));
      activeHand.status = isBust(activeHand.cards) ? "bust" : "stand";
      buildPlayerHelper(currentPlayer);
      this.advanceHand(state, currentPlayer);
    } else if (move === "split") {
      if (!canSplit(currentPlayer)) {
        throw new Error("Cannot split at this point");
      }

      const splitCard = activeHand.cards.pop()!;
      const isAceSplit = splitCard.rank === "A";
      const newHand = createHand(activeHand.bet);

      newHand.cards.push(splitCard);
      newHand.isSplit = true;
      activeHand.isSplit = true;

      if (isAceSplit) {
        activeHand.splitFromAce = true;
        newHand.splitFromAce = true;
      }

      currentPlayer.tokens -= activeHand.bet;

      activeHand.cards.push(this.drawCard(state));
      newHand.cards.push(this.drawCard(state));

      currentPlayer.hands.splice(currentPlayer.activeHandIndex + 1, 0, newHand);
      buildPlayerHelper(currentPlayer);

      if (isAceSplit) {
        activeHand.status = "stand";
        newHand.status = "stand";
        this.advanceHand(state, currentPlayer);
      }
    }

    this.games.set(gameId, state);
    return state;
  }

  private drawCard(state: BlackjackGameState): Card {
    if (state.deck.length === 0) {
      const inPlay = new Set<string>();
      for (const ps of state.playerStates) {
        for (const hand of ps.hands) {
          for (const card of hand.cards) {
            inPlay.add(`${card.rank}-${card.suit}`);
          }
        }
      }
      for (const card of state.dealerCards) {
        inPlay.add(`${card.rank}-${card.suit}`);
      }
      const fresh = buildDeck().filter(c => !inPlay.has(`${c.rank}-${c.suit}`));
      state.deck = fresh.length > 0 ? fresh : buildDeck();
    }
    return state.deck.pop()!;
  }

  private advanceHand(state: BlackjackGameState, ps: PlayerState): void {
    const nextHandIndex = ps.hands.findIndex(
      (h, i) => i > ps.activeHandIndex && h.status === "playing"
    );

    if (nextHandIndex !== -1) {
      ps.activeHandIndex = nextHandIndex;
      buildPlayerHelper(ps);
      return;
    }

    ps.status = "done";
    buildPlayerHelper(ps);
    this.advanceTurn(state);
  }

  private advanceTurn(state: BlackjackGameState): void {
    const nextIndex = state.playerStates.findIndex(
      (ps, i) => i > state.currentPlayerIndex && ps.tokens > 0 && ps.status === "waiting"
    );

    if (nextIndex === -1) {
      this.resolveRound(state.gameId);
      return;
    }

    state.currentPlayerIndex = nextIndex;
    state.playerStates[nextIndex].status = "playing";
    buildPlayerHelper(state.playerStates[nextIndex]);
  }

  private resolveRound(gameId: string): void {
    const state = this.getState(gameId);

    state.phase = "dealer-turn";
    state.dealerHidden = false;

    while (handValue(state.dealerCards).hi < 17 || isSoftSeventeen(state.dealerCards)) {
      state.dealerCards.push(this.drawCard(state));
    }

    const dealerValue = handValue(state.dealerCards).hi;
    const dealerBust = dealerValue > 21;
    const dealerBJ = isBlackjack(state.dealerCards);

    for (const ps of state.playerStates) {
      let totalDelta = 0;

      for (const hand of ps.hands) {
        if (hand.status === "bust") {
          hand.roundDelta = -hand.bet;
        } else {
          const playerValue = handValue(hand.cards).hi;
          const playerBJ = isBlackjack(hand.cards) && !hand.isSplit;

          if (playerBJ && !dealerBJ) {
            hand.roundDelta = Math.floor(hand.bet * 1.5);
          } else if (playerBJ && dealerBJ) {
            hand.roundDelta = 0;
          } else if (dealerBJ) {
            hand.roundDelta = -hand.bet;
          } else if (dealerBust || playerValue > dealerValue) {
            hand.roundDelta = hand.bet;
          } else if (playerValue === dealerValue) {
            hand.roundDelta = 0;
          } else {
            hand.roundDelta = -hand.bet;
          }
        }

        hand.status = "done";
        totalDelta += hand.roundDelta;
      }

      ps.roundDelta = totalDelta;
      ps.tokens = Math.max(0, ps.tokens + totalDelta);
      ps.status = "done";
      buildPlayerHelper(ps);
    }

    state.roundActive = false;
    state.phase = "round-over";

    if (state.currentRound >= TOTAL_ROUNDS) {
      this.finalizeGame(gameId);
    }

    this.games.set(gameId, state);
  }

  private finalizeGame(gameId: string): void {
    const state = this.getState(gameId);
    const sorted = [...state.playerStates].sort((a, b) => b.tokens - a.tokens);
    const topTokens = sorted[0]?.tokens ?? 0;
    const winners = sorted.filter(ps => ps.tokens === topTokens && ps.tokens > 0);

    state.isOver = true;
    state.phase = "game-over";
    state.result = {
      winnerId: winners.length === 1 ? winners[0].playerId : null,
      winnerIds: winners.map(ps => ps.playerId),
      isTie: winners.length > 1,
      outcome: winners.length > 1 ? "draw" : "win",
      reason: "rounds-complete"
    };

    this.games.set(gameId, state);
  }

  handleTimeout(gameId: string, playerId: string): BlackjackGameState {
    const state = this.getState(gameId);

    if (state.phase === "betting") {
      const ps = state.playerStates.find((p) => p.playerId === playerId);

      if (ps && !ps.hasBet) {
        if (ps.tokens <= 0) {
          return state;
        }

        const autoBet = ps.tokens < MIN_BET ? ps.tokens : MIN_BET;
        const { state: newState } = this.placeBet(gameId, playerId, autoBet);
        return newState;
      }

      return state;
    }

    return this.makeMove(gameId, playerId, "stand");
  }

  getAvailableMoves(gameId: string, playerId: string): BlackjackMove[] {
    const state = this.getState(gameId);
    const ps = state.playerStates.find((p) => p.playerId === playerId);
    if (!ps) return [];

    const activeHand = ps.hands[ps.activeHandIndex];
    if (!activeHand) return [];

    const moves: BlackjackMove[] = ["hit", "stand"];
    if (canDouble(ps)) moves.push("double");
    if (canSplit(ps)) moves.push("split");

    return moves;
  }

  startRound(gameId: string): BlackjackGameState {
    return this.startBettingPhase(gameId);
  }

  getState(gameId: string): BlackjackGameState {
    const state = this.games.get(gameId);
    if (!state) {
      throw new Error(`Game ${gameId} not found`);
    }
    return state;
  }

  isGameOver(gameId: string): boolean {
    return this.getState(gameId).isOver;
  }

  getResult(gameId: string): GameResult | null {
    return this.getState(gameId).result;
  }

  getLeaderboard(gameId: string): { playerId: string; tokens: number; rank: number }[] {
    const state = this.getState(gameId);
    return [...state.playerStates]
      .sort((a, b) => b.tokens - a.tokens)
      .map((ps, i) => ({
        playerId: ps.playerId,
        tokens: ps.tokens,
        rank: i + 1
      }));
  }

  getCurrentPlayer(gameId: string): PlayerState | null {
    const state = this.getState(gameId);
    return state.playerStates[state.currentPlayerIndex] || null;
  }
}

export const blackjackEngine = new BlackjackEngine();