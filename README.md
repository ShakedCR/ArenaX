# ArenaX

ArenaX is a multiplayer tournament platform supporting Blackjack and Trivia games.

**Features:**
- Tournament management (public & private)
- Real-time gameplay via Socket.io
- Wallet and virtual tokens with entry fees and prize distribution
- ELO ranking system
- Google OAuth + JWT authentication
- AI-generated trivia questions (Ollama)
- RAG-powered trivia from custom documents

---

## Team

- Shaked Crissy — Frontend + AI + Refactoring
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

## Deploy to Production

### 1. Configure environment variables

**Server** — copy and fill `server/.env.example` → `server/.env`:
```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/arenax
CLIENT_URL=http://<your-server-ip-or-domain>
JWT_SECRET=<strong-random-secret>
SESSION_SECRET=<strong-random-secret>
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3
OLLAMA_EMBED_MODEL=nomic-embed-text
```

**Client** — copy and fill `client/.env.example` → `client/.env`:
```env
VITE_API_URL=http://<your-server-ip-or-domain>:3000
```

### 2. Pull Ollama models (once per machine)
```bash
ollama pull llama3
ollama pull nomic-embed-text
```

### 3. Build the client
```bash
cd client
npm install
npm run build
# Output: client/dist/
```

### 4. Build and start the server
```bash
cd server
npm install
npm run build
npm start
```

### 5. Serve the client
Serve the `client/dist/` folder with any static file server. Example using `serve`:
```bash
npx serve client/dist -l 5173
```

Or configure nginx to point to `client/dist/`.

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
