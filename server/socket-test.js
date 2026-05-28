const { io } = require("socket.io-client");

const socket = io("http://localhost:3000", {
  auth: {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTE3MTAzNmRiMGU3MzRmNDFiZmRjNGQiLCJpYXQiOjE3Nzk4OTY4MDUsImV4cCI6MTc4MDUwMTYwNX0.Ddx_4cJ8gZZo63ZN7D-I_Hhsb1KrUPzB7PRxENiK-QU"
  }
});

socket.on("connect", () => {
  console.log("Connected:", socket.id);

  socket.emit(
    "trivia:join",
    {
      triviaGameId: "6a17ffff17781f82e7f6f43d"
    },
    (response) => {
      console.log("JOIN RESPONSE:", response);
    }
  );
});

socket.on("trivia:player-joined", (data) => {
  console.log("PLAYER JOINED:", data);
});

socket.on("trivia:question-started", (data) => {
  console.log("QUESTION STARTED:", data);
});

socket.on("trivia:leaderboard-updated", (data) => {
  console.log("LEADERBOARD:", data);
});

socket.on("trivia:answer-result", (data) => {
  console.log("ANSWER RESULT:", data);
});

socket.on("trivia:game-completed", (data) => {
  console.log("GAME COMPLETED:", data);
});