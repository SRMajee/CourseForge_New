import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import routes from "./routes/index";
import { webhookRouter } from "./routes/paymentRoutes";
import { errorHandler } from "./middleware/validation";

const app: Express = express();

// 1. Global Middleware
app.use(helmet()); // Security Headers
app.use(
  cors({
    origin: "http://localhost:5173", // Frontend URL
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// 2. Webhook Handling (Must be before JSON parsing)
app.use("/api/v1/payment", webhookRouter);

// 3. Body Parsing (Skipping for webhooks handled above if needed,
// but usually webhookRouter handles its own body parsing if using raw)
app.use((req, res, next) => {
  if (req.originalUrl.includes("/api/v1/payment/webhook")) {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// 4. Debug Logger (Optional)
app.use((req, res, next) => {
  if (req.method === "POST" || req.method === "PUT") {
    // console.log(`📦 [${req.method}] ${req.url}`);
  }
  next();
});

app.use(morgan("tiny")); // Request logging

// 5. Health Check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", env: env.NODE_ENV });
});

// 6. API Routes
app.use("/api/v1", routes);

// 7. 404 Handler
app.use(errorHandler);

export default app;
