import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app";
import connectDB from "./config/db";

const PORT = process.env.PORT || 3000;

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`ArenaX server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();