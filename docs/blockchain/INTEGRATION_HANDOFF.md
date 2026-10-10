# TrustGraph — Blockchain Integration Handoff

**Audience:** frontend and backend integration engineers.
**Scope of this document:** everything needed to consume the canonical smart contract correctly. The blockchain scope (contracts, tests, deployment pipeline) is complete; this document records the handoff boundary.

Related documents:

- `docs/blockchain/AUDIT_REPORT.md` — pre-existing code audit (findings F-1..F-6)
- `docs/blockchain/ARCHITECTURE_DECISION.md` — why `TrustGraphRegistry` is canonical
- `docs/blockchain/TESTING.md` — how the contract test suite runs
- `docs/blockchain/DEPLOYMENT.md` — how deployment works and what it produces

---

## 1. Status

| Item | Status |
| --- | --- |
| Canonical contract | `TrustGraphRegistry` (`contracts/TrustGraphRegistry.sol`) |
| Secondary contract | `ProofOfWorkRegistry` (`contracts/ProofOfWorkRegistry.sol`) — hardened and tested, not part of the MVP integration path |
| Contracts tested | 135 Mocha/ethers tests, 100% line + statement coverage on both contracts |
| **Deployment** | **NOT DEPLOYED** — no transaction has been broadcast to Monad testnet. `deployments/monad-testnet.json` does not exist yet. |
| Frontend hardcoded address `0x4386926019A8B74431eBDeF7c2718E340621B903` | **Verified empty on testnet** (no contract code, confirmed 2026-10-10 via `eth_getCode`). Do not rely on it. |

After the authorized deployment, `deployments/monad-testnet.json` becomes the single source of truth for the address, transaction hash, block number, and deployer.

## 2. Network

| Field | Value |
| --- | --- |
| Network name (Hardhat) | `monadTestnet` |
| Chain ID | `10143` |
| RPC | `https://testnet-rpc.monad.xyz` |
| Explorer (used by scripts/docs) | `https://testnet.monadvision.com` |
| Explorer (used by frontend `src/lib/blockchain/chain.ts`) | `https://testnet.monadexplorer.com` |

Both explorer hostnames appear in the codebase; the integration phase should converge on one (see §9).

## 3. ABI source of truth

The contract is the source of truth. Generated ABI + bytecode live at:

```
artifacts/contracts/TrustGraphRegistry.sol/TrustGraphRegistry.json
```

Regenerate anytime with `npm run contracts:compile`. The JSON contains `abi` (21 entries) and `bytecode` (6677 bytes runtime creation code).

The frontend keeps a hand-written copy at `src/lib/contract/abi.ts`. **It diverges from the deployed contract in one place — see §9.1.** For the integration phase, prefer importing the generated artifact ABI rather than maintaining a parallel copy.

## 4. Read API (no authorization required)

| Function | Returns | Notes |
| --- | --- | --- |
| `owner()` | `address` | Registry administrator |
| `authorizedIssuers(address)` | `bool` | Explicit grant map. Does **not** reflect the owner's implicit privilege |
| `isIssuer(address)` | `bool` | `authorizedIssuers[x] \|\| x == owner` — use this for authorization checks |
| `getAttestation(uint256 id)` | `Attestation` | Reverts `"Attestation does not exist"` for unknown ids |
| `isValid(uint256 id)` | `bool` | false for unknown ids (no revert) |
| `getValidityStatus(uint256 id)` | `uint8` | Enum `ValidityStatus` — see §7 |
| `getAttestationsBySubject(address)` | `uint256[]` | Unbounded array — chunk or multicall for large subjects |
| `getAttestationsByIssuer(address)` | `uint256[]` | Unbounded array |
| `getTotalAttestations()` | `uint256` | Total ever issued (revocation does not decrement) |
| `getAllAttestationIds()` | `uint256[]` | Unbounded — do not call unguarded from UI |

`Attestation` struct fields, in order: `id (uint256)`, `issuer (address)`, `subject (address)`, `claimType (bytes32)`, `evidenceHash (bytes32)`, `evidenceUri (string)`, `issuedAt (uint256)`, `expiry (uint256)`, `revoked (bool)`, `revocationReason (string)`.

Attestation ids start at **1** (id 0 never exists).

## 5. Write API and permissions

| Function | Who may call | Reverts with |
| --- | --- | --- |
| `approveIssuer(address)` | owner only | `"Only registry owner may perform this action"`, `"Invalid issuer address"`, `"Issuer already authorized"` |
| `removeIssuer(address)` | owner only | `"Only registry owner may perform this action"`, `"Invalid issuer address"`, `"Address is not an authorized issuer"` |
| `issueAttestation(subject, claimType, evidenceHash, evidenceUri, expiry) returns (uint256 id)` | authorized issuer or owner | `"Caller is not an authorized issuer"`, `"Invalid subject address"`, `"Claim type cannot be empty"`, `"Evidence hash cannot be empty"`, `"Expiry must be in the future"` |
| `revokeAttestation(uint256 id, string reason)` | original issuer of that attestation, or owner | `"Attestation does not exist"`, `"Attestation is already revoked"`, `"Only the issuing reviewer or registry owner can revoke"` |
| `transferOwnership(address)` | owner only | `"Only registry owner may perform this action"`, `"Invalid new owner"` |

Behavioral details that matter to the UI:

- **`issueAttestation` returns the new id**, and also emits `AttestationIssued`. Either source works; the event is the indexing-friendly one.
- **`expiry == 0` means perpetual.** Any non-zero `expiry` must be strictly greater than the block timestamp at issuance (`expiry == now` reverts).
- **Revocation is permanent and preserves history.** The attestation stays in all queries with `revoked = true`; nothing is ever deleted.
- **De-authorizing an issuer does NOT retroactively invalidate their attestations' history** — it changes *current* validity (`getValidityStatus` returns `INVALID_ISSUER`), and re-approving the issuer restores `VALID` for unrevoked, unexpired attestations.
- **`transferOwnership` strips the previous owner's explicit issuer grant** (audit fix F-1) and emits `IssuerRemoved(previousOwner)` when it does. The new owner holds the implicit issuer privilege immediately. Self-transfer (`newOwner == owner`) is a no-op that keeps the grant.

## 6. Events

Indexed params become EVM log topics; only indexed params can be used in `eth_getLogs` filters.

| Event | Indexed (topics) | Non-indexed (data) |
| --- | --- | --- |
| `AttestationIssued` | `id (uint256)`, `issuer (address)`, `subject (address)` | `claimType (bytes32)`, `evidenceHash (bytes32)`, `expiry (uint256)` |
| `AttestationRevoked` | `id (uint256)`, `issuer (address)` | `reason (string)`, `timestamp (uint256)` |
| `IssuerApproved` | `issuer (address)` | — |
| `IssuerRemoved` | `issuer (address)` | — |
| `OwnershipTransferred` | `previousOwner (address)`, `newOwner (address)` | — |

`AttestationIssued` has exactly **3 topics** (`topic0` = event selector + 3 indexed params). `claimType` is **not** a topic — you cannot filter issuance logs by claim type on-chain; filter client-side after fetching by subject or issuer.

## 7. Validity semantics

`getValidityStatus(id)` returns (uint8):

| Value | Name | Meaning | Precedence |
| --- | --- | --- | --- |
| 0 | `NOT_FOUND` | id does not exist | checked first |
| 1 | `VALID` | exists, not revoked, not expired, issuer currently authorized | checked last |
| 2 | `REVOKED` | explicitly revoked | highest after NOT_FOUND |
| 3 | `EXPIRED` | `block.timestamp >= expiry` (inclusive; `expiry != 0`) | below REVOKED |
| 4 | `INVALID_ISSUER` | issuing issuer is currently de-authorized | lowest failure |

Precedence order: `NOT_FOUND` > `REVOKED` > `EXPIRED` > `INVALID_ISSUER` > `VALID`. A revoked attestation reports `REVOKED` even if also expired.

`isValid(id)` is true only for `VALID`. Never infer validity from `revoked`/`expiry` fields alone — issuer de-authorization changes validity without touching the struct.

## 8. Evidence and claim-type encoding conventions (must not change)

- **`evidenceHash` is a plain SHA-256 digest** of the canonical evidence manifest, stored as an opaque `bytes32`. There is **no keccak256 transformation** anywhere in the contract. From TypeScript: `new Uint8Array(await crypto.subtle.digest("SHA-256", canonicalManifestBytes))` → pad to bytes32. The test suite pins the NIST vector `sha256("abc") = 0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`.
- **`claimType` is a UTF-8 string packed into `bytes32`** (e.g. `"CONTRACT_DEPLOYED"` → `encodeBytes32String("CONTRACT_DEPLOYED")` from ethers v6). It is **not** `keccak256("CONTRACT_DEPLOYED")`. The contract stores and returns the raw bytes; `getAttestation(id).claimType` decodes back with `decodeBytes32String`.
- The canonicalization rules for the evidence manifest (what exactly gets hashed) are an application-layer convention — see AGENTS.md §12. Whatever the app canonicalizes must remain deterministic across versions, because the on-chain hash is immutable.

## 9. Known divergences — for the integration phase (blockchain scope will not change these)

### 9.1 Frontend ABI mismatch on `AttestationIssued` (will misdecode events)

`src/lib/contract/abi.ts` declares `claimType` as `indexed: true`. The deployed contract declares it non-indexed (only `id`, `issuer`, `subject` are indexed). Consequences if the frontend ABI is used as-is:

- **Decoding:** `claimType` would be read from `topics[3]`, which does not exist — ethers will either throw or produce garbage for `claimType`, `evidenceHash`, `expiry`.
- **Filtering:** `contract.filters.AttestationIssued(..., claimType, ...)` would build an invalid topic filter.

Fix (frontend team): replace the hand-written event entry with the one from `artifacts/contracts/TrustGraphRegistry.sol/TrustGraphRegistry.json`, or import the artifact ABI directly.

### 9.2 Frontend contract address must be updated post-deployment

`src/lib/contract/config.ts` falls back to `0x4386926019A8B74431eBDeF7c2718E340621B903`, which has **no code on testnet** (verified 2026-10-10). Until the real address is wired in, every write call from the UI will fail. Options for the integration phase:

- set `VITE_TRUST_GRAPH_REGISTRY_ADDRESS` to the address in `deployments/monad-testnet.json`, or
- update the fallback constant after deployment.

The blockchain team does not modify these files; the address will be provided in `deployments/monad-testnet.json` immediately after the authorized deployment.

### 9.3 Explorer hostname inconsistency

Frontend uses `testnet.monadexplorer.com`; deployment scripts and metadata use `testnet.monadvision.com`. Both appear in Monad materials; pick one in the integration phase so `TransactionLink` and deployment records agree.

### 9.4 Unbounded array getters

`getAllAttestationIds`, `getAttestationsBySubject`, `getAttestationsByIssuer` return full arrays. Fine for the MVP data volume; if the registry grows, page through ids and batch `getAttestation` calls (multicall) instead.

## 10. Post-deployment integration checklist

1. Read `deployments/monad-testnet.json` → `address`, `transactionHash`, `blockNumber`, `deployedAt`.
2. Independently confirm on the explorer (`<explorer>/address/<address>`) that code exists and the deployer transaction is in `blockNumber`.
3. Run `npm run contracts:check:testnet` (no private key needed) — it must print `[OK] Contract is live`.
4. Update the frontend address (§9.2) and fix the ABI event entry (§9.1).
5. Wire the first owner-side action: `approveIssuer(<reviewer wallet>)` from the deployer wallet.
6. Smoke the full lifecycle with two wallets: issue → `getValidityStatus == 1` → revoke → status `2` → history still queryable.
7. Point indexer/log consumption at the events table in §6 (3 topics for `AttestationIssued`).

## 11. If you need to verify anything yourself

- Contract source: `contracts/TrustGraphRegistry.sol` (fully commented).
- Test suite: `npm run contracts:test` (135 tests) and `npm run contracts:coverage` (100% line/statement).
- Audit rationale and known limitations: `docs/blockchain/AUDIT_REPORT.md`.
- Architecture rationale: `docs/blockchain/ARCHITECTURE_DECISION.md`.
