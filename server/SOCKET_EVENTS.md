# ArenaX Socket.io Events

This document is for frontend integration (Shaked + Ofek).
It summarizes all currently defined Socket.io events and marks whether each event is already implemented or still planned.

Status legend:
- ✅ Implemented: active in server runtime
- 🟡 Planned: contract is defined, implementation is TODO

---

## Connection

### Authentication (handshake)
- Direction: Client -> Server
- Field: `socket.handshake.auth.token`
- Description: JWT token is required; server rejects unauthorized connections.
- Status: ✅ Implemented

---

## Tournament Room Events

### `join-tournament-room`
- Direction: Client -> Server
- Payload:
```json
{ "tournamentId": "<string>" }
```
- Description: Join tournament room `tournament:<tournamentId>`.
- Status: ✅ Implemented

### `leave-tournament-room`
- Direction: Client -> Server
- Payload:
```json
{ "tournamentId": "<string>" }
```
- Description: Leave tournament room.
- Status: ✅ Implemented

### `tournament:player-joined`
- Direction: Server -> Room
- Payload:
```json
{ "userId": "<string>" }
```
- Description: Emitted to other users in tournament room when someone joins.
- Status: ✅ Implemented

### `tournament:update`
- Direction: Client -> Server -> Room
- Payload (from client):
```json
{ "tournamentId": "<string>", "leaderboard": {} }
```
- Payload (from server):
```json
{
  "tournamentId": "<string>",
  "leaderboard": {},
  "updatedBy": "<userId>",
  "at": "<iso-date>"
}
```
- Description: Broadcast leaderboard update to `tournament:<tournamentId>`.
- Status: ✅ Implemented

---

## Game Room Generic Events

### `player:join`
- Direction: Client -> Server -> Room
- Payload (client):
```json
{ "gameId": "<string>" }
```
- Payload (server):
```json
{
  "gameId": "<string>",
  "userId": "<string>",
  "reconnected": true,
  "at": "<iso-date>"
}
```
- Ack:
```json
{ "ok": true }
```
- Description: Join room `game:<gameId>`. If reconnect timer exists, it is cleared.
- Status: ✅ Implemented

### `player:disconnect`
- Direction: Server -> Room
- Payload:
```json
{
  "gameId": "<string>",
  "userId": "<string>",
  "reconnectTimeoutMs": 60000,
  "at": "<iso-date>"
}
```
- Description: Emitted when socket disconnects; server starts 60s reconnect timer.
- Status: ✅ Implemented

### `player:reconnect`
- Direction: Server -> Room
- Payload:
```json
{
  "gameId": "<string>",
  "userId": "<string>",
  "restoredFrom": "database | null",
  "at": "<iso-date>"
}
```
- Description: Emitted after successful rejoin while reconnect timer is active. If persisted game snapshot exists, `restoredFrom` is `"database"`.
- Status: ✅ Implemented

### `game:state` (restore on reconnect)
- Direction: Server -> Reconnected Client (direct emit)
- Payload:
```json
{
  "gameId": "<string>",
  "state": {},
  "leaderboard": [],
  "status": "active | completed",
  "lastAction": "start | move:hit | move:stand | move:double",
  "updatedAt": "<iso-date>",
  "updatedBy": "system",
  "source": "database",
  "at": "<iso-date>"
}
```
- Description: On reconnect, server restores latest persisted game snapshot from MongoDB and sends it to the reconnected player.
- Status: ✅ Implemented

### `game:move`
- Direction: Client -> Server -> Room
- Payload (client):
```json
{ "gameId": "<string>", "move": {} }
```
- Payload (server):
```json
{
  "gameId": "<string>",
  "playerId": "<userId>",
  "move": {},
  "at": "<iso-date>"
}
```
- Status: ✅ Implemented

### `game:state`
- Direction: Client -> Server -> Room
- Payload (client):
```json
{ "gameId": "<string>", "state": {} }
```
- Payload (server):
```json
{
  "gameId": "<string>",
  "state": {},
  "updatedBy": "<userId>",
  "at": "<iso-date>"
}
```
- Status: ✅ Implemented

### `game:end`
- Direction: Client -> Server -> Room
- Payload (client):
```json
{ "gameId": "<string>", "result": {} }
```
- Payload (server):
```json
{
  "gameId": "<string>",
  "result": {},
  "endedBy": "<userId>",
  "at": "<iso-date>"
}
```
- Status: ✅ Implemented

---

## Blackjack-Specific Contract

Full game loop implemented in `server/src/socket/blackjack.socket.ts`.

### Flow (required order)

```
POST /api/tournaments/:id/start  (REST — triggers game creation)
  ↓
socket.emit("player:join", { gameId })
  ↓
socket.emit("blackjack:request-state", { gameId })
  ↓ server → socket:
blackjack:game-start  (full state + cards)
  ↓
socket.emit("blackjack:player-action", { gameId, action })
  ↓ server → room:
blackjack:game-state  OR  blackjack:round-result → blackjack:round-start
  ↓  (repeats 5 rounds)
blackjack:game-over
```

---

### `blackjack:request-state`
- Direction: Client -> Server
- **Send immediately after `player:join`** — requests current game state and starts the 60s action timer.
- Payload:
```json
{ "gameId": "<string>" }
```
- Ack: `{ "ok": true }` or `{ "ok": false, "message": "<reason>" }`
- Status: ✅ Implemented

### `blackjack:player-action`
- Direction: Client -> Server
- Payload:
```json
{ "gameId": "<string>", "action": "hit | stand | double" }
```
- Ack: `{ "ok": true }` or `{ "ok": false, "message": "<reason>" }`
- Status: ✅ Implemented

### `blackjack:game-start`
- Direction: Server -> Requesting Client (direct emit, not broadcast)
- Emitted in response to `blackjack:request-state` with the full current state.
- Payload:
```json
{
  "gameId": "<string>",
  "players": [{ "id": "<string>", "name": "<string>" }],
  "round": 1,
  "totalRounds": 5,
  "dealerCards": [{ "text": "A", "suite": "hearts", "value": 1, "color": "R" }],
  "playerStates": [
    {
      "id": "<playerId>",
      "cards": [],
      "bet": 100,
      "tokens": 1000,
      "hasActed": false,
      "availableActions": { "hit": true, "stand": true, "double": true }
    }
  ]
}
```
- Status: ✅ Implemented

### `blackjack:game-state`
- Direction: Server -> Room (broadcast)
- Emitted after every player action while the round is still active.
- Payload:
```json
{
  "gameId": "<string>",
  "round": 1,
  "dealerCards": [],
  "players": [
    {
      "id": "<playerId>",
      "cards": [],
      "bet": 100,
      "status": "player-turn-right | dealer-turn | done",
      "playerValue": { "hi": 17, "lo": 7 },
      "hasActed": false,
      "availableActions": { "hit": true, "stand": true, "double": false }
    }
  ]
}
```
- Status: ✅ Implemented

### `blackjack:round-result`
- Direction: Server -> Room (broadcast)
- Emitted when all players have acted. Includes ranked leaderboard (KAN-48).
- Payload:
```json
{
  "gameId": "<string>",
  "round": 1,
  "dealerCards": [],
  "results": [
    {
      "id": "<playerId>",
      "outcome": "win | loss | draw",
      "delta": 100
    }
  ],
  "leaderboard": [
    { "playerId": "<string>", "tokens": 1100, "rank": 1 }
  ]
}
```
- Status: ✅ Implemented

### `blackjack:round-start`
- Direction: Server -> Room (broadcast)
- Emitted 3 seconds after `blackjack:round-result`. Followed immediately by `blackjack:game-state` with new cards.
- Payload:
```json
{
  "gameId": "<string>",
  "round": 2,
  "players": [
    { "id": "<playerId>", "tokens": 1100 }
  ]
}
```
- Status: ✅ Implemented

### `blackjack:timeout`
- Direction: Server -> Room (broadcast)
- Emitted when a player doesn't act within 60 seconds. Auto-stand is applied.
- Payload:
```json
{ "gameId": "<string>", "playerId": "<string>" }
```
- Status: ✅ Implemented

### `blackjack:game-over`
- Direction: Server -> Room (broadcast)
- Emitted after round 5. Match document is updated in MongoDB automatically.
- Payload:
```json
{
  "gameId": "<string>",
  "finalLeaderboard": [
    { "playerId": "<string>", "tokens": 1300, "rank": 1 }
  ]
}
```
- Status: ✅ Implemented

### `blackjack:player-disconnected`
- Direction: Server -> Room
- Handled by the generic `player:disconnect` event (see above).
- Status: ✅ Implemented (via generic disconnect handler)

---

## Blackjack Integration Example (React)

```js
import { connectSocket, getSocket } from '../services/socket';

// 1. Connect (call once after login)
connectSocket(localStorage.getItem('token'));
const socket = getSocket();

// 2. Join game room, then request state
socket.emit('player:join', { gameId }, (res) => {
  if (!res.ok) return;

  // Must call this after join — delivers current state and starts the 60s timer
  socket.emit('blackjack:request-state', { gameId });
});

// 3. Listen for events
socket.on('blackjack:game-start',   (data) => { /* render initial cards */ });
socket.on('blackjack:game-state',   (data) => { /* update cards mid-round */ });
socket.on('blackjack:round-result', (data) => { /* show result + leaderboard */ });
socket.on('blackjack:round-start',  (data) => { /* prepare next round UI */ });
socket.on('blackjack:timeout',      (data) => { /* show "timed out" message */ });
socket.on('blackjack:game-over',    (data) => { /* show final standings */ });

// 4. Send player action
socket.emit('blackjack:player-action',
  { gameId, action: 'hit' },
  (res) => { if (!res.ok) console.error(res.message); }
);
```

---

## Card Format

```ts
{
  text: string,    // "A" | "2"–"10" | "J" | "Q" | "K"
  suite: string,   // "hearts" | "diamonds" | "clubs" | "spades"
  value: number,   // 1–10
  color: string    // "R" | "B"
}
```

---

## Source of Truth

- Generic implemented events: `server/src/socket/index.ts`
- Blackjack implementation: `server/src/blackjack/socket.ts`
- Trivia implementation: `server/src/socket/trivia.socket.ts`
