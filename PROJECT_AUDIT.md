# Proof-of-Work Passport — Project Audit (Phase 1)

**Audit Date:** October 2026  
**Auditor:** Antigravity AI Engineering Agent  
**Repository:** Proof-of-Work Passport (`pow-passport`)  
**Specification Reference:** `AGENTS.md`

---

## 1. Current State

**Classification: B. Partially Implemented**

The repository is not empty; it contains an existing, working React + TypeScript + Tailwind CSS frontend shell with mock-driven pages and Wagmi/Viem boilerplate configured for Monad testnet. It also includes an initial Solidity contract draft (`contracts/ProofOfWorkRegistry.sol`). 

However:
- **Contract Mismatches:** The existing contract does not strictly conform to `AGENTS.md` (it lacks explicit `rejectWork`, `approveVerifier`, `removeVerifier`, `isVerifier` functions, and permits an invalid transition `REJECTED -> VERIFIED`).
- **No Contract Testing/Tooling:** There is no Hardhat/Foundry environment, no automated Solidity tests, and no deployment scripts.
- **Frontend Running on Mock Simulation:** The frontend currently routes mutations through an in-memory/localStorage service (`src/services/workService.ts`) rather than executing real on-chain transactions on Monad testnet.
- **Wallet Incompleteness:** The wallet connection in `Navbar.tsx` only handles a happy path and does not expose wrong-network detection or network switching controls as mandated by `AGENTS.md` Rule 15.
- **Missing Type Standardization:** Shared types do not expose the exact requested domain models (`Work`, `Evidence`, `Passport`, `Verifier`, `Transaction`) as top-level exports.
- **Missing Environment Config:** No `.env.example` or `.env` files exist.

---

## 2. Tech Stack

The workspace currently has the following dependencies installed in `package.json`:

### Core Technologies
- **Runtime / Framework:** React 18.3.1, ReactDOM 18.3.1, TypeScript 5.7.2
- **Bundler:** Vite 6.0.3 with `@vitejs/plugin-react` 4.3.4
- **Routing:** `react-router-dom` 6.28.1
- **Styling:** Tailwind CSS 3.4.17, PostCSS 8.4.49, Autoprefixer 10.4.20, `clsx` 2.1.1, `tailwind-merge` 2.5.5
- **Icons:** `lucide-react` 0.468.0
- **State & Data Fetching:** `@tanstack/react-query` 5.62.8
- **Web3 / Blockchain Client:** `wagmi` 2.14.6, `viem` 2.21.57

### Tooling Status
- `npm run build` runs `tsc -b && vite build` and builds successfully.
- No test runner (Vitest or Jest) is installed for the frontend.
- No Solidity toolchain (Foundry `forge` or Hardhat) is configured in `package.json`.

---

## 3. Architecture

### Current Structure
```text
trust-graph/
├── .agents/                      # Monad skill and agent definitions
├── contracts/
│   └── ProofOfWorkRegistry.sol  # Initial contract draft
├── src/
│   ├── components/layout/       # AppLayout, Navbar, Footer
│   ├── config/                  # chain.ts (Monad Testnet 10143), wagmi.ts
│   ├── contracts/               # ProofOfWorkRegistryABI.ts
│   ├── data/                    # mockData.ts (Alex & Sarah seed passports)
│   ├── hooks/                   # useWorkRegistry.ts (wraps workService)
│   ├── pages/                   # HomePage, PassportPage, SubmitPage, VerifyPage, ProofDetailPage
│   ├── services/                # workService.ts (localStorage fallback simulation)
│   ├── types/                   # index.ts
│   ├── utils/                   # formatters.ts (SHA-256 calculation, formatting)
│   ├── App.tsx                  # React Router definitions
│   ├── main.tsx                 # WagmiProvider + QueryClientProvider root
│   └── index.css                # Tailwind directives and base theme
├── AGENTS.md                    # Project Rules & Specifications
└── README.md                    # Product specification document
```

### Presentation & Business Logic Coupling
- Pages currently invoke custom hooks (`usePassport`, `useWorkItem`, `useVerifierQueue`, `useWorkActions`), which delegate to `workService.ts`.
- `workService.ts` contains simulated data manipulation and generates simulated transaction/work IDs using `Math.random()`. Per `AGENTS.md` Rule 12, `Math.random()` and fake transaction states must be eradicated in live mode.

---

## 4. Blockchain

### 4.1 Existing Chain Configuration
- Monad Testnet is defined in `src/config/chain.ts`:
  - **Chain ID:** `10143`
  - **RPC URL:** `https://testnet-rpc.monad.xyz`
  - **Explorer URL:** `https://testnet.monadexplorer.com`
  - **Native Currency:** `MON` (18 decimals)

### 4.2 Existing Wallet Configuration
- Configured via Wagmi `createConfig` with injected connector.
- Missing:
  - Wrong-network detection warning in UI.
  - Interactive switch network mechanism.
  - Multi-connector support (general injected + MetaMask).

### 4.3 Existing Contract (`ProofOfWorkRegistry.sol`)
The contract currently in `contracts/ProofOfWorkRegistry.sol` has:
- `registerWork(bytes32 workId, WorkType workType, string evidenceHash, string metadataUri)`
- `verifyWork(bytes32 workId, bool approve)`
- `revokeWork(bytes32 workId, string reason)`
- `getWork(bytes32 workId)`
- `isVerified(bytes32 workId)`
- `getWorksByWorker(address worker)`
- `getWorkerStats(address worker)`
- `setVerifier(address verifier, bool isAuthorized)`

### 4.4 Existing ABI Handling
- `src/contracts/ProofOfWorkRegistryABI.ts` contains an ABI array mirroring `ProofOfWorkRegistry.sol`.
- Contract address is currently hardcoded in `src/config/chain.ts` (`0x4386926019A8B74431eBDeF7c2718E340621B903`).

---

## 5. Existing Problems

1. **Contract Specification Mismatch with `AGENTS.md`:**
   - **Invalid state transition allowed:** Line 151 of `ProofOfWorkRegistry.sol` allows `record.status == WorkStatus.REJECTED` to transition to `VERIFIED`. `AGENTS.md` Section 5 explicitly dictates: `REJECTED -> VERIFIED invalid`.
   - **Missing discrete functions:** `AGENTS.md` Section 8 & 9 requires `rejectWork(...)`, `approveVerifier(...)`, `removeVerifier(...)`, and `isVerifier(...)`. The current contract combines reject into `verifyWork(bytes32, bool)` and uses `setVerifier(...)`.
   - **Missing events:** `AGENTS.md` requires `WorkRejected`, `VerifierApproved`, and `VerifierRemoved`. The current contract emits `VerifierStatusUpdated` and does not have `WorkRejected`.
   - **Evidence Hash Type:** The existing contract uses `string evidenceHash`, whereas `AGENTS.md` Section 7 and 12 defines `bytes32 evidenceHash`.

2. **Frontend Mock vs. Live Ambiguity:**
   - `workService.ts` writes pseudo hashes generated via `Math.random()` to `localStorage`. `AGENTS.md` Rule 3 ("Never fake blockchain state") and Rule 27 ("Never mix mock and real blockchain data silently") require distinct `MOCK MODE` vs `LIVE MODE` flags and indicators.

3. **Incomplete Wallet Handling:**
   - If a user is on Ethereum Mainnet or Sepolia, the app continues to display without notifying them they are on the wrong network or offering a "Switch to Monad Testnet" action.

4. **Missing Environment Variables:**
   - Contract addresses and RPC endpoints are hardcoded without `.env.example` configuration support.

5. **Type Nomenclature Inconsistencies:**
   - `src/types/index.ts` defined `WorkRecord` and `DeveloperPassport`, but lacked canonical `Work`, `Evidence`, `Passport`, `Verifier`, `Transaction` definitions as requested in Phase 1 Foundation.

---

## 6. Recommended Changes (Phase 1 & Onward)

1. **Centralize Blockchain Layer (`src/lib/`):**
   - Establish `src/lib/blockchain/` and `src/lib/contract/` single-source-of-truth modules for chain definitions, contract address configuration, ABI, and explorer helpers.
2. **Standardize Shared Types (`src/types/index.ts`):**
   - Implement `Work`, `WorkStatus`, `WorkType`, `Evidence`, `Passport`, `Verifier`, and `Transaction` conforming to `AGENTS.md`.
3. **Harmonize `ProofOfWorkRegistry.sol` with `AGENTS.md`:**
   - Update contract structure with explicit `rejectWork`, `approveVerifier`, `removeVerifier`, `isVerifier`, `bytes32 evidenceHash`, and enforce strict transition rules (`REJECTED` cannot become `VERIFIED`, `REVOKED` cannot become `VERIFIED`).
4. **Upgrade Wallet Component (`Navbar.tsx` & Wallet Controls):**
   - Add network check against `monadTestnet.id` (`10143`), display "Wrong Network" badge with one-click `switchChain({ chainId: 10143 })`.
5. **Add `.env.example`:**
   - Add environment template for `VITE_PROOF_OF_WORK_REGISTRY_ADDRESS` and `VITE_MONAD_RPC_URL`.
6. **Add Scripting in `package.json`:**
   - Add `"typecheck": "tsc --noEmit"` to standard verification scripts.

---

## 7. Missing Components for Full MVP

- **Phase 2:**
  - Automated tests for `ProofOfWorkRegistry.sol`.
  - Deployment workflow to Monad Testnet.
  - Verified contract address on Monad Testnet.
- **Phase 3 - 5:**
  - Real contract integration hooks: `useSubmitWorkOnChain`, `useVerifyWorkOnChain`, `useRejectWorkOnChain`, `useRevokeWorkOnChain`, `usePassportOnChain`.
  - Transaction lifecycle feedback (Ready -> Waiting for Wallet -> Submitted -> Confirming -> Confirmed).
  - Clear toggle / indicator for `MOCK MODE` vs `LIVE MONAD ON-CHAIN`.
- **Phase 6 - 7:**
  - Direct on-chain verification links to `testnet.monadexplorer.com`.
  - Historical revocation record preservation and visual display.

---

## 8. Risk Areas

1. **RPC Reliability on Testnet:**
   - Public testnet RPC `https://testnet-rpc.monad.xyz` can occasionally rate-limit or drop calls. A fallback RPC configuration should be supported via `.env`.
2. **Gas Estimation on Monad:**
   - Monad charges based on `gas_limit` and uses distinct execution patterns. When calling write methods, we must ensure gas parameters adhere to Monad standards (as detailed in the `gas` skill).
3. **State Desynchronization:**
   - When a verifier approves work on-chain, transaction indexing and Wagmi cache invalidation must be handled cleanly to prevent stale status in public views.
