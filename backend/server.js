import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { productsRouter } from "./routes/products.js";
import { gameOptionsRouter } from "./routes/game-options.js";
import { orderRouter } from "./routes/order.js";

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN ? [process.env.FRONTEND_ORIGIN] : true,
    methods: ["GET", "POST", "OPTIONS"],
  })
);
app.use(express.json({ limit: "200kb" }));
app.use(morgan("tiny"));

app.use(
  "/api/",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/products", productsRouter);
app.use("/api/game-options", gameOptionsRouter);
app.use("/api/order", orderRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`API listening on :${port}`);
});

