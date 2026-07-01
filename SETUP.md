# ArenaX — Local Setup Guide

## Prerequisites

Install these once on your machine:

- [Node.js 18+](https://nodejs.org)
- [MongoDB](https://www.mongodb.com/try/download/community) — community edition
- [Ollama](https://ollama.com) — local AI runtime

---

## 1. Clone and install dependencies

```bash
git clone <repo-url>
cd ArenaX

# Server
cd server && npm install && cd ..

# Client
cd client && npm install && cd ..
```

---

## 2. Configure environment variables

**Server:**
```bash
cp server/.env.example server/.env
```
Open `server/.env` and fill in:
- `JWT_SECRET` — any long random string (e.g. `openssl rand -hex 32`)
- `SESSION_SECRET` — any long random string
- Leave everything else as-is for local dev

**Client:**
```bash
cp client/.env.example client/.env
```
Default values work for local dev — no changes needed.

---

## 3. Pull Ollama models (one-time, ~1GB each)

```bash
ollama pull llama3
ollama pull nomic-embed-text
```

---

## 4. Run the project

Open **4 terminals**:

**Terminal 1 — MongoDB:**
```bash
mongod
```

**Terminal 2 — Ollama:**
```bash
ollama serve
```

**Terminal 3 — Server:**
```bash
cd server
npm run dev
```

**Terminal 4 — Client:**
```bash
cd client
npm run dev
```

Client runs at `http://localhost:5173`, server at `http://localhost:3000`.

---

## Troubleshooting

**"Cannot connect to Ollama"** — make sure `ollama serve` is running in a terminal.

**"Cannot connect to MongoDB"** — make sure `mongod` is running. On Mac you can also use `brew services start mongodb-community`.

**Tournament creation fails** — Ollama needs `llama3` model. Run `ollama list` to verify it's downloaded.
