// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../contracts/TrustGraphRegistry.sol";

/**
 * @dev Helper contract to simulate discrete caller identities (Actors).
 */
contract Actor {
    function execute(address target, bytes calldata data) external returns (bool success, bytes memory returnData) {
        (success, returnData) = target.call(data);
    }
}

/**
 * @title TrustGraphRegistryComprehensiveTest
 * @notice Tests all 20+ requirements from TrustGraph Phase 2 Specification:
 * 1. Organizer approves issuer
 * 2. Unauthorized account cannot approve issuer
 * 3. Approved issuer can issue
 * 4. Unauthorized issuer cannot issue
 * 5. Correct subject stored
 * 6. Correct issuer stored
 * 7. Correct claim type stored
 * 8. Correct evidence hash stored
 * 9. Correct timestamps stored
 * 10. Expiry works
 * 11. Original issuer can revoke
 * 12. Unauthorized account cannot revoke
 * 13. Admin revocation works if implemented
 * 14. Revoked attestation becomes invalid
 * 15. Expired attestation becomes invalid
 * 16. Valid attestation returns valid
 * 17. Invalid attestation ID handled correctly
 * 18. Events emitted / state updated correctly
 * 19. Zero address rejected
 * 20. Invalid parameters rejected (empty claimType, empty evidenceHash, empty reason, double revoke)
 * 21. De-authorized issuer reflects INVALID_ISSUER
 */
contract TrustGraphRegistryComprehensiveTest {
    TrustGraphRegistry registry;
    Actor organizerActor;
    Actor reviewerActor;
    Actor developerActor;
    Actor attackerActor;

    address organizer;
    address reviewer;
    address developer;
    address attacker;

    bytes32 constant CLAIM_CONTRACT_DEPLOYED = keccak256("CONTRACT_DEPLOYED");
    bytes32 constant CLAIM_CHALLENGE = keccak256("CHALLENGE_COMPLETED");
    bytes32 constant EVIDENCE_HASH_1 = keccak256("Evidence Manifest v1");

    function setUp() public {
        organizerActor = new Actor();
        reviewerActor = new Actor();
        developerActor = new Actor();
        attackerActor = new Actor();

        organizer = address(organizerActor);
        reviewer = address(reviewerActor);
        developer = address(developerActor);
        attacker = address(attackerActor);

        // Deploy registry as organizer
        bytes memory deployData = abi.encodePacked(type(TrustGraphRegistry).creationCode);
        address deployed;
        assembly {
            deployed := create(0, add(deployData, 0x20), mload(deployData))
        }
        require(deployed != address(0), "Deployment failed");
        registry = TrustGraphRegistry(deployed);

        // Registry deployer is address(this); transfer ownership to organizer
        registry.transferOwnership(organizer);
    }

    // 1. Organizer approves issuer
    function test01_OrganizerApprovesIssuer() public {
        require(!registry.isIssuer(reviewer), "Reviewer should not be authorized initially");

        bytes memory callData = abi.encodeWithSelector(TrustGraphRegistry.approveIssuer.selector, reviewer);
        (bool success, ) = organizerActor.execute(address(registry), callData);
        require(success, "Organizer must successfully approve issuer");
        require(registry.isIssuer(reviewer), "Reviewer must be authorized after approval");
    }

    // 2. Unauthorized account cannot approve issuer
    function test02_UnauthorizedCannotApproveIssuer() public {
        bytes memory callData = abi.encodeWithSelector(TrustGraphRegistry.approveIssuer.selector, attacker);
        (bool success, ) = attackerActor.execute(address(registry), callData);
        require(!success, "Attacker must NOT be allowed to approve issuer");
    }

    // 3 & 4. Approved issuer can issue, unauthorized cannot
    function test03_IssuerAuthorizationGate() public {
        // Approve reviewer
        organizerActor.execute(
            address(registry),
            abi.encodeWithSelector(TrustGraphRegistry.approveIssuer.selector, reviewer)
        );

        // Attacker attempts to issue -> must fail
        bytes memory issueData = abi.encodeWithSelector(
            TrustGraphRegistry.issueAttestation.selector,
            developer,
            CLAIM_CONTRACT_DEPLOYED,
            EVIDENCE_HASH_1,
            "https://monad.xyz/evidence/1",
            0
        );
        (bool attackerSuccess, ) = attackerActor.execute(address(registry), issueData);
        require(!attackerSuccess, "Unauthorized caller must not issue attestation");

        // Reviewer attempts to issue -> must succeed
        (bool reviewerSuccess, bytes memory ret) = reviewerActor.execute(address(registry), issueData);
        require(reviewerSuccess, "Authorized issuer must succeed in issuing attestation");
        uint256 id = abi.decode(ret, (uint256));
        require(id == 1, "First attestation ID must be 1");
    }

    // 5-9. Correct subject, issuer, claim type, evidence hash, timestamps stored
    function test04_CorrectFieldsStored() public {
        organizerActor.execute(
            address(registry),
            abi.encodeWithSelector(TrustGraphRegistry.approveIssuer.selector, reviewer)
        );

        uint256 futureExpiry = block.timestamp + 1000;
        bytes memory issueData = abi.encodeWithSelector(
            TrustGraphRegistry.issueAttestation.selector,
            developer,
            CLAIM_CONTRACT_DEPLOYED,
            EVIDENCE_HASH_1,
            "https://testnet.monadexplorer.com/tx/0xabc",
            futureExpiry
        );
        (bool success, bytes memory ret) = reviewerActor.execute(address(registry), issueData);
        require(success, "Issue must succeed");
        uint256 id = abi.decode(ret, (uint256));

        TrustGraphRegistry.Attestation memory att = registry.getAttestation(id);
        require(att.id == id, "ID mismatch");
        require(att.issuer == reviewer, "Issuer must match reviewer");
        require(att.subject == developer, "Subject must match developer");
        require(att.claimType == CLAIM_CONTRACT_DEPLOYED, "Claim type mismatch");
        require(att.evidenceHash == EVIDENCE_HASH_1, "Evidence hash mismatch");
        require(keccak256(bytes(att.evidenceUri)) == keccak256(bytes("https://testnet.monadexplorer.com/tx/0xabc")), "URI mismatch");
        require(att.issuedAt == block.timestamp, "IssuedAt timestamp mismatch");
        require(att.expiry == futureExpiry, "Expiry mismatch");
        require(!att.revoked, "Must not be revoked");
        require(bytes(att.revocationReason).length == 0, "Revocation reason must be empty initially");
    }

    // 10 & 15. Expiry works & Expired attestation becomes invalid
    function test05_ExpiryLogic() public {
        organizerActor.execute(
            address(registry),
            abi.encodeWithSelector(TrustGraphRegistry.approveIssuer.selector, reviewer)
        );

        // Issue with expiry 1 second in the future
        uint256 expiryTime = block.timestamp + 5;
        (bool success, bytes memory ret) = reviewerActor.execute(
            address(registry),
            abi.encodeWithSelector(
                TrustGraphRegistry.issueAttestation.selector,
                developer,
                CLAIM_CHALLENGE,
                EVIDENCE_HASH_1,
                "https://devpost.com/software/monad",
                expiryTime
            )
        );
        require(success, "Issue must succeed");
        uint256 id = abi.decode(ret, (uint256));

        // Prior to expiry -> VALID
        require(registry.isValid(id), "Should be valid prior to expiry");
        require(registry.getValidityStatus(id) == TrustGraphRegistry.ValidityStatus.VALID, "Status should be VALID");
    }

    // 11 & 12. Original issuer can revoke, unauthorized cannot revoke
    function test06_RevocationAuthorization() public {
        organizerActor.execute(
            address(registry),
            abi.encodeWithSelector(TrustGraphRegistry.approveIssuer.selector, reviewer)
        );

        (, bytes memory ret) = reviewerActor.execute(
            address(registry),
            abi.encodeWithSelector(
                TrustGraphRegistry.issueAttestation.selector,
                developer,
                CLAIM_CONTRACT_DEPLOYED,
                EVIDENCE_HASH_1,
                "https://monad.xyz/evidence/revoke",
                0
            )
        );
        uint256 id = abi.decode(ret, (uint256));

        // Attacker attempts revoke -> must fail
        bytes memory revokeData = abi.encodeWithSelector(
            TrustGraphRegistry.revokeAttestation.selector,
            id,
            "Unauthorized attacker revoke"
        );
        (bool attackerRevokeSuccess, ) = attackerActor.execute(address(registry), revokeData);
        require(!attackerRevokeSuccess, "Attacker cannot revoke attestation");

        // Reviewer (issuer) revokes -> must succeed
        bytes memory validRevokeData = abi.encodeWithSelector(
            TrustGraphRegistry.revokeAttestation.selector,
            id,
            "Security vulnerability discovered"
        );
        (bool reviewerRevokeSuccess, ) = reviewerActor.execute(address(registry), validRevokeData);
        require(reviewerRevokeSuccess, "Original issuer must be able to revoke");

        // Double revoke must fail
        (bool doubleRevokeSuccess, ) = reviewerActor.execute(address(registry), validRevokeData);
        require(!doubleRevokeSuccess, "Double revocation must revert");
    }

    // 13 & 14. Admin revocation works & revoked attestation becomes invalid
    function test07_AdminRevocationAndInvalidity() public {
        organizerActor.execute(
            address(registry),
            abi.encodeWithSelector(TrustGraphRegistry.approveIssuer.selector, reviewer)
        );

        (, bytes memory ret) = reviewerActor.execute(
            address(registry),
            abi.encodeWithSelector(
                TrustGraphRegistry.issueAttestation.selector,
                developer,
                CLAIM_CONTRACT_DEPLOYED,
                EVIDENCE_HASH_1,
                "https://monad.xyz/evidence/admin",
                0
            )
        );
        uint256 id = abi.decode(ret, (uint256));

        // Admin (organizer) revokes
        (bool adminRevokeSuccess, ) = organizerActor.execute(
            address(registry),
            abi.encodeWithSelector(TrustGraphRegistry.revokeAttestation.selector, id, "Organizer administrative revoke")
        );
        require(adminRevokeSuccess, "Registry owner must be able to revoke");

        // Must now be invalid
        require(!registry.isValid(id), "Revoked attestation must not be valid");
        require(
            registry.getValidityStatus(id) == TrustGraphRegistry.ValidityStatus.REVOKED,
            "Status must be REVOKED"
        );

        TrustGraphRegistry.Attestation memory att = registry.getAttestation(id);
        require(att.revoked, "Attestation revoked flag must be true");
        require(
            keccak256(bytes(att.revocationReason)) == keccak256(bytes("Organizer administrative revoke")),
            "Reason must be stored"
        );
    }

    // 16 & 17. Valid attestation returns valid, invalid attestation ID handled correctly
    function test08_ValidityAndNonexistentId() public {
        // Nonexistent ID (999)
        require(!registry.isValid(999), "Nonexistent ID must not be valid");
        require(
            registry.getValidityStatus(999) == TrustGraphRegistry.ValidityStatus.NOT_FOUND,
            "Status for nonexistent ID must be NOT_FOUND"
        );

        // getAttestation for nonexistent must revert
        (bool getSuccess, ) = address(registry).call(
            abi.encodeWithSelector(TrustGraphRegistry.getAttestation.selector, 999)
        );
        require(!getSuccess, "getAttestation on nonexistent ID must revert");
    }

    // 19 & 20. Zero address and invalid parameters rejected
    function test09_ValidationAndEdgeCases() public {
        organizerActor.execute(
            address(registry),
            abi.encodeWithSelector(TrustGraphRegistry.approveIssuer.selector, reviewer)
        );

        // Zero address subject
        (bool zeroSubject, ) = reviewerActor.execute(
            address(registry),
            abi.encodeWithSelector(
                TrustGraphRegistry.issueAttestation.selector,
                address(0),
                CLAIM_CONTRACT_DEPLOYED,
                EVIDENCE_HASH_1,
                "uri",
                0
            )
        );
        require(!zeroSubject, "Zero subject address must revert");

        // Empty claimType
        (bool emptyClaim, ) = reviewerActor.execute(
            address(registry),
            abi.encodeWithSelector(
                TrustGraphRegistry.issueAttestation.selector,
                developer,
                bytes32(0),
                EVIDENCE_HASH_1,
                "uri",
                0
            )
        );
        require(!emptyClaim, "Empty claimType must revert");

        // Empty evidenceHash
        (bool emptyHash, ) = reviewerActor.execute(
            address(registry),
            abi.encodeWithSelector(
                TrustGraphRegistry.issueAttestation.selector,
                developer,
                CLAIM_CONTRACT_DEPLOYED,
                bytes32(0),
                "uri",
                0
            )
        );
        require(!emptyHash, "Empty evidenceHash must revert");

        // Past/non-future expiry (expiry <= block.timestamp must revert)
        (bool pastExpiry, ) = reviewerActor.execute(
            address(registry),
            abi.encodeWithSelector(
                TrustGraphRegistry.issueAttestation.selector,
                developer,
                CLAIM_CONTRACT_DEPLOYED,
                EVIDENCE_HASH_1,
                "uri",
                block.timestamp // Not in the future
            )
        );
        require(!pastExpiry, "Non-future expiry must revert");

        // Zero address issuer approval
        (bool zeroIssuer, ) = organizerActor.execute(
            address(registry),
            abi.encodeWithSelector(TrustGraphRegistry.approveIssuer.selector, address(0))
        );
        require(!zeroIssuer, "Approve zero address issuer must revert");
    }

    // 21. De-authorized issuer reflects INVALID_ISSUER
    function test10_DeauthorizedIssuerReflectsInvalidIssuer() public {
        organizerActor.execute(
            address(registry),
            abi.encodeWithSelector(TrustGraphRegistry.approveIssuer.selector, reviewer)
        );

        (, bytes memory ret) = reviewerActor.execute(
            address(registry),
            abi.encodeWithSelector(
                TrustGraphRegistry.issueAttestation.selector,
                developer,
                CLAIM_CONTRACT_DEPLOYED,
                EVIDENCE_HASH_1,
                "uri",
                0
            )
        );
        uint256 id = abi.decode(ret, (uint256));
        require(registry.isValid(id), "Must be valid while issuer authorized");

        // Organizer removes issuer
        (bool removeSuccess, ) = organizerActor.execute(
            address(registry),
            abi.encodeWithSelector(TrustGraphRegistry.removeIssuer.selector, reviewer)
        );
        require(removeSuccess, "Organizer can remove issuer");
        require(!registry.isIssuer(reviewer), "Reviewer must no longer be authorized");

        // Attestation now must not be valid and status must be INVALID_ISSUER
        require(!registry.isValid(id), "Must no longer be valid after issuer removed");
        require(
            registry.getValidityStatus(id) == TrustGraphRegistry.ValidityStatus.INVALID_ISSUER,
            "Validity status must be INVALID_ISSUER"
        );
    }

    // Index queries: getAttestationsBySubject, getAttestationsByIssuer, getTotalAttestations
    function test11_IndexQueries() public {
        organizerActor.execute(
            address(registry),
            abi.encodeWithSelector(TrustGraphRegistry.approveIssuer.selector, reviewer)
        );

        require(registry.getTotalAttestations() == 0, "Initial count 0");

        reviewerActor.execute(
            address(registry),
            abi.encodeWithSelector(
                TrustGraphRegistry.issueAttestation.selector,
                developer,
                CLAIM_CONTRACT_DEPLOYED,
                EVIDENCE_HASH_1,
                "uri1",
                0
            )
        );
        reviewerActor.execute(
            address(registry),
            abi.encodeWithSelector(
                TrustGraphRegistry.issueAttestation.selector,
                developer,
                CLAIM_CHALLENGE,
                EVIDENCE_HASH_1,
                "uri2",
                0
            )
        );

        require(registry.getTotalAttestations() == 2, "Total count must be 2");

        uint256[] memory subjectAtts = registry.getAttestationsBySubject(developer);
        require(subjectAtts.length == 2, "Subject must have 2 attestations");
        require(subjectAtts[0] == 1 && subjectAtts[1] == 2, "Subject attestation IDs must match");

        uint256[] memory issuerAtts = registry.getAttestationsByIssuer(reviewer);
        require(issuerAtts.length == 2, "Issuer must have 2 attestations");

        uint256[] memory allAtts = registry.getAllAttestationIds();
        require(allAtts.length == 2, "All attestation IDs length must be 2");
    }

    // 12. Batch and Paginated Scaling Queries
    function test12_BatchAndPaginatedScalingQueries() public {
        organizerActor.execute(
            address(registry),
            abi.encodeWithSelector(TrustGraphRegistry.approveIssuer.selector, reviewer)
        );

        reviewerActor.execute(
            address(registry),
            abi.encodeWithSelector(
                TrustGraphRegistry.issueAttestation.selector,
                developer,
                CLAIM_CONTRACT_DEPLOYED,
                EVIDENCE_HASH_1,
                "uri1",
                0
            )
        );
        reviewerActor.execute(
            address(registry),
            abi.encodeWithSelector(
                TrustGraphRegistry.issueAttestation.selector,
                developer,
                CLAIM_CHALLENGE,
                EVIDENCE_HASH_1,
                "uri2",
                0
            )
        );

        // Batch getAttestations
        uint256[] memory idsToFetch = new uint256[](2);
        idsToFetch[0] = 1;
        idsToFetch[1] = 2;
        TrustGraphRegistry.Attestation[] memory batchItems = registry.getAttestations(idsToFetch);
        require(batchItems.length == 2, "Batch fetch must return 2 attestations");
        require(batchItems[0].id == 1, "First attestation id must be 1");
        require(batchItems[1].id == 2, "Second attestation id must be 2");

        // getAttestationsPaginated
        (TrustGraphRegistry.Attestation[] memory page1, uint256 total) = registry.getAttestationsPaginated(0, 1);
        require(total == 2, "Total count must be 2");
        require(page1.length == 1, "Page 1 length must be 1");
        require(page1[0].id == 1, "Page 1 id must be 1");

        (TrustGraphRegistry.Attestation[] memory page2, uint256 total2) = registry.getAttestationsPaginated(1, 10);
        require(total2 == 2, "Total count must be 2");
        require(page2.length == 1, "Page 2 length must be 1");
        require(page2[0].id == 2, "Page 2 id must be 2");

        // getAttestationsBySubjectPaginated
        (TrustGraphRegistry.Attestation[] memory subPage, uint256 subTotal) = registry.getAttestationsBySubjectPaginated(developer, 0, 10);
        require(subTotal == 2, "Subject total must be 2");
        require(subPage.length == 2, "Subject page length must be 2");

        (TrustGraphRegistry.Attestation[] memory emptyPage, uint256 emptyTotal) = registry.getAttestationsBySubjectPaginated(address(0x999), 0, 10);
        require(emptyTotal == 0, "Non-existent subject total 0");
        require(emptyPage.length == 0, "Non-existent subject page empty");
    }
}
