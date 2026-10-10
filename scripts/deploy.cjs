/**
 * Deployment script for TrustGraph registries on Monad Testnet (Chain ID: 10143)
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=0x... node scripts/deploy.cjs trust
 *   DEPLOYER_PRIVATE_KEY=0x... node scripts/deploy.cjs work
 */

const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { createWalletClient, createPublicClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { defineChain } = require('viem');

const MONAD_TESTNET_CHAIN_ID = 10143;
const RPC_URL = process.env.VITE_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz';
const registryTarget = process.argv[2] || 'trust';
const deployment = registryTarget === 'work'
  ? { file: 'ProofOfWorkRegistry.sol', name: 'ProofOfWorkRegistry', envKey: 'VITE_PROOF_OF_WORK_REGISTRY_ADDRESS' }
  : registryTarget === 'trust'
    ? { file: 'TrustGraphRegistry.sol', name: 'TrustGraphRegistry', envKey: 'VITE_TRUST_GRAPH_REGISTRY_ADDRESS' }
    : null;

if (!deployment) throw new Error('Select a registry to deploy: trust or work.');

const monadTestnet = defineChain({
  id: MONAD_TESTNET_CHAIN_ID,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
  testnet: true,
});

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ Error: DEPLOYER_PRIVATE_KEY environment variable is required.');
    console.error('Example: DEPLOYER_PRIVATE_KEY=0x1234... node scripts/deploy.cjs');
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
  console.log(`🚀 Deployer account: ${account.address}`);

  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(RPC_URL),
  });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Deployer balance: ${Number(balance) / 1e18} MON`);
  if (balance === 0n) {
    console.error('❌ Error: Deployer balance is 0 MON. Obtain testnet MON from faucet: https://testnet.monad.xyz');
    process.exit(1);
  }

  // Compile the explicitly selected registry.
  console.log(`Compiling ${deployment.file}...`);
  const contractPath = path.join(__dirname, '../contracts', deployment.file);
  const source = fs.readFileSync(contractPath, 'utf8');
  const input = {
    language: 'Solidity',
    sources: { [deployment.file]: { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors) {
    const errors = output.errors.filter((e) => e.severity === 'error');
    if (errors.length > 0) {
      console.error('Compilation errors:', errors);
      process.exit(1);
    }
  }

  const compiled = output.contracts[deployment.file][deployment.name];
  const abi = compiled.abi;
  const bytecode = '0x' + compiled.evm.bytecode.object;

  console.log('📡 Broadcasting deployment transaction to Monad Testnet...');
  const txHash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [],
  });
  console.log(`Tx submitted: https://testnet.monadexplorer.com/tx/${txHash}`);
  console.log('⏳ Waiting for block confirmation on Monad...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  const contractAddress = receipt.contractAddress;

  if (receipt.status !== 'success' || !contractAddress) {
    console.error('Deployment transaction reverted or failed to return contract address.');
    process.exit(1);
  }

  const deployedCode = await publicClient.getCode({ address: contractAddress });
  if (!deployedCode || deployedCode === '0x') {
    throw new Error(`Deployment returned ${contractAddress}, but Monad RPC reports no contract bytecode.`);
  }

  console.log(`\n${deployment.name} successfully deployed!`);
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`🔗 Explorer: https://testnet.monadexplorer.com/address/${contractAddress}`);

  // Update .env file
  const envPath = path.join(__dirname, '../.env');
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  if (envContent.includes(`${deployment.envKey}=`)) {
    envContent = envContent.replace(new RegExp(`${deployment.envKey}=.*`, 'g'), `${deployment.envKey}=${contractAddress}`);
  } else {
    envContent += `\n${deployment.envKey}=${contractAddress}\n`;
  }
  fs.writeFileSync(envPath, envContent.trim() + '\n');
  console.log(`Updated .env with ${deployment.envKey}=${contractAddress}`);
}

main().catch((err) => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
