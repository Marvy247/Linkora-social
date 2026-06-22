import express, { Request, Response, NextFunction } from "express";
import { Database } from "../db";
import { logger, requestLoggingMiddleware, getHealth } from "../logger";
import { rateLimitRead, rateLimitWrite, rateLimit } from "../middleware/rateLimit";
import { requireStellarAuth } from "../middleware/stellarAuth";
import { createProfilesRouter } from "./routes/profiles";
import { createPostsRouter } from "./routes/posts";
import { createFollowsRouter } from "./routes/follows";
import { createPoolsRouter } from "./routes/pools";

// ── App factory ───────────────────────────────────────────────────────────────

export function createApp(db: Database): express.Application {
  const app = express();
  app.use(express.json());

  // Add request logging middleware early (before all other middleware)
  app.use(requestLoggingMiddleware);

  // ── Health check (no rate limiting, no auth) ──────────────────────────────

  app.get("/health", (_req: Request, res: Response): void => {
    const health = getHealth();
    const status = health.status === "ok" ? 200 : 503;
    res.status(status).json(health);
  });

  // ── Apply rate limiting to all /api routes ─────────────────────────────────
  // Read endpoints get rateLimitRead; write endpoints get rateLimitWrite.
  // The unified rateLimit middleware auto-detects based on HTTP method.
  app.use("/api", rateLimit);

  // ── Resource routes (read-only) ───────────────────────────────────────────
  app.use("/api/profiles", createProfilesRouter(db));
  app.use("/api/posts", createPostsRouter(db));
  app.use("/api/follows", createFollowsRouter(db));
  app.use("/api/pools", createPoolsRouter(db));

  // ── Search endpoint (POST but treated as a read — use read limit) ─────────

  interface SearchQuery {
    query: string;
    limit?: number;
    offset?: number;
  }

  interface Post {
    id: number;
    author: string;
    content: string;
    tip_total: string;
    timestamp: number;
  }

  interface SearchResponse {
    posts: Post[];
    total: number;
    has_more: boolean;
  }

  interface ErrorResponse {
    error: string;
    code: string;
  }

  const MAX_LIMIT = 100;
  const DEFAULT_LIMIT = 20;
  const DEFAULT_OFFSET = 0;

  // Override: search uses read-rate-limit even though it's POST
  app.post(
    "/api/search/posts",
    rateLimitRead,
    (req: Request, res: Response<SearchResponse | ErrorResponse>): void => {
      const body = req.body as Partial<SearchQuery>;

      if (
        body.query === undefined ||
        body.query === null ||
        typeof body.query !== "string" ||
        body.query.trim() === ""
      ) {
        res.status(400).json({ error: "query is required", code: "INVALID_QUERY" });
        return;
      }

      const limit = body.limit !== undefined ? Number(body.limit) : DEFAULT_LIMIT;
      const offset = body.offset !== undefined ? Number(body.offset) : DEFAULT_OFFSET;

      if (!Number.isInteger(limit) || limit < 1) {
        res.status(400).json({ error: "limit must be a positive integer", code: "INVALID_QUERY" });
        return;
      }

      if (limit > MAX_LIMIT) {
        res.status(400).json({
          error: `limit cannot exceed ${MAX_LIMIT}`,
          code: "LIMIT_EXCEEDED",
        });
        return;
      }

      if (!Number.isInteger(offset) || offset < 0) {
        res
          .status(400)
          .json({ error: "offset must be a non-negative integer", code: "INVALID_QUERY" });
        return;
      }

      // TODO: integrate with the search database.
      res.json({ posts: [], total: 0, has_more: false });
    }
  );

  // ── DM relay endpoint (write — requires Stellar auth + write rate limit) ───

  interface MessagePayload {
    recipientAddress: string;
    encryptedContent: string;
  }

  app.post(
    "/api/messages",
    requireStellarAuth,
    rateLimitWrite,
    (req: Request, res: Response): void => {
      const body = req.body as Partial<MessagePayload>;

      if (typeof body.recipientAddress !== "string" || body.recipientAddress.trim() === "") {
        res.status(400).json({ error: "recipientAddress is required", code: "INVALID_PAYLOAD" });
        return;
      }

      if (typeof body.encryptedContent !== "string" || body.encryptedContent.trim() === "") {
        res.status(400).json({ error: "encryptedContent is required", code: "INVALID_PAYLOAD" });
        return;
      }

      // TODO: persist and relay DM via Stellar contract.
      res.status(202).json({
        status: "accepted",
        from: req.context?.stellarAddress,
        to: body.recipientAddress,
      });
    }
  );

  // ── Error handler ─────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, req: Request, res: Response, _next: NextFunction): void => {
    logger.error(
      {
        requestId: req.context?.requestId,
        error: err.message,
        stack: err.stack,
      },
      "Unhandled error"
    );
    res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
  });

  return app;
}

// ── Server bootstrap (skipped when imported in tests) ────────────────────────

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Pool } = require("pg") as typeof import("pg");
  const DATABASE_URL = process.env.DATABASE_URL ?? "";
  const _stub = new Pool({ connectionString: DATABASE_URL }) as unknown as Database;
  const PORT = parseInt(process.env.PORT ?? "3001", 10);
  const serverApp = createApp(_stub);
  serverApp.listen(PORT, () => {
    logger.info({ port: PORT }, "Indexer API listening");
  });
}
