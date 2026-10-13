/**
 * Read-only verification of a TrustGraphRegistry deployment on Monad testnet.
 *
 * Usage: npm run contracts:check:testnet
 *        DEPLOYMENT_ADDRESS=0xCustomAddress npm run contracts:check:testnet
 * Requires no private key; reads deployments/monad-testnet.json by default.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { Contract, JsonRpcProvider, formatEther, getAddress } from "ethers";

const EXPECTED_CHAIN_ID = 10143n;
const DEPLOYMENT_RECORD_PATH = path.resolve("deployments", "monad-testnet.json");
const EXPLORER_URL = "https://testnet.monadvision.com";

const MINIMAL_ABI = [
  "function owner() view returns (address)",
  "function isIssuer(address) view returns (bool)",
  "function getTotalAttestations() view returns (uint256)",
];

async function main(): Promise<void> {
  // `hardhat run` rejects unconsumed CLI args (HHE506), so an address
  // override is passed via DEPLOYMENT_ADDRESS; argv still works for
  // non-hardhat runners.
  const argAddress =
    process.env.DEPLOYMENT_ADDRESS ?? process.argv.find((a) => /^0x[0-9a-fA-F]{40}$/.test(a));
  let address = argAddress;

  if (!address) {
    if (!fs.existsSync(DEPLOYMENT_RECORD_PATH)) {
      console.error(
        `[ABORT] No deployment record at ${path.relative(process.cwd(), DEPLOYMENT_RECORD_PATH)}.\n` +
          "Deploy first (npm run contracts:deploy:testnet) or pass an address:\n" +
          "  DEPLOYMENT_ADDRESS=0xYourContractAddress npm run contracts:check:testnet"
      );
      process.exit(1);
    }
    const record = JSON.parse(fs.readFileSync(DEPLOYMENT_RECORD_PATH, "utf8"));
    address = record.address;
    console.log(
      `Loaded deployment record: ${record.contract} deployed at ${record.deployedAt}`
    );
  }

  if (!address) {
    console.error("[ABORT] Missing contract address.");
    process.exit(1);
  }

  address = getAddress(address.toLowerCase());

  const rpcUrl = process.env.MONAD_TESTNET_RPC_URL ?? "https://testnet-rpc.monad.xyz";
  const provider = new JsonRpcProvider(rpcUrl);

  const providerNetwork = await provider.getNetwork();
  console.log(`  rpc      : ${rpcUrl}`);
  console.log(`  chain id : ${providerNetwork.chainId}`);
  if (providerNetwork.chainId !== EXPECTED_CHAIN_ID) {
    console.error(
      `[ABORT] Unexpected chain id ${providerNetwork.chainId}; expected ${EXPECTED_CHAIN_ID}.`
    );
    process.exit(1);
  }

  console.log(`  address  : ${address}`);

  const code = await provider.getCode(address);
  if (code === "0x") {
    console.error(
      `[ABORT] No contract code at ${address}. ` +
        `The testnet may have been reset or the address is stale. ` +
        `Explorer: ${EXPLORER_URL}/address/${address}`
    );
    process.exit(1);
  }
  console.log(`  code size: ${(code.length - 2) / 2} bytes`);

  const registry = new Contract(address, MINIMAL_ABI, provider);

  const owner = await registry.owner();
  const ownerIsIssuer = await registry.isIssuer(owner);
  const totalAttestations = await registry.getTotalAttestations();

  const feeData = await provider.getFeeData();
  const deployerBalance = await provider.getBalance(owner);

  console.log("[OK] Contract is live on Monad testnet:");
  console.log(`  owner               : ${owner}`);
  console.log(`  owner is issuer     : ${ownerIsIssuer}`);
  console.log(`  total attestations  : ${totalAttestations}`);
  console.log(`  owner MON balance   : ${formatEther(deployerBalance)}`);
  if (feeData.gasPrice !== null) {
    console.log(`  current gas price   : ${feeData.gasPrice.toString()} wei`);
  }
  console.log(`  explorer            : ${EXPLORER_URL}/address/${address}`);
}

main().catch((error) => {
  console.error("[FAILED] Deployment check encountered an error:");
  console.error(error);
  process.exit(1);
});
