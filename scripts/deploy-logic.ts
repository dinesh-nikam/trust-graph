/**
 * Deploys TrustGraphRegistry to Monad testnet and records deployment metadata.
 *
 * Usage: npm run contracts:deploy:testnet
 * Requires: DEPLOYER_PRIVATE_KEY (env var or Hardhat keystore), funded with MON.
 *
 * This script never runs automatically; deployment requires explicit authorization.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { network } from "hardhat";

const EXPECTED_CHAIN_ID = 10143n;
const DEPLOYMENT_RECORD_PATH = path.resolve("deployments", "monad-testnet.json");
const EXPLORER_URL = "https://testnet.monadvision.com";

function isCredentialResolutionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("deployer_private_key") ||
    message.includes("configuration variable") ||
    message.includes("keystore") ||
    message.includes("env_var_not_found")
  );
}

export async function main(): Promise<void> {
  console.log("Connecting to Monad testnet...");

  let ethers: any;
  let deployer: any;
  try {
    const connection = await network.getOrCreate("monadTestnet");
    ethers = connection.ethers;
    [deployer] = await ethers.getSigners();
  } catch (error) {
    if (isCredentialResolutionError(error)) {
      console.error(
        "[ABORT] Could not resolve DEPLOYER_PRIVATE_KEY.\n" +
          "Provide it via the environment or the Hardhat keystore:\n" +
          "  export DEPLOYER_PRIVATE_KEY=0x...\n" +
          "  npx hardhat keystore set DEPLOYER_PRIVATE_KEY\n" +
          "Never commit this value to Git."
      );
      process.exit(1);
    }
    throw error;
  }

  const providerNetwork = await ethers.provider.getNetwork();
  console.log(`  chain id : ${providerNetwork.chainId}`);
  console.log(`  deployer : ${deployer.address}`);

  if (providerNetwork.chainId !== EXPECTED_CHAIN_ID) {
    console.error(
      `[ABORT] Unexpected chain id ${providerNetwork.chainId}; expected ${EXPECTED_CHAIN_ID}. ` +
        "Refusing to deploy to the wrong network."
    );
    process.exit(1);
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`  balance  : ${ethers.formatEther(balance)} MON`);
  if (balance === 0n) {
    console.error("[ABORT] Deployer has no MON on Monad testnet. Fund the wallet first.");
    process.exit(1);
  }

  console.log("Deploying TrustGraphRegistry...");
  const registry = await ethers.deployContract("TrustGraphRegistry");
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  const deployTx = registry.deploymentTransaction();
  const receipt = deployTx ? await deployTx.wait() : null;

  console.log(`  address  : ${address}`);
  console.log(`  tx hash  : ${deployTx?.hash ?? "unknown"}`);
  console.log(`  block    : ${receipt?.blockNumber ?? "unknown"}`);

  if (!receipt || receipt.status !== 1) {
    console.error("[ABORT] Deployment transaction did not succeed on-chain.");
    process.exit(1);
  }

  // Post-deploy smoke checks against live state.
  const owner = await registry.owner();
  const deployerIsIssuer = await registry.isIssuer(deployer.address);
  const totalAttestations = await registry.getTotalAttestations();

  if (owner !== deployer.address) {
    console.error(`[ABORT] Post-deploy check failed: owner is ${owner}, expected ${deployer.address}.`);
    process.exit(1);
  }
  if (!deployerIsIssuer) {
    console.error("[ABORT] Post-deploy check failed: deployer is not an authorized issuer.");
    process.exit(1);
  }
  if (totalAttestations !== 0n) {
    console.error("[ABORT] Post-deploy check failed: registry is not empty.");
    process.exit(1);
  }
  console.log("  smoke checks: owner, issuer grant, empty registry — all OK");

  const record = {
    network: "monadTestnet",
    chainId: Number(EXPECTED_CHAIN_ID),
    rpcUrl: process.env.MONAD_TESTNET_RPC_URL ?? "https://testnet-rpc.monad.xyz",
    explorerUrl: EXPLORER_URL,
    contract: "TrustGraphRegistry",
    address,
    deployer: deployer.address,
    transactionHash: deployTx?.hash ?? null,
    blockNumber: receipt.blockNumber,
    deployedAt: new Date().toISOString(),
    compiler: {
      solc: "0.8.28",
      optimizer: { enabled: true, runs: 200 },
    },
    status: "deployed",
  };

  fs.mkdirSync(path.dirname(DEPLOYMENT_RECORD_PATH), { recursive: true });
  fs.writeFileSync(DEPLOYMENT_RECORD_PATH, JSON.stringify(record, null, 2) + "\n");
  console.log(`[OK] Deployment record written to ${path.relative(process.cwd(), DEPLOYMENT_RECORD_PATH)}`);
  console.log(`[OK] Explorer: ${EXPLORER_URL}/address/${address}`);
}
