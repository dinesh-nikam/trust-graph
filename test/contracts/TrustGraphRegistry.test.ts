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
const CLAIM_CONTRACT_DEPLOYED = encodeBytes32String("CONTRACT_DEPLOYED");
const CLAIM_GITHUB_CONTRIBUTION = encodeBytes32String("GITHUB_CONTRIBUTION");
const EVIDENCE_URI = "https://evidence.trustgraph.dev/manifests/att-1.json";

const VALIDITY = {
  NOT_FOUND: 0n,
  VALID: 1n,
  REVOKED: 2n,
  EXPIRED: 3n,
  INVALID_ISSUER: 4n,
} as const;

describe("TrustGraphRegistry", function () {
  async function deployRegistryFixture() {
    const [owner, issuer, secondIssuer, subject, otherSubject, attacker, newOwner] =
      await ethers.getSigners();

    const registry = await ethers.deployContract("TrustGraphRegistry");
    await registry.waitForDeployment();

    await registry.approveIssuer(issuer.address);
    await registry.approveIssuer(secondIssuer.address);

    return {
      registry,
      owner,
      issuer,
      secondIssuer,
      subject,
      otherSubject,
      attacker,
      newOwner,
    };
  }

  async function issuedPerpetualFixture() {
    const base = await loadFixture(deployRegistryFixture);
    const { registry, issuer, subject } = base;
    const issuedAt = (await time.latest()) + 100;
    await time.setNextBlockTimestamp(issuedAt);
    await registry
      .connect(issuer)
      .issueAttestation(
        subject.address,
        CLAIM_CONTRACT_DEPLOYED,
        SHA256_ABC,
        EVIDENCE_URI,
        0
      );
    return { ...base, attestationId: 1n, issuedAt };
  }

  // --- Deployment & Initialization ---

  describe("Deployment", function () {
    it("sets the deployer as owner", async function () {
      const { registry, owner } = await loadFixture(deployRegistryFixture);
      expect(await registry.owner()).to.equal(owner.address);
    });

    it("grants the deployer an implicit issuer privilege", async function () {
      const { registry, owner } = await loadFixture(deployRegistryFixture);
      expect(await registry.isIssuer(owner.address)).to.equal(true);
      expect(await registry.authorizedIssuers(owner.address)).to.equal(true);
    });

    it("does not treat arbitrary addresses as issuers", async function () {
      const { registry, attacker } = await loadFixture(deployRegistryFixture);
      expect(await registry.isIssuer(attacker.address)).to.equal(false);
    });

    it("starts with an empty registry", async function () {
      const { registry } = await loadFixture(deployRegistryFixture);
      expect(await registry.getTotalAttestations()).to.equal(0n);
      expect(await registry.getAllAttestationIds()).to.deep.equal([]);
    });
  });

  // --- Issuer Management ---

  describe("Issuer management", function () {
    it("allows the owner to approve an issuer", async function () {
      const { registry, owner, attacker } = await loadFixture(deployRegistryFixture);
      await expect(registry.connect(owner).approveIssuer(attacker.address))
        .to.emit(registry, "IssuerApproved")
        .withArgs(attacker.address);
      expect(await registry.isIssuer(attacker.address)).to.equal(true);
    });

    it("reverts issuer approval when called by a non-owner", async function () {
      const { registry, attacker, subject } = await loadFixture(deployRegistryFixture);
      await expect(
        registry.connect(attacker).approveIssuer(subject.address)
      ).to.be.revertedWith("Only registry owner may perform this action");
    });

    it("reverts issuer approval for the zero address", async function () {
      const { registry, owner } = await loadFixture(deployRegistryFixture);
      await expect(
        registry.connect(owner).approveIssuer(ZERO_ADDRESS)
      ).to.be.revertedWith("Invalid issuer address");
    });

    it("reverts on approving an already authorized issuer", async function () {
      const { registry, owner, issuer } = await loadFixture(deployRegistryFixture);
      await expect(
        registry.connect(owner).approveIssuer(issuer.address)
      ).to.be.revertedWith("Issuer already authorized");
    });

    it("allows the owner to remove an issuer", async function () {
      const { registry, owner, issuer } = await loadFixture(deployRegistryFixture);
      await expect(registry.connect(owner).removeIssuer(issuer.address))
        .to.emit(registry, "IssuerRemoved")
        .withArgs(issuer.address);
      expect(await registry.isIssuer(issuer.address)).to.equal(false);
      expect(await registry.authorizedIssuers(issuer.address)).to.equal(false);
    });

    it("reverts issuer removal when called by a non-owner", async function () {
      const { registry, attacker, issuer } = await loadFixture(deployRegistryFixture);
      await expect(
        registry.connect(attacker).removeIssuer(issuer.address)
      ).to.be.revertedWith("Only registry owner may perform this action");
    });

    it("reverts issuer removal for the zero address", async function () {
      const { registry, owner } = await loadFixture(deployRegistryFixture);
      await expect(
        registry.connect(owner).removeIssuer(ZERO_ADDRESS)
      ).to.be.revertedWith("Invalid issuer address");
    });

    it("reverts issuer removal for an address that was never authorized", async function () {
      const { registry, owner, attacker } = await loadFixture(deployRegistryFixture);
      await expect(
        registry.connect(owner).removeIssuer(attacker.address)
      ).to.be.revertedWith("Address is not an authorized issuer");
    });

    it("keeps the owner an issuer via the implicit privilege even after their explicit grant is removed", async function () {
      const { registry, owner } = await loadFixture(deployRegistryFixture);
      // owner removes their own explicit grant
      await registry.connect(owner).removeIssuer(owner.address);
      expect(await registry.authorizedIssuers(owner.address)).to.equal(false);
      expect(await registry.isIssuer(owner.address)).to.equal(true);
    });

    it("reverts removal initiated by an issuer (issuer cannot manage issuers)", async function () {
      const { registry, issuer, secondIssuer } = await loadFixture(deployRegistryFixture);
      await expect(
        registry.connect(issuer).removeIssuer(secondIssuer.address)
      ).to.be.revertedWith("Only registry owner may perform this action");
    });
  });

  // --- Attestation Issuance ---

  describe("Attestation issuance", function () {
    it("lets an authorized issuer issue an attestation with id 1", async function () {
      const { registry, issuer, subject } = await loadFixture(deployRegistryFixture);
      await expect(
        registry
          .connect(issuer)
          .issueAttestation(
            subject.address,
            CLAIM_CONTRACT_DEPLOYED,
            SHA256_ABC,
            EVIDENCE_URI,
            0
          )
      )
        .to.emit(registry, "AttestationIssued")
        .withArgs(
          1n,
          issuer.address,
          subject.address,
          CLAIM_CONTRACT_DEPLOYED,
          SHA256_ABC,
          0n
        );
      expect(await registry.getTotalAttestations()).to.equal(1n);
    });

    it("lets the owner issue an attestation through the implicit issuer privilege", async function () {
      const { registry, owner, subject } = await loadFixture(deployRegistryFixture);
      await expect(
        registry
          .connect(owner)
          .issueAttestation(subject.address, CLAIM_CONTRACT_DEPLOYED, SHA256_ABC, EVIDENCE_URI, 0)
      )
        .to.emit(registry, "AttestationIssued")
        .withArgs(1n, owner.address, subject.address, CLAIM_CONTRACT_DEPLOYED, SHA256_ABC, 0n);
    });

    it("reverts issuance by a non-issuer", async function () {
      const { registry, attacker, subject } = await loadFixture(deployRegistryFixture);
      await expect(
        registry
          .connect(attacker)
          .issueAttestation(subject.address, CLAIM_CONTRACT_DEPLOYED, SHA256_ABC, EVIDENCE_URI, 0)
      ).to.be.revertedWith("Caller is not an authorized issuer");
    });

    it("reverts issuance after the issuer authorization is removed", async function () {
      const { registry, owner, issuer, subject } = await loadFixture(deployRegistryFixture);
      await registry.connect(owner).removeIssuer(issuer.address);
      await expect(
        registry
          .connect(issuer)
          .issueAttestation(subject.address, CLAIM_CONTRACT_DEPLOYED, SHA256_ABC, EVIDENCE_URI, 0)
      ).to.be.revertedWith("Caller is not an authorized issuer");
    });

    it("reverts issuance to the zero subject", async function () {
      const { registry, issuer } = await loadFixture(deployRegistryFixture);
      await expect(
        registry
          .connect(issuer)
          .issueAttestation(ZERO_ADDRESS, CLAIM_CONTRACT_DEPLOYED, SHA256_ABC, EVIDENCE_URI, 0)
      ).to.be.revertedWith("Invalid subject address");
    });

    it("reverts issuance with an empty claim type", async function () {
      const { registry, issuer, subject } = await loadFixture(deployRegistryFixture);
      await expect(
        registry
          .connect(issuer)
          .issueAttestation(subject.address, ZeroHash, SHA256_ABC, EVIDENCE_URI, 0)
      ).to.be.revertedWith("Claim type cannot be empty");
    });

    it("reverts issuance with an empty evidence hash", async function () {
      const { registry, issuer, subject } = await loadFixture(deployRegistryFixture);
      await expect(
        registry
          .connect(issuer)
          .issueAttestation(subject.address, CLAIM_CONTRACT_DEPLOYED, ZeroHash, EVIDENCE_URI, 0)
      ).to.be.revertedWith("Evidence hash cannot be empty");
    });

    it("reverts issuance with an expiry in the past", async function () {
      const { registry, issuer, subject } = await loadFixture(deployRegistryFixture);
      const past = (await time.latest()) - 10;
      await expect(
        registry
          .connect(issuer)
          .issueAttestation(subject.address, CLAIM_CONTRACT_DEPLOYED, SHA256_ABC, EVIDENCE_URI, past)
      ).to.be.revertedWith("Expiry must be in the future");
    });

    it("reverts issuance when expiry equals the issuing block timestamp", async function () {
      const { registry, issuer, subject } = await loadFixture(deployRegistryFixture);
      const expiry = (await time.latest()) + 500;
      await time.setNextBlockTimestamp(expiry);
      await expect(
        registry
          .connect(issuer)
          .issueAttestation(subject.address, CLAIM_CONTRACT_DEPLOYED, SHA256_ABC, EVIDENCE_URI, expiry)
      ).to.be.revertedWith("Expiry must be in the future");
    });

    it("allows a perpetual attestation (expiry = 0)", async function () {
      const { registry, issuer, subject } = await loadFixture(deployRegistryFixture);
      await registry
        .connect(issuer)
        .issueAttestation(subject.address, CLAIM_CONTRACT_DEPLOYED, SHA256_ABC, EVIDENCE_URI, 0);
      expect(await registry.getTotalAttestations()).to.equal(1n);
      expect(await registry.getValidityStatus(1n)).to.equal(VALIDITY.VALID);
    });

    it("records the full attestation struct with deterministic fields", async function () {
      const { attestationId, issuedAt, registry, issuer, subject } =
        await loadFixture(issuedPerpetualFixture);
      const att = await registry.getAttestation(attestationId);
      expect(att.id).to.equal(attestationId);
      expect(att.issuer).to.equal(issuer.address);
      expect(att.subject).to.equal(subject.address);
      expect(att.claimType).to.equal(CLAIM_CONTRACT_DEPLOYED);
      expect(att.evidenceHash).to.equal(SHA256_ABC);
      expect(att.evidenceUri).to.equal(EVIDENCE_URI);
      expect(att.issuedAt).to.equal(issuedAt);
      expect(att.expiry).to.equal(0n);
      expect(att.revoked).to.equal(false);
      expect(att.revocationReason).to.equal("");
    });

    it("allocates monotonically increasing ids across issuers", async function () {
      const { registry, issuer, secondIssuer, subject, otherSubject } =
        await loadFixture(deployRegistryFixture);
      await registry
        .connect(issuer)
        .issueAttestation(subject.address, CLAIM_CONTRACT_DEPLOYED, SHA256_ABC, EVIDENCE_URI, 0);
      await registry
        .connect(secondIssuer)
        .issueAttestation(otherSubject.address, CLAIM_GITHUB_CONTRIBUTION, SHA256_ABC, EVIDENCE_URI, 0);
      await registry
        .connect(issuer)
        .issueAttestation(otherSubject.address, CLAIM_GITHUB_CONTRIBUTION, SHA256_ABC, EVIDENCE_URI, 0);

      expect(await registry.getTotalAttestations()).to.equal(3n);
      expect(await registry.getAllAttestationIds()).to.deep.equal([1n, 2n, 3n]);
    });
  });

  // --- Revocation ---

  describe("Attestation revocation", function () {
    it("lets the original issuer revoke with a reason and emits the event", async function () {
      const f = await loadFixture(issuedPerpetualFixture);
      const { registry, issuer, attestationId, issuedAt } = f;
      const revokeAt = issuedAt + 50;
      await time.setNextBlockTimestamp(revokeAt);
      await expect(
        registry.connect(issuer).revokeAttestation(attestationId, "evidence was withdrawn")
      )
        .to.emit(registry, "AttestationRevoked")
        .withArgs(attestationId, issuer.address, "evidence was withdrawn", revokeAt);

      const att = await registry.getAttestation(attestationId);
      expect(att.revoked).to.equal(true);
      expect(att.revocationReason).to.equal("evidence was withdrawn");
    });

    it("lets the registry owner revoke an attestation they did not issue", async function () {
      const f = await loadFixture(issuedPerpetualFixture);
      const { registry, owner, attestationId, issuedAt } = f;
      const revokeAt = issuedAt + 10;
      await time.setNextBlockTimestamp(revokeAt);
      await expect(
        registry.connect(owner).revokeAttestation(attestationId, "owner review")
      )
        .to.emit(registry, "AttestationRevoked")
        .withArgs(attestationId, owner.address, "owner review", revokeAt);
    });

    it("reverts revocation by a different issuer", async function () {
      const f = await loadFixture(issuedPerpetualFixture);
      const { registry, secondIssuer, attestationId } = f;
      await expect(
        registry.connect(secondIssuer).revokeAttestation(attestationId, "hostile")
      ).to.be.revertedWith("Only the issuing reviewer or registry owner can revoke");
    });

    it("reverts revocation by an unauthorized attacker", async function () {
      const f = await loadFixture(issuedPerpetualFixture);
      const { registry, attacker, attestationId } = f;
      await expect(
        registry.connect(attacker).revokeAttestation(attestationId, "hack")
      ).to.be.revertedWith("Only the issuing reviewer or registry owner can revoke");
    });

    it("reverts revocation of a nonexistent attestation", async function () {
      const { registry, owner } = await loadFixture(deployRegistryFixture);
      await expect(
        registry.connect(owner).revokeAttestation(999n, "missing")
      ).to.be.revertedWith("Attestation does not exist");
    });

    it("reverts revocation of id 0", async function () {
      const { registry, owner } = await loadFixture(deployRegistryFixture);
      await expect(
        registry.connect(owner).revokeAttestation(0n, "zero")
      ).to.be.revertedWith("Attestation does not exist");
    });

    it("reverts double revocation", async function () {
      const f = await loadFixture(issuedPerpetualFixture);
      const { registry, issuer, attestationId } = f;
      await registry.connect(issuer).revokeAttestation(attestationId, "first");
      await expect(
        registry.connect(issuer).revokeAttestation(attestationId, "second")
      ).to.be.revertedWith("Attestation is already revoked");
    });

    it("reverts on an empty revocation reason", async function () {
      const f = await loadFixture(issuedPerpetualFixture);
      const { registry, issuer, attestationId } = f;
      await expect(
        registry.connect(issuer).revokeAttestation(attestationId, "")
      ).to.be.revertedWith("Revocation reason cannot be empty");
    });

    it("keeps the revoked attestation in subject and issuer queries (historical integrity)", async function () {
      const f = await loadFixture(issuedPerpetualFixture);
      const { registry, issuer, subject, attestationId } = f;
      await registry.connect(issuer).revokeAttestation(attestationId, "reason");
      expect(await registry.getAttestationsBySubject(subject.address)).to.deep.equal([attestationId]);
      expect(await registry.getAttestationsByIssuer(issuer.address)).to.deep.equal([attestationId]);
      expect(await registry.getAllAttestationIds()).to.deep.equal([attestationId]);
      expect(await registry.getTotalAttestations()).to.equal(1n);
    });
  });

  // --- Validity & Status Precedence ---

  describe("Validity status", function () {
    it("returns NOT_FOUND and isValid false for a nonexistent attestation", async function () {
      const { registry } = await loadFixture(deployRegistryFixture);
      expect(await registry.getValidityStatus(42n)).to.equal(VALIDITY.NOT_FOUND);
      expect(await registry.isValid(42n)).to.equal(false);
    });

    it("returns VALID for a fresh unrevoked, unexpired attestation", async function () {
      const f = await loadFixture(issuedPerpetualFixture);
      const { registry, attestationId } = f;
      expect(await registry.getValidityStatus(attestationId)).to.equal(VALIDITY.VALID);
      expect(await registry.isValid(attestationId)).to.equal(true);
    });

    it("returns REVOKED after revocation", async function () {
      const f = await loadFixture(issuedPerpetualFixture);
      const { registry, issuer, attestationId } = f;
      await registry.connect(issuer).revokeAttestation(attestationId, "reason");
      expect(await registry.getValidityStatus(attestationId)).to.equal(VALIDITY.REVOKED);
      expect(await registry.isValid(attestationId)).to.equal(false);
    });

    it("returns EXPIRED after the expiry timestamp passes", async function () {
      const { registry, issuer, subject } = await loadFixture(deployRegistryFixture);
      const now = await time.latest();
      const expiry = now + 1000;
      await registry
        .connect(issuer)
        .issueAttestation(subject.address, CLAIM_CONTRACT_DEPLOYED, SHA256_ABC, EVIDENCE_URI, expiry);
      await time.increaseTo(expiry + 1);
      expect(await registry.getValidityStatus(1n)).to.equal(VALIDITY.EXPIRED);
      expect(await registry.isValid(1n)).to.equal(false);
    });

    it("treats expiry as inclusive: valid one second before, expired at the exact timestamp", async function () {
      const { registry, issuer, subject } = await loadFixture(deployRegistryFixture);
      const now = await time.latest();
      const expiry = now + 1000;
      await registry
        .connect(issuer)
        .issueAttestation(subject.address, CLAIM_CONTRACT_DEPLOYED, SHA256_ABC, EVIDENCE_URI, expiry);

      await time.increaseTo(expiry - 1);
      expect(await registry.getValidityStatus(1n)).to.equal(VALIDITY.VALID);
      expect(await registry.isValid(1n)).to.equal(true);

      await time.increaseTo(expiry);
      expect(await registry.getValidityStatus(1n)).to.equal(VALIDITY.EXPIRED);
      expect(await registry.isValid(1n)).to.equal(false);
    });

    it("never expires a perpetual attestation (expiry = 0)", async function () {
      const f = await loadFixture(issuedPerpetualFixture);
      const { registry, attestationId, issuedAt } = f;
      await time.increaseTo(issuedAt + 3650 * 24 * 60 * 60);
      expect(await registry.getValidityStatus(attestationId)).to.equal(VALIDITY.VALID);
      expect(await registry.isValid(attestationId)).to.equal(true);
    });

    it("gives REVOKED precedence over EXPIRED", async function () {
      const { registry, issuer, subject } = await loadFixture(deployRegistryFixture);
      const now = await time.latest();
      const expiry = now + 1000;
      await registry
        .connect(issuer)
        .issueAttestation(subject.address, CLAIM_CONTRACT_DEPLOYED, SHA256_ABC, EVIDENCE_URI, expiry);
      await registry.connect(issuer).revokeAttestation(1n, "revoked before expiry");
      await time.increaseTo(expiry + 1);
      expect(await registry.getValidityStatus(1n)).to.equal(VALIDITY.REVOKED);
    });

    it("gives EXPIRED precedence over INVALID_ISSUER", async function () {
      const { registry, owner, issuer, subject } = await loadFixture(deployRegistryFixture);
      const now = await time.latest();
      const expiry = now + 1000;
      await registry
        .connect(issuer)
        .issueAttestation(subject.address, CLAIM_CONTRACT_DEPLOYED, SHA256_ABC, EVIDENCE_URI, expiry);
      await registry.connect(owner).removeIssuer(issuer.address);
      await time.increaseTo(expiry + 1);
      expect(await registry.getValidityStatus(1n)).to.equal(VALIDITY.EXPIRED);
    });

    it("returns INVALID_ISSUER when the issuing issuer is de-authorized", async function () {
      const f = await loadFixture(issuedPerpetualFixture);
      const { registry, owner, issuer, attestationId } = f;
      await registry.connect(owner).removeIssuer(issuer.address);
      expect(await registry.getValidityStatus(attestationId)).to.equal(VALIDITY.INVALID_ISSUER);
      expect(await registry.isValid(attestationId)).to.equal(false);
    });

    it("restores VALID when the issuer is re-authorized", async function () {
      const f = await loadFixture(issuedPerpetualFixture);
      const { registry, owner, issuer, attestationId } = f;
      await registry.connect(owner).removeIssuer(issuer.address);
      expect(await registry.getValidityStatus(attestationId)).to.equal(VALIDITY.INVALID_ISSUER);
      await registry.connect(owner).approveIssuer(issuer.address);
      expect(await registry.getValidityStatus(attestationId)).to.equal(VALIDITY.VALID);
    });

    it("keeps owner-issued attestations VALID even though the owner has no explicit grant", async function () {
      const { registry, owner, subject } = await loadFixture(deployRegistryFixture);
      await registry
        .connect(owner)
        .issueAttestation(subject.address, CLAIM_CONTRACT_DEPLOYED, SHA256_ABC, EVIDENCE_URI, 0);
      expect(await registry.getValidityStatus(1n)).to.equal(VALIDITY.VALID);
    });

    it("owner attestations remain valid after the owner's explicit grant is removed (implicit privilege)", async function () {
      const { registry, owner, subject } = await loadFixture(deployRegistryFixture);
      await registry
        .connect(owner)
        .issueAttestation(subject.address, CLAIM_CONTRACT_DEPLOYED, SHA256_ABC, EVIDENCE_URI, 0);
      await registry.connect(owner).removeIssuer(owner.address);
      expect(await registry.getValidityStatus(1n)).to.equal(VALIDITY.VALID);
    });
  });

  // --- Queries ---

  describe("Query functions", function () {
    it("reverts getAttestation for a nonexistent id", async function () {
      const { registry } = await loadFixture(deployRegistryFixture);
      await expect(registry.getAttestation(7n)).to.be.revertedWith(
        "Attestation does not exist"
      );
    });

    it("indexes attestations by subject", async function () {
      const { registry, issuer, secondIssuer, subject, otherSubject } =
        await loadFixture(deployRegistryFixture);
      await registry
        .connect(issuer)
        .issueAttestation(subject.address, CLAIM_CONTRACT_DEPLOYED, SHA256_ABC, EVIDENCE_URI, 0);
      await registry
        .connect(secondIssuer)
        .issueAttestation(otherSubject.address, CLAIM_GITHUB_CONTRIBUTION, SHA256_ABC, EVIDENCE_URI, 0);
      await registry
        .connect(issuer)
        .issueAttestation(subject.address, CLAIM_GITHUB_CONTRIBUTION, SHA256_ABC, EVIDENCE_URI, 0);

      expect(await registry.getAttestationsBySubject(subject.address)).to.deep.equal([1n, 3n]);
      expect(await registry.getAttestationsBySubject(otherSubject.address)).to.deep.equal([2n]);
      expect(await registry.getAttestationsBySubject(attackerAddress())).to.deep.equal([]);
    });

    it("indexes attestations by issuer", async function () {
      const { registry, issuer, secondIssuer, subject, otherSubject } =
        await loadFixture(deployRegistryFixture);
      await registry
        .connect(issuer)
        .issueAttestation(subject.address, CLAIM_CONTRACT_DEPLOYED, SHA256_ABC, EVIDENCE_URI, 0);
      await registry
        .connect(secondIssuer)
        .issueAttestation(otherSubject.address, CLAIM_GITHUB_CONTRIBUTION, SHA256_ABC, EVIDENCE_URI, 0);
      await registry
        .connect(issuer)
        .issueAttestation(otherSubject.address, CLAIM_GITHUB_CONTRIBUTION, SHA256_ABC, EVIDENCE_URI, 0);

      expect(await registry.getAttestationsByIssuer(issuer.address)).to.deep.equal([1n, 3n]);
      expect(await registry.getAttestationsByIssuer(secondIssuer.address)).to.deep.equal([2n]);
    });

    it("returns an empty list for a subject with no attestations", async function () {
      const { registry, attacker } = await loadFixture(deployRegistryFixture);
      expect(await registry.getAttestationsBySubject(attacker.address)).to.deep.equal([]);
      expect(await registry.getAttestationsByIssuer(attacker.address)).to.deep.equal([]);
    });

    it("tracks total and all ids across many issuances", async function () {
      const { registry, issuer, secondIssuer, subject, otherSubject } =
        await loadFixture(deployRegistryFixture);
      for (let i = 0; i < 4; i++) {
        const who = i % 2 === 0 ? issuer : secondIssuer;
        const target = i % 2 === 0 ? subject : otherSubject;
        await registry
          .connect(who)
          .issueAttestation(target.address, CLAIM_CONTRACT_DEPLOYED, SHA256_ABC, EVIDENCE_URI, 0);
      }
      expect(await registry.getTotalAttestations()).to.equal(4n);
      expect(await registry.getAllAttestationIds()).to.deep.equal([1n, 2n, 3n, 4n]);
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

    it("keeps the owner's issuer grant on self-transfer", async function () {
      const { registry, owner } = await loadFixture(deployRegistryFixture);
      await expect(
        registry.connect(owner).transferOwnership(owner.address)
      )
        .to.emit(registry, "OwnershipTransferred")
        .withArgs(owner.address, owner.address);
      expect(await registry.authorizedIssuers(owner.address)).to.equal(true);
      expect(await registry.isIssuer(owner.address)).to.equal(true);
    });

    it("strips the previous owner's issuer authorization on transfer (F-1 regression)", async function () {
      const { registry, owner, newOwner } = await loadFixture(deployRegistryFixture);
      await expect(registry.connect(owner).transferOwnership(newOwner.address))
        .to.emit(registry, "IssuerRemoved")
        .withArgs(owner.address);
      expect(await registry.authorizedIssuers(owner.address)).to.equal(false);
      expect(await registry.isIssuer(owner.address)).to.equal(false);
    });

    it("prevents the previous owner from issuing attestations after transfer (F-1 regression)", async function () {
      const { registry, owner, newOwner, subject } = await loadFixture(deployRegistryFixture);
      await registry.connect(owner).transferOwnership(newOwner.address);
      await expect(
        registry
          .connect(owner)
          .issueAttestation(subject.address, CLAIM_CONTRACT_DEPLOYED, SHA256_ABC, EVIDENCE_URI, 0)
      ).to.be.revertedWith("Caller is not an authorized issuer");
    });

    it("prevents the previous owner from calling onlyOwner functions after transfer", async function () {
      const { registry, owner, newOwner, attacker } = await loadFixture(deployRegistryFixture);
      await registry.connect(owner).transferOwnership(newOwner.address);
      await expect(
        registry.connect(owner).approveIssuer(attacker.address)
      ).to.be.revertedWith("Only registry owner may perform this action");
      await expect(
        registry.connect(owner).transferOwnership(owner.address)
      ).to.be.revertedWith("Only registry owner may perform this action");
    });

    it("grants the new owner the implicit issuer privilege and owner revocation right", async function () {
      const f = await loadFixture(issuedPerpetualFixture);
      const { registry, owner, newOwner, attestationId, subject } = f;
      await registry.connect(owner).transferOwnership(newOwner.address);

      expect(await registry.isIssuer(newOwner.address)).to.equal(true);
      await registry
        .connect(newOwner)
        .issueAttestation(subject.address, CLAIM_CONTRACT_DEPLOYED, SHA256_ABC, EVIDENCE_URI, 0);
      expect(await registry.getTotalAttestations()).to.equal(2n);

      await registry
        .connect(newOwner)
        .revokeAttestation(attestationId, "new owner revocation");
      expect(await registry.getValidityStatus(attestationId)).to.equal(VALIDITY.REVOKED);
    });

    it("keeps the original issuer's right to revoke their own attestation after ownership changes", async function () {
      const f = await loadFixture(issuedPerpetualFixture);
      const { registry, owner, newOwner, issuer, attestationId } = f;
      await registry.connect(owner).transferOwnership(newOwner.address);
      // issuer privilege is independent of ownership
      await registry.connect(issuer).revokeAttestation(attestationId, "issuer still can");
      expect((await registry.getAttestation(attestationId)).revoked).to.equal(true);
    });
  });

  // --- Evidence integrity (SHA-256 bytes32 convention) ---

  describe("Evidence integrity", function () {
    it("stores and returns an exact SHA-256 digest (NIST vector) without transformation", async function () {
      const { registry, issuer, subject } = await loadFixture(deployRegistryFixture);
      await registry
        .connect(issuer)
        .issueAttestation(subject.address, CLAIM_CONTRACT_DEPLOYED, SHA256_ABC, EVIDENCE_URI, 0);
      const att = await registry.getAttestation(1n);
      expect(att.evidenceHash).to.equal(SHA256_ABC);
    });

    it("preserves a Node-computed SHA-256 of a canonical evidence manifest", async function () {
      const { registry, issuer, subject } = await loadFixture(deployRegistryFixture);
      const manifest = JSON.stringify({
        claimType: "CONTRACT_DEPLOYED",
        repo: "https://github.com/example/erc20",
        commit: "9c8f3a1",
      });
      const digest = createHash("sha256").update(manifest).digest("hex");
      const evidenceHash = "0x" + digest;

      await registry
        .connect(issuer)
        .issueAttestation(subject.address, CLAIM_CONTRACT_DEPLOYED, evidenceHash, EVIDENCE_URI, 0);
      const att = await registry.getAttestation(1n);
      expect(att.evidenceHash).to.equal(evidenceHash);
    });

    it("stores UTF-8 claim types as raw bytes32 without keccak transformation", async function () {
      const { registry, issuer, subject } = await loadFixture(deployRegistryFixture);
      await registry
        .connect(issuer)
        .issueAttestation(subject.address, CLAIM_GITHUB_CONTRIBUTION, SHA256_ABC, EVIDENCE_URI, 0);
      const att = await registry.getAttestation(1n);
      expect(att.claimType).to.equal(CLAIM_GITHUB_CONTRIBUTION);
      expect(att.claimType).to.not.equal(ZeroHash);
    });

    it("accepts identical evidence hashes on distinct attestations", async function () {
      const { registry, issuer, subject, otherSubject } =
        await loadFixture(deployRegistryFixture);
      await registry
        .connect(issuer)
        .issueAttestation(subject.address, CLAIM_CONTRACT_DEPLOYED, SHA256_ABC, EVIDENCE_URI, 0);
      await registry
        .connect(issuer)
        .issueAttestation(otherSubject.address, CLAIM_CONTRACT_DEPLOYED, SHA256_ABC, EVIDENCE_URI, 0);
      expect(await registry.getTotalAttestations()).to.equal(2n);
      const a = await registry.getAttestation(1n);
      const b = await registry.getAttestation(2n);
      expect(a.evidenceHash).to.equal(b.evidenceHash);
      expect(a.subject).to.not.equal(b.subject);
    });
  });
});

// Small helper kept outside the describe to keep fixtures declarative.
function attackerAddress(): string {
  return "0x000000000000000000000000000000000000dEaD";
}
