# TrustGraph — Blockchain Code Audit Report

**Date:** 2026-10-10
**Scope:** Smart contracts and blockchain infrastructure only (`contracts/`, `test/`, deployment tooling)
**Auditor basis:** Full source inspection + read-only Monad Testnet RPC queries + official Monad documentation
**Method note:** This audit re-examines primary sources; it does not rely on `PROJECT_AUDIT.md` (which predates recent contract rewrites).

---

## 1. Functions Currently Implemented

### TrustGraphRegistry.sol (`contracts/TrustGraphRegistry.sol`, Solidity ^0.8.20)

| Function | Visibility / Mutability | Access |
|---|---|---|
| `owner()` | public view | — |
| `authorizedIssuers(address)` | public view | — |
| `approveIssuer(address)` | external, onlyOwner | Registry owner |
| `removeIssuer(address)` | external, onlyOwner | Registry owner |
| `isIssuer(address)` | external view | — (true for owner implicitly) |
| `issueAttestation(subject, claimType, evidenceHash, evidenceUri, expiry)` | external, onlyIssuer, returns `uint256 id` | Authorized issuer or owner |
| `revokeAttestation(id, reason)` | external | Original issuer or registry owner |
| `getAttestation(id)` | external view, reverts if missing | — |
| `isValid(id)` | external view | — |
| `getValidityStatus(id)` | external view returns `ValidityStatus` | — |
| `getAttestationsBySubject(subject)` | external view | — |
| `getAttestationsByIssuer(issuer)` | external view | — |
| `getTotalAttestations()` | external view | — |
| `getAllAttestationIds()` | external view | — |
| `transferOwnership(newOwner)` | external, onlyOwner | Registry owner |

### ProofOfWorkRegistry.sol (`contracts/ProofOfWorkRegistry.sol`, Solidity ^0.8.20)

| Function | Visibility / Mutability | Access |
|---|---|---|
| `owner()`, `authorizedVerifiers(address)` | public view | — |
| `approveVerifier(address)` / `removeVerifier(address)` | external, onlyOwner | Registry owner |
| `isVerifier(address)` | external view | — (owner implicit) |
| `registerWork(workId, workType, evidenceHash, metadataUri)` | external | Any caller (becomes `worker`) |
| `verifyWork(workId)` | external, onlyVerifier | Authorized verifier or owner |
| `rejectWork(workId, reason)` | external, onlyVerifier | Authorized verifier or owner |
| `revokeWork(workId, reason)` | external, onlyVerifier | Authorized verifier or owner |
| `getWork(workId)` | external view, reverts if missing | — |
| `isVerified(workId)` | external view | — |
| `getWorksByWorker(worker)` | external view | — |
| `getWorkerStats(worker)` | external view (4 counters) | — |
| `getAllWorkIds()` / `getTotalWorkCount()` | external view | — |
| `transferOwnership(newOwner)` | external, onlyOwner | Registry owner |

Both contracts comply with `AGENTS.md` Sections 8–9 naming requirements. `PROJECT_AUDIT.md`'s claims of missing `rejectWork`/`approveVerifier`/`removeVerifier`/`isVerifier` and a `REJECTED → VERIFIED` hole are **outdated** — the contracts were rewritten since that audit.

## 2. Events Emitted

- **TrustGraphRegistry:** `IssuerApproved(issuer)`, `IssuerRemoved(issuer)`, `AttestationIssued(id, issuer, subject, claimType, evidenceHash, expiry)`, `AttestationRevoked(id, issuer, reason, timestamp)`, `OwnershipTransferred(previousOwner, newOwner)`.
- **ProofOfWorkRegistry:** `WorkSubmitted(workId, worker, workType, evidenceHash, metadataUri)`, `WorkVerified(workId, verifier, timestamp)`, `WorkRejected(workId, verifier, reason, timestamp)`, `WorkRevoked(workId, verifier, reason, timestamp)`, `VerifierApproved(verifier)`, `VerifierRemoved(verifier)`, `OwnershipTransferred(previousOwner, newOwner)`.

Both satisfy `AGENTS.md` Section 9 event requirements and carry indexed keys suitable for off-chain indexing.

## 3. Access Control

- **Owner:** sole authority for issuer/verifier management and ownership transfer; both contracts check `require(msg.sender == owner)` via `onlyOwner`.
- **Issuer/Verifier:** `onlyIssuer` / `onlyVerifier` modifiers accept explicitly authorized addresses **or** the current owner (implicit privilege).
- **Revocation:** TrustGraphRegistry restricts revocation to the *original issuer* or *current owner*. ProofOfWorkRegistry allows any current verifier for `revokeWork` (spec-permissive).
- Constructor auto-authorizes the deployer as owner + issuer/verifier.

## 4. State Transitions

- **TrustGraphRegistry:** validity is *derived*, not stored: `REVOKED` > `EXPIRED` (past `expiry`, where `0` = perpetual) > `INVALID_ISSUER` (authorization removed) > `VALID`. Revocation is one-way (`revoked` flag never cleared). De-authorizing an issuer retroactively demotes all their attestations to `INVALID_ISSUER`.
- **ProofOfWorkRegistry:** strict state machine — `PENDING → VERIFIED`, `PENDING → REJECTED`, `VERIFIED → REVOKED`; every other transition reverts ("Can only verify/reject/revoke …"). `REJECTED → VERIFIED` is correctly blocked, satisfying `AGENTS.md` Section 5.

## 5. Input Validation

Both contracts validate: zero addresses (subject/issuer/verifier/new owner), zero/empty identifiers (`claimType`, `evidenceHash`, `workId`), duplicate authorization (`approveIssuer`/`approveVerifier`), removal of non-authorized addresses, nonexistent records, repeated revocation, and (TrustGraphRegistry) expiry strictly in the future unless `0` (perpetual).

Not validated (documented design choices): `subject == issuer` self-attestation is permitted; `evidenceUri` may be empty; dynamic string lengths (`evidenceUri`, `revocationReason`, rejection reasons) are unbounded (gas-exposure only, no DoS vector in state-changing paths). ProofOfWorkRegistry enum parameters are ABI-boundary validated by Solidity 0.8.x.

## 6. Compilation

Not yet verifiable in-repository: **no Solidity toolchain exists** (no Hardhat/Foundry config, no `scripts/`, no `deployments/`). Both contracts appear syntactically valid for ^0.8.20; compilation will be confirmed in Phase 3 after tooling setup.

## 7. Application Expectations (read-only inspection)

- `src/lib/contract/abi.ts` defines a human-written `TrustGraphRegistryABI` that matches `TrustGraphRegistry.sol` **function-for-function and event-for-event** (including the tuple output of `getAttestation` and `getValidityStatus → uint8`).
- `src/contracts/ProofOfWorkRegistryABI.ts` is a one-line re-export alias of the TrustGraph ABI — the legacy name is vestigial.
- `src/hooks/useTrustGraph.ts` issues real wagmi `writeContract` calls to `issueAttestation` / `revokeAttestation` — i.e., the frontend is integrated against the **attestation model**.
- `src/lib/contract/config.ts` points `CONTRACT_CONFIG` at `TrustGraphRegistryABI` + the hardcoded address below.
- `src/config/chain.ts` defines Monad Testnet (ID 10143, RPC `https://testnet-rpc.monad.xyz`, explorer `https://testnet.monadexplorer.com`).
- `src/config/wagmi.ts` uses a single injected connector.

## 8. Hardcoded Address Investigation — `0x4386926019A8B74431eBDeF7c2718E340621B903`

Read-only RPC queries against `https://testnet-rpc.monad.xyz` (2026-10-10):

| Query | Result |
|---|---|
| `eth_chainId` | `0x279f` = **10143** (confirmed Monad Testnet) |
| `eth_getCode(0x4386…B903)` | **`0x` — no contract code at this address** |

The official Monad docs record a **testnet reset on 2025-12-16**, so any prior deployment at this address no longer exists. Consequence: the frontend's default address is an empty EOA and every LIVE-mode transaction against it would fail. The stale value must **not** be patched by this task (frontend files are out of scope); the new deployment metadata (`deployments/monad-testnet.json`) will carry the authoritative address for the integration phase.

## 9. Solidity Tooling / Deployment Artifacts

None exist. No `hardhat.config.ts` / `foundry.toml`, no deployment scripts, no deployment metadata, no compiled artifacts, no chainlist-verified deployment record. `.gitignore` already excludes `artifacts/`, `cache/`, `coverage/`, and real `.env` files (with `!.env.example`) — compatible with Hardhat out of the box.

## 10. Do Existing Tests Execute Solidity?

**No.** `test/trustGraph.test.ts` is a pure Node.js simulation: it re-implements the attestation state machine in TypeScript (with `node:assert`) and checks SHA-256 determinism via `node:crypto`. It never compiles or executes EVM bytecode. It is a useful behavioral mirror of TrustGraphRegistry and must remain untouched; it does not satisfy the contract-test requirement.

## 11. Findings Register (to address in Phase 4)

| # | Severity | Finding | Disposition |
|---|---|---|---|
| F-1 | **Medium** | Stale role retention after `transferOwnership`: the previous owner's explicit `authorizedIssuers`/`authorizedVerifiers` mapping entry survives ownership transfer, so a former owner can keep issuing attestations (TGR) or verifying/revoking work (PWR) indefinitely. | Fix in both contracts: clear the previous owner's authorization on transfer (ABI-compatible; emits existing role events). Regression tests required. |
| F-2 | Low | Validity precedence (REVOKED > EXPIRED > INVALID_ISSUER) is correct but implicit; matches the frontend's `evaluateValidity` mirror exactly. | Document in handoff. |
| F-3 | Low | Unbounded dynamic strings (`evidenceUri`, `revocationReason`, rejection reasons) — gas exposure only. | Document; no change (a cap would be a breaking interface change). |
| F-4 | Low | `getWorkerStats` / `getAllAttestationIds` are O(n) unbounded views. | Document; direct frontend to events/pagination for scale. |
| F-5 | Info | Existence is keyed on `issuedAt != 0` / `createdAt != 0` (zero block timestamp theoretically collides). Practically impossible on Monad. | Document only. |
| F-6 | Info | Evidence hashing convention: off-chain **SHA-256** (Web Crypto) stored as `bytes32`; contract treats it as opaque. No Keccak-256 substitution exists on-chain. Canonical digest encoding documented in handoff. | Preserve; document. |
| F-7 | Info | Frontend explorer URL (`testnet.monadexplorer.com`) differs from the current official explorer (`testnet.monadvision.com` per docs.monad.xyz). | Out of scope; noted in `INTEGRATION_HANDOFF.md`. |

## 12. Network Configuration Validation (official docs, 2026-10-10)

| Value | Repo usage | Official (docs.monad.xyz) | Status |
|---|---|---|---|
| Chain ID | 10143 | 10143 (`0x279f`, RPC-confirmed) | ✅ |
| RPC URL | `https://testnet-rpc.monad.xyz` | Same (HTTP + WSS) | ✅ |
| Currency | MON, 18 decimals | MON | ✅ |
| Explorer | `testnet.monadexplorer.com` (frontend) | `testnet.monadvision.com` | ⚠️ frontend outdated (F-7) |
| Reset | — | Testnet reset 2025-12-16 | explains empty address (§8) |
