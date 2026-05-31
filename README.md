# ArenaX

ArenaX is a multiplayer tournament platform for games such as Blackjack, Chess and Checkers.

The platform supports:
- Tournament management
- Real-time gameplay
- Wallet and virtual tokens
- Elo ranking system
- Public and private tournaments
- Authentication and user profiles

---

## Team

- Shaked Crissy — Frontend + AI
- Ofek Nagauker — Backend + Auth + Wallet
- Mevorah Berrebi — Game Engine + Socket.io

---

## Tech Stack

### Frontend
- React
- TypeScript
- MUI
- Socket.io Client

### Backend
- Node.js
- Express
- MongoDB + Mongoose
- Socket.io
- JWT Authentication

### Game Engines
- engine-blackjack
- chess.js
- draughts.js

---

## Project Structure

```txt
/client         React frontend
/server         Express backend
/server/games   Game engines
```

---

## Architecture

```txt
React Client
     ↓
REST API + Socket.io
     ↓
Express Server
     ↓
MongoDB
```

Game engines run on the server side.
Realtime updates are handled using Socket.io.

---

## Run Locally

### Client

```bash
cd client
npm install
npm run dev
```

### Server

```bash
cd server
npm install
npm run dev
```

---

## Environment Variables

Server:
- MONGO_URI
- JWT_SECRET
- GOOGLE_CLIENT_ID

---

## Realtime Events Docs

Socket.io events contract:
`server/SOCKET_EVENTS.md`

---

## Branch Strategy

- `main` — stable branch
- `dev` — shared development branch
- feature branches are created per task/feature