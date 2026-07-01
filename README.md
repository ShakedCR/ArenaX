# ArenaX

ArenaX is a multiplayer tournament platform supporting Blackjack and Trivia games (Chess and Checkers planned).

**Features:**
- Tournament management (public & private with invite codes and QR)
- Real-time gameplay via Socket.io
- Wallet and virtual tokens with entry fees and prize distribution
- ELO ranking system
- Google OAuth + JWT authentication
- AI-generated trivia questions (Ollama)
- RAG-powered trivia from custom documents (in development)

---

## Team

- Shaked Crissy — Frontend + AI
- Ofek Nagauker — Backend + Auth + Wallet
- Mevoreich Berrebi — Game Engine + Socket.io

---

## Tech Stack

### Frontend
- React 18 + Vite
- MUI (Material UI)
- Socket.io Client
- React Router v6

### Backend
- Node.js + Express + TypeScript
- MongoDB + Mongoose
- Socket.io
- JWT + Google OAuth (Passport.js)
- Ollama (local AI — question generation + embeddings)

### Game Engines
- engine-blackjack
- chess.js (planned)
- draughts (planned)

---

## Project Structure

```
/client         React frontend (Vite)
/server         Express backend (TypeScript)
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- MongoDB running locally
- [Ollama](https://ollama.com) installed

### 1. Clone & install dependencies

```bash
# Client
cd client
npm install

# Server
cd server
npm install
```

### 2. Pull required Ollama models

```bash
ollama pull llama3              # trivia question generation
ollama pull nomic-embed-text    # document embeddings (RAG)
```

### 3. Configure environment variables

Copy `server/.env.example` to `server/.env` and fill in:

```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/arenax
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3
OLLAMA_EMBED_MODEL=nomic-embed-text
```

### 4. Run

```bash
# Terminal 1 — Ollama
ollama serve

# Terminal 2 — Server
cd server && npm run dev

# Terminal 3 — Client
cd client && npm run dev
```

Client runs on `http://localhost:5173`, server on `http://localhost:3000`.

---

## Architecture

```
React Client (Vite)
       ↓
REST API + Socket.io (JWT auth)
       ↓
Express Server
       ↓
MongoDB + Ollama (local AI)
```

- Game logic runs **server-side** (game engines)
- Real-time updates via **Socket.io rooms** (game room, tournament room, user room)
- Socket connections authenticate via JWT on handshake
- Reconnect window: 60 seconds before forfeit

---

## Socket Events

Full event contract: [`server/SOCKET_EVENTS.md`](server/SOCKET_EVENTS.md)

---

## Branch Strategy

- `main` — stable, production-ready
- `dev` — shared development branch
- Feature branches per task (e.g. `trivia-frontend`, `trivia-rag`)
- PRs into `dev`, `dev` into `main` when stable
