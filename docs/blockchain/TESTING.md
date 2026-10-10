# TrustGraph — Contract Testing Guide

## What exists

| Suite | File | Count | Runner |
| --- | --- | --- | --- |
| `ProofOfWorkRegistry` contract tests | `test/contracts/ProofOfWorkRegistry.test.ts` | 70 | Hardhat Mocha + ethers |
| `TrustGraphRegistry` contract tests | `test/contracts/TrustGraphRegistry.test.ts` | 65 | Hardhat Mocha + ethers |
| App-level lifecycle simulation (frontend team) | `test/trustGraph.test.ts` | — | `node --experimental-strip-types` via `npm test` |

**Important:** `test/trustGraph.test.ts` is an application-level simulation owned by the frontend team. It is NOT a contract test and must never be counted as one. Hardhat is configured (`paths.tests.mocha: "test/contracts"`) so `hardhat test` only runs the two contract suites; the app-level file runs only under `npm test`.

## Commands

```bash
npm run contracts:compile    # compile contracts, regenerate artifacts/
npm run contracts:test       # run the 135 contract tests (local EVM)
npm run contracts:coverage   # same suite with coverage instrumentation
npm test                     # app-level simulation (frontend-owned, untouched here)
```

Current results: **135 passing, 0 failing; 100.00% line and statement coverage** on both `contracts/ProofOfWorkRegistry.sol` and `contracts/TrustGraphRegistry.sol`.

## How the tests work

- The suite targets Hardhat's local simulated EVM (`network.getOrCreate()`); nothing is ever broadcast off-machine.
- Both test files share one network connection created at module load (`await network.getOrCreate()` at the top of each file). Sharing the instance keeps `loadFixture` snapshot bookkeeping consistent across files — using `network.connect()` per file corrupts snapshots (top-level `connect()` is also deprecated in Hardhat 3).
- `networkHelpers.loadFixture` provides per-test state isolation: every test starts from a fresh deployment via fixture functions (`deployRegistryFixture`, `pendingWorkFixture`, `verifiedWorkFixture`, and their TrustGraph equivalents).
- Time-dependent behavior (expiry boundaries, pinned timestamps in events) uses `networkHelpers.time` (`setNextBlockTimestamp`, `increaseTo`, `latest`).
- Zero values are explicit: `ZERO_ADDRESS` (`0x0000000000000000000000000000000000000000`) for address params, `ZeroHash` for bytes32 params. Never pass a 32-byte hash where a 20-byte address is expected — ethers will treat it as an ENS name.

### Coverage by behavior

Both contracts:

- Deployment/initialization (owner set, implicit issuer/verifier privilege, empty registry)
- Authorization management: approve/remove, non-owner rejection, zero-address rejection, duplicate/never-authorized rejection, implicit-privilege persistence
- Core operations: full validation matrix of reverts, exact event emission with pinned timestamps
- Complete invalid state-transition matrices (e.g. `PENDING→REVOKED`, `REJECTED→VERIFIED`, `REVOKED→VERIFIED`, `VERIFIED→REJECTED`, double-verify, double-reject, double-revoke)
- TrustGraph-specific: inclusive expiry boundary (valid at `T-1`, expired at `T`), issuance revert when `expiry == block.timestamp`, perpetual attestations (`expiry = 0`), status precedence (`REVOKED > EXPIRED > INVALID_ISSUER > VALID`), validity restoration on issuer re-approval, historical integrity after revocation
- Ownership-transfer security (audit finding F-1 regressions): previous owner stripped of explicit grant and blocked from every privileged action; self-transfer keeps the grant; new owner receives the implicit privilege; original issuers keep revocation rights over their own attestations
- Evidence integrity: NIST SHA-256 vector round-trip, Node-computed SHA-256 of a canonical manifest preserved without transformation, UTF-8 bytes32 claim types stored raw (no keccak), opaque bytes32 work ids

## Maintenance notes

- Hardhat 3 + `@nomicfoundation/hardhat-toolbox-mocha-ethers`: the deprecated `.to.not.be.reverted` matcher throws in this version — assert with plain `await` plus state checks instead. `revertedWith` and `emit().withArgs()` work normally.
- `hardhat test --coverage` is the coverage entry point (there is no separate `coverage` task in Hardhat 3).
- New tests belong in `test/contracts/` only.
