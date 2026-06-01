const { io } = require("socket.io-client");

const token = process.env.SOCKET_TEST_TOKEN || "<PUT_JWT_TOKEN_HERE>";

const socket = io("http://localhost:3000", {
  auth: {
    token
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