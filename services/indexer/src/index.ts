/**
 * Linkora Indexer — entry point.
 *
 * Connects to a Soroban RPC endpoint, streams contract events from the
 * Linkora contract, writes raw events to PostgreSQL, and dispatches each
 * event to the appropriate typed handler.
 *
 * Environment variables (all required unless noted):
 *   DATABASE_URL      - PostgreSQL connection string
 *   STELLAR_RPC_URL   - Soroban RPC endpoint
 *   CONTRACT_ID       - Bech32 contract address
 *   START_LEDGER      - Ledger sequence to start streaming from
 *   POLL_INTERVAL_MS  - (optional) polling interval in ms, default 5000
 */
/**
 * Linkora Indexer — entry point.
 */

import { Pool } from "pg";
import { streamEvents, RawEvent } from "./stream";
import { logger, healthState } from "./logger";

// ── Config ────────────────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const DATABASE_URL = requireEnv("DATABASE_URL");
const STELLAR_RPC_URL = requireEnv("STELLAR_RPC_URL");
const CONTRACT_ID = requireEnv("CONTRACT_ID");
const START_LEDGER = parseInt(requireEnv("START_LEDGER"), 10);

const POLL_INTERVAL_MS = process.env["POLL_INTERVAL_MS"]
  ? parseInt(process.env["POLL_INTERVAL_MS"], 10)
  : undefined;

// ── Database ──────────────────────────────────────────────────────────────────

const pgPool = new Pool({ connectionString: DATABASE_URL });

async function ensureEventsTable(): Promise<void> {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id            BIGSERIAL   PRIMARY KEY,
      event_id      TEXT        NOT NULL UNIQUE,
      ledger        INTEGER     NOT NULL,
      contract_id   TEXT        NOT NULL,
      topic         TEXT[]      NOT NULL,
      value         TEXT        NOT NULL,
      tx_hash       TEXT        NOT NULL,
      closed_at     TIMESTAMPTZ NOT NULL,
      indexed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pgPool.query(`
    CREATE INDEX IF NOT EXISTS idx_events_ledger ON events (ledger);
    CREATE INDEX IF NOT EXISTS idx_events_contract_id ON events (contract_id);
  `);
}

async function persistEvent(event: RawEvent): Promise<void> {
  await pgPool.query(
    `
    INSERT INTO events
      (event_id, ledger, contract_id, topic, value, tx_hash, closed_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (event_id) DO NOTHING
    `,
    [
      event.id,
      event.ledger,
      event.contractId,
      event.topic,
      event.value,
      event.txHash,
      new Date(event.ledgerClosedAt),
    ]
  );
}

// ── Event dispatch ────────────────────────────────────────────────────────────

async function handleEvent(event: RawEvent): Promise<void> {
  await persistEvent(event);

  const eventType = event.topic[0];
  logger.info({ ledger: event.ledger, type: eventType, txHash: event.txHash }, "Event indexed");
}

// ── Lifecycle control ────────────────────────────────────────────────────────

const abortController = new AbortController();
let isRunning = false;

function shutdown(signal: string): void {
  logger.info({ signal }, "Received signal, shutting down");
  abortController.abort();
}

// ── Graceful shutdown hooks ──────────────────────────────────────────────────

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ── Core runner ──────────────────────────────────────────────────────────────

export async function startIndexing(): Promise<void> {
  if (isRunning) return;
  isRunning = true;

  logger.info("Starting Linkora indexer");
  logger.info({ rpcUrl: STELLAR_RPC_URL }, "RPC endpoint");
  logger.info({ contractId: CONTRACT_ID }, "Contract");
  logger.info({ startLedger: START_LEDGER }, "Starting from ledger");

  await ensureEventsTable();
  healthState.dbConnected = true;

  try {
    healthState.rpcConnected = true;
    await streamEvents(
      {
        rpcUrl: STELLAR_RPC_URL,
        contractId: CONTRACT_ID,
        startLedger: START_LEDGER,
        pollIntervalMs: POLL_INTERVAL_MS,
      },
      handleEvent,
      abortController.signal
    );
  } finally {
    // CRITICAL: always close DB so Jest can exit
    healthState.dbConnected = false;
    healthState.rpcConnected = false;
    await pgPool.end();
    isRunning = false;
    logger.info("Shutdown complete");
  }
}

// ── Auto-run ONLY outside tests ──────────────────────────────────────────────

if (process.env.NODE_ENV !== "test") {
  startIndexing().catch((err) => {
    logger.fatal(
      { error: err instanceof Error ? err.message : String(err) },
      "Fatal indexer error"
    );
    process.exit(1);
  });
}
