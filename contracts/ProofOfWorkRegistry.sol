// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProofOfWorkRegistry
 * @dev Verification registry on Monad testnet where completed work becomes verifiable proof.
 *
 * Product Lifecycle:
 * Work -> Evidence -> Verification -> On-chain proof -> Passport
 * 
 * Rules:
 * - Evidence details & canonical hashes are anchored on-chain.
 * - Authorized verifiers review off-chain evidence manifests and record approvals/rejections/revocations.
 * - Strict state transitions:
 *     PENDING -> VERIFIED
 *     PENDING -> REJECTED
 *     VERIFIED -> REVOKED
 *   All invalid transitions revert.
 * - No tokens, staking, governance, or NFTs. Simple, clean, verifiable developer proof.
 */
contract ProofOfWorkRegistry {
    // --- Enums ---

    enum WorkType {
        SMART_CONTRACT,
        GITHUB_CONTRIBUTION,
        HACKATHON_PROJECT
    }

    enum Status {
        PENDING,
        VERIFIED,
        REJECTED,
        REVOKED
    }

    // --- Data Models ---

    struct Work {
        bytes32 workId;
        address worker;
        WorkType workType;
        bytes32 evidenceHash;     // Cryptographic 32-byte hash (SHA-256) of canonical evidence
        string metadataUri;      // Off-chain evidence manifest location (URL or IPFS CID)
        address verifier;
        uint256 createdAt;
        uint256 verifiedAt;
        Status status;
        string statusReason;     // Reason for rejection or revocation
    }

    // --- State Variables ---

    address public owner;
    mapping(address => bool) public authorizedVerifiers;

    // Registry storage
    mapping(bytes32 => Work) private works;
    bytes32[] private allWorkIds;
    mapping(address => bytes32[]) private workerWorkIds;

    // --- Events ---

    event WorkSubmitted(
        bytes32 indexed workId,
        address indexed worker,
        WorkType indexed workType,
        bytes32 evidenceHash,
        string metadataUri
    );

    event WorkVerified(
        bytes32 indexed workId,
        address indexed verifier,
        uint256 timestamp
    );

    event WorkRejected(
        bytes32 indexed workId,
        address indexed verifier,
        string reason,
        uint256 timestamp
    );

    event WorkRevoked(
        bytes32 indexed workId,
        address indexed verifier,
        string reason,
        uint256 timestamp
    );

    event VerifierApproved(address indexed verifier);
    event VerifierRemoved(address indexed verifier);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // --- Modifiers ---

    modifier onlyOwner() {
        require(msg.sender == owner, "Only registry owner may perform this action");
        _;
    }

    modifier onlyVerifier() {
        require(
            authorizedVerifiers[msg.sender] || msg.sender == owner,
            "Caller is not an authorized verifier"
        );
        _;
    }

    // --- Constructor ---

    constructor() {
        owner = msg.sender;
        authorizedVerifiers[msg.sender] = true;
        emit VerifierApproved(msg.sender);
    }

    // --- Verifier Authorization Management ---

    /**
     * @notice Authorize an address as a verifier.
     * @param verifier Address to authorize.
     */
    function approveVerifier(address verifier) external onlyOwner {
        require(verifier != address(0), "Invalid verifier address");
        require(!authorizedVerifiers[verifier], "Verifier already authorized");
        authorizedVerifiers[verifier] = true;
        emit VerifierApproved(verifier);
    }

    /**
     * @notice Remove an authorized verifier.
     * @param verifier Address to revoke authorization from.
     */
    function removeVerifier(address verifier) external onlyOwner {
        require(verifier != address(0), "Invalid verifier address");
        require(authorizedVerifiers[verifier], "Address is not an authorized verifier");
        authorizedVerifiers[verifier] = false;
        emit VerifierRemoved(verifier);
    }

    /**
     * @notice Check whether an address is an authorized verifier.
     * @param verifier Address to check.
     */
    function isVerifier(address verifier) external view returns (bool) {
        return authorizedVerifiers[verifier] || verifier == owner;
    }

    // --- Core Registry Operations ---

    /**
     * @notice Register a newly completed work item with cryptographic evidence anchor.
     * @param workId Unique 32-byte identifier for the work item.
     * @param workType Category of work (SMART_CONTRACT, GITHUB_CONTRIBUTION, HACKATHON_PROJECT).
     * @param evidenceHash Deterministic SHA-256 hash of canonical evidence manifest.
     * @param metadataUri Off-chain URL / IPFS pointer to evidence manifest.
     */
    function registerWork(
        bytes32 workId,
        WorkType workType,
        bytes32 evidenceHash,
        string calldata metadataUri
    ) external {
        require(workId != bytes32(0), "Invalid work ID");
        require(works[workId].createdAt == 0, "Work item already registered");
        require(evidenceHash != bytes32(0), "Evidence hash cannot be empty");

        works[workId] = Work({
            workId: workId,
            worker: msg.sender,
            workType: workType,
            evidenceHash: evidenceHash,
            metadataUri: metadataUri,
            verifier: address(0),
            createdAt: block.timestamp,
            verifiedAt: 0,
            status: Status.PENDING,
            statusReason: ""
        });

        allWorkIds.push(workId);
        workerWorkIds[msg.sender].push(workId);

        emit WorkSubmitted(workId, msg.sender, workType, evidenceHash, metadataUri);
    }

    /**
     * @notice Verify a pending work submission.
     * @param workId Unique identifier of pending work.
     */
    function verifyWork(bytes32 workId) external onlyVerifier {
        Work storage record = works[workId];
        require(record.createdAt != 0, "Work item does not exist");
        require(record.status == Status.PENDING, "Can only verify PENDING work");

        record.status = Status.VERIFIED;
        record.verifier = msg.sender;
        record.verifiedAt = block.timestamp;

        emit WorkVerified(workId, msg.sender, block.timestamp);
    }

    /**
     * @notice Reject a pending work submission with human-readable rationale.
     * @param workId Unique identifier of pending work.
     * @param reason Rejection explanation.
     */
    function rejectWork(bytes32 workId, string calldata reason) external onlyVerifier {
        Work storage record = works[workId];
        require(record.createdAt != 0, "Work item does not exist");
        require(record.status == Status.PENDING, "Can only reject PENDING work");
        require(bytes(reason).length > 0, "Rejection reason cannot be empty");

        record.status = Status.REJECTED;
        record.verifier = msg.sender;
        record.verifiedAt = block.timestamp;
        record.statusReason = reason;

        emit WorkRejected(workId, msg.sender, reason, block.timestamp);
    }

    /**
     * @notice Revoke previously verified work item. Historical record is preserved.
     * @param workId Unique work identifier.
     * @param reason Human-readable justification for revocation.
     */
    function revokeWork(bytes32 workId, string calldata reason) external onlyVerifier {
        Work storage record = works[workId];
        require(record.createdAt != 0, "Work item does not exist");
        require(record.status == Status.VERIFIED, "Can only revoke VERIFIED work");
        require(bytes(reason).length > 0, "Revocation reason cannot be empty");

        record.status = Status.REVOKED;
        record.verifier = msg.sender;
        record.verifiedAt = block.timestamp;
        record.statusReason = reason;

        emit WorkRevoked(workId, msg.sender, reason, block.timestamp);
    }

    // --- Query Functions ---

    /**
     * @notice Retrieve full record details for a work item.
     */
    function getWork(bytes32 workId) external view returns (Work memory) {
        require(works[workId].createdAt != 0, "Work item does not exist");
        return works[workId];
    }

    /**
     * @notice Check whether a given work item is currently verified.
     */
    function isVerified(bytes32 workId) external view returns (bool) {
        return works[workId].status == Status.VERIFIED;
    }

    /**
     * @notice Get all work IDs registered by a specific developer address.
     */
    function getWorksByWorker(address worker) external view returns (bytes32[] memory) {
        return workerWorkIds[worker];
    }

    /**
     * @notice Aggregate counts of verified works for a developer.
     */
    function getWorkerStats(address worker) external view returns (
        uint256 totalVerified,
        uint256 smartContracts,
        uint256 githubContributions,
        uint256 hackathonProjects
    ) {
        bytes32[] memory ids = workerWorkIds[worker];
        for (uint256 i = 0; i < ids.length; i++) {
            Work memory r = works[ids[i]];
            if (r.status == Status.VERIFIED) {
                totalVerified++;
                if (r.workType == WorkType.SMART_CONTRACT) smartContracts++;
                else if (r.workType == WorkType.GITHUB_CONTRIBUTION) githubContributions++;
                else if (r.workType == WorkType.HACKATHON_PROJECT) hackathonProjects++;
            }
        }
    }

    /**
     * @notice Get all registered work IDs in chronological order.
     */
    function getAllWorkIds() external view returns (bytes32[] memory) {
        return allWorkIds;
    }

    /**
     * @notice Total number of registered work items.
     */
    function getTotalWorkCount() external view returns (uint256) {
        return allWorkIds.length;
    }

    /**
     * @notice Alias for getTotalWorkCount conforming to IProofOfWorkRegistry
     */
    function getWorkCount() external view returns (uint256) {
        return allWorkIds.length;
    }

    /**
     * @notice Batch retrieve work records for an array of work IDs.
     * @dev Eliminates N JSON-RPC round-trips into a single query.
     */
    function getWorks(bytes32[] calldata ids) external view returns (Work[] memory items) {
        items = new Work[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            items[i] = works[ids[i]];
        }
    }

    /**
     * @notice Paginated retrieval of registered work records.
     * @param offset Starting index in allWorkIds array.
     * @param limit Maximum number of records to return (capped at 100 to avoid gas exhaustion).
     */
    function getWorksPaginated(uint256 offset, uint256 limit) external view returns (
        Work[] memory items,
        uint256 total
    ) {
        total = allWorkIds.length;
        if (offset >= total || limit == 0) {
            return (new Work[](0), total);
        }

        uint256 count = limit;
        if (offset + count > total) {
            count = total - offset;
        }
        if (count > 100) {
            count = 100;
        }

        items = new Work[](count);
        for (uint256 i = 0; i < count; i++) {
            items[i] = works[allWorkIds[offset + i]];
        }
    }

    /**
     * @notice Paginated retrieval of works registered by a specific developer.
     */
    function getWorksByWorkerPaginated(address worker, uint256 offset, uint256 limit) external view returns (
        Work[] memory items,
        uint256 total
    ) {
        bytes32[] storage workerIds = workerWorkIds[worker];
        total = workerIds.length;
        if (offset >= total || limit == 0) {
            return (new Work[](0), total);
        }

        uint256 count = limit;
        if (offset + count > total) {
            count = total - offset;
        }
        if (count > 100) {
            count = 100;
        }

        items = new Work[](count);
        for (uint256 i = 0; i < count; i++) {
            items[i] = works[workerIds[offset + i]];
        }
    }

    // --- Admin Functions ---

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
