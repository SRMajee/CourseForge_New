import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import routes from "./routes/index";
import { webhookRouter } from "./routes/paymentRoutes";
import { errorHandler } from "./middleware/validation";
import compression from "compression";
const app: Express = express();

// ==========================================
// 1. Global Middleware (Security & Optimization)
// ==========================================
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);
// ==========================================
// 1. Response Compression
// ==========================================
app.use(
  compression({
    level: 6,
    threshold: 10 * 1000,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  }),
);

app.use(morgan("tiny"));

// ==========================================
// 2. Webhook Handling
// ==========================================
app.use("/api/v1/payment", webhookRouter);

// ==========================================
// 3. Body Parsing
// ==========================================
app.use((req, res, next) => {
  if (req.originalUrl.includes("/api/v1/payment/webhook")) {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// ==========================================
// 4. Routes
// ==========================================
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", env: env.NODE_ENV });
});

app.use("/api/v1", routes);

// ==========================================
// 5. Error Handling
// ==========================================
app.use(errorHandler);

export default app;
