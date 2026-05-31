# LinkoraContract Security Review

**Contract:** `packages/contracts/contracts/linkora-contracts/src/lib.rs`  
**Review Date:** 2025-05-26  
**Reviewer:** Community security review (open-source week)  
**Scope:** Full review of `LinkoraContract` — profiles, social graph, posts, reactions, tipping, community pools, upgradability.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 1 |
| Medium | 3 |
| Low | 3 |
| Informational | 3 |

No critical vulnerabilities were identified. One high-severity finding relates to integer overflow in the fee calculation path. The remaining findings are medium or lower severity.

---

## Findings

### [HIGH-01] Integer overflow in fee calculation

**Location:** `lib.rs`, `tip()` function, line ~715  
**Severity:** High

**Description:**  
The fee calculation performs a direct multiplication before division:

```rust
let fee_amount = (amount * fee_bps as i128) / 10_000;
```

`i128` can hold values up to approximately `1.7 × 10^38`. However, `amount` is user-controlled (passed in as `i128`) and `fee_bps` can be up to `10_000`. If `amount` approaches `i128::MAX / 10_000` (~`1.7 × 10^34`), the multiplication `amount * fee_bps as i128` overflows in debug builds and wraps silently in release builds. A wrapped fee could be negative, allowing an attacker to receive more than they tipped.

In practice, token balances on Stellar are bounded by the token contract's supply, making extremely large `amount` values unlikely for most tokens. However, the contract places no upper bound on `amount`, and a malicious or custom token could produce an exploit path.

**Recommendation:**  
Use a checked multiplication and handle overflow explicitly:

```rust
let fee_amount = amount
    .checked_mul(fee_bps as i128)
    .expect("tip amount overflow")
    / 10_000;
```

Alternatively, cap `amount` to a protocol maximum (e.g., `i64::MAX`) and document the invariant.

---

### [MED-01] Unbounded `Vec<Address>` growth in follow/follower lists

**Location:** `lib.rs`, `follow()` and `unfollow()` functions  
**Severity:** Medium

**Description:**  
Following and follower lists are stored as `Vec<Address>` in persistent storage. There is no cap on how many addresses can be added to these lists. An attacker can create many accounts and have them all follow a single target address, growing the follower `Vec` arbitrarily. Because every `follow()` call loads the entire list, serializes the updated list, and writes it back, storage size and CPU costs grow linearly with follower count.

On Soroban, large persistent entries incur higher ledger entry fees and may eventually exceed the maximum contract data entry size, making the affected account's follow/follower data permanently inaccessible.

**Recommendation:**  
Introduce a maximum per-user follow/follower count constant (e.g., `MAX_FOLLOWS: u32 = 5_000`) and assert it before appending to either list. Alternatively, migrate to a sparse key-per-pair design (`StorageKey::FollowEdge(follower, followee)`) that avoids loading the entire list on every call.

---

### [MED-02] `get_followers` allows `limit = 0`; inconsistent with `get_following`

**Location:** `lib.rs`, lines ~469 and ~486  
**Severity:** Medium

**Description:**  
`get_following` validates:

```rust
assert!(limit > 0 && limit <= MAX_PAGINATION_LIMIT, "limit must be between 1 and 50");
```

But `get_followers` only validates:

```rust
assert!(limit <= MAX_PAGE_LIMIT, "limit exceeded");
```

A call to `get_followers` with `limit = 0` passes validation. The `paginate` helper correctly returns an empty `Vec` for `limit = 0`, so there is no functional exploit, but the inconsistency creates a confusing API surface and may cause unexpected empty responses for callers who forget to set a non-zero limit.

**Recommendation:**  
Align `get_followers` with `get_following`:

```rust
assert!(limit > 0 && limit <= MAX_PAGE_LIMIT, "limit must be between 1 and 50");
```

---

### [MED-03] `pool_withdraw` duplicate-signer check missing

**Location:** `lib.rs`, `pool_withdraw()` function, line ~823  
**Severity:** Medium

**Description:**  
The `pool_withdraw` function checks that the number of signers meets the threshold and that each signer is in the pool's admin list, but it does not verify that the same address does not appear more than once in the `signers` argument. A pool admin could pass their address `threshold` times in the `signers` Vec and satisfy the M-of-N requirement alone.

```rust
// No deduplication check
assert!(signers.len() >= pool.threshold, "insufficient signers");
for signer in signers.iter() {
    assert!(pool.admins.iter().any(|x| x == signer), "unauthorized signer");
    signer.require_auth();
}
```

While `require_auth()` is called for each entry, Soroban's auth model counts repeated auths for the same address as equivalent to a single auth, so a single admin can drain a pool that requires `threshold > 1` approvals by listing their address `threshold` times.

**Recommendation:**  
Deduplicate `signers` before the threshold check, or track unique authenticated addresses in a local `Map<Address, bool>`:

```rust
let mut seen: Map<Address, bool> = Map::new(&env);
let mut unique_count: u32 = 0;
for signer in signers.iter() {
    assert!(pool.admins.iter().any(|x| x == signer), "unauthorized signer");
    signer.require_auth();
    if !seen.contains_key(signer.clone()) {
        seen.set(signer, true);
        unique_count += 1;
    }
}
assert!(unique_count >= pool.threshold, "insufficient unique signers");
```

The same issue applies to `add_pool_admin`, `remove_pool_admin`, and `update_pool_threshold`.

---

### [LOW-01] `LEDGER_THRESHOLD` is nearly equal to `LEDGER_BUMP`

**Location:** `lib.rs`, lines ~38–39  
**Severity:** Low

**Description:**  

```rust
const LEDGER_BUMP: u32 = 535_000;
const LEDGER_THRESHOLD: u32 = 535_000 - 100;
```

The lazy-extension pattern is intended to avoid bumping TTL on every read by only extending when the remaining TTL falls below `LEDGER_THRESHOLD`. With a gap of only 100 ledgers (~8 minutes at 5 s/ledger) between bump and threshold, the TTL is extended on nearly every access, negating the lazy optimization and paying the `extend_ttl` fee unnecessarily often.

**Recommendation:**  
Set `LEDGER_THRESHOLD` to roughly half of `LEDGER_BUMP` (e.g., `267_500`) so that the extension is triggered only when the entry is at genuine risk of expiry:

```rust
const LEDGER_BUMP: u32 = 535_000;       // ~30 days
const LEDGER_THRESHOLD: u32 = 267_500;  // extend when < ~15 days remain
```

---

### [LOW-02] `set_fee` and `set_treasury` emit no events

**Location:** `lib.rs`, `set_fee()` and `set_treasury()`  
**Severity:** Low

**Description:**  
These admin functions silently change the fee rate and treasury address. Off-chain indexers and users have no way to detect that the fee changed or that treasury proceeds are being redirected to a new address without polling the contract state.

**Recommendation:**  
Emit a `FeeChangedEvent` and `TreasuryChangedEvent` (analogous to the existing `ContractUpgraded` event) to make these admin actions auditable on-chain.

---

### [LOW-03] `tip_total` on `Post` tracks gross tip, not net

**Location:** `lib.rs`, `tip()` function  
**Severity:** Low

**Description:**  
`post.tip_total += amount;` increments by the gross tip amount, including the portion deducted as a fee and sent to treasury. The field is named `tip_total` without clarifying whether it represents gross or net value, which may mislead integrators who assume it equals the amount the author actually received.

**Recommendation:**  
Either rename the field to `tip_total_gross`, or change the increment to `post.tip_total += author_amount;` and document the semantics clearly in a Rust doc comment.

---

### [INFO-01] No admin-transfer function

**Location:** `lib.rs` — admin management  
**Severity:** Informational

**Description:**  
There is no `transfer_admin` or `set_admin` function. Once the contract is deployed, the admin address is fixed. If the admin key is lost or compromised, there is no recovery path short of a contract upgrade.

**Note:** This is a design choice, not necessarily a bug. However, projects that need key rotation should add a two-step admin transfer (propose + accept) to avoid accidentally locking the contract to an address that cannot sign.

---

### [INFO-02] `initialize` uses panic rather than an error type

**Location:** `lib.rs`, `initialize()`  
**Severity:** Informational

**Description:**  
`initialize` panics with a string if called more than once. Soroban best practice is to return a typed error (via `#[contracterror]`) for precondition failures so that callers can distinguish error cases without parsing panic messages.

---

### [INFO-03] `upgrade()` does not validate new WASM hash

**Location:** `lib.rs`, `upgrade()`  
**Severity:** Informational

**Description:**  
The `upgrade` function accepts any `BytesN<32>` as the new WASM hash without verifying that a contract with that hash has been uploaded to the network. If the hash does not correspond to an uploaded WASM, `update_current_contract_wasm` will panic and the transaction will fail, but the error message will be opaque. Documenting this precondition in a Rust doc comment would help integrators avoid confusing deployment failures.

---

## Out of Scope

- Token contract security (the `token::Client` calls trust the token passed by the caller; accepting arbitrary token addresses is an intended design choice for multi-token support, but callers should be aware that malicious token contracts can reenter or behave unexpectedly)
- Off-chain indexer security
- Frontend security
