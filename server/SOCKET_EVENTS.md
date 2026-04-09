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

Defined in server but game-loop handlers are not implemented yet.

### `blackjack:player-action`
- Direction: Client -> Server
- Payload:
```json
{ "gameId": "<string>", "action": "hit | stand | double" }
```
- Status: 🟡 Planned

### `blackjack:game-start`
- Direction: Server -> Clients
- Payload:
```json
{ "gameId": "<string>", "players": [], "round": 1, "totalRounds": 5 }
```
- Status: 🟡 Planned

### `blackjack:game-state`
- Direction: Server -> Clients
- Status: 🟡 Planned

### `blackjack:round-start`
- Direction: Server -> Clients
- Status: 🟡 Planned

### `blackjack:round-result`
- Direction: Server -> Clients
- Status: 🟡 Planned

### `blackjack:timeout`
- Direction: Server -> Clients
- Status: 🟡 Planned

### `blackjack:player-disconnected`
- Direction: Server -> Clients
- Status: 🟡 Planned

### `blackjack:game-over`
- Direction: Server -> Clients
- Status: 🟡 Planned

---

## Chess-Specific Contract

### Client -> Server
- `chess:move`
- `chess:resign`
- `chess:offer-draw`
- `chess:accept-draw`

### Server -> Clients
- `chess:game-start`
- `chess:game-state`
- `chess:move`
- `chess:game-over`
- `chess:timeout`
- `chess:draw-offered`

Status: 🟡 Planned

---

## Checkers-Specific Contract

### Client -> Server
- `checkers:move`
- `checkers:resign`

### Server -> Clients
- `checkers:game-start`
- `checkers:game-state`
- `checkers:move`
- `checkers:game-over`
- `checkers:timeout`

Status: 🟡 Planned

---

## Source of Truth

- Generic implemented events: `server/src/socket/index.ts`
- Blackjack contract: `server/src/socket/blackjack.socket.ts`
- Chess contract: `server/src/socket/chess.socket.ts`
- Checkers contract: `server/src/socket/checkers.socket.ts`
