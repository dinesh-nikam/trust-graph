import { describe, it } from "mocha";
import { expect } from "chai";
import { main } from "../../scripts/deploy.js";

describe("deploy.ts credential resolution", function () {
  it("aborts with a credential error when DEPLOYER_PRIVATE_KEY cannot be resolved", async function () {
    const originalKey = process.env.DEPLOYER_PRIVATE_KEY;
    const originalHhTest = process.env.HH_TEST;
    const originalExit = process.exit;

    delete process.env.DEPLOYER_PRIVATE_KEY;
    // Block keystore password prompts during the test and force a fast failure
    // when the variable is only in the encrypted keystore.
    process.env.HH_TEST = "true";

    // main() calls process.exit(1) on abort. Turn that into a thrown error so
    // the test runner is not killed and we can assert on the failure.
    const thrown: { code?: number; logs: string[] } = { logs: [] };
    process.exit = ((code: number) => {
      thrown.code = code;
      throw new Error(`process.exit(${code})`);
    }) as typeof process.exit;

    try {
      await main();
      expect.fail("main() should have aborted before reaching chain checks");
    } catch (error) {
      expect(thrown.code).to.equal(1, "expected abort exit code 1");
      const message = (error as Error).message.toLowerCase();
      expect(message).to.satisfy(
        (m: string) =>
          m.includes("process.exit") ||
          m.includes("deployer_private_key") ||
          m.includes("configuration variable") ||
          m.includes("keystore"),
        `expected credential-related error, got: ${message}`
      );
    } finally {
      process.exit = originalExit;
      if (originalKey !== undefined) {
        process.env.DEPLOYER_PRIVATE_KEY = originalKey;
      } else {
        delete process.env.DEPLOYER_PRIVATE_KEY;
      }
      if (originalHhTest !== undefined) {
        process.env.HH_TEST = originalHhTest;
      } else {
        delete process.env.HH_TEST;
      }
    }
  });
});
