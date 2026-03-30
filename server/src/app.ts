import express from "express";
import cors from "cors";
import morgan from "morgan";
import healthRoutes from "./routes/health.routes";
import authRoutes from "./routes/auth.routes";

const app = express();

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.use("/health", healthRoutes);

app.use("/api/auth", authRoutes);

export default app;