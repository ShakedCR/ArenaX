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

## Sample QR (CI Autotest)

Below is a sample invite link and the generated QR code for a test tournament created during CI/local verification.

- Invite code: `MQAX3CVTCY`
- Invite link: http://localhost:5173/tournaments/join/MQAX3CVTCY

QR image (embedded):

![Sample Tournament QR](data:image/png;base64,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)

Local file: [docs/qr-samples/CI-autotest-QR.png](docs/qr-samples/CI-autotest-QR.png)


- `main` — stable branch
- `dev` — shared development branch
- feature branches are created per task/feature