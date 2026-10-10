// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TrustGraphRegistry
 * @dev Evidence-backed attestation and verification registry on Monad.
 *
 * Core Principle:
 * "Trust the evidence, not the profile."
 *
 * Product Lifecycle:
 * CLAIM -> EVIDENCE -> ISSUER -> ATTESTATION -> CURRENT VALIDITY
 *
 * An attestation proves that an authorized issuer reviewed the evidence
 * and that the attestation is currently valid. It does not automatically
 * prove that the underlying claim is true.
 *
 * Validity states:
 * - VALID: Not revoked, not expired, issuer is currently authorized
 * - REVOKED: Explicitly revoked by issuer or registry owner
 * - EXPIRED: Past the recorded expiry timestamp
 * - INVALID_ISSUER: Issuer authorization has been removed
 */
contract TrustGraphRegistry {
    // --- Data Models ---

    struct Attestation {
        uint256 id;
        address issuer;
        address subject;
        bytes32 claimType;        // e.g. keccak256("CONTRACT_DEPLOYED") or UTF-8 bytes32
        bytes32 evidenceHash;     // Cryptographic SHA-256 hash of canonical evidence manifest
        string evidenceUri;       // Off-chain location of evidence manifest (URL / IPFS)
        uint256 issuedAt;         // Block timestamp when attestation was issued
        uint256 expiry;           // Expiry timestamp (0 = perpetual)
        bool revoked;             // Whether attestation has been revoked
        string revocationReason;  // Human-readable rationale for revocation
    }

    enum ValidityStatus {
        NOT_FOUND,
        VALID,
        REVOKED,
        EXPIRED,
        INVALID_ISSUER
    }

    // --- State Variables ---

    address public owner;
    mapping(address => bool) public authorizedIssuers;

    // Registry Storage
    mapping(uint256 => Attestation) private attestations;
    mapping(address => uint256[]) private subjectAttestationIds;
    mapping(address => uint256[]) private issuerAttestationIds;
    uint256[] private allAttestationIds;

    uint256 private nextAttestationId = 1;

    // --- Events ---

    event IssuerApproved(address indexed issuer);
    event IssuerRemoved(address indexed issuer);

    event AttestationIssued(
        uint256 indexed id,
        address indexed issuer,
        address indexed subject,
        bytes32 claimType,
        bytes32 evidenceHash,
        uint256 expiry
    );

    event AttestationRevoked(
        uint256 indexed id,
        address indexed issuer,
        string reason,
        uint256 timestamp
    );

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // --- Modifiers ---

    modifier onlyOwner() {
        require(msg.sender == owner, "Only registry owner may perform this action");
        _;
    }

    modifier onlyIssuer() {
        require(
            authorizedIssuers[msg.sender] || msg.sender == owner,
            "Caller is not an authorized issuer"
        );
        _;
    }

    // --- Constructor ---

    constructor() {
        owner = msg.sender;
        authorizedIssuers[msg.sender] = true;
        emit IssuerApproved(msg.sender);
    }

    // --- Issuer Management ---

    /**
     * @notice Authorize an address to issue attestations.
     * @param issuer Address to authorize.
     */
    function approveIssuer(address issuer) external onlyOwner {
        require(issuer != address(0), "Invalid issuer address");
        require(!authorizedIssuers[issuer], "Issuer already authorized");
        authorizedIssuers[issuer] = true;
        emit IssuerApproved(issuer);
    }

    /**
     * @notice Remove an authorized issuer.
     * @param issuer Address to de-authorize.
     */
    function removeIssuer(address issuer) external onlyOwner {
        require(issuer != address(0), "Invalid issuer address");
        require(authorizedIssuers[issuer], "Address is not an authorized issuer");
        authorizedIssuers[issuer] = false;
        emit IssuerRemoved(issuer);
    }

    /**
     * @notice Check whether an address is an authorized issuer.
     * @param issuer Address to inspect.
     */
    function isIssuer(address issuer) external view returns (bool) {
        return authorizedIssuers[issuer] || issuer == owner;
    }

    // --- Core Attestation Operations ---

    /**
     * @notice Issue an evidence-backed attestation for a subject wallet.
     * @param subject The wallet address whose work is attested.
     * @param claimType The type of claim (e.g. CONTRACT_DEPLOYED).
     * @param evidenceHash Cryptographic 32-byte hash (SHA-256) of evidence manifest.
     * @param evidenceUri Off-chain pointer to the evidence (URL / IPFS).
     * @param expiry Expiration unix timestamp (0 for perpetual).
     * @return id Unique identifier for the created attestation.
     */
    function issueAttestation(
        address subject,
        bytes32 claimType,
        bytes32 evidenceHash,
        string calldata evidenceUri,
        uint256 expiry
    ) external onlyIssuer returns (uint256 id) {
        require(subject != address(0), "Invalid subject address");
        require(claimType != bytes32(0), "Claim type cannot be empty");
        require(evidenceHash != bytes32(0), "Evidence hash cannot be empty");
        if (expiry != 0) {
            require(expiry > block.timestamp, "Expiry must be in the future");
        }

        id = nextAttestationId++;

        attestations[id] = Attestation({
            id: id,
            issuer: msg.sender,
            subject: subject,
            claimType: claimType,
            evidenceHash: evidenceHash,
            evidenceUri: evidenceUri,
            issuedAt: block.timestamp,
            expiry: expiry,
            revoked: false,
            revocationReason: ""
        });

        allAttestationIds.push(id);
        subjectAttestationIds[subject].push(id);
        issuerAttestationIds[msg.sender].push(id);

        emit AttestationIssued(
            id,
            msg.sender,
            subject,
            claimType,
            evidenceHash,
            expiry
        );
    }

    /**
     * @notice Revoke an existing attestation.
     * @dev Only the original issuer or the registry owner may revoke.
     * Historical record is preserved with revoked = true.
     * @param id The attestation identifier.
     * @param reason Human-readable justification for revocation.
     */
    function revokeAttestation(uint256 id, string calldata reason) external {
        Attestation storage att = attestations[id];
        require(att.issuedAt != 0, "Attestation does not exist");
        require(!att.revoked, "Attestation is already revoked");
        require(bytes(reason).length > 0, "Revocation reason cannot be empty");
        require(
            msg.sender == att.issuer || msg.sender == owner,
            "Only the issuing reviewer or registry owner can revoke"
        );

        att.revoked = true;
        att.revocationReason = reason;

        emit AttestationRevoked(id, msg.sender, reason, block.timestamp);
    }

    // --- Inspection & Validity Verification ---

    /**
     * @notice Get full attestation record by ID.
     * @param id Attestation identifier.
     */
    function getAttestation(uint256 id) external view returns (Attestation memory) {
        require(attestations[id].issuedAt != 0, "Attestation does not exist");
        return attestations[id];
    }

    /**
     * @notice Check whether an attestation is currently valid.
     * @dev An attestation is valid if:
     * 1. It exists.
     * 2. It is not revoked.
     * 3. It has not expired.
     * 4. The issuer is currently authorized.
     * @param id Attestation identifier.
     */
    function isValid(uint256 id) external view returns (bool) {
        Attestation memory att = attestations[id];
        if (att.issuedAt == 0) return false;
        if (att.revoked) return false;
        if (att.expiry != 0 && block.timestamp >= att.expiry) return false;
        if (!authorizedIssuers[att.issuer] && att.issuer != owner) return false;
        return true;
    }

    /**
     * @notice Get explicit validity status enum for an attestation.
     * @param id Attestation identifier.
     * @return status ValidityStatus (NOT_FOUND, VALID, REVOKED, EXPIRED, INVALID_ISSUER).
     */
    function getValidityStatus(uint256 id) external view returns (ValidityStatus status) {
        Attestation memory att = attestations[id];
        if (att.issuedAt == 0) return ValidityStatus.NOT_FOUND;
        if (att.revoked) return ValidityStatus.REVOKED;
        if (att.expiry != 0 && block.timestamp >= att.expiry) return ValidityStatus.EXPIRED;
        if (!authorizedIssuers[att.issuer] && att.issuer != owner) return ValidityStatus.INVALID_ISSUER;
        return ValidityStatus.VALID;
    }

    /**
     * @notice Get all attestation IDs issued for a given subject wallet.
     * @param subject Wallet address of the subject.
     */
    function getAttestationsBySubject(address subject) external view returns (uint256[] memory) {
        return subjectAttestationIds[subject];
    }

    /**
     * @notice Get all attestation IDs issued by a specific issuer.
     * @param issuer Wallet address of the issuer.
     */
    function getAttestationsByIssuer(address issuer) external view returns (uint256[] memory) {
        return issuerAttestationIds[issuer];
    }

    /**
     * @notice Total count of attestations issued in registry history.
     */
    function getTotalAttestations() external view returns (uint256) {
        return allAttestationIds.length;
    }

    /**
     * @notice Get all registered attestation IDs.
     */
    function getAllAttestationIds() external view returns (uint256[] memory) {
        return allAttestationIds;
    }

    // --- Admin Operations ---

    /**
     * @notice Transfer contract ownership to a new administrator.
     * @dev The previous owner's explicit issuer authorization is revoked on
     * transfer; ownership itself carried that grant via the constructor. The
     * new owner remains an issuer through the implicit owner privilege.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        address previousOwner = owner;
        if (newOwner != previousOwner && authorizedIssuers[previousOwner]) {
            authorizedIssuers[previousOwner] = false;
            emit IssuerRemoved(previousOwner);
        }
        emit OwnershipTransferred(previousOwner, newOwner);
        owner = newOwner;
    }
}
