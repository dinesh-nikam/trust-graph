/**
 * Entry point for `hardhat run scripts/deploy.ts --network monadTestnet`.
 *
 * Deployment logic lives in ./deploy-logic.ts so it can be imported by tests
 * without triggering execution.
 */
import { main } from "./deploy-logic.js";

main().catch((error) => {
  console.error("[FAILED] Deployment encountered an error:");
  console.error(error);
  process.exit(1);
});
