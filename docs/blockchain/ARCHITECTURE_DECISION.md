# Architecture Decision Record — Canonical Contract for the Monad Testnet MVP

**Date:** 2026-10-10
**Status:** Accepted (confirmed by product owner, 2026-10-10)
**Scope:** Blockchain/smart-contract layer only. No frontend or backend files are modified by this decision; integration expectations are recorded in `INTEGRATION_HANDOFF.md`.

---

## Decision

**`contracts/TrustGraphRegistry.sol` is the canonical contract** for the TrustGraph MVP and the only contract to be deployed to Monad Testnet.

`contracts/ProofOfWorkRegistry.sol` is **retained and deferred**: it stays in the repository, compiles, and carries its own unit tests, but it is not deployed and not part of the integration surface.

The two workflows are **not merged** into a single contract — the added state space and attack surface buy nothing for the MVP.

## Why

1. **The application is already integrated against the attestation model.**
   - `src/lib/contract/abi.ts` mirrors `TrustGraphRegistry.sol` function-for-function and event-for-event.
   - `src/hooks/useTrustGraph.ts` performs real wagmi `writeContract` calls to `issueAttestation` / `revokeAttestation`.
   - All product pages (`/issue`, `/profile/:address`, `/graph/:address`, `/verify/:id`) are attestation-model.
   Selecting `ProofOfWorkRegistry` would invalidate every one of these integration points and force rework on the frontend/backend teams — the opposite of this task's isolation goal.

2. **The product specification agrees.** `README.md` — the current product document — defines the lifecycle `CLAIM → EVIDENCE → ISSUER → ATTESTATION → CURRENT VALIDITY`, the issuer authorization model, discrete `ValidityStatus` values, and the demo personas. `TrustGraphRegistry.sol` implements exactly this.

3. **The application's own test suite agrees.** `test/trustGraph.test.ts` simulates the attestation state machine (issuer authorization, revocation with mandatory reason, expiry, de-authorization propagation).

4. **The conflict is a stale document, not a live design question.** `AGENTS.md` describes the earlier *Proof-of-Work Passport* workflow (developer submits work → verifier approves/rejects). The repository demonstrably pivoted to the TrustGraph attestation model after that document was written; `PROJECT_AUDIT.md` confirms that era, and both contracts have since been rewritten. `TrustGraphRegistry` also satisfies the underlying product principle of `AGENTS.md` (evidence → verifier → on-chain record → public inspection) while matching the shipped code.

## Workflow Supported

```text
Authorized issuer creates an attestation for a subject
        ↓
Attestation stored with claim type, evidenceHash (SHA-256, bytes32), evidenceUri, expiry
        ↓
Validity is evaluated dynamically:
    REVOKED  — issuer or owner revoked (historical reason preserved)
    EXPIRED  — past expiry (0 = perpetual)
    INVALID_ISSUER — issuer authorization removed
    VALID    — none of the above
        ↓
Anyone can inspect validity, evidence hash, issuer, timestamps, and tx on Monad
```

## Essential Functions (integration surface)

- **Writes:** `issueAttestation(subject, claimType, evidenceHash, evidenceUri, expiry)`, `revokeAttestation(id, reason)`, `approveIssuer(issuer)`, `removeIssuer(issuer)`, `transferOwnership(newOwner)`
- **Reads:** `getAttestation(id)`, `isValid(id)`, `getValidityStatus(id)`, `getAttestationsBySubject(subject)`, `getAttestationsByIssuer(issuer)`, `getTotalAttestations()`, `getAllAttestationIds()`, `isIssuer(issuer)`, `owner()`, `authorizedIssuers(address)`
- **Events:** `AttestationIssued`, `AttestationRevoked`, `IssuerApproved`, `IssuerRemoved`, `OwnershipTransferred`

## Alternative Contract Disposition

`ProofOfWorkRegistry.sol` (work-review workflow: `registerWork → verify/reject → revoke`, strict `PENDING/VERIFIED/REJECTED/REVOKED` transitions) remains in `contracts/` and is tested so that:

- the historical product direction is not silently deleted;
- a future product decision to reintroduce the two-step review workflow has a tested starting point.

It is excluded from deployment metadata and from `INTEGRATION_HANDOFF.md`'s canonical interface.

## Compatibility Requirements for Future Integration

1. The frontend must point at the **newly deployed** address from `deployments/monad-testnet.json` (the current hardcoded `0x4386…B903` has no code on the post-reset testnet). Frontend files are not modified by this task.
2. The canonical ABI is the compiled artifact ABI (`artifacts/contracts/TrustGraphRegistry.sol/TrustGraphRegistry.json`), also exported for handoff. The human-written ABI in `src/lib/contract/abi.ts` currently matches it; only the address needs updating at integration time.
3. Hardening change of record: `transferOwnership` now de-authorizes the previous owner (emits `IssuerRemoved`). This is ABI-compatible with the existing frontend ABI; no integration change is required for it.
4. Evidence hashing stays off-chain SHA-256 rendered as `bytes32` (see `INTEGRATION_HANDOFF.md` for canonical encoding rules).

## Unresolved Conflicts (documentation debt)

- `AGENTS.md` still specifies the ProofOfWork workflow (Sections 4–9, 48–49) and three `Work`-type categories, while the repository, `README.md`, and this decision implement the attestation model with three `ClaimType` values. **`AGENTS.md` was not modified** (out of scope); the discrepancy is recorded here for the documentation owners to reconcile.
- `PROJECT_AUDIT.md` predates the contract rewrites; its contract-level findings (missing functions, `REJECTED → VERIFIED` hole, `string evidenceHash`) no longer apply. Superseded by `AUDIT_REPORT.md` for blockchain matters.
- Frontend explorer URL (`testnet.monadexplorer.com`) differs from the current official explorer (`testnet.monadvision.com`). Frontend concern; noted for integration.
