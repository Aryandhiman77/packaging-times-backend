import "dotenv/config";

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "node:path";

import publicRoutes from "./routes/public.js";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";

import { Settings, Subscriber } from "./models/index.js";

import { errorHandler, requireMongo } from "./middleware/validate.js";

import {
  requireAdmin,
  requireTrustedOrigin,
  syncPrimaryAdmin,
} from "./middleware/auth.js";

import { storySeoPage } from "./services/storySeoPage.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  }),
);

app.use(
  cors({
    origin: (process.env.CLIENT_ORIGIN || "http://localhost:5173")
      .split(",")
      .map((x) => x.trim()),

    credentials: true,
  }),
);

app.use(morgan("dev"));

app.use(
  express.json({
    limit: "18mb",
  }),
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "1mb",
  }),
);

app.use(cookieParser());

app.use(
  "/uploads",
  express.static(path.resolve("uploads"), {
    maxAge: "1d",

    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  }),
);

app.get("/api/health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    ok: connected,
    database: connected ? "connected" : "disconnected",
  });
});

app.use(
  "/api/public",
  requireMongo,
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
  publicRoutes,
);

app.use("/api/auth", requireMongo, authRoutes);

app.use(
  "/api/admin",
  requireMongo,
  requireAdmin,
  requireTrustedOrigin,
  adminRoutes,
);

// SEO HTML for individual news articles
app.get("/story/:slug", requireMongo, storySeoPage);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found.",
  });
});

app.use(errorHandler);

const port = Number(process.env.PORT || 5000);

async function start() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is required.");
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });

    await Settings.updateOne(
      { key: "main" },
      {
        $setOnInsert: {
          key: "main",
        },
      },
      { upsert: true },
    );

    // Replace the old builder instruction heading
    // only when it still matches that exact text.
    await Settings.updateOne(
      {
        key: "main",
        heroHeading: "Trending News Changes Regularly",
      },
      {
        $set: {
          heroHeading: "Packaging News & Industry Insights",
        },
      },
    );

    await Subscriber.updateMany(
      { updatedAt: { $exists: false } },
      [{ $set: { updatedAt: "$createdAt" } }],
    );

    const adminSync = await syncPrimaryAdmin();

    console.log("MongoDB connected. Primary admin:", adminSync);
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }

  const server = app.listen(port, () => {
    console.log(`Packaging Times API listening on ${port}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `Startup failed: port ${port} is already in use. Stop the other backend process or set a different PORT.`,
      );
      process.exit(1);
    }

    throw error;
  });
}

start();
