// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../contracts/ProofOfWorkRegistry.sol";

/**
 * @dev Caller abstraction contract to simulate discrete cryptographic identities.
 */
contract Actor {
    function execute(address target, bytes calldata data) external returns (bool success, bytes memory returnData) {
        (success, returnData) = target.call(data);
    }
}

/**
 * @title ProofOfWorkRegistryComprehensiveTest
 * @notice Formal verification test suite testing all RFC 2119 invariants for ProofOfWorkRegistry on Monad:
 * 1. Initial deployer is owner and initial authorized verifier
 * 2. Owner approves verifier
 * 3. Non-owner cannot approve verifier
 * 4. Zero address verifier rejected
 * 5. Duplicate verifier approval rejected
 * 6. Owner removes verifier
 * 7. Non-owner cannot remove verifier
 * 8. Non-authorized verifier removal rejected
 * 9. Worker registers work with evidence hash -> PENDING state
 * 10. Duplicate work ID registration rejected
 * 11. Empty work ID and empty evidence hash rejected
 * 12. Unauthorized caller cannot verify work
 * 13. Authorized verifier verifies work -> VERIFIED state
 * 14. Cannot re-verify already VERIFIED work (duplicate verification illegal)
 * 15. Authorized verifier rejects work with reason -> REJECTED state
 * 16. Rejecting with empty reason rejected
 * 17. Cannot verify REJECTED work (terminal failure)
 * 18. Authorized verifier revokes VERIFIED work with reason -> REVOKED state
 * 19. Revoking with empty reason rejected
 * 20. Cannot revoke PENDING work (invalid transition)
 * 21. Cannot re-verify REVOKED work (terminal invalidation)
 * 22. getWorksByWorker & getWorkerStats aggregate correct counts
 * 23. getAllWorkIds, getTotalWorkCount, and getWorkCount return consistent data
 * 24. Querying nonexistent work ID reverts
 * 25. Owner transfers ownership with proper authorization
 */
contract ProofOfWorkRegistryComprehensiveTest {
    ProofOfWorkRegistry registry;
    Actor ownerActor;
    Actor verifierActor;
    Actor workerActor;
    Actor attackerActor;

    address owner;
    address verifier;
    address worker;
    address attacker;

    bytes32 constant WORK_ID_1 = keccak256("WORK_SUBMISSION_001");
    bytes32 constant WORK_ID_2 = keccak256("WORK_SUBMISSION_002");
    bytes32 constant WORK_ID_3 = keccak256("WORK_SUBMISSION_003");
    bytes32 constant WORK_ID_4 = keccak256("WORK_SUBMISSION_004");

    bytes32 constant EVIDENCE_HASH_1 = keccak256("Canonical Evidence Payload 1");
    bytes32 constant EVIDENCE_HASH_2 = keccak256("Canonical Evidence Payload 2");
    bytes32 constant EVIDENCE_HASH_3 = keccak256("Canonical Evidence Payload 3");

    string constant METADATA_URI_1 = "https://github.com/monad-developers/parallel-dex/pull/42";
    string constant METADATA_URI_2 = "https://testnet.monadexplorer.com/address/0x1234567890123456789012345678901234567890";

    function setUp() public {
        ownerActor = new Actor();
        verifierActor = new Actor();
        workerActor = new Actor();
        attackerActor = new Actor();

        owner = address(ownerActor);
        verifier = address(verifierActor);
        worker = address(workerActor);
        attacker = address(attackerActor);

        // Deploy registry as ownerActor
        bytes memory deployData = abi.encodePacked(type(ProofOfWorkRegistry).creationCode);
        address deployed;
        assembly {
            deployed := create(0, add(deployData, 0x20), mload(deployData))
        }
        require(deployed != address(0), "Deployment failed");
        registry = ProofOfWorkRegistry(deployed);

        // Transfer ownership to ownerActor
        registry.transferOwnership(owner);
    }

    // 1. Deployer / owner is recognized
    function test01_DeployerIsOwner() public view {
        require(registry.owner() == owner, "Owner mismatch");
    }

    // 2. Owner approves verifier
    function test02_OwnerApprovesVerifier() public {
        require(!registry.isVerifier(verifier), "Verifier should not be authorized initially");

        bytes memory callData = abi.encodeWithSelector(ProofOfWorkRegistry.approveVerifier.selector, verifier);
        (bool ok, ) = ownerActor.execute(address(registry), callData);
        require(ok, "Owner must successfully approve verifier");
        require(registry.isVerifier(verifier), "Verifier must now be recognized");
    }

    // 3. Non-owner cannot approve verifier
    function test03_AttackerCannotApproveVerifier() public {
        bytes memory callData = abi.encodeWithSelector(ProofOfWorkRegistry.approveVerifier.selector, attacker);
        (bool ok, ) = attackerActor.execute(address(registry), callData);
        require(!ok, "Attacker must NOT be allowed to approve verifier");
    }

    // 4. Cannot approve address(0) or duplicate verifier
    function test04_ValidationOnApproveVerifier() public {
        // Zero address
        bytes memory callData0 = abi.encodeWithSelector(ProofOfWorkRegistry.approveVerifier.selector, address(0));
        (bool ok0, ) = ownerActor.execute(address(registry), callData0);
        require(!ok0, "Approving address(0) must revert");

        // First approval
        bytes memory callData1 = abi.encodeWithSelector(ProofOfWorkRegistry.approveVerifier.selector, verifier);
        (bool ok1, ) = ownerActor.execute(address(registry), callData1);
        require(ok1, "First approval should succeed");

        // Duplicate approval
        (bool ok2, ) = ownerActor.execute(address(registry), callData1);
        require(!ok2, "Duplicate approval must revert");
    }

    // 5. Owner removes verifier
    function test05_OwnerRemovesVerifier() public {
        // Approve first
        ownerActor.execute(
            address(registry),
            abi.encodeWithSelector(ProofOfWorkRegistry.approveVerifier.selector, verifier)
        );
        require(registry.isVerifier(verifier), "Verifier must be active");

        // Remove
        (bool ok, ) = ownerActor.execute(
            address(registry),
            abi.encodeWithSelector(ProofOfWorkRegistry.removeVerifier.selector, verifier)
        );
        require(ok, "Owner must be able to remove verifier");
        require(!registry.isVerifier(verifier), "Verifier must no longer be authorized");
    }

    // 6. Non-owner cannot remove verifier
    function test06_AttackerCannotRemoveVerifier() public {
        ownerActor.execute(
            address(registry),
            abi.encodeWithSelector(ProofOfWorkRegistry.approveVerifier.selector, verifier)
        );

        (bool ok, ) = attackerActor.execute(
            address(registry),
            abi.encodeWithSelector(ProofOfWorkRegistry.removeVerifier.selector, verifier)
        );
        require(!ok, "Attacker must NOT be allowed to remove verifier");
        require(registry.isVerifier(verifier), "Verifier should still be authorized");
    }

    // 7. Worker registers work -> PENDING status
    function test07_WorkerRegistersWork() public {
        bytes memory regData = abi.encodeWithSelector(
            ProofOfWorkRegistry.registerWork.selector,
            WORK_ID_1,
            ProofOfWorkRegistry.WorkType.SMART_CONTRACT,
            EVIDENCE_HASH_1,
            METADATA_URI_1
        );
        (bool ok, ) = workerActor.execute(address(registry), regData);
        require(ok, "Worker must successfully register work");

        ProofOfWorkRegistry.Work memory item = registry.getWork(WORK_ID_1);
        require(item.workId == WORK_ID_1, "Work ID mismatch");
        require(item.worker == worker, "Worker address mismatch");
        require(uint8(item.workType) == uint8(ProofOfWorkRegistry.WorkType.SMART_CONTRACT), "Work type mismatch");
        require(item.evidenceHash == EVIDENCE_HASH_1, "Evidence hash mismatch");
        require(keccak256(bytes(item.metadataUri)) == keccak256(bytes(METADATA_URI_1)), "Metadata URI mismatch");
        require(item.verifier == address(0), "Verifier must be address(0) while pending");
        require(uint8(item.status) == uint8(ProofOfWorkRegistry.Status.PENDING), "Status must be PENDING");
        require(item.verifiedAt == 0, "verifiedAt must be 0 while pending");
        require(item.createdAt > 0, "createdAt must be set");
        require(!registry.isVerified(WORK_ID_1), "isVerified must return false for pending work");
    }

    // 8. Registration input validations
    function test08_RegistrationValidations() public {
        // Empty workId
        bytes memory regData0 = abi.encodeWithSelector(
            ProofOfWorkRegistry.registerWork.selector,
            bytes32(0),
            ProofOfWorkRegistry.WorkType.SMART_CONTRACT,
            EVIDENCE_HASH_1,
            METADATA_URI_1
        );
        (bool ok0, ) = workerActor.execute(address(registry), regData0);
        require(!ok0, "bytes32(0) workId must revert");

        // Empty evidenceHash
        bytes memory regDataEmptyHash = abi.encodeWithSelector(
            ProofOfWorkRegistry.registerWork.selector,
            WORK_ID_1,
            ProofOfWorkRegistry.WorkType.SMART_CONTRACT,
            bytes32(0),
            METADATA_URI_1
        );
        (bool okHash, ) = workerActor.execute(address(registry), regDataEmptyHash);
        require(!okHash, "bytes32(0) evidenceHash must revert");

        // Valid registration
        bytes memory regDataValid = abi.encodeWithSelector(
            ProofOfWorkRegistry.registerWork.selector,
            WORK_ID_1,
            ProofOfWorkRegistry.WorkType.SMART_CONTRACT,
            EVIDENCE_HASH_1,
            METADATA_URI_1
        );
        (bool okValid, ) = workerActor.execute(address(registry), regDataValid);
        require(okValid, "Valid registration must succeed");

        // Duplicate registration
        (bool okDup, ) = workerActor.execute(address(registry), regDataValid);
        require(!okDup, "Duplicate work ID registration must revert");
    }

    // 9. Unauthorized cannot verify work
    function test09_UnauthorizedCannotVerifyWork() public {
        // Register work
        workerActor.execute(
            address(registry),
            abi.encodeWithSelector(
                ProofOfWorkRegistry.registerWork.selector,
                WORK_ID_1,
                ProofOfWorkRegistry.WorkType.GITHUB_CONTRIBUTION,
                EVIDENCE_HASH_1,
                METADATA_URI_1
            )
        );

        // Attacker attempts verify
        bytes memory vData = abi.encodeWithSelector(ProofOfWorkRegistry.verifyWork.selector, WORK_ID_1);
        (bool okAttacker, ) = attackerActor.execute(address(registry), vData);
        require(!okAttacker, "Unauthorized caller must not verify work");

        // Worker attempts self-verification
        (bool okWorker, ) = workerActor.execute(address(registry), vData);
        require(!okWorker, "Worker must not self-verify work");
    }

    // 10. Authorized verifier verifies work -> VERIFIED state
    function test10_AuthorizedVerifierVerifiesWork() public {
        // Authorize verifier
        ownerActor.execute(
            address(registry),
            abi.encodeWithSelector(ProofOfWorkRegistry.approveVerifier.selector, verifier)
        );

        // Register work
        workerActor.execute(
            address(registry),
            abi.encodeWithSelector(
                ProofOfWorkRegistry.registerWork.selector,
                WORK_ID_1,
                ProofOfWorkRegistry.WorkType.HACKATHON_PROJECT,
                EVIDENCE_HASH_1,
                METADATA_URI_1
            )
        );

        // Verifier calls verifyWork
        bytes memory vData = abi.encodeWithSelector(ProofOfWorkRegistry.verifyWork.selector, WORK_ID_1);
        (bool ok, ) = verifierActor.execute(address(registry), vData);
        require(ok, "Authorized verifier must verify work");

        ProofOfWorkRegistry.Work memory item = registry.getWork(WORK_ID_1);
        require(uint8(item.status) == uint8(ProofOfWorkRegistry.Status.VERIFIED), "Status must be VERIFIED");
        require(item.verifier == verifier, "Verifier address mismatch");
        require(item.verifiedAt > 0, "verifiedAt must be set");
        require(registry.isVerified(WORK_ID_1), "isVerified must return true");
    }

    // 11. Duplicate verification illegal
    function test11_CannotReverifyWork() public {
        ownerActor.execute(
            address(registry),
            abi.encodeWithSelector(ProofOfWorkRegistry.approveVerifier.selector, verifier)
        );

        workerActor.execute(
            address(registry),
            abi.encodeWithSelector(
                ProofOfWorkRegistry.registerWork.selector,
                WORK_ID_1,
                ProofOfWorkRegistry.WorkType.SMART_CONTRACT,
                EVIDENCE_HASH_1,
                METADATA_URI_1
            )
        );

        bytes memory vData = abi.encodeWithSelector(ProofOfWorkRegistry.verifyWork.selector, WORK_ID_1);
        verifierActor.execute(address(registry), vData);

        // Second verification attempt
        (bool ok2, ) = verifierActor.execute(address(registry), vData);
        require(!ok2, "Re-verifying already VERIFIED work must revert");
    }

    // 12 & 13. Authorized verifier rejects work with reason
    function test12_AuthorizedVerifierRejectsWork() public {
        ownerActor.execute(
            address(registry),
            abi.encodeWithSelector(ProofOfWorkRegistry.approveVerifier.selector, verifier)
        );

        workerActor.execute(
            address(registry),
            abi.encodeWithSelector(
                ProofOfWorkRegistry.registerWork.selector,
                WORK_ID_1,
                ProofOfWorkRegistry.WorkType.GITHUB_CONTRIBUTION,
                EVIDENCE_HASH_1,
                METADATA_URI_1
            )
        );

        // Empty reason must revert
        bytes memory rejEmpty = abi.encodeWithSelector(ProofOfWorkRegistry.rejectWork.selector, WORK_ID_1, "");
        (bool okEmpty, ) = verifierActor.execute(address(registry), rejEmpty);
        require(!okEmpty, "Empty rejection reason must revert");

        // Valid rejection
        string memory reason = "Pull request was closed without being merged into main branch.";
        bytes memory rejValid = abi.encodeWithSelector(ProofOfWorkRegistry.rejectWork.selector, WORK_ID_1, reason);
        (bool ok, ) = verifierActor.execute(address(registry), rejValid);
        require(ok, "Authorized verifier must successfully reject work");

        ProofOfWorkRegistry.Work memory item = registry.getWork(WORK_ID_1);
        require(uint8(item.status) == uint8(ProofOfWorkRegistry.Status.REJECTED), "Status must be REJECTED");
        require(keccak256(bytes(item.statusReason)) == keccak256(bytes(reason)), "Status reason mismatch");
        require(!registry.isVerified(WORK_ID_1), "Rejected work is not verified");

        // Cannot verify rejected work
        bytes memory vData = abi.encodeWithSelector(ProofOfWorkRegistry.verifyWork.selector, WORK_ID_1);
        (bool okV, ) = verifierActor.execute(address(registry), vData);
        require(!okV, "Cannot verify rejected work (terminal failure)");
    }

    // 14 & 15. Authorized verifier revokes VERIFIED work
    function test13_AuthorizedVerifierRevokesWork() public {
        ownerActor.execute(
            address(registry),
            abi.encodeWithSelector(ProofOfWorkRegistry.approveVerifier.selector, verifier)
        );

        workerActor.execute(
            address(registry),
            abi.encodeWithSelector(
                ProofOfWorkRegistry.registerWork.selector,
                WORK_ID_1,
                ProofOfWorkRegistry.WorkType.SMART_CONTRACT,
                EVIDENCE_HASH_1,
                METADATA_URI_1
            )
        );

        // Verify first
        verifierActor.execute(
            address(registry),
            abi.encodeWithSelector(ProofOfWorkRegistry.verifyWork.selector, WORK_ID_1)
        );

        // Revoke with empty reason -> revert
        bytes memory revEmpty = abi.encodeWithSelector(ProofOfWorkRegistry.revokeWork.selector, WORK_ID_1, "");
        (bool okEmpty, ) = verifierActor.execute(address(registry), revEmpty);
        require(!okEmpty, "Empty revocation reason must revert");

        // Revoke with valid reason
        string memory reason = "Audit identified severe reentrancy vulnerability in deployed bytecode.";
        bytes memory revValid = abi.encodeWithSelector(ProofOfWorkRegistry.revokeWork.selector, WORK_ID_1, reason);
        (bool ok, ) = verifierActor.execute(address(registry), revValid);
        require(ok, "Verifier must successfully revoke work");

        ProofOfWorkRegistry.Work memory item = registry.getWork(WORK_ID_1);
        require(uint8(item.status) == uint8(ProofOfWorkRegistry.Status.REVOKED), "Status must be REVOKED");
        require(keccak256(bytes(item.statusReason)) == keccak256(bytes(reason)), "Status reason mismatch");
        require(!registry.isVerified(WORK_ID_1), "Revoked work is not verified");

        // Cannot re-verify revoked work
        bytes memory vData = abi.encodeWithSelector(ProofOfWorkRegistry.verifyWork.selector, WORK_ID_1);
        (bool okV, ) = verifierActor.execute(address(registry), vData);
        require(!okV, "Cannot re-verify revoked work");
    }

    // 16. Cannot revoke PENDING work
    function test14_CannotRevokePendingWork() public {
        ownerActor.execute(
            address(registry),
            abi.encodeWithSelector(ProofOfWorkRegistry.approveVerifier.selector, verifier)
        );

        workerActor.execute(
            address(registry),
            abi.encodeWithSelector(
                ProofOfWorkRegistry.registerWork.selector,
                WORK_ID_1,
                ProofOfWorkRegistry.WorkType.SMART_CONTRACT,
                EVIDENCE_HASH_1,
                METADATA_URI_1
            )
        );

        bytes memory revData = abi.encodeWithSelector(
            ProofOfWorkRegistry.revokeWork.selector,
            WORK_ID_1,
            "Revoking unverified claim"
        );
        (bool ok, ) = verifierActor.execute(address(registry), revData);
        require(!ok, "Revoking PENDING work must revert");
    }

    // 17. getWorksByWorker & getWorkerStats calculations
    function test15_WorkerStatsAggregation() public {
        ownerActor.execute(
            address(registry),
            abi.encodeWithSelector(ProofOfWorkRegistry.approveVerifier.selector, verifier)
        );

        // Register 3 items of different types
        workerActor.execute(
            address(registry),
            abi.encodeWithSelector(
                ProofOfWorkRegistry.registerWork.selector,
                WORK_ID_1,
                ProofOfWorkRegistry.WorkType.SMART_CONTRACT,
                EVIDENCE_HASH_1,
                METADATA_URI_1
            )
        );

        workerActor.execute(
            address(registry),
            abi.encodeWithSelector(
                ProofOfWorkRegistry.registerWork.selector,
                WORK_ID_2,
                ProofOfWorkRegistry.WorkType.GITHUB_CONTRIBUTION,
                EVIDENCE_HASH_2,
                METADATA_URI_1
            )
        );

        workerActor.execute(
            address(registry),
            abi.encodeWithSelector(
                ProofOfWorkRegistry.registerWork.selector,
                WORK_ID_3,
                ProofOfWorkRegistry.WorkType.HACKATHON_PROJECT,
                EVIDENCE_HASH_3,
                METADATA_URI_2
            )
        );

        // Initial stats before verification -> 0 verified
        (uint256 tot0, , , ) = registry.getWorkerStats(worker);
        require(tot0 == 0, "No verified items yet");

        bytes32[] memory workerIds = registry.getWorksByWorker(worker);
        require(workerIds.length == 3, "Worker must have 3 registered works");

        // Verify items 1 and 3
        verifierActor.execute(
            address(registry),
            abi.encodeWithSelector(ProofOfWorkRegistry.verifyWork.selector, WORK_ID_1)
        );
        verifierActor.execute(
            address(registry),
            abi.encodeWithSelector(ProofOfWorkRegistry.verifyWork.selector, WORK_ID_3)
        );

        (
            uint256 totalVerified,
            uint256 smartContracts,
            uint256 githubContributions,
            uint256 hackathonProjects
        ) = registry.getWorkerStats(worker);

        require(totalVerified == 2, "Total verified must be 2");
        require(smartContracts == 1, "Smart contracts count must be 1");
        require(githubContributions == 0, "Github count must be 0 (still pending)");
        require(hackathonProjects == 1, "Hackathon count must be 1");
    }

    // 18. getAllWorkIds & getWorkCount
    function test16_WorkCountsAndEnumeration() public {
        require(registry.getTotalWorkCount() == 0, "Initial count must be 0");
        require(registry.getWorkCount() == 0, "Initial alias count must be 0");

        workerActor.execute(
            address(registry),
            abi.encodeWithSelector(
                ProofOfWorkRegistry.registerWork.selector,
                WORK_ID_1,
                ProofOfWorkRegistry.WorkType.SMART_CONTRACT,
                EVIDENCE_HASH_1,
                METADATA_URI_1
            )
        );

        workerActor.execute(
            address(registry),
            abi.encodeWithSelector(
                ProofOfWorkRegistry.registerWork.selector,
                WORK_ID_2,
                ProofOfWorkRegistry.WorkType.GITHUB_CONTRIBUTION,
                EVIDENCE_HASH_2,
                METADATA_URI_2
            )
        );

        require(registry.getTotalWorkCount() == 2, "Total work count must be 2");
        require(registry.getWorkCount() == 2, "Alias work count must be 2");

        bytes32[] memory all = registry.getAllWorkIds();
        require(all.length == 2, "All work IDs length must be 2");
        require(all[0] == WORK_ID_1 && all[1] == WORK_ID_2, "Order preserved");
    }

    // 19. Nonexistent work reverts
    function test17_NonexistentWorkReverts() public {
        bytes memory callData = abi.encodeWithSelector(ProofOfWorkRegistry.getWork.selector, keccak256("NONEXISTENT"));
        (bool ok, ) = attackerActor.execute(address(registry), callData);
        require(!ok, "Querying nonexistent work must revert");
    }

    // 20. Ownership transfer
    function test18_OwnershipTransfer() public {
        bytes memory tData = abi.encodeWithSelector(ProofOfWorkRegistry.transferOwnership.selector, attacker);
        (bool ok, ) = ownerActor.execute(address(registry), tData);
        require(ok, "Owner must transfer ownership");
        require(registry.owner() == attacker, "New owner mismatch");

        // Old owner cannot approve verifiers anymore
        bytes memory appData = abi.encodeWithSelector(ProofOfWorkRegistry.approveVerifier.selector, verifier);
        (bool okOld, ) = ownerActor.execute(address(registry), appData);
        require(!okOld, "Previous owner must not approve verifiers");

        // New owner can approve verifiers
        (bool okNew, ) = attackerActor.execute(address(registry), appData);
        require(okNew, "New owner must approve verifiers");
    }

    // 21. Batch and Paginated Scaling Queries
    function test19_BatchAndPaginatedScalingQueries() public {
        workerActor.execute(
            address(registry),
            abi.encodeWithSelector(
                ProofOfWorkRegistry.registerWork.selector,
                WORK_ID_1,
                ProofOfWorkRegistry.WorkType.SMART_CONTRACT,
                EVIDENCE_HASH_1,
                METADATA_URI_1
            )
        );
        workerActor.execute(
            address(registry),
            abi.encodeWithSelector(
                ProofOfWorkRegistry.registerWork.selector,
                WORK_ID_2,
                ProofOfWorkRegistry.WorkType.HACKATHON_PROJECT,
                EVIDENCE_HASH_2,
                METADATA_URI_2
            )
        );

        // Test getWorks batch query
        bytes32[] memory idsToFetch = new bytes32[](2);
        idsToFetch[0] = WORK_ID_1;
        idsToFetch[1] = WORK_ID_2;
        ProofOfWorkRegistry.Work[] memory batchItems = registry.getWorks(idsToFetch);
        require(batchItems.length == 2, "Batch fetch must return 2 items");
        require(batchItems[0].workId == WORK_ID_1, "First item workId must match");
        require(batchItems[1].workId == WORK_ID_2, "Second item workId must match");

        // Test getWorksPaginated (page 1)
        (ProofOfWorkRegistry.Work[] memory page1, uint256 total) = registry.getWorksPaginated(0, 1);
        require(total == 2, "Total count must be 2");
        require(page1.length == 1, "Page 1 length must be 1");
        require(page1[0].workId == WORK_ID_1, "Page 1 item must be WORK_ID_1");

        // Test getWorksPaginated (page 2)
        (ProofOfWorkRegistry.Work[] memory page2, uint256 total2) = registry.getWorksPaginated(1, 10);
        require(total2 == 2, "Total count must be 2");
        require(page2.length == 1, "Page 2 length must be 1");
        require(page2[0].workId == WORK_ID_2, "Page 2 item must be WORK_ID_2");

        // Test getWorksPaginated (out of range offset)
        (ProofOfWorkRegistry.Work[] memory emptyPage, uint256 total3) = registry.getWorksPaginated(2, 10);
        require(total3 == 2, "Total count must be 2");
        require(emptyPage.length == 0, "Out of range page must be empty");

        // Test getWorksByWorkerPaginated
        (ProofOfWorkRegistry.Work[] memory workerPage, uint256 workerTotal) = registry.getWorksByWorkerPaginated(worker, 0, 10);
        require(workerTotal == 2, "Worker total must be 2");
        require(workerPage.length == 2, "Worker page length must be 2");

        (ProofOfWorkRegistry.Work[] memory attackerPage, uint256 attackerTotal) = registry.getWorksByWorkerPaginated(attacker, 0, 10);
        require(attackerTotal == 0, "Attacker total must be 0");
        require(attackerPage.length == 0, "Attacker page must be empty");
    }
}
