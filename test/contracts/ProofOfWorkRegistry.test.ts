import { createHash } from "node:crypto";
import { describe, it } from "mocha";
import { expect } from "chai";
import { encodeBytes32String, ZeroHash } from "ethers";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.getOrCreate();
const { loadFixture, time } = networkHelpers;

// Known NIST SHA-256 test vector: sha256("abc")
const SHA256_ABC =
  "0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const METADATA_URI = "https://evidence.trustgraph.dev/works/work-001.json";

const STATUS = {
  PENDING: 0n,
  VERIFIED: 1n,
  REJECTED: 2n,
  REVOKED: 3n,
} as const;

const WORK_TYPE = {
  SMART_CONTRACT: 0n,
  GITHUB_CONTRIBUTION: 1n,
  HACKATHON_PROJECT: 2n,
} as const;

function workId(seed: string): string {
  return encodeBytes32String(seed);
}

describe("ProofOfWorkRegistry", function () {
  async function deployRegistryFixture() {
    const [owner, verifier, secondVerifier, worker, otherWorker, attacker, newOwner] =
      await ethers.getSigners();

    const registry = await ethers.deployContract("ProofOfWorkRegistry");
    await registry.waitForDeployment();

    await registry.approveVerifier(verifier.address);
    await registry.approveVerifier(secondVerifier.address);

    return {
      registry,
      owner,
      verifier,
      secondVerifier,
      worker,
      otherWorker,
      attacker,
      newOwner,
    };
  }

  async function pendingWorkFixture() {
    const base = await loadFixture(deployRegistryFixture);
    const { registry, worker } = base;
    const id = workId("work-001");
    const createdAt = (await time.latest()) + 100;
    await time.setNextBlockTimestamp(createdAt);
    await registry
      .connect(worker)
      .registerWork(id, WORK_TYPE.SMART_CONTRACT, SHA256_ABC, METADATA_URI);
    return { ...base, workId: id, createdAt };
  }

  async function verifiedWorkFixture() {
    const base = await loadFixture(pendingWorkFixture);
    const { registry, verifier, workId: id, createdAt } = base;
    const verifiedAt = createdAt + 100;
    await time.setNextBlockTimestamp(verifiedAt);
    await registry.connect(verifier).verifyWork(id);
    return { ...base, verifiedAt };
  }

  // --- Deployment & Initialization ---

  describe("Deployment", function () {
    it("sets the deployer as owner", async function () {
      const { registry, owner } = await loadFixture(deployRegistryFixture);
      expect(await registry.owner()).to.equal(owner.address);
    });

    it("grants the deployer an implicit verifier privilege", async function () {
      const { registry, owner } = await loadFixture(deployRegistryFixture);
      expect(await registry.isVerifier(owner.address)).to.equal(true);
      expect(await registry.authorizedVerifiers(owner.address)).to.equal(true);
    });

    it("starts with an empty registry", async function () {
      const { registry } = await loadFixture(deployRegistryFixture);
      expect(await registry.getTotalWorkCount()).to.equal(0n);
      expect(await registry.getAllWorkIds()).to.deep.equal([]);
    });
  });

  // --- Verifier Management ---

  describe("Verifier management", function () {
    it("allows the owner to approve a verifier", async function () {
      const { registry, owner, attacker } = await loadFixture(deployRegistryFixture);
      await expect(registry.connect(owner).approveVerifier(attacker.address))
        .to.emit(registry, "VerifierApproved")
        .withArgs(attacker.address);
      expect(await registry.isVerifier(attacker.address)).to.equal(true);
    });

    it("reverts verifier approval when called by a non-owner", async function () {
      const { registry, attacker, worker } = await loadFixture(deployRegistryFixture);
      await expect(
        registry.connect(attacker).approveVerifier(worker.address)
      ).to.be.revertedWith("Only registry owner may perform this action");
    });

    it("reverts verifier approval for the zero address", async function () {
      const { registry, owner } = await loadFixture(deployRegistryFixture);
      await expect(
        registry.connect(owner).approveVerifier(ZERO_ADDRESS)
      ).to.be.revertedWith("Invalid verifier address");
    });

    it("reverts on approving an already authorized verifier", async function () {
      const { registry, owner, verifier } = await loadFixture(deployRegistryFixture);
      await expect(
        registry.connect(owner).approveVerifier(verifier.address)
      ).to.be.revertedWith("Verifier already authorized");
    });

    it("allows the owner to remove a verifier", async function () {
      const { registry, owner, verifier } = await loadFixture(deployRegistryFixture);
      await expect(registry.connect(owner).removeVerifier(verifier.address))
        .to.emit(registry, "VerifierRemoved")
        .withArgs(verifier.address);
      expect(await registry.isVerifier(verifier.address)).to.equal(false);
      expect(await registry.authorizedVerifiers(verifier.address)).to.equal(false);
    });

    it("reverts verifier removal when called by a non-owner", async function () {
      const { registry, attacker, verifier } = await loadFixture(deployRegistryFixture);
      await expect(
        registry.connect(attacker).removeVerifier(verifier.address)
      ).to.be.revertedWith("Only registry owner may perform this action");
    });

    it("reverts verifier removal for the zero address", async function () {
      const { registry, owner } = await loadFixture(deployRegistryFixture);
      await expect(
        registry.connect(owner).removeVerifier(ZERO_ADDRESS)
      ).to.be.revertedWith("Invalid verifier address");
    });

    it("reverts verifier removal for an address that was never authorized", async function () {
      const { registry, owner, attacker } = await loadFixture(deployRegistryFixture);
      await expect(
        registry.connect(owner).removeVerifier(attacker.address)
      ).to.be.revertedWith("Address is not an authorized verifier");
    });

    it("keeps the owner a verifier via the implicit privilege even after their explicit grant is removed", async function () {
      const { registry, owner } = await loadFixture(deployRegistryFixture);
      await registry.connect(owner).removeVerifier(owner.address);
      expect(await registry.authorizedVerifiers(owner.address)).to.equal(false);
      expect(await registry.isVerifier(owner.address)).to.equal(true);
    });
  });

  // --- Work Registration ---

  describe("Work registration", function () {
    it("lets any developer register work as PENDING and emits WorkSubmitted", async function () {
      const { registry, worker } = await loadFixture(deployRegistryFixture);
      const id = workId("work-001");
      await expect(
        registry
          .connect(worker)
          .registerWork(id, WORK_TYPE.SMART_CONTRACT, SHA256_ABC, METADATA_URI)
      )
        .to.emit(registry, "WorkSubmitted")
        .withArgs(id, worker.address, WORK_TYPE.SMART_CONTRACT, SHA256_ABC, METADATA_URI);
      expect(await registry.getTotalWorkCount()).to.equal(1n);
    });

    it("requires no authorization to submit (open submission)", async function () {
      const { registry, attacker } = await loadFixture(deployRegistryFixture);
      const id = workId("attacker-work");
      await registry
        .connect(attacker)
        .registerWork(id, WORK_TYPE.GITHUB_CONTRIBUTION, SHA256_ABC, METADATA_URI);
      expect(await registry.getTotalWorkCount()).to.equal(1n);
    });

    it("reverts registration with a zero workId", async function () {
      const { registry, worker } = await loadFixture(deployRegistryFixture);
      await expect(
        registry
          .connect(worker)
          .registerWork(ZeroHash, WORK_TYPE.SMART_CONTRACT, SHA256_ABC, METADATA_URI)
      ).to.be.revertedWith("Invalid work ID");
    });

    it("reverts registration of a duplicate workId", async function () {
      const { registry, worker, otherWorker } = await loadFixture(deployRegistryFixture);
      const id = workId("dup");
      await registry
        .connect(worker)
        .registerWork(id, WORK_TYPE.SMART_CONTRACT, SHA256_ABC, METADATA_URI);
      await expect(
        registry
          .connect(otherWorker)
          .registerWork(id, WORK_TYPE.GITHUB_CONTRIBUTION, SHA256_ABC, METADATA_URI)
      ).to.be.revertedWith("Work item already registered");
    });

    it("reverts registration with an empty evidence hash", async function () {
      const { registry, worker } = await loadFixture(deployRegistryFixture);
      await expect(
        registry
          .connect(worker)
          .registerWork(workId("no-evidence"), WORK_TYPE.SMART_CONTRACT, ZeroHash, METADATA_URI)
      ).to.be.revertedWith("Evidence hash cannot be empty");
    });

    it("records the full Work struct at registration", async function () {
      const f = await loadFixture(pendingWorkFixture);
      const { registry, workId: id, worker, createdAt } = f;
      const w = await registry.getWork(id);
      expect(w.workId).to.equal(id);
      expect(w.worker).to.equal(worker.address);
      expect(w.workType).to.equal(WORK_TYPE.SMART_CONTRACT);
      expect(w.evidenceHash).to.equal(SHA256_ABC);
      expect(w.metadataUri).to.equal(METADATA_URI);
      expect(w.verifier).to.equal(ZERO_ADDRESS);
      expect(w.createdAt).to.equal(createdAt);
      expect(w.verifiedAt).to.equal(0n);
      expect(w.status).to.equal(STATUS.PENDING);
    });

    it("accepts all three supported work types", async function () {
      const { registry, worker } = await loadFixture(deployRegistryFixture);
      await registry
        .connect(worker)
        .registerWork(workId("type-0"), WORK_TYPE.SMART_CONTRACT, SHA256_ABC, METADATA_URI);
      await registry
        .connect(worker)
        .registerWork(workId("type-1"), WORK_TYPE.GITHUB_CONTRIBUTION, SHA256_ABC, METADATA_URI);
      await registry
        .connect(worker)
        .registerWork(workId("type-2"), WORK_TYPE.HACKATHON_PROJECT, SHA256_ABC, METADATA_URI);
      const w0 = await registry.getWork(workId("type-0"));
      const w1 = await registry.getWork(workId("type-1"));
      const w2 = await registry.getWork(workId("type-2"));
      expect(w0.workType).to.equal(WORK_TYPE.SMART_CONTRACT);
      expect(w1.workType).to.equal(WORK_TYPE.GITHUB_CONTRIBUTION);
      expect(w2.workType).to.equal(WORK_TYPE.HACKATHON_PROJECT);
    });

    it("lets the same worker register multiple distinct works", async function () {
      const { registry, worker } = await loadFixture(deployRegistryFixture);
      await registry
        .connect(worker)
        .registerWork(workId("a"), WORK_TYPE.SMART_CONTRACT, SHA256_ABC, METADATA_URI);
      await registry
        .connect(worker)
        .registerWork(workId("b"), WORK_TYPE.GITHUB_CONTRIBUTION, SHA256_ABC, METADATA_URI);
      expect(await registry.getWorksByWorker(worker.address)).to.deep.equal([
        workId("a"),
        workId("b"),
      ]);
    });

    it("keeps worker attribution bound to msg.sender", async function () {
      const { registry, worker, otherWorker } = await loadFixture(deployRegistryFixture);
      await registry
        .connect(worker)
        .registerWork(workId("mine"), WORK_TYPE.SMART_CONTRACT, SHA256_ABC, METADATA_URI);
      await registry
        .connect(otherWorker)
        .registerWork(workId("theirs"), WORK_TYPE.SMART_CONTRACT, SHA256_ABC, METADATA_URI);
      expect(await registry.getWorksByWorker(worker.address)).to.deep.equal([workId("mine")]);
      expect(await registry.getWorksByWorker(otherWorker.address)).to.deep.equal([workId("theirs")]);
    });
  });

  // --- Verification Flow ---

  describe("Verification flow", function () {
    it("lets an authorized verifier verify PENDING work and emits WorkVerified", async function () {
      const f = await loadFixture(pendingWorkFixture);
      const { registry, verifier, workId: id, createdAt } = f;
      const verifiedAt = createdAt + 60;
      await time.setNextBlockTimestamp(verifiedAt);
      await expect(registry.connect(verifier).verifyWork(id))
        .to.emit(registry, "WorkVerified")
        .withArgs(id, verifier.address, verifiedAt);

      const w = await registry.getWork(id);
      expect(w.status).to.equal(STATUS.VERIFIED);
      expect(w.verifier).to.equal(verifier.address);
      expect(w.verifiedAt).to.equal(verifiedAt);
      expect(await registry.isVerified(id)).to.equal(true);
    });

    it("lets the owner verify through the implicit verifier privilege", async function () {
      const f = await loadFixture(pendingWorkFixture);
      const { registry, owner, workId: id, createdAt } = f;
      const verifiedAt = createdAt + 30;
      await time.setNextBlockTimestamp(verifiedAt);
      await expect(registry.connect(owner).verifyWork(id))
        .to.emit(registry, "WorkVerified")
        .withArgs(id, owner.address, verifiedAt);
      expect(await registry.isVerified(id)).to.equal(true);
    });

    it("reverts verification by an unauthorized account", async function () {
      const f = await loadFixture(pendingWorkFixture);
      const { registry, attacker, workId: id } = f;
      await expect(
        registry.connect(attacker).verifyWork(id)
      ).to.be.revertedWith("Caller is not an authorized verifier");
    });

    it("reverts verification by the worker themselves (worker cannot self-verify)", async function () {
      const f = await loadFixture(pendingWorkFixture);
      const { registry, worker, workId: id } = f;
      await expect(
        registry.connect(worker).verifyWork(id)
      ).to.be.revertedWith("Caller is not an authorized verifier");
    });

    it("reverts verification of a nonexistent workId", async function () {
      const { registry, verifier } = await loadFixture(deployRegistryFixture);
      await expect(
        registry.connect(verifier).verifyWork(workId("ghost"))
      ).to.be.revertedWith("Work item does not exist");
    });

    it("reverts verification of id zero", async function () {
      const { registry, verifier } = await loadFixture(deployRegistryFixture);
      await expect(
        registry.connect(verifier).verifyWork(ZeroHash)
      ).to.be.revertedWith("Work item does not exist");
    });

    it("reverts duplicate verification (VERIFIED -> VERIFIED is invalid)", async function () {
      const f = await loadFixture(verifiedWorkFixture);
      const { registry, secondVerifier, workId: id } = f;
      await expect(
        registry.connect(secondVerifier).verifyWork(id)
      ).to.be.revertedWith("Can only verify PENDING work");
    });

    it("reverts re-verification by the same verifier", async function () {
      const f = await loadFixture(verifiedWorkFixture);
      const { registry, verifier, workId: id } = f;
      await expect(
        registry.connect(verifier).verifyWork(id)
      ).to.be.revertedWith("Can only verify PENDING work");
    });

    it("reverts verification after the verifier authorization is removed", async function () {
      const { registry, owner, verifier, worker } = await loadFixture(deployRegistryFixture);
      const id = workId("late-verify");
      await registry
        .connect(worker)
        .registerWork(id, WORK_TYPE.SMART_CONTRACT, SHA256_ABC, METADATA_URI);
      await registry.connect(owner).removeVerifier(verifier.address);
      await expect(
        registry.connect(verifier).verifyWork(id)
      ).to.be.revertedWith("Caller is not an authorized verifier");
    });
  });

  // --- Rejection Flow ---

  describe("Rejection flow", function () {
    it("lets a verifier reject PENDING work with a reason and emits WorkRejected", async function () {
      const f = await loadFixture(pendingWorkFixture);
      const { registry, verifier, workId: id, createdAt } = f;
      const rejectedAt = createdAt + 60;
      await time.setNextBlockTimestamp(rejectedAt);
      await expect(
        registry.connect(verifier).rejectWork(id, "evidence insufficient")
      )
        .to.emit(registry, "WorkRejected")
        .withArgs(id, verifier.address, "evidence insufficient", rejectedAt);

      const w = await registry.getWork(id);
      expect(w.status).to.equal(STATUS.REJECTED);
      expect(w.verifier).to.equal(verifier.address);
      expect(await registry.isVerified(id)).to.equal(false);
    });

    it("records an empty rejection reason when none is provided", async function () {
      const f = await loadFixture(pendingWorkFixture);
      const { registry, verifier, workId: id } = f;
      await registry.connect(verifier).rejectWork(id, "");
      const w = await registry.getWork(id);
      expect(w.status).to.equal(STATUS.REJECTED);
    });

    it("reverts rejection by an unauthorized account", async function () {
      const f = await loadFixture(pendingWorkFixture);
      const { registry, attacker, workId: id } = f;
      await expect(
        registry.connect(attacker).rejectWork(id, "nope")
      ).to.be.revertedWith("Caller is not an authorized verifier");
    });

    it("reverts rejection of a nonexistent workId", async function () {
      const { registry, verifier } = await loadFixture(deployRegistryFixture);
      await expect(
        registry.connect(verifier).rejectWork(workId("ghost"), "missing")
      ).to.be.revertedWith("Work item does not exist");
    });

    it("reverts double rejection (REJECTED -> REJECTED is invalid)", async function () {
      const f = await loadFixture(pendingWorkFixture);
      const { registry, verifier, secondVerifier, workId: id } = f;
      await registry.connect(verifier).rejectWork(id, "first");
      await expect(
        registry.connect(secondVerifier).rejectWork(id, "second")
      ).to.be.revertedWith("Can only reject PENDING work");
    });

    it("reverts rejection after verification (VERIFIED -> REJECTED is invalid)", async function () {
      const f = await loadFixture(verifiedWorkFixture);
      const { registry, verifier, workId: id } = f;
      await expect(
        registry.connect(verifier).rejectWork(id, "too late")
      ).to.be.revertedWith("Can only reject PENDING work");
    });

    it("reverts rejection after revocation (REVOKED -> REJECTED is invalid)", async function () {
      const f = await loadFixture(verifiedWorkFixture);
      const { registry, verifier, workId: id } = f;
      await registry.connect(verifier).revokeWork(id, "compromised");
      await expect(
        registry.connect(verifier).rejectWork(id, "after revoke")
      ).to.be.revertedWith("Can only reject PENDING work");
    });
  });

  // --- Revocation Flow ---

  describe("Revocation flow", function () {
    it("lets a verifier revoke VERIFIED work and emits WorkRevoked", async function () {
      const f = await loadFixture(verifiedWorkFixture);
      const { registry, verifier, workId: id, verifiedAt } = f;
      const revokedAt = verifiedAt + 60;
      await time.setNextBlockTimestamp(revokedAt);
      await expect(
        registry.connect(verifier).revokeWork(id, "plagiarism discovered")
      )
        .to.emit(registry, "WorkRevoked")
        .withArgs(id, verifier.address, "plagiarism discovered", revokedAt);

      const w = await registry.getWork(id);
      expect(w.status).to.equal(STATUS.REVOKED);
      expect(await registry.isVerified(id)).to.equal(false);
    });

    it("lets a different authorized verifier revoke work they did not verify", async function () {
      const f = await loadFixture(verifiedWorkFixture);
      const { registry, secondVerifier, workId: id } = f;
      await registry.connect(secondVerifier).revokeWork(id, "second opinion");
      const w = await registry.getWork(id);
      expect(w.status).to.equal(STATUS.REVOKED);
      expect(w.verifier).to.equal(secondVerifier.address);
    });

    it("lets the owner revoke through the implicit verifier privilege", async function () {
      const f = await loadFixture(verifiedWorkFixture);
      const { registry, owner, workId: id } = f;
      await registry.connect(owner).revokeWork(id, "owner audit");
      expect((await registry.getWork(id)).status).to.equal(STATUS.REVOKED);
    });

    it("reverts revocation by an unauthorized account", async function () {
      const f = await loadFixture(verifiedWorkFixture);
      const { registry, attacker, workId: id } = f;
      await expect(
        registry.connect(attacker).revokeWork(id, "hack")
      ).to.be.revertedWith("Caller is not an authorized verifier");
    });

    it("reverts revocation of the worker's own work (worker cannot self-revoke)", async function () {
      const f = await loadFixture(verifiedWorkFixture);
      const { registry, worker, workId: id } = f;
      await expect(
        registry.connect(worker).revokeWork(id, "changed my mind")
      ).to.be.revertedWith("Caller is not an authorized verifier");
    });

    it("reverts revocation of a nonexistent workId", async function () {
      const { registry, verifier } = await loadFixture(deployRegistryFixture);
      await expect(
        registry.connect(verifier).revokeWork(workId("ghost"), "missing")
      ).to.be.revertedWith("Work item does not exist");
    });

    it("reverts revocation of PENDING work (PENDING -> REVOKED is invalid)", async function () {
      const f = await loadFixture(pendingWorkFixture);
      const { registry, verifier, workId: id } = f;
      await expect(
        registry.connect(verifier).revokeWork(id, "still pending")
      ).to.be.revertedWith("Can only revoke VERIFIED work");
    });

    it("reverts revocation of REJECTED work (REJECTED -> REVOKED is invalid)", async function () {
      const f = await loadFixture(pendingWorkFixture);
      const { registry, verifier, workId: id } = f;
      await registry.connect(verifier).rejectWork(id, "rejected");
      await expect(
        registry.connect(verifier).revokeWork(id, "after reject")
      ).to.be.revertedWith("Can only revoke VERIFIED work");
    });

    it("reverts double revocation (REVOKED -> REVOKED is invalid)", async function () {
      const f = await loadFixture(verifiedWorkFixture);
      const { registry, verifier, workId: id } = f;
      await registry.connect(verifier).revokeWork(id, "first");
      await expect(
        registry.connect(verifier).revokeWork(id, "second")
      ).to.be.revertedWith("Can only revoke VERIFIED work");
    });

    it("preserves the historical record after revocation", async function () {
      const f = await loadFixture(verifiedWorkFixture);
      const { registry, workId: id, worker } = f;
      await registry.connect(f.verifier).revokeWork(id, "revoked");
      const w = await registry.getWork(id);
      expect(w.workId).to.equal(id);
      expect(w.worker).to.equal(worker.address);
      expect(w.status).to.equal(STATUS.REVOKED);
      expect(await registry.getWorksByWorker(worker.address)).to.deep.equal([id]);
      expect(await registry.getAllWorkIds()).to.deep.equal([id]);
    });

    it("keeps isVerified true when the verifying verifier is later removed (status is historical)", async function () {
      const f = await loadFixture(verifiedWorkFixture);
      const { registry, owner, verifier, workId: id } = f;
      await registry.connect(owner).removeVerifier(verifier.address);
      expect(await registry.isVerified(id)).to.equal(true);
    });
  });

  // --- Invalid Transition Matrix ---

  describe("Invalid status transition matrix", function () {
    it("rejects every invalid transition from PENDING except VERIFIED/REJECTED", async function () {
      const f = await loadFixture(pendingWorkFixture);
      const { registry, verifier, workId: id } = f;
      // PENDING -> REVOKED invalid
      await expect(
        registry.connect(verifier).revokeWork(id, "pending to revoked")
      ).to.be.revertedWith("Can only revoke VERIFIED work");
      // sanity: PENDING -> VERIFIED valid
      await registry.connect(verifier).verifyWork(id);
      expect(await registry.isVerified(id)).to.equal(true);
    });

    it("rejects REJECTED -> VERIFIED", async function () {
      const f = await loadFixture(pendingWorkFixture);
      const { registry, verifier, workId: id } = f;
      await registry.connect(verifier).rejectWork(id, "no");
      await expect(
        registry.connect(verifier).verifyWork(id)
      ).to.be.revertedWith("Can only verify PENDING work");
    });

    it("rejects REJECTED -> REVOKED", async function () {
      const f = await loadFixture(pendingWorkFixture);
      const { registry, verifier, workId: id } = f;
      await registry.connect(verifier).rejectWork(id, "no");
      await expect(
        registry.connect(verifier).revokeWork(id, "revoked")
      ).to.be.revertedWith("Can only revoke VERIFIED work");
    });

    it("rejects REVOKED -> VERIFIED", async function () {
      const f = await loadFixture(verifiedWorkFixture);
      const { registry, verifier, workId: id } = f;
      await registry.connect(verifier).revokeWork(id, "revoked");
      await expect(
        registry.connect(verifier).verifyWork(id)
      ).to.be.revertedWith("Can only verify PENDING work");
    });

    it("rejects VERIFIED -> REJECTED", async function () {
      const f = await loadFixture(verifiedWorkFixture);
      const { registry, verifier, workId: id } = f;
      await expect(
        registry.connect(verifier).rejectWork(id, "no")
      ).to.be.revertedWith("Can only reject PENDING work");
    });
  });

  // --- Queries & Stats ---

  describe("Queries and stats", function () {
    it("reverts getWork for a nonexistent id", async function () {
      const { registry } = await loadFixture(deployRegistryFixture);
      await expect(registry.getWork(workId("missing"))).to.be.revertedWith(
        "Work item does not exist"
      );
    });

    it("returns false from isVerified for a nonexistent id without reverting", async function () {
      const { registry } = await loadFixture(deployRegistryFixture);
      expect(await registry.isVerified(workId("missing"))).to.equal(false);
    });

    it("aggregates worker stats counting only VERIFIED works per type", async function () {
      const { registry, verifier, worker } = await loadFixture(deployRegistryFixture);
      // 2 smart contracts, 1 github, 1 hackathon verified; 1 smart contract rejected; 1 github revoked; 1 hackathon pending
      await registry.connect(worker).registerWork(workId("sc-1"), WORK_TYPE.SMART_CONTRACT, SHA256_ABC, METADATA_URI);
      await registry.connect(worker).registerWork(workId("sc-2"), WORK_TYPE.SMART_CONTRACT, SHA256_ABC, METADATA_URI);
      await registry.connect(worker).registerWork(workId("gh-1"), WORK_TYPE.GITHUB_CONTRIBUTION, SHA256_ABC, METADATA_URI);
      await registry.connect(worker).registerWork(workId("hp-1"), WORK_TYPE.HACKATHON_PROJECT, SHA256_ABC, METADATA_URI);
      await registry.connect(worker).registerWork(workId("sc-rej"), WORK_TYPE.SMART_CONTRACT, SHA256_ABC, METADATA_URI);
      await registry.connect(worker).registerWork(workId("gh-rev"), WORK_TYPE.GITHUB_CONTRIBUTION, SHA256_ABC, METADATA_URI);
      await registry.connect(worker).registerWork(workId("hp-pend"), WORK_TYPE.HACKATHON_PROJECT, SHA256_ABC, METADATA_URI);

      await registry.connect(verifier).verifyWork(workId("sc-1"));
      await registry.connect(verifier).verifyWork(workId("sc-2"));
      await registry.connect(verifier).verifyWork(workId("gh-1"));
      await registry.connect(verifier).verifyWork(workId("hp-1"));
      await registry.connect(verifier).rejectWork(workId("sc-rej"), "bad");
      await registry.connect(verifier).verifyWork(workId("gh-rev"));
      await registry.connect(verifier).revokeWork(workId("gh-rev"), "compromised");

      const stats = await registry.getWorkerStats(worker.address);
      expect(stats.totalVerified).to.equal(4n);
      expect(stats.smartContracts).to.equal(2n);
      expect(stats.githubContributions).to.equal(1n);
      expect(stats.hackathonProjects).to.equal(1n);
    });

    it("returns zeroed stats for an address with no work", async function () {
      const { registry, attacker } = await loadFixture(deployRegistryFixture);
      const stats = await registry.getWorkerStats(attacker.address);
      expect(stats.totalVerified).to.equal(0n);
      expect(stats.smartContracts).to.equal(0n);
      expect(stats.githubContributions).to.equal(0n);
      expect(stats.hackathonProjects).to.equal(0n);
    });

    it("keeps getAllWorkIds in registration order across workers", async function () {
      const { registry, worker, otherWorker } = await loadFixture(deployRegistryFixture);
      await registry.connect(worker).registerWork(workId("w1"), WORK_TYPE.SMART_CONTRACT, SHA256_ABC, METADATA_URI);
      await registry.connect(otherWorker).registerWork(workId("w2"), WORK_TYPE.SMART_CONTRACT, SHA256_ABC, METADATA_URI);
      await registry.connect(worker).registerWork(workId("w3"), WORK_TYPE.SMART_CONTRACT, SHA256_ABC, METADATA_URI);
      expect(await registry.getAllWorkIds()).to.deep.equal([workId("w1"), workId("w2"), workId("w3")]);
      expect(await registry.getTotalWorkCount()).to.equal(3n);
    });

    it("returns an empty list for a worker with no submissions", async function () {
      const { registry, attacker } = await loadFixture(deployRegistryFixture);
      expect(await registry.getWorksByWorker(attacker.address)).to.deep.equal([]);
    });
  });

  // --- Ownership & F-1 regression ---

  describe("Ownership transfer", function () {
    it("transfers ownership and emits the event", async function () {
      const { registry, owner, newOwner } = await loadFixture(deployRegistryFixture);
      await expect(registry.connect(owner).transferOwnership(newOwner.address))
        .to.emit(registry, "OwnershipTransferred")
        .withArgs(owner.address, newOwner.address);
      expect(await registry.owner()).to.equal(newOwner.address);
    });

    it("reverts transfer when called by a non-owner", async function () {
      const { registry, attacker, newOwner } = await loadFixture(deployRegistryFixture);
      await expect(
        registry.connect(attacker).transferOwnership(newOwner.address)
      ).to.be.revertedWith("Only registry owner may perform this action");
    });

    it("reverts transfer to the zero address", async function () {
      const { registry, owner } = await loadFixture(deployRegistryFixture);
      await expect(
        registry.connect(owner).transferOwnership(ZERO_ADDRESS)
      ).to.be.revertedWith("Invalid new owner");
    });

    it("keeps the owner's verifier grant on self-transfer", async function () {
      const { registry, owner } = await loadFixture(deployRegistryFixture);
      await expect(registry.connect(owner).transferOwnership(owner.address))
        .to.emit(registry, "OwnershipTransferred")
        .withArgs(owner.address, owner.address);
      expect(await registry.authorizedVerifiers(owner.address)).to.equal(true);
      expect(await registry.isVerifier(owner.address)).to.equal(true);
    });

    it("strips the previous owner's verifier authorization on transfer (F-1 regression)", async function () {
      const { registry, owner, newOwner } = await loadFixture(deployRegistryFixture);
      await expect(registry.connect(owner).transferOwnership(newOwner.address))
        .to.emit(registry, "VerifierRemoved")
        .withArgs(owner.address);
      expect(await registry.authorizedVerifiers(owner.address)).to.equal(false);
      expect(await registry.isVerifier(owner.address)).to.equal(false);
    });

    it("prevents the previous owner from verifying after transfer (F-1 regression)", async function () {
      const { registry, owner, newOwner, worker } = await loadFixture(deployRegistryFixture);
      const id = workId("post-transfer");
      await registry
        .connect(worker)
        .registerWork(id, WORK_TYPE.SMART_CONTRACT, SHA256_ABC, METADATA_URI);
      await registry.connect(owner).transferOwnership(newOwner.address);
      await expect(
        registry.connect(owner).verifyWork(id)
      ).to.be.revertedWith("Caller is not an authorized verifier");
    });

    it("prevents the previous owner from rejecting, revoking, and managing verifiers after transfer", async function () {
      const f = await loadFixture(verifiedWorkFixture);
      const { registry, owner, newOwner, workId: id, attacker } = f;
      await registry.connect(owner).transferOwnership(newOwner.address);
      await expect(
        registry.connect(owner).rejectWork(id, "late")
      ).to.be.revertedWith("Caller is not an authorized verifier");
      await expect(
        registry.connect(owner).revokeWork(id, "late")
      ).to.be.revertedWith("Caller is not an authorized verifier");
      await expect(
        registry.connect(owner).approveVerifier(attacker.address)
      ).to.be.revertedWith("Only registry owner may perform this action");
      await expect(
        registry.connect(owner).removeVerifier(attacker.address)
      ).to.be.revertedWith("Only registry owner may perform this action");
      await expect(
        registry.connect(owner).transferOwnership(owner.address)
      ).to.be.revertedWith("Only registry owner may perform this action");
    });

    it("grants the new owner the implicit verifier privilege", async function () {
      const { registry, owner, newOwner, worker } = await loadFixture(deployRegistryFixture);
      const id = workId("new-owner-verifies");
      await registry
        .connect(worker)
        .registerWork(id, WORK_TYPE.SMART_CONTRACT, SHA256_ABC, METADATA_URI);
      await registry.connect(owner).transferOwnership(newOwner.address);
      await registry.connect(newOwner).verifyWork(id);
      expect(await registry.isVerified(id)).to.equal(true);
    });
  });

  // --- Evidence integrity ---

  describe("Evidence integrity", function () {
    it("stores and returns an exact SHA-256 digest (NIST vector)", async function () {
      const f = await loadFixture(pendingWorkFixture);
      const { registry, workId: id } = f;
      const w = await registry.getWork(id);
      expect(w.evidenceHash).to.equal(SHA256_ABC);
    });

    it("preserves a Node-computed SHA-256 of a canonical evidence manifest", async function () {
      const { registry, worker } = await loadFixture(deployRegistryFixture);
      const manifest = JSON.stringify({
        repo: "https://github.com/example/erc20",
        commit: "9c8f3a1",
        deploymentTx: "0xabc123",
      });
      const evidenceHash = "0x" + createHash("sha256").update(manifest).digest("hex");
      const id = workId("sha-manifest");
      await registry
        .connect(worker)
        .registerWork(id, WORK_TYPE.SMART_CONTRACT, evidenceHash, METADATA_URI);
      const w = await registry.getWork(id);
      expect(w.evidenceHash).to.equal(evidenceHash);
    });

    it("treats workId as an opaque bytes32 with no on-chain interpretation", async function () {
      const { registry, worker } = await loadFixture(deployRegistryFixture);
      const id = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
      await registry
        .connect(worker)
        .registerWork(id, WORK_TYPE.HACKATHON_PROJECT, SHA256_ABC, METADATA_URI);
      const w = await registry.getWork(id);
      expect(w.workId).to.equal(id);
    });
  });
});
