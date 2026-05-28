# sdk

Typed TypeScript client for `LinkoraContract`, generated from the compiled contract WASM using `stellar contract bindings typescript`.

## Quick Start

### 1. Install

```bash
pnpm add sdk
```

### 2. Instantiate the client

```ts
import { Client } from "sdk";

const client = new Client({
  contractId: "C...",          // deployed LinkoraContract address
  networkPassphrase: "Test SDF Network ; September 2015",
  rpcUrl: "https://soroban-testnet.stellar.org",
});
```

### 3. Call contract functions

```ts
// Read a post
const post = await client.get_post({ id: 1n });
console.log(post.result);

// Create a post (requires auth)
const tx = await client.create_post(
  { author: keypair.publicKey(), content: "Hello Linkora!" },
  { fee: 100 }
);
await tx.signAndSend({ signTransaction: keypair.sign.bind(keypair) });
```

### 4. Simulate before sending

```ts
// Simulate to estimate fees before committing
const simResult = await client.tip(
  { tipper: myAddress, post_id: 1n, token: xlmAddress, amount: 1_000_000n },
  { simulate: true }
);
console.log("estimated fee:", simResult.simulationData?.minResourceFee);
```

## API Reference

Full API documentation is published to GitHub Pages. Run locally with:

```bash
pnpm docs
# Opens packages/sdk/docs/index.html
```

## Regenerating the client

Run this after every contract change:

```bash
# 1. Rebuild the contract
pnpm build:contracts

# 2. Regenerate the TypeScript client
bash packages/sdk/generate.sh
```

The generated files are written to `packages/sdk/src/`. Commit them so consumers don't need the Stellar CLI installed.

## Usage

Import the client in the frontend or any other workspace package:

```ts
import { Client } from "sdk";
```

## Prerequisites

- Stellar CLI: `cargo install --locked stellar-cli`
- Contract built: `pnpm build:contracts`
