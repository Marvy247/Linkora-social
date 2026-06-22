# TODO - Indexer security hardening

## Step 1: Analyze & align specs

- [x] Read existing implementations: rateLimit, stellarAuth, logger, api/index, stream, index
- [ ] Verify which endpoints are “write” vs “read” in current API
- [ ] Ensure auth middleware is applied only to write endpoints

## Step 2: Implement Redis sliding-window rate limiting

- [ ] Update `services/indexer/src/middleware/rateLimit.ts`
  - [ ] Add Redis-backed sliding-window implementation (fallback to in-memory)
  - [ ] Enforce read: RATE_LIMIT_READ_RPM per IP
  - [ ] Enforce write: RATE_LIMIT_WRITE_RPM per `req.context.stellarAddress`
  - [ ] Return 429 + Retry-After

## Step 3: Update Stellar signature auth to required format

- [ ] Update `services/indexer/src/middleware/stellarAuth.ts`
  - [x] Parse `Authorization: StellarSig <base64(JSON{address,timestamp,signature})>`

  - [ ] Verify signature over sha256(address + ":" + timestamp)
  - [ ] Enforce timestamp tolerance (±30s) / replay protection requirements
  - [ ] Attach `req.context.stellarAddress`

## Step 4: Apply auth to write endpoints

- [ ] Update `services/indexer/src/api/index.ts` and/or route files
  - [ ] Add `requireStellarAuth` for all write endpoints
  - [ ] Ensure rate limiting uses authenticated address for write endpoints

## Step 5: Structured logging cleanup & abuse detection

- [ ] Replace all `console.log`/`console.error` with pino logger calls
  - [ ] `services/indexer/src/index.ts`
  - [ ] `services/indexer/src/stream.ts`
  - [ ] `services/indexer/src/api/index.ts`

## Step 6: Health endpoint

- [ ] Add `GET /health` returning {status, uptime, dbConnected, rpcConnected}
- [ ] Wire `healthState` flags to actual connectivity checks

## Step 7: Tests

- [ ] Add Jest tests for:
  - [ ] Burst 70 reads => 61st returns 429
  - [ ] Valid stellar-signed write accepted
  - [ ] 60-second-old timestamp => 403
  - [ ] Invalid signature => 401
- [ ] Ensure tests pass in CI without Redis (fallback)

## Step 8: Fix existing API indexer file issues

- [ ] Remove/repair broken exports and references in `services/indexer/src/api/index.ts`

## Step 9: Run test suite

- [ ] `cd services/indexer && npm test`
