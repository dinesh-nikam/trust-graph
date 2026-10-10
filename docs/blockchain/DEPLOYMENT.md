# Deployment Guide — TrustGraphRegistry

> **Current status: NOT DEPLOYED.**
> No TrustGraphRegistry has ever been broadcast to Monad testnet from this repository.
> Deployment requires an **explicit human authorization checkpoint** — the deploy
> script is never run automatically, and no agent or CI job is permitted to
> broadcast without an explicit, per-deployment go-ahead from the repository owner.

This guide covers deploying `contracts/TrustGraphRegistry.sol` to **Monad testnet**
(chain ID **10143**) and verifying the deployment afterwards.

---

## 1. Prerequisites

### 1.1 A funded testnet-only wallet

- Use a wallet that holds **MON on Monad testnet only**.
- Never point this pipeline at a wallet holding mainnet funds.
- If you need testnet MON, use the official Monad testnet faucet.
- The deployer becomes the contract `owner` and is granted issuer rights
  automatically by the contract constructor.

### 1.2 Provide the deployer private key

`scripts/deploy.ts` resolves `DEPLOYER_PRIVATE_KEY` through Hardhat 3's
configuration-variable system. It accepts the key from either the environment
variable **or** the encrypted Hardhat keystore (env takes precedence).

Recommended — store the key in the Hardhat keystore so it never sits in a
shell variable or file inside the repo:

```bash
npx hardhat keystore set DEPLOYER_PRIVATE_KEY
```

Alternative — export it only for the current shell session:

```bash
export DEPLOYER_PRIVATE_KEY=0x...
```

Rules enforced by this repository:

- **Never commit** the key, a `.env` file containing it, or any mnemonic.
- **Never paste** the key into chat, issues, screenshots, or scripts.
- The script and tests never print the resolved key.
- The `.gitignore` already excludes `.env`.

If the key cannot be resolved from either source, the script aborts with
`[ABORT] Could not resolve DEPLOYER_PRIVATE_KEY` before any RPC call is made.

### 1.3 Optional: custom RPC

The pipeline defaults to the public endpoint `https://testnet-rpc.monad.xyz`.
Override it with:

```bash
export MONAD_TESTNET_RPC_URL=https://your-provider.example/v3/your-key
```

---

## 2. Network constants

| Constant | Value |
| --- | --- |
| Network name (Hardhat) | `monadTestnet` |
| Chain ID | `10143` |
| Default RPC | `https://testnet-rpc.monad.xyz` |
| Explorer | `https://testnet.monadvision.com` |
| Compiler | `solc 0.8.28`, optimizer on, 200 runs |

The chain ID is **hard-validated before any transaction is sent**. If the RPC
reports a different chain ID the script aborts with `[ABORT]`.

---

## 3. Deploy

```bash
npm run contracts:deploy:testnet
```

This runs `hardhat run scripts/deploy.ts --network monadTestnet`, which performs
the following sequence, aborting at the first failure with an `[ABORT]` message
and exit code 1:

1. Verify `DEPLOYER_PRIVATE_KEY` is present (before touching the network).
2. Connect to `monadTestnet` and print chain ID, deployer address, and balance.
3. **Chain-ID check**: refuse to deploy if the RPC's chain ID is not `10143`.
4. **Balance check**: refuse to deploy if the deployer holds 0 MON.
5. Deploy `TrustGraphRegistry` and wait for confirmation.
6. **Receipt check**: abort unless the deployment receipt has `status === 1`.
7. **Smoke checks against live state**:
   - `owner() === deployer`
   - `isIssuer(deployer) === true`
   - `getTotalAttestations() === 0`
8. Write the deployment record and print the explorer link.

If any smoke check fails the script aborts **after** the deploy transaction —
the contract exists but the record is not written; see §6.

### Expected output (shape)

```text
Connecting to Monad testnet...
  chain id : 10143
  deployer : 0x...
  balance  : 12.345 MON
Deploying TrustGraphRegistry...
  address  : 0x...
  tx hash  : 0x...
  block    : 1234567
  smoke checks: owner, issuer grant, empty registry — all OK
[OK] Deployment record written to deployments\monad-testnet.json
[OK] Explorer: https://testnet.monadvision.com/address/0x...
```

---

## 4. Deployment record

On success the script writes `deployments/monad-testnet.json`
(git-ignored path, created fresh on each deploy):

```json
{
  "network": "monadTestnet",
  "chainId": 10143,
  "rpcUrl": "https://testnet-rpc.monad.xyz",
  "explorerUrl": "https://testnet.monadvision.com",
  "contract": "TrustGraphRegistry",
  "address": "0x…",
  "deployer": "0x…",
  "transactionHash": "0x…",
  "blockNumber": 1234567,
  "deployedAt": "2026-10-10T…Z",
  "compiler": {
    "solc": "0.8.28",
    "optimizer": { "enabled": true, "runs": 200 }
  },
  "status": "deployed"
}
```

This file is the single source of truth for the deployed address. Downstream
consumers (frontend integration, explorers, tooling) should read the address
from here — not from chat logs or screenshots.

---

## 5. Verify the deployment

Read-only check; requires **no private key** and no gas.

```bash
npm run contracts:check:testnet
```

- Reads `deployments/monad-testnet.json` by default.
- To check an arbitrary address (e.g. re-verifying after a testnet reset):

  ```bash
  DEPLOYMENT_ADDRESS=0xYourContractAddress npm run contracts:check:testnet
  ```

Checks performed against the live RPC:

- Chain ID is `10143`.
- Contract code exists at the address (`eth_getCode` non-empty). If empty, the
  message says the **testnet may have been reset or the address is stale** —
  this is exactly the failure mode that made the previously assumed frontend
  address `0x4386926019A8B74431eBDeF7c2718E340621B903` unusable; it was
  independently re-verified as **empty** on 2026-10-10.
- Reads and prints `owner()`, `isIssuer(owner)`, `getTotalAttestations()`,
  the owner's MON balance, and the current gas price.

The `DEPLOYMENT_ADDRESS` env var exists because `hardhat run` rejects
unconsumed positional CLI arguments (Hardhat error HHE506).

---

## 6. If a deployment partially fails

| Symptom | Meaning | Action |
| --- | --- | --- |
| `[ABORT]` before "Deploying…" | Pre-flight guard tripped (key, chain ID, balance). | Nothing was broadcast. Fix the cause and re-run. |
| `[ABORT]` after "Deploying…" (receipt/smoke) | Transaction sent but post-checks failed, or checks errored. | Contract may exist on-chain. **Do not deploy a replacement blindly** — run `contracts:check:testnet -- ` with the tx's contract address, or look it up on the explorer, and reuse the live instance. Re-deploying wastes MON and forks the source of truth. |
| Record written but explorer link 404s immediately | Explorer indexing lag. | Re-check in a few minutes; the on-chain state is authoritative. |

---

## 7. Authorization checkpoint (Phase 8)

Per this repository's deployment policy:

> **Stop before broadcasting a testnet deployment until explicit authorization
> is obtained.**

Concretely:

- The deploy command is run **by a human**, on demand, only after the change
  set that produced the bytecode has been reviewed.
- Any assistant/agent session must ask for and receive an explicit
  authorization for that specific broadcast before running the deploy
  command. "The task prompt was provided" is **not** authorization.
- If authorization is declined or pending, the repository stays in
  **NOT DEPLOYED** state and all integration docs keep pointing at the
  not-yet-valid address in the handoff doc.

After an authorized deployment succeeds:

1. Copy `address` + `transactionHash` + `deployedAt` from
   `deployments/monad-testnet.json` into
   `docs/blockchain/INTEGRATION_HANDOFF.md` §1 (status table).
2. Hand the address to the frontend team — they own
   `src/lib/contract/config.ts` (see handoff §9.2). Blockchain scope does not
   edit frontend files.
3. Re-run `npm run contracts:check:testnet` and confirm all smoke values.

---

## 8. Recompilation and determinism

- Compiled artifacts live in `artifacts/` (git-ignored) and are regenerated by
  `npm run contracts:compile`.
- Bytecode is reproducible for a fixed `solc`/settings pair. The record stores
  the compiler settings (`0.8.28`, optimizer 200 runs) used for the deploy; if
  you change either in `hardhat.config.ts`, redeploy rather than mixing
  artifact generations.
