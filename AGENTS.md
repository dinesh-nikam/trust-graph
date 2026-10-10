# AGENTS.md

# Proof-of-Work Passport — Agent Engineering Rules

## 0. PURPOSE

You are an engineering agent working on **Proof-of-Work Passport**.

The product principle is:

> **Don't tell people what you can do. Show them what you've actually done.**

The application allows a developer to:

1. Submit evidence of completed work.
2. Have that work reviewed by an authorized verifier.
3. Record the verification on Monad.
4. Make the proof publicly inspectable.
5. Revoke the verification later if necessary.

The core lifecycle is:

**Work → Evidence → Verification → On-chain proof → Passport**

This is a blockchain verification product, not a generic social profile.

---

# 1. NON-NEGOTIABLE PRODUCT RULES

These rules override convenience.

### Rule 1 — Evidence comes before reputation

Never implement a generic reputation score.

Do not create:

- `reputationScore`
- `trustScore`
- `developerScore`
- XP
- levels
- rankings
- leaderboards

The product is based on **verifiable work**, not an arbitrary numerical reputation system.

---

### Rule 2 — Verification must be distinguishable from a claim

A user claiming:

> "I built a smart contract."

is NOT equivalent to:

> "An authorized verifier reviewed evidence of this work and verified it."

The UI must make this distinction obvious.

---

### Rule 3 — Never fake blockchain state

Never display mock data as if it came from Monad.

Never write UI such as:

> "Verified on Monad"

unless the application actually has the corresponding on-chain record.

Mock/demo mode must be visually and technically distinguishable from real blockchain mode.

---

### Rule 4 — Real transactions matter

The final MVP must support real Monad testnet transactions for:

- submitting work
- verifying work
- rejecting work
- revoking work

Do not replace these with:

- local state
- fake transaction hashes
- hardcoded block numbers
- simulated confirmations

Mock data is acceptable during development, but the final demo flow must use the real contract.

---

### Rule 5 — Keep the product narrow

Do not expand the product into another platform.

Do NOT build:

- LinkedIn
- Upwork
- a job marketplace
- a social network
- a DAO
- a token
- an NFT marketplace
- messaging
- comments
- followers
- likes
- generic identity infrastructure
- AI recruiter
- AI verification
- payment infrastructure
- multi-chain support
- mobile application

If a feature does not strengthen:

**Work → Evidence → Verification → On-chain proof → Passport**

do not build it.

---

# 2. PRIMARY USERS

The system has three roles.

## Developer

Can:

- connect wallet
- view passport
- submit work
- attach evidence
- view verification status
- inspect verified proofs
- share passport

## Verifier

Can:

- view pending submissions
- inspect evidence
- approve work
- reject work
- revoke previously verified work

Only authorized verifiers may perform verifier actions.

## Public Viewer

Can:

- view a public passport
- inspect individual proofs
- inspect evidence
- inspect verifier
- inspect timestamps
- inspect blockchain transaction
- inspect current status

A public viewer must NOT need a wallet.

---

# 3. SUPPORTED WORK TYPES

The MVP supports exactly three work types:

```text
SMART_CONTRACT
GITHUB_CONTRIBUTION
HACKATHON_PROJECT
```

Do not add additional work categories unless explicitly instructed.

The system must be designed so more types can be added later without rewriting the core architecture.

---

# 4. CORE USER FLOW

The complete product flow is:

```text
Developer connects wallet
        ↓
Developer submits work
        ↓
Evidence is attached
        ↓
Work becomes PENDING
        ↓
Authorized verifier reviews submission
        ↓
Verifier APPROVES or REJECTS
        ↓
Blockchain transaction is confirmed
        ↓
Passport updates
        ↓
Public viewer can inspect proof
        ↓
Verifier may REVOKE later
        ↓
Proof remains visible as historical REVOKED record
```

Never bypass this lifecycle.

---

# 5. STATUS MODEL

Use exactly these statuses:

```solidity
enum Status {
    PENDING,
    VERIFIED,
    REJECTED,
    REVOKED
}
```

Expected transitions:

```text
PENDING → VERIFIED
PENDING → REJECTED
VERIFIED → REVOKED
```

Invalid transitions must be rejected.

Examples:

```text
REJECTED → VERIFIED       invalid
REJECTED → REVOKED        invalid
REVOKED → VERIFIED        invalid
VERIFIED → VERIFIED       invalid
PENDING → REVOKED         invalid
```

The smart contract must enforce important state transitions.

Do not rely only on frontend validation.

---

# 6. SMART CONTRACT

The MVP uses one primary contract:

```text
ProofOfWorkRegistry.sol
```

Do not create unnecessary contracts.

The contract is the source of truth for verification state.

---

# 7. CONTRACT DATA MODEL

Use a structure equivalent to:

```solidity
struct Work {
    uint256 id;
    address worker;
    bytes32 workType;
    bytes32 evidenceHash;
    address verifier;
    uint256 createdAt;
    uint256 verifiedAt;
    Status status;
}
```

The implementation may improve naming or packing where necessary, but do not unnecessarily change the product model.

---

# 8. VERIFIER AUTHORIZATION

The contract must maintain an authorized verifier system.

Required operations:

```solidity
approveVerifier(address verifier)
removeVerifier(address verifier)
isVerifier(address verifier)
```

Only the appropriate administrator/owner may approve or remove verifiers.

Never allow an arbitrary wallet to verify work.

---

# 9. CONTRACT FUNCTIONS

The contract should provide functionality equivalent to:

```solidity
registerWork(...)
verifyWork(...)
rejectWork(...)
revokeWork(...)
getWork(...)
isVerified(...)
approveVerifier(...)
removeVerifier(...)
isVerifier(...)
```

Use events for important state changes.

Required events:

```solidity
WorkSubmitted
WorkVerified
WorkRejected
WorkRevoked
VerifierApproved
VerifierRemoved
```

Events should contain enough information for frontend/indexing purposes.

---

# 10. ACCESS CONTROL

Security rules are mandatory.

### Developer

Can:

- submit their own work

Cannot:

- verify arbitrary work
- revoke another person's work
- approve verifiers

### Verifier

Can:

- verify pending work
- reject pending work
- revoke work they are authorized to revoke according to the contract rules

Cannot:

- approve themselves as administrator/verifier unless explicitly authorized by the contract owner

### Public viewer

Can:

- read public data

Cannot:

- modify blockchain state

---

# 11. EVIDENCE MODEL

Evidence should generally remain off-chain.

Examples:

```text
GitHub repository
Contract deployment
Hackathon submission
Documentation
Demo URL
Transaction reference
```

The blockchain should store a deterministic hash/reference rather than sensitive documents.

Never put:

- private documents
- passwords
- API keys
- private URLs
- personal sensitive information

on-chain.

---

# 12. EVIDENCE HASHING

Evidence hashing must be deterministic.

Use a canonical representation before hashing.

For example:

```text
canonical evidence
        ↓
normalized representation
        ↓
hash
        ↓
bytes32 evidenceHash
        ↓
stored on Monad
```

The same evidence should produce the same hash.

Do not generate random hashes simply to populate the contract.

Never use:

```text
Math.random()
```

or fake transaction data to simulate evidence integrity.

---

# 13. FRONTEND ARCHITECTURE

Use:

```text
React
TypeScript
Vite
Tailwind CSS
wagmi
viem
Solidity
Monad testnet
```

Use a clean separation between:

```text
UI
↓
hooks
↓
blockchain service
↓
contract
```

Recommended structure:

```text
src/
├── components/
├── pages/
├── hooks/
├── lib/
│   ├── blockchain/
│   └── contract/
├── types/
├── data/
└── utils/
```

Recommended components:

```text
PassportCard.tsx
ProofCard.tsx
StatusBadge.tsx
EvidencePanel.tsx
VerificationCard.tsx
TransactionLink.tsx
WalletButton.tsx
```

Recommended pages:

```text
Home.tsx
Passport.tsx
Submit.tsx
Verify.tsx
Proof.tsx
```

Recommended hooks:

```text
usePassport.ts
useProof.ts
useSubmitWork.ts
useVerifyWork.ts
useRejectWork.ts
useRevokeWork.ts
```

Names may change if the existing project architecture is better, but responsibilities must remain separated.

---

# 14. BLOCKCHAIN SERVICE LAYER

Do NOT put contract calls directly throughout React components.

Bad:

```tsx
onClick={() => contract.write(...)}
```

everywhere.

Prefer:

```text
component
    ↓
hook
    ↓
blockchain service
    ↓
contract
```

Contract addresses, ABIs, chain configuration, and transaction utilities belong in dedicated blockchain modules.

This makes the application testable and maintainable.

---

# 15. WALLET HANDLING

Wallet connection must clearly show:

- connected address
- connected network
- wrong-network state
- connection state
- transaction state

Never silently assume the wallet is connected.

Never silently switch networks without explicit user interaction if the wallet requires approval.

Handle:

```text
wallet not connected
wrong network
user rejected transaction
transaction pending
transaction failed
transaction confirmed
```

---

# 16. TRANSACTION UX

Every blockchain mutation must have clear states:

```text
Ready
↓
Waiting for wallet
↓
Transaction submitted
↓
Confirming
↓
Confirmed
```

If a transaction fails, show a useful error.

Do not show:

> Success

before the transaction is actually confirmed.

After confirmation, refresh the relevant blockchain state.

---

# 17. REQUIRED ROUTES

The application should contain:

```text
/
```

Homepage.

```text
/passport/:address
```

Public passport.

```text
/submit
```

Submit work.

```text
/verify
```

Verifier dashboard.

```text
/proof/:id
```

Individual proof.

Routes can be reorganized only if the resulting UX is clearer.

---

# 18. HOMEPAGE

The homepage should communicate the product immediately.

Primary message:

> **Don't tell people what you can do. Show them what you've actually done.**

Explain:

```text
Submit work
→
Attach evidence
→
Get verified
→
Record proof on Monad
→
Share your passport
```

Do not fill the homepage with generic Web3 terminology.

Avoid vague phrases such as:

- decentralized future
- revolutionizing trust
- next-generation identity
- Web3 reputation layer

Prefer concrete language.

---

# 19. PASSPORT

The passport is the central product surface.

It should show:

```text
Developer
Wallet address
Verified work count
Pending work count
Rejected work count
Revoked work count
```

Each proof should show:

```text
Work title
Work type
Status
Evidence
Verifier
Created date
Verified date
Transaction
```

The passport must make verification inspectable rather than merely decorative.

---

# 20. PROOF DETAIL PAGE

A proof detail page must answer:

### What did this person do?

Display the work.

### What evidence supports it?

Display evidence links/details.

### Who verified it?

Display verifier address.

### When?

Display timestamps.

### Is it still valid?

Display current status.

### Can I verify it myself?

Provide blockchain transaction / explorer information where available.

This page is more important than the graph.

---

# 21. VERIFICATION DASHBOARD

The verifier dashboard should prioritize pending work.

Each submission should expose:

```text
Worker
Work title
Work type
Description
Evidence
Submitted date
Current status
```

Actions:

```text
Verify
Reject
```

For verified work:

```text
Revoke
```

Never allow a verifier action without confirmation when the action is destructive or irreversible.

---

# 22. REVOCATION

Revocation must not delete the historical record.

After revocation:

```text
status = REVOKED
```

The public passport should still show the proof.

The UI should communicate:

> This proof was previously verified but is no longer valid.

Never silently remove revoked work.

Historical integrity is part of the product.

---

# 23. PUBLIC VERIFICATION

Public users must be able to inspect a proof without connecting a wallet.

A public proof should expose:

```text
Worker
Work
Evidence
Verifier
Status
Created timestamp
Verification timestamp
Transaction
Contract
Network
```

The public viewer should not need to trust the application UI alone.

Where possible, provide a path to independently inspect the blockchain record.

---

# 24. TRUST GRAPH

The trust graph is a supporting visualization.

Conceptually:

```text
Developer
   ↓
Work
   ↓
Evidence
   ↓
Verifier
   ↓
Blockchain record
```

Do not make the graph the core product.

If the graph becomes difficult to maintain, prioritize:

1. Passport
2. Proof detail
3. Verification
4. Blockchain correctness

before graph polish.

---

# 25. DESIGN SYSTEM

The product should feel like serious developer infrastructure.

Style direction:

```text
dark
minimal
technical
high contrast
restrained
premium
```

Avoid generic crypto aesthetics.

Do NOT overuse:

- neon gradients
- glowing cards
- excessive glassmorphism
- giant animated backgrounds
- random 3D objects
- token-style visuals
- meaningless particle effects

Animations should communicate state or hierarchy.

They should not exist simply because animation is possible.

---

# 26. STATUS UI

Statuses must be immediately understandable.

Use clear labels:

```text
PENDING
VERIFIED
REJECTED
REVOKED
```

Do not rely only on color.

A status should have:

```text
label
icon or visual indicator
semantic styling
```

Accessibility must remain usable for users with color-vision differences.

---

# 27. MOCK DATA RULES

Mock data is allowed during development.

However:

### Never mix mock and real blockchain data silently.

The application must know whether it is operating in:

```text
MOCK MODE
```

or:

```text
LIVE MODE
```

If mock mode exists, expose it clearly in development.

Never use fake data to create the impression that the hackathon demo is running on-chain.

---

# 28. DEMO DATA

Use three conceptual demo identities:

```text
Organizer
Verifier
Developer
```

The demo developer should have examples such as:

```text
ERC-20 Smart Contract
Hackathon Project
GitHub Contribution
```

But distinguish seeded/demo data from actual on-chain records.

---

# 29. ERROR HANDLING

Every external operation must handle failure.

At minimum:

```text
wallet rejected
wrong network
contract reverted
invalid work ID
unauthorized verifier
transaction failed
transaction pending
transaction timeout
missing evidence
invalid evidence
invalid status transition
```

Never swallow errors.

Bad:

```ts
try {
   await transaction();
} catch {}
```

Good:

```ts
try {
   await transaction();
} catch (error) {
   // log appropriately
   // expose user-readable error
}
```

Never expose raw technical errors as the only UX.

---

# 30. SECURITY REQUIREMENTS

The contract must test:

### Authorization

- unauthorized user cannot verify
- unauthorized user cannot reject
- unauthorized user cannot revoke
- unauthorized user cannot approve verifier
- unauthorized user cannot remove verifier

### State

- invalid status transitions fail
- duplicate verification fails
- duplicate rejection fails
- invalid work IDs fail
- already revoked work cannot be verified again

### Data

- worker cannot be silently changed
- evidence hash cannot be silently changed
- verifier cannot be silently changed

### Events

Every important state change emits the correct event.

---

# 31. SMART CONTRACT TESTS

Write tests for at least:

```text
deploy contract
approve verifier
remove verifier

submit work
read work

verify work
reject work
revoke work

unauthorized verify
unauthorized reject
unauthorized revoke

invalid work ID
duplicate verification
invalid status transition

isVerified()

event emission
```

Do not consider the contract complete without tests.

---

# 32. FRONTEND TESTING

Test important user flows:

```text
wallet connection
passport rendering
proof rendering
submit form validation
pending state
verification flow
rejection flow
revocation flow
transaction error handling
wrong network
public passport
public proof
```

Prioritize critical flows over superficial component coverage.

---

# 33. TYPE SAFETY

Use TypeScript strictly.

Avoid:

```ts
any
```

unless there is a documented reason.

Do not duplicate blockchain types throughout the frontend.

Define shared types for:

```text
Work
WorkStatus
WorkType
Verifier
Evidence
Transaction
Passport
```

---

# 34. CODE QUALITY

Before adding new code:

1. Inspect the existing implementation.
2. Reuse existing components/utilities.
3. Avoid duplicate logic.
4. Follow existing naming conventions.
5. Keep components focused.
6. Keep blockchain logic out of presentation components.
7. Prefer simple code over clever abstractions.

Do not rewrite working code without a reason.

---

# 35. DEPENDENCY RULE

Do not add a dependency just because it is convenient.

Before adding a package ask:

```text
Can this be implemented cleanly with the existing stack?
```

If yes, do not add the dependency.

Every dependency should have a clear purpose.

---

# 36. ENVIRONMENT VARIABLES

Never hardcode:

```text
private keys
RPC secrets
API keys
credentials
```

Use environment variables.

Never commit:

```text
.env
.env.local
private key files
wallet secrets
```

Provide:

```text
.env.example
```

with placeholder values.

---

# 37. CONTRACT ADDRESS MANAGEMENT

Never scatter the contract address throughout the codebase.

Keep deployment configuration centralized.

For example:

```text
src/lib/contract/config.ts
```

or equivalent.

The frontend should have one source of truth for:

```text
chain
contract address
ABI
explorer URL
```

---

# 38. MONAD INTEGRATION

Monad is the blockchain verification layer.

Do not make unsupported claims such as:

> "Monad makes reputation trustworthy."

Instead:

> "Verification records are written on Monad and can be independently inspected."

Always distinguish:

```text
application claim
```

from:

```text
blockchain fact
```

---

# 39. EXPLORER LINKS

Whenever a real transaction exists, provide an explorer link.

Do not construct fake transaction URLs.

Explorer URLs must be derived from the configured network and actual transaction hash.

---

# 40. DATA REFRESH

After a successful mutation:

```text
submit
verify
reject
revoke
```

the UI must refresh relevant blockchain state.

Do not depend on stale local state.

Prefer:

```text
transaction confirmed
        ↓
invalidate/refetch
        ↓
render latest blockchain state
```

---

# 41. LOADING STATES

Every async blockchain action needs a loading state.

Examples:

```text
Loading passport...
Loading proof...
Submitting...
Waiting for wallet...
Confirming...
Verifying...
Rejecting...
Revoking...
```

Do not leave users staring at an unchanged interface.

---

# 42. EMPTY STATES

Every important page needs a meaningful empty state.

Examples:

```text
No verified work yet.
```

```text
No pending submissions.
```

```text
No proofs found.
```

Do not render blank screens.

---

# 43. RESPONSIVE DESIGN

The application must work on:

```text
desktop
tablet
mobile
```

However, do not create a separate mobile application.

Use responsive layouts.

---

# 44. ACCESSIBILITY

At minimum:

- semantic HTML
- keyboard-accessible controls
- visible focus states
- readable contrast
- form labels
- meaningful button text
- status not conveyed by color alone

---

# 45. DEVELOPMENT ORDER

Follow this order unless there is a strong technical reason not to.

## Phase 1 — Foundation

Build:

```text
project structure
routing
Tailwind
wallet integration
wagmi
viem
Monad configuration
shared types
```

---

## Phase 2 — Contract

Build:

```text
ProofOfWorkRegistry.sol
```

Then:

```text
tests
deployment
ABI
contract address
```

Do not build complex UI before the contract model is stable.

---

## Phase 3 — Passport

Build:

```text
/public passport
/passport/:address
```

Start with mock data if necessary.

Then connect to real blockchain state.

---

## Phase 4 — Submit

Build:

```text
/submit
```

Flow:

```text
form
→ validation
→ evidence normalization
→ hash
→ contract transaction
→ confirmation
→ refresh
```

---

## Phase 5 — Verify

Build:

```text
/verify
```

Flow:

```text
pending proof
→ inspect evidence
→ verify/reject
→ transaction
→ refresh
```

---

## Phase 6 — Public Proof

Build:

```text
/proof/:id
```

This should become the strongest demonstration of the product.

---

## Phase 7 — Revocation

Implement:

```text
verified
→ revoke
→ revoked
```

Keep historical visibility.

---

## Phase 8 — Graph

Only after the core lifecycle works.

---

## Phase 9 — Polish

Improve:

```text
spacing
typography
loading states
error states
animations
responsive design
empty states
transaction UX
```

Polish must not come before correctness.

---

# 46. PRIORITY SYSTEM

Use this priority hierarchy.

## P0 — Required

```text
wallet
Monad configuration
contract
contract tests
submit work
verify work
reject work
revoke work
passport
proof detail
real transactions
public verification
```

## P1 — Important

```text
excellent transaction UX
evidence display
explorer links
error handling
responsive UI
empty states
loading states
security hardening
```

## P2 — Nice to have

```text
trust graph
animations
filters
search
additional visual polish
```

## P3 — Do not build for MVP

```text
GitHub API automation
AI verification
bounty marketplace
recruiter matching
cross-chain support
payment system
mobile app
social features
```

---

# 47. AGENT BEHAVIOR RULES

When working on this repository:

### Rule A — Inspect before editing

Before modifying a file:

1. Read it.
2. Understand its role.
3. Check related imports.
4. Check existing abstractions.
5. Check whether the functionality already exists.

Never blindly overwrite files.

---

### Rule B — Small changes first

Prefer incremental changes.

After each meaningful change:

```text
typecheck
lint
test
build
```

when applicable.

Fix errors before moving on.

---

### Rule C — Do not hide failures

Never solve an error by:

- disabling TypeScript
- disabling linting
- removing tests
- suppressing errors
- adding `any`
- commenting out broken functionality
- replacing real blockchain calls with fake state

If something fails, diagnose the root cause.

---

### Rule D — Do not over-engineer

Do not create abstractions for hypothetical future requirements.

Build the smallest architecture that correctly supports the current MVP.

---

### Rule E — Preserve working functionality

Before changing existing functionality, determine whether it is already required by another part of the application.

Do not casually rewrite unrelated code.

---

### Rule F — No fake completeness

A page that looks finished but uses hardcoded blockchain data is NOT finished.

A button labeled "Verify" that only changes React state is NOT verification.

A transaction hash such as:

```text
0x123...
```

is NOT acceptable unless it is an actual transaction hash.

---

# 48. DEFINITION OF DONE

The MVP is complete only when this exact flow works:

```text
1. Developer connects wallet.

2. Developer opens /submit.

3. Developer submits a work item.

4. Evidence is attached.

5. A real transaction is sent to Monad.

6. Work appears as PENDING.

7. Authorized verifier opens /verify.

8. Verifier inspects evidence.

9. Verifier approves the work.

10. A real Monad transaction confirms.

11. Work becomes VERIFIED.

12. Developer passport updates.

13. Public user opens /passport/:address.

14. Public user opens /proof/:id.

15. Public user can inspect:
    - work
    - evidence
    - verifier
    - timestamps
    - transaction
    - status

16. Verifier revokes the proof.

17. A real Monad transaction confirms.

18. Proof becomes REVOKED.

19. Historical proof remains visible.

20. Invalid/unauthorized operations fail correctly.
```

If any of these are simulated rather than implemented, the MVP is not complete.

---

# 49. FINAL DEMO SCRIPT

The final hackathon demo should be short.

### Step 1

Open a developer passport with little or no verified work.

### Step 2

Submit:

```text
ERC-20 Smart Contract
```

with evidence.

### Step 3

Show the pending state.

### Step 4

Switch to verifier.

### Step 5

Open the submission.

### Step 6

Inspect evidence.

### Step 7

Verify it.

### Step 8

Show the real Monad transaction.

### Step 9

Return to passport.

The verified proof now appears.

### Step 10

Open the public proof page.

Show:

```text
Work
Evidence
Verifier
Timestamp
Blockchain transaction
Status
```

### Step 11

Revoke the proof.

### Step 12

Show that it remains visible but now says:

```text
REVOKED
```

This demonstrates that the system records both verification and historical invalidation.

---

# 50. FINAL PRODUCT TEST

Before declaring the project finished, ask:

### Question 1

**What did this person actually do?**

If the UI cannot answer this, it fails.

### Question 2

**What evidence supports the claim?**

If evidence cannot be inspected, it fails.

### Question 3

**Who verified it?**

If the verifier is unclear, it fails.

### Question 4

**Was the verification actually recorded on-chain?**

If not, it fails.

### Question 5

**Is the verification still valid?**

If revocation is impossible or unclear, it fails.

### Question 6

**Can another person inspect the proof without trusting the UI?**

If not, improve the public verification flow.

---

# 51. PRODUCT PRINCIPLE

The product should not try to convince users that the system is trustworthy.

It should give users enough evidence to verify the claim themselves.

Therefore prioritize:

```text
Evidence
    ↓
Verifier
    ↓
Blockchain record
    ↓
Public inspection
```

over:

```text
marketing
    ↓
claims
    ↓
visual effects
```

---

# 52. ENGINEERING PRINCIPLE

When forced to choose between:

```text
more features
```

and:

```text
stronger verification
```

choose stronger verification.

When forced to choose between:

```text
better animation
```

and:

```text
better transaction handling
```

choose transaction handling.

When forced to choose between:

```text
more pages
```

and:

```text
a more trustworthy proof page
```

choose the proof page.

When forced to choose between:

```text
faster implementation
```

and:

```text
fake blockchain behavior
```

never fake blockchain behavior.

---

# 53. CORE ARCHITECTURAL RULE

The system must preserve this separation:

```text
CLAIM
  ↓
EVIDENCE
  ↓
VERIFICATION
  ↓
ON-CHAIN RECORD
  ↓
PUBLIC INSPECTION
```

Do not collapse these concepts into one generic "reputation" object.

That distinction is the core intellectual and technical value of Proof-of-Work Passport.

---

# 54. FINAL RULE

Build less.

Verify more.

The goal is not to create the biggest application.

The goal is to make one claim undeniable:

> **This person did this work, here is the evidence, this verifier approved it, and the verification can be independently inspected on-chain.**