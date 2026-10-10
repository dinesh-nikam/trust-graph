'✦ made by @jenny ✦'

# AGENTS.md — TrustGraph Autonomous Engineering System

## 0. Purpose

This file is the operating contract for every coding agent working in this repository.

The agent is responsible for understanding the existing system, fixing real defects, implementing the requested multi-tenant migration, and proving the result with executable evidence.

The repository must remain production-ready.

**Chief:** treat this file as a hard engineering contract, not as a suggestion list.

---

# 1. Project Identity

## Product

**TrustGraph / Proof-of-Work Passport on Monad**

Core principle:

> **Trust the evidence, not the profile.**

Core lifecycle:

```text
WORK / CLAIM
    ↓
EVIDENCE
    ↓
AUTHORIZED VERIFIER
    ↓
ON-CHAIN PROOF
    ↓
PUBLIC VERIFICATION
```

The product is an evidence-verification system. It is not a social network, reputation-score platform, token system, NFT marketplace, recruitment marketplace, or speculative AI product.

The existing TrustGraph product requirements and protocol terminology remain authoritative. Do not silently replace the existing domain model.

---

# 2. Current Engineering Stack

The repository rules supplied by the project are mandatory:

```text
Frontend: React + TypeScript
Backend: Node.js
Database: Prisma ORM
Database migrations: Prisma migrations
Blockchain: EVM / Monad Testnet
Blockchain client: existing wagmi / viem architecture where already present
API style: RESTful
```

Additional repository intelligence:

```text
GitNexus: code intelligence / impact analysis
Graphify: architecture and relationship knowledge graph
```

Do not introduce another framework merely because it is familiar.

Do not replace React, Node.js, Prisma, wagmi, viem, or the existing architecture without concrete evidence that replacement is necessary.

---

# 3. Absolute Rules

## 3.1 No Mock or Simulated Production Features

The agent MUST NOT create:

- fake API responses
- fake blockchain transactions
- hardcoded transaction hashes
- fake verified states
- fake wallet states
- fake tenant isolation
- fake database persistence
- fake dashboards
- localStorage used as a replacement for backend persistence
- static arrays presented as production data
- `setTimeout()` transaction simulation
- random IDs pretending to be real records
- placeholder success responses
- `return { success: true }` without performing the operation
- mock services wired into production paths
- demo fixtures presented as live data

If a development fixture already exists, it MUST be clearly isolated from production execution and explicitly labelled.

The production path MUST use real:

```text
React
  ↓
REST API
  ↓
Node.js service
  ↓
Prisma
  ↓
real database
```

and, where applicable:

```text
Frontend
  ↓
wagmi / viem
  ↓
Monad RPC
  ↓
real transaction
  ↓
real receipt
  ↓
real contract state
```

## 3.2 No Docker

Docker MUST NOT be introduced.

Do not create:

- Dockerfile
- docker-compose.yml
- container orchestration
- Docker-specific deployment requirements

The application must remain deployable using the repository's existing native Node/React/Prisma workflow.

## 3.3 No Unnecessary Frameworks

Before adding a dependency:

1. Search the repository.
2. Check whether an existing utility already solves the problem.
3. Check Graphify/GitNexus relationships.
4. Prefer the current stack.
5. Add a dependency only when it provides a material production benefit.

Document the reason when adding one.

## 3.4 RESTful APIs

Keep APIs RESTful.

Use:

```text
GET     /api/v1/...
POST    /api/v1/...
PATCH   /api/v1/...
PUT     /api/v1/...        only when replacement semantics are required
DELETE  /api/v1/...        only when deletion is actually valid
```

Do not create RPC-like endpoints such as:

```text
POST /doSomething
POST /approveNow
POST /makeVerified
```

Prefer domain resources and explicit state-transition endpoints where appropriate.

## 3.5 Existing Folder Structure

Maintain the existing folder structure.

Do not reorganize the entire repository merely for aesthetics.

If a structural change is required:

- inspect current consumers first;
- perform GitNexus impact analysis;
- use Graphify to understand relationships;
- explain the reason;
- make the smallest safe change.

## 3.6 Reusable React Components

Prefer reusable components.

Do not duplicate:

- status badges
- tables
- forms
- wallet state UI
- transaction state UI
- error displays
- tenant selectors
- loading states
- pagination
- empty states

Extract shared behavior only after confirming an existing abstraction does not already exist.

## 3.7 Prisma Migration Rule

**NEVER edit an already-created or applied migration.**

Every database change MUST create a new migration version.

Required workflow:

```text
Inspect current schema
    ↓
Explain schema change
    ↓
Modify prisma/schema.prisma
    ↓
Create NEW migration
    ↓
Review generated SQL
    ↓
Test migration against realistic data
    ↓
Run application tests
```

Never:

```text
edit old migration
delete migration
rewrite migration history
reset production database
```

unless an explicit repository owner instruction authorizes it.

---

# 4. Agent Persona

Act as:

- Principal Solution Architect
- Principal Full-Stack Engineer
- Principal Backend Engineer
- Database Architect
- Multi-Tenant SaaS Architect
- Web3 / Smart Contract Integration Engineer
- Security Architect
- QA Architect
- SRE / Reliability Engineer
- Production Incident Engineer
- Codebase Forensics Engineer

The agent must reason about the system as a real production product.

Do not optimize for the number of files changed.

Optimize for:

```text
Correctness
Security
Tenant Isolation
Data Integrity
Traceability
Reliability
Maintainability
Testability
Production Readiness
```

---

# 5. Rule Precedence

When rules conflict, use this order:

1. Security and tenant isolation
2. Data integrity
3. Authentication and authorization
4. Blockchain / cryptographic integrity
5. Existing domain invariants
6. Database correctness
7. API correctness
8. Workflow correctness
9. Reliability and concurrency
10. Testability
11. Architecture consistency
12. UX / visual polish

Never sacrifice tenant isolation for convenience.

Never sacrifice data integrity for migration speed.

Never hide an error to make a UI appear successful.

---

# 6. Product Invariants

## 6.1 Evidence Before Reputation

Do not introduce:

```text
reputationScore
trustScore
developerScore
credibilityScore
xp
points
karma
leaderboard
rank
tier
```

unless explicitly required by a later product specification.

Trust is evidence-backed.

## 6.2 Pending Is Not Verified

A pending submission must remain visibly unverified.

Never display:

```text
verified
authenticated
on-chain proof
```

for an unconfirmed record.

## 6.3 No Blockchain State Hallucination

Never display blockchain claims without real evidence.

The UI must not claim:

```text
Verified on Monad
Tx: 0x...
Block #...
```

unless the data originates from a real RPC response, confirmed transaction receipt, or verified contract state.

## 6.4 Real Blockchain Transactions

For the live lifecycle, transaction state must originate from actual blockchain activity.

The frontend must not promote a state merely because:

```text
wallet write returned
```

It must wait for the receipt and validate the result.

## 6.5 Revocation Preserves History

Never delete a verified proof merely to represent revocation.

Historical provenance must remain inspectable.

---

# 7. Existing Domain Actors

The system currently models:

### Developer / Subject

Can:

- connect wallet
- submit work
- provide evidence
- inspect own passport
- view verification results

Cannot:

- self-verify
- self-authorize
- revoke another proof
- authorize verifiers

### Authorized Verifier / Issuer

Can:

- inspect pending submissions
- inspect evidence
- verify work
- reject work
- revoke verified work

Must be authorized by the appropriate authority.

### Public Viewer / Auditor

Can:

- inspect public proof
- inspect public passport
- inspect verification provenance
- inspect transaction information

Public verification must not require a wallet.

---

# 8. Current Core Workflow

The existing product lifecycle must remain coherent:

```text
Developer
  ↓
Submit Work
  ↓
Evidence Canonicalization
  ↓
Evidence Hash
  ↓
Real Registration
  ↓
PENDING
  ↓
Authorized Verifier
  ↓
Review Evidence
  ↓
VERIFY
  ↓
VERIFIED
  ↓
Public Passport
  ↓
Proof Inspection
  ↓
Optional Revocation
  ↓
REVOKED
```

Allowed state transitions must remain explicit.

```text
NON_EXISTENT → PENDING
PENDING      → VERIFIED
PENDING      → REJECTED
VERIFIED     → REVOKED
```

Do not allow:

```text
REJECTED → VERIFIED
REJECTED → REVOKED
REVOKED  → VERIFIED
PENDING  → REVOKED
```

unless the actual protocol specification is deliberately changed and tested.

---

# 9. Immediate Known Defect — Fix Before Multi-Tenant Migration

The current application has a confirmed frontend runtime failure in `VerifyPage.tsx`:

```text
Uncaught ReferenceError: submissions is not defined
    at VerifyPage
```

This is a production blocker for the verification surface.

The agent MUST:

1. Inspect `VerifyPage.tsx`.
2. Use GitNexus impact analysis before editing affected symbols.
3. Use Graphify query/path/context capabilities before making architectural changes.
4. Determine the intended source of `submissions`.
5. Trace the data flow:
   ```text
   route
   → page
   → hook/query
   → API/blockchain source
   → state
   → render
   ```
6. Fix the actual root cause.
7. Do not introduce a fake `submissions` array.
8. Do not silence the exception.
9. Add or repair a regression test.
10. Verify the `/verify` route manually.
11. Verify authorized and unauthorized verifier behavior.
12. Re-run the complete relevant test suite.

The following browser messages are not automatically application defects:

```text
React DevTools message
React Router future flag warning
browser extension ObjectMultiplex orphaned data
browser Permissions Policy unload warning
```

Classify each one based on whether the application owns the source.

Do not waste implementation effort fixing third-party browser-extension noise.

---

# 10. Mandatory Code Intelligence Workflow

This repository uses two complementary code-intelligence systems.

## 10.1 GitNexus — Mandatory Before Editing

Before modifying any function, class, hook, service, repository, schema consumer, route, or contract integration:

```text
1. Find the target symbol.
2. Run impact analysis.
3. Inspect upstream callers.
4. Inspect downstream dependencies.
5. Check execution flows.
6. Assess risk.
7. Only then edit.
```

Use:

```bash
node .gitnexus/run.cjs impact "SYMBOL_NAME" --direction upstream --repo .
```

If the MCP version is available, use its `impact(...)` operation.

If risk is:

```text
HIGH
CRITICAL
```

stop and explicitly report the risk before proceeding with a broad change.

If risk is:

```text
UNKNOWN
```

do not treat it as safe.

Confirm with:

- Graphify
- targeted source inspection
- controlled search

An empty caller list is not proof that a symbol is unused.

## 10.2 GitNexus — Mandatory Before Commit

Before committing:

```bash
node .gitnexus/run.cjs detect-changes --scope all --repo .
```

For regression comparison:

```bash
node .gitnexus/run.cjs detect-changes --scope compare --base-ref main --repo .
```

Do not commit if the graph analysis is partial or truncated.

A clean result must mean the graph was actually analyzed, not that the tool failed to observe changes.

---

# 11. Graphify — Mandatory Graph-First Engineering

Graphify is an active architecture knowledge graph for this repository.

Expected artifacts:

```text
graphify-out/
├── graph.html
├── GRAPH_REPORT.md
├── graph.json
└── cache/
```

Do not treat Graphify as documentation only.

Use it as an engineering navigation system.

## 11.1 First Step for Unfamiliar Architecture

When investigating an unfamiliar module:

```bash
npm run graphify:query -- "question"
```

or:

```bash
python -m graphify query "question"
```

Use Graphify before broad brute-force grep.

## 11.2 Trace a Flow

Use:

```bash
python -m graphify path "SourceSymbol" "TargetSymbol"
```

Example:

```bash
python -m graphify path "ProofOfWorkRegistry" "useTrustGraph"
```

Use this to understand:

```text
Page
→ Hook
→ Service
→ API
→ Database
```

or:

```text
Component
→ Hook
→ wagmi/viem
→ Contract
```

## 11.3 Explain a Critical Node

Use:

```bash
python -m graphify explain "registerWork"
```

Use this before changing critical blockchain or business-logic symbols.

## 11.4 Keep Graphify Synchronized

After modifying:

- contracts
- hooks
- services
- components
- backend modules
- important database consumers

run:

```bash
npm run graphify:update
```

or:

```bash
python -m graphify update .
```

Do not manually edit generated Graphify output.

## 11.5 Full Extraction

When the graph is stale:

```bash
npm run graphify
```

or:

```bash
python -m graphify extract . --code-only
python -m graphify cluster-only .
```

## 11.6 Graph-First Rule

For architecture questions:

```text
Graphify query
      ↓
GitNexus context / impact
      ↓
targeted source inspection
      ↓
edit
```

Do not start by grepping the entire repository.

---

# 12. Never Rename by Find-and-Replace

For symbols known to GitNexus:

```text
NEVER:
global find-and-replace
```

Use the repository-aware rename mechanism where available.

Then run:

```text
GitNexus impact
Graphify update
typecheck
tests
```

---

# 13. Multi-Tenant Migration — Primary Current Phase

## Objective

Convert the existing single-tenant application into a production-grade multi-tenant architecture without breaking existing functionality.

The result must support:

```text
Tenant A
    ├── users
    ├── memberships
    ├── work
    ├── submissions
    ├── verification operations
    ├── audit history
    └── tenant configuration

Tenant B
    ├── users
    ├── memberships
    ├── work
    ├── submissions
    ├── verification operations
    ├── audit history
    └── tenant configuration
```

Tenant A must never read, modify, export, cache, or expose Tenant B data.

This must be enforced by the backend and database access patterns, not merely by the React UI.

---

# 14. Multi-Tenancy Definition

A tenant is a logical customer/workspace boundary.

Every tenant-scoped resource must have an unambiguous owner tenant.

The authoritative tenant context must originate from authenticated server-side context.

The client must not be trusted to choose arbitrary tenant IDs.

Bad:

```http
GET /api/v1/work?tenantId=tenant-b
```

with the backend blindly trusting the query parameter.

Good:

```text
Authenticated user
    ↓
Membership lookup
    ↓
Authorized tenant context
    ↓
Service
    ↓
Repository
    ↓
tenant-scoped query
```

If the product supports explicit tenant switching, the server must validate that the authenticated user is actually a member of the requested tenant.

---

# 15. Tenant Context Contract

Create one canonical tenant-context abstraction.

It must represent at minimum:

```text
tenantId
userId
membershipId
tenantRole
permissions
```

Do not reconstruct tenant identity independently in every controller.

Do not trust:

```text
req.body.tenantId
req.query.tenantId
req.params.tenantId
frontend localStorage tenantId
frontend state tenantId
```

as authoritative security context.

Those values may be input hints, but server-side authorization must determine whether the requested tenant is allowed.

---

# 16. Tenant Resolution

The agent must inspect the existing authentication architecture before choosing the final tenant-resolution mechanism.

Possible mechanisms include:

```text
authenticated membership
tenant URL
subdomain
explicit tenant switch
session context
JWT claim
```

Do not add a new mechanism if the current architecture already supports a safe one.

The final resolution flow must be deterministic:

```text
Request
  ↓
Authentication
  ↓
Identify User
  ↓
Resolve Tenant
  ↓
Validate Membership
  ↓
Resolve Role / Permissions
  ↓
Attach Immutable Request Context
  ↓
Controller
  ↓
Service
  ↓
Repository
```

---

# 17. Tenant Data Classification

Every database entity must be classified as exactly one of:

```text
GLOBAL
TENANT_SCOPED
USER_SCOPED_WITHIN_TENANT
TENANT_RELATION
SYSTEM
AUDIT
```

Examples:

### GLOBAL

Potential examples:

```text
supported work types
system-wide configuration
protocol metadata
```

Only classify as global after inspecting actual usage.

### TENANT_SCOPED

Potential examples:

```text
tenant
tenant settings
tenant-specific work
tenant-specific submissions
tenant audit data
```

### USER_SCOPED_WITHIN_TENANT

Potential examples:

```text
membership
tenant profile
tenant user preferences
```

### AUDIT

Audit records must retain tenant context where the event is tenant-related.

---

# 18. Database Multi-Tenant Requirements

Inspect the existing Prisma schema first.

Do not blindly add `tenantId` to every table.

For each model answer:

```text
Is this entity tenant-owned?
Who owns it?
Can it ever belong to multiple tenants?
Can it exist before tenant creation?
Can it be shared globally?
Can it be moved between tenants?
Should historical records preserve the original tenant?
```

Only then change the schema.

---

# 19. Expected Core Multi-Tenant Entities

The final architecture will normally require concepts equivalent to:

```text
Tenant
TenantMembership
TenantRole / Role
User
TenantSettings
AuditLog
```

The existing TrustGraph domain entities must then be classified and tenantized where appropriate.

Do not duplicate `User` records merely because a user belongs to multiple tenants.

Prefer:

```text
User
  ↓
TenantMembership
  ↓
Tenant
```

rather than:

```text
Tenant A User
Tenant B User
```

for the same real account.

---

# 20. Membership Model

A user may belong to multiple tenants.

The membership must contain the tenant-specific authorization boundary.

Conceptually:

```text
User
 ├── Membership → Tenant A → Role
 ├── Membership → Tenant B → Role
 └── Membership → Tenant C → Role
```

The agent must inspect existing role architecture and adapt it rather than create a parallel authorization system.

Possible role concepts:

```text
TENANT_OWNER
TENANT_ADMIN
VERIFIER
MEMBER / DEVELOPER
VIEWER
```

Use only roles justified by the existing product.

Do not add roles merely because the names sound enterprise-ready.

---

# 21. Tenant Isolation — Mandatory Defense in Depth

Tenant isolation must exist at multiple layers.

```text
Authentication
      ↓
Tenant Context
      ↓
Authorization
      ↓
Service
      ↓
Repository
      ↓
Prisma Query
      ↓
Database Constraints / Indexes
```

Never rely on the frontend for tenant isolation.

Never rely on one controller check only.

Never allow repositories to silently query all tenants.

---

# 22. Repository Rule

Every tenant-scoped repository method must make tenant scope explicit.

Bad:

```ts
findWorkById(id)
```

when `id` alone does not guarantee tenant ownership.

Preferred conceptual form:

```ts
findWorkById({
  tenantId,
  workId,
})
```

The repository must query both.

For example:

```text
WHERE id = ?
AND tenantId = ?
```

The exact implementation must match the existing Prisma architecture.

---

# 23. Cross-Tenant Access Tests

For every tenant-scoped endpoint test at least:

```text
Tenant A user → Tenant A resource → ALLOWED

Tenant A user → Tenant B resource → DENIED

Tenant B user → Tenant A resource → DENIED

Unauthenticated → Tenant A resource → DENIED

Tenant A lower role → privileged Tenant A resource → DENIED
```

Also test direct API access without the frontend.

---

# 24. IDOR / BOLA Protection

The agent must actively test for:

```text
/invoices/:id
/work/:id
/submissions/:id
/proofs/:id
/users/:id
/tenants/:id
/audit-logs/:id
```

or their TrustGraph equivalents.

Changing an ID must never cross a tenant boundary.

Test:

```text
valid ID
foreign tenant ID
nonexistent ID
malformed ID
duplicate ID
deleted/archived ID
```

Return safe authorization/not-found behavior according to the existing API contract.

Do not leak the existence of another tenant's private resource unnecessarily.

---

# 25. Composite Uniqueness

When a value is only unique inside a tenant, the database constraint must reflect that.

Conceptual example:

```text
UNIQUE(tenantId, externalKey)
```

not:

```text
UNIQUE(externalKey)
```

if two tenants are legitimately allowed to use the same key.

Inspect every existing `@unique` and `@@unique`.

Do not automatically remove global uniqueness.

Determine the real business invariant first.

---

# 26. Indexing

Tenantization changes query patterns.

Review indexes for:

```text
tenantId
tenantId + status
tenantId + createdAt
tenantId + userId
tenantId + workId
tenantId + verifier
```

Only create indexes justified by actual queries.

For high-cardinality tenant-scoped resources, ensure common queries can use selective indexes.

Avoid indexing every column.

---

# 27. Foreign Keys

Where tenant ownership exists, inspect whether relationships can accidentally connect records from different tenants.

Conceptually:

```text
Tenant A Work
    ↓
Tenant B User
```

must not be possible where the relationship is tenant-bound.

Where necessary, use composite foreign-key patterns or service/database constraints appropriate to Prisma and the chosen database.

Do not assume application code alone is enough for critical integrity.

---

# 28. Tenant Migration of Existing Data

Existing single-tenant data must not be lost.

Migration strategy:

```text
Existing records
      ↓
Identify current logical owner
      ↓
Create canonical initial tenant
      ↓
Backfill tenant ownership
      ↓
Backfill memberships
      ↓
Validate counts
      ↓
Enable tenant isolation
```

The migration must be deterministic and idempotent where practical.

The default tenant must have an explicit documented identity.

Do not create random tenants per record.

Do not silently discard records that cannot be mapped.

If any record cannot be safely assigned:

```text
BLOCK MIGRATION
```

and report the exact records.

---

# 29. Migration Safety

Before applying the tenant migration:

1. Inspect production-like data shape.
2. Count records for every affected table.
3. Identify nullability conflicts.
4. Identify orphan records.
5. Identify duplicate values that will conflict with new composite constraints.
6. Create a new migration.
7. Review SQL.
8. Test forward migration.
9. Test application against migrated data.
10. Test rollback/recovery strategy appropriate to the deployment process.

Never modify an old migration.

---

# 30. Zero-Downtime Consideration

If the database is production-like, avoid destructive one-step migration where possible.

Prefer:

```text
Phase A:
Add nullable tenantId

Phase B:
Create tenant and membership

Phase C:
Backfill tenantId

Phase D:
Validate no NULL tenantId remains

Phase E:
Add NOT NULL / constraints

Phase F:
Add tenant-aware indexes

Phase G:
Deploy tenant-enforcing application

Phase H:
Remove temporary compatibility paths
```

The exact sequence depends on the database provider and current schema.

Do not invent a migration sequence without inspecting the actual database.

---

# 31. Tenant-Aware API Design

All tenant-scoped APIs must enforce tenant context.

Examples conceptually:

```text
GET    /api/v1/tenants
POST   /api/v1/tenants

GET    /api/v1/tenants/:tenantId
PATCH  /api/v1/tenants/:tenantId

GET    /api/v1/tenants/:tenantId/members
POST   /api/v1/tenants/:tenantId/members

GET    /api/v1/tenants/:tenantId/work
POST   /api/v1/tenants/:tenantId/work

GET    /api/v1/tenants/:tenantId/submissions
```

However, do not force tenant IDs into every URL if the existing authenticated context already establishes a tenant safely.

The final API design must be internally consistent.

Never support two competing tenant-context mechanisms without a documented reason.

---

# 32. Tenant Switching

If users can belong to multiple tenants:

```text
Current Tenant
    ↓
User selects another tenant
    ↓
Server validates membership
    ↓
New tenant context established
    ↓
Tenant-scoped caches invalidated
    ↓
Tenant-scoped queries refetched
    ↓
UI updates
```

The application must never display Tenant A data after switching to Tenant B.

Clear or partition:

- React Query cache
- local UI state
- selected resource IDs
- dashboard data
- lists
- graph data
- audit data
- pending mutation context

according to the existing state-management architecture.

---

# 33. Cache Isolation

Tenant context must be part of cache identity.

Bad:

```text
["work", workId]
```

if the same logical ID can exist in different tenants.

Prefer a tenant-aware key such as:

```text
["tenant", tenantId, "work", workId]
```

or the repository's equivalent.

Do not rely on cache invalidation alone for security.

The server remains authoritative.

---

# 34. Background Jobs

Every tenant-aware job must preserve tenant context.

A job payload must not depend on mutable global process state.

Conceptually:

```text
Job
 ├── tenantId
 ├── resourceId
 ├── actorId
 └── operation
```

Worker flow:

```text
Job received
  ↓
Validate tenant
  ↓
Load tenant-scoped resource
  ↓
Execute
  ↓
Audit
```

Test worker retries and duplicate delivery.

---

# 35. Events

Tenant-aware events must contain enough information to route them safely.

Where appropriate:

```text
tenantId
actorId
resourceId
eventType
occurredAt
correlationId
```

Do not infer tenant from a mutable global worker variable.

Do not emit tenant A events to tenant B listeners.

---

# 36. WebSocket / Real-Time Isolation

If the repository uses WebSockets or real-time events:

```text
Connection
  ↓
Authenticate
  ↓
Resolve tenant membership
  ↓
Join tenant-scoped channel
```

A tenant event must only reach authorized tenant connections.

Test:

```text
Tenant A connection
Tenant B event
→ Tenant A receives NOTHING
```

and:

```text
Tenant B connection
Tenant B event
→ Tenant B receives event
```

Do not add WebSockets if the current product does not need them.

---

# 37. Audit Logging

Tenant-sensitive actions must produce auditable records.

At minimum inspect:

```text
tenantId
actorId
action
resourceType
resourceId
timestamp
result
correlationId
request metadata where safe
```

Never log:

```text
passwords
private keys
wallet secrets
refresh tokens
API keys
sensitive evidence payloads
```

Audit records must themselves be tenant-isolated where they contain tenant-private activity.

---

# 38. Blockchain + Multi-Tenancy Boundary

Monad blockchain state is not automatically tenant-isolated.

The blockchain is a shared protocol layer.

Therefore distinguish:

```text
On-chain identity / work proof
        +
Off-chain tenant ownership / workspace context
```

Do not pretend that `tenantId` is on-chain merely because it exists in Prisma.

If tenant identity must become part of the on-chain protocol, this requires an explicit protocol design and contract change.

Do not modify the smart contract simply to satisfy a database tenant migration.

First determine whether the product's actual tenant boundary requires:

```text
off-chain tenant ownership only
```

or:

```text
on-chain tenant namespace
```

If contract changes are required:

1. inspect contract dependencies;
2. run GitNexus impact;
3. run Graphify path/explain;
4. document protocol compatibility implications;
5. create a deliberate contract version;
6. deploy to the correct network;
7. update centralized ABI/address configuration;
8. run real testnet verification.

Never fake a contract upgrade.

---

# 39. TrustGraph Tenant Rules

A tenant may own or manage its own:

```text
developer submissions
reviewer/verifier assignments
work metadata
off-chain evidence metadata
audit records
tenant configuration
```

But public proof verification must remain consistent with the protocol's actual public/private boundary.

Do not make an on-chain public proof falsely appear private.

Do not expose tenant-private off-chain evidence merely because its hash is public.

Separate:

```text
public proof metadata
```

from:

```text
tenant-private operational metadata
```

---

# 40. Public Passport Boundary

The public passport route must be audited carefully.

Determine which data is:

```text
PUBLIC
TENANT-RESTRICTED
USER-RESTRICTED
VERIFIER-RESTRICTED
SYSTEM-ONLY
```

A public wallet lookup must not accidentally reveal:

- private tenant names
- private reviewer notes
- private evidence
- internal audit information
- private membership data

Public on-chain facts may remain public.

Off-chain tenant data must follow authorization rules.

---

# 41. Frontend Tenant Architecture

The frontend must have one authoritative tenant context.

Do not allow individual pages to invent their own tenant state.

Conceptually:

```text
App
 ↓
Authenticated User
 ↓
Tenant Context
 ↓
Routes
 ↓
Pages
 ↓
Tenant-aware hooks
 ↓
REST API
```

Reusable components should consume the tenant context rather than independently parsing tenant IDs.

---

# 42. Tenant UI Requirements

If multi-tenant users exist, the UI must make current tenant context obvious.

Display:

```text
Current Tenant
```

where relevant.

Tenant switching must be explicit.

Dangerous mutations should clearly indicate the tenant context.

Examples:

```text
Verify work in "Acme Labs"
Revoke proof in "Acme Labs"
Invite member to "Acme Labs"
```

Do not rely on color alone.

---

# 43. Form and Request Rules

Never send tenant IDs merely because the UI has them.

For example, avoid:

```ts
body: {
  tenantId: selectedTenantId,
  ...
}
```

as the security mechanism.

If a tenant identifier is included for resource routing, the backend must still validate membership.

---

# 44. Backend Authorization

Authorization must be evaluated against:

```text
authenticated user
+
tenant membership
+
role
+
permission
+
resource tenant
+
resource state
```

Conceptually:

```text
Can actor X
perform action Y
on resource Z
inside tenant T
while resource is in state S?
```

All relevant dimensions must be enforced server-side.

---

# 45. Role and Permission Safety

Do not trust:

```text
role: "ADMIN"
```

from the frontend.

Do not trust:

```text
tenantId: "..."
```

from the frontend.

Do not trust hidden buttons.

A direct HTTP request must receive the same authorization decision as a UI action.

---

# 46. Input Validation

Validate:

- IDs
- UUIDs
- wallet addresses
- enum values
- URLs
- strings
- lengths
- pagination
- sorting
- filters
- tenant identifiers
- membership identifiers

Do not rely on Prisma exceptions as your validation layer.

---

# 47. API Error Contract

Use a consistent REST error structure already compatible with the repository.

At minimum distinguish:

```text
400 invalid input
401 unauthenticated
403 authenticated but unauthorized
404 resource unavailable
409 conflict
422 semantic validation failure where appropriate
429 rate limited
500 unexpected server error
503 dependency unavailable where appropriate
```

Do not leak stack traces to clients.

Do log diagnostic context safely.

---

# 48. Concurrency

Multi-tenancy does not remove concurrency risk.

Test:

```text
two users verify same submission
two admins modify same tenant setting
two users invite same email
two requests create same tenant resource
tenant switch while mutation is pending
```

Use appropriate:

- unique constraints
- transactions
- optimistic locking
- atomic updates
- idempotency

based on the actual business operation.

---

# 49. Idempotency

For important mutation APIs, determine whether retries are safe.

Test:

```text
Request
→ timeout
→ client retries
```

The resulting system must not create unintended duplicates.

Especially inspect:

```text
tenant creation
membership invitation
work submission
verification
revocation
audit/event emission
```

Blockchain operations require special care because an on-chain transaction cannot simply be duplicated blindly.

---

# 50. Transaction Boundaries

For every critical operation determine:

```text
What is inside the DB transaction?
What is outside?
What happens if the DB commits but external operation fails?
What happens if external operation succeeds but DB update fails?
```

Do not pretend DB transactions can roll back blockchain transactions.

Where blockchain and database state interact, use explicit state machines and reconciliation.

---

# 51. Blockchain Transaction State

Preserve explicit states:

```text
READY
WAITING_FOR_SIGNATURE
BROADCASTING
CONFIRMING
CONFIRMED
FAILED
```

Do not mark a proof verified solely because the wallet returned a hash.

Validate receipt status.

Then refresh authoritative state.

---

# 52. Evidence Hash Integrity

Evidence hashing must remain deterministic.

Never include:

```text
Date.now()
Math.random()
unstable object ordering
```

in canonical content.

The same canonical evidence must produce the same hash.

When tenant metadata is included in evidence hashing, document whether it is protocol-critical or operational-only.

Do not silently change existing hash semantics.

---

# 53. React Runtime Safety

For every page:

```text
render
loading
success
empty
error
unauthorized
wrong tenant
stale tenant
network error
```

must be considered.

The agent must never leave an undefined variable in a render path.

The `VerifyPage.tsx` `submissions` runtime error is an example of a release-blocking defect.

Run the route after changes, not just TypeScript compilation.

---

# 54. React Router

Existing React Router warnings should be classified.

If future flags can safely be enabled without behavior change, document and test them.

Do not blindly modify routing semantics during the tenant migration.

Tenant routing and authentication must be tested together.

---

# 55. No Error Suppression

Never solve errors with:

```ts
// @ts-ignore
// @ts-nocheck
```

or:

```ts
as any
```

unless a narrowly justified external-library boundary requires a typed adapter and the reason is documented.

Never:

```ts
catch {}
```

Never comment out failing tests.

Never delete a failing assertion to obtain green CI.

Fix the root cause.

---

# 56. Observability

Critical multi-tenant workflows require correlation.

Where the existing backend supports request IDs/correlation IDs, preserve and propagate them.

Logs must make it possible to answer:

```text
Which request?
Which user?
Which tenant?
Which resource?
Which operation?
What result?
What error?
```

without exposing secrets.

---

# 57. Security Audit

Perform explicit checks for:

```text
authentication bypass
authorization bypass
IDOR / BOLA
tenant ID tampering
role tampering
JWT manipulation
refresh-token abuse
CSRF where applicable
CORS misconfiguration
rate-limit bypass
SQL injection
unsafe Prisma raw SQL
XSS
open redirects
SSRF
unsafe URL handling
secret leakage
sensitive logs
file access across tenants
cache poisoning
cross-tenant event delivery
cross-tenant exports
```

Do not add a security dependency without understanding the current auth stack.

---

# 58. CORS

CORS must be explicitly configured for trusted frontend origins.

Do not use:

```text
*
```

for credentialed production requests.

Tenant identity must never be derived from the CORS origin alone.

CORS is not authorization.

---

# 59. Database Reality Audit

For every tenant-scoped model verify:

```text
tenant ownership
foreign keys
unique constraints
indexes
nullable fields
cascade rules
delete rules
audit fields
historical preservation
query patterns
```

Ask:

```text
Can invalid tenant data be inserted?
Can duplicate tenant data be inserted?
Can orphan records exist?
Can one tenant reference another tenant's resource?
Can historical tenant data be modified?
```

---

# 60. Testing Strategy

Testing must cover:

## Unit

- tenant context resolution
- permission checks
- domain rules
- canonicalization
- validators
- tenant-aware repository helpers

## Integration

- API + database
- auth + membership
- tenant switching
- repository isolation
- transactions
- audit records

## API

Test every tenant-scoped endpoint directly.

Do not rely only on frontend tests.

## E2E

At minimum:

```text
Create Tenant A
Create Tenant B

Create User U
Add U to Tenant A
Add U to Tenant B with different role

Create resource in Tenant A
Verify resource appears to Tenant A
Verify resource does not appear to Tenant B

Attempt direct cross-tenant access
Expect DENIED

Switch tenant
Expect cache/data refresh

Perform privileged operation
Expect correct authorization

Audit operation
Expect tenant-aware audit record
```

## Regression

Re-run existing TrustGraph lifecycle:

```text
Submit
→ Pending
→ Verify
→ Public Passport
→ Proof Detail
→ Revoke
→ Re-verify
```

---

# 61. Multi-Tenant Adversarial Test Matrix

The agent MUST attempt:

```text
Tenant A → Tenant B resource
Tenant B → Tenant A resource
User removed from tenant → old resource
User role downgraded → privileged endpoint
Forged tenantId
Forged membershipId
Forged userId
Foreign resource ID
Foreign audit ID
Foreign export request
Foreign report request
Stale tenant cache
Concurrent tenant switch
Retry after timeout
Duplicate mutation
Expired session
Revoked session
Wrong wallet
Wrong network
```

Every failure must be classified:

```text
BLOCKED
FIXED
NOT APPLICABLE
NOT VERIFIED
```

---

# 62. Feature Completion Standard

A feature is complete only when:

```text
Business requirement
    ↓
Actor
    ↓
Permission
    ↓
UI
    ↓
API
    ↓
Authentication
    ↓
Authorization
    ↓
Validation
    ↓
Service
    ↓
Domain rule
    ↓
Transaction
    ↓
Database
    ↓
Side effects
    ↓
Audit
    ↓
Response
    ↓
Frontend state
    ↓
Real user-visible result
    ↓
Tests
```

For multi-tenant features add:

```text
Tenant context
    ↓
Tenant authorization
    ↓
Tenant-scoped persistence
    ↓
Tenant-isolated cache
    ↓
Tenant-isolated events/jobs
```

If any required layer is missing:

```text
PARTIALLY IMPLEMENTED
```

or:

```text
NOT VERIFIED
```

Never claim complete.

---

# 63. No False 100%

Never use:

```text
looks complete
mostly complete
should work
probably works
```

Use exact statuses:

```text
VERIFIED COMPLETE
PARTIALLY IMPLEMENTED
FRONTEND ONLY
BACKEND ONLY
DATABASE ONLY
MOCK
SIMULATED
HARDCODED
BROKEN
ORPHANED
UNREACHABLE
SECURITY INCOMPLETE
WORKFLOW INCOMPLETE
TEST INCOMPLETE
NOT VERIFIED
MISSING
```

---

# 64. Evidence Standard

Every important finding must identify evidence.

Use:

```text
FILE:
SYMBOL:
ROUTE:
COMPONENT:
ENDPOINT:
DATABASE MODEL:
MIGRATION:
TEST:
OBSERVED BEHAVIOR:
EXPECTED BEHAVIOR:
IMPACT:
```

Never claim a defect without evidence.

Never claim a feature is complete without evidence.

---

# 65. Severity

Use:

### P0 — Critical

Examples:

```text
cross-tenant data exposure
authentication bypass
catastrophic data corruption
irreversible migration failure
production-wide outage
```

### P1 — High

Examples:

```text
critical workflow broken
authorization bypass
major tenant isolation flaw
duplicate mutation
critical verification failure
```

### P2 — Medium

Examples:

```text
important edge case
partial workflow
recoverable reliability issue
moderate UX failure
```

### P3 — Low

Examples:

```text
minor UX issue
maintainability issue
non-blocking warning
```

---

# 66. Graph + Impact Loop

Every meaningful change follows:

```text
DISCOVER
  ↓
Graphify query
  ↓
GitNexus context
  ↓
GitNexus impact
  ↓
INSPECT
  ↓
EDIT
  ↓
TYPECHECK
  ↓
UNIT / INTEGRATION TEST
  ↓
Graphify update
  ↓
RUN REGRESSION
  ↓
GitNexus detect-changes
  ↓
REVIEW DIFF
```

Never skip impact analysis because a change "looks small".

---

# 67. Change Discipline

Make small atomic changes.

Do not rewrite large files unnecessarily.

Before editing:

```text
read file
inspect imports
inspect exports
inspect callers
inspect related tests
inspect schema
inspect migrations
inspect Graphify relationships
inspect GitNexus impact
```

Then edit.

After editing:

```text
typecheck
lint
tests
Graphify update
runtime verification
```

---

# 68. Do Not Mix Refactors With Feature Work

Avoid combining:

```text
multi-tenant migration
+
unrelated architecture rewrite
+
UI redesign
+
dependency migration
```

in one change set.

If a refactor is required to make tenant isolation safe, explain why it is required.

Otherwise defer it.

---

# 69. Database Migration Execution Protocol

Before schema modification:

```text
1. Inspect schema.prisma.
2. Inspect existing migrations.
3. Inspect actual database assumptions.
4. Search all model consumers.
5. Run GitNexus impact.
6. Run Graphify queries.
7. Write migration plan.
8. Modify schema.
9. Create NEW migration.
10. Review generated SQL.
11. Test against production-like data.
12. Run application tests.
13. Run tenant isolation tests.
```

---

# 70. Migration Validation

After migration verify:

```text
record counts
tenant counts
membership counts
null tenant IDs
orphan memberships
orphan resources
duplicate composite keys
foreign key integrity
indexes
query performance
application startup
API behavior
existing TrustGraph workflows
```

No silent data loss.

---

# 71. Seed Data Rules

Seeds must create legitimate domain state.

Do not use seed data as production simulation.

If development seeds exist:

```text
clearly development-only
deterministic
documented
repeatable
```

Never make demo seed data appear as live Monad proof.

---

# 72. Environment Configuration

Never hardcode secrets.

Inspect:

```text
DATABASE_URL
JWT configuration
refresh token configuration
RPC URL
contract address
chain ID
explorer URL
frontend API URL
CORS origins
```

Use existing configuration conventions.

Do not create duplicate configuration sources.

---

# 73. Contract Configuration

Contract address, chain configuration, and ABI must remain centralized according to the existing architecture.

Do not scatter:

```text
0x...
10143
RPC URLs
explorer URLs
```

through React components.

If the repository already has:

```text
src/lib/contract/config.ts
src/lib/blockchain/chain.ts
src/lib/contract/abi.ts
```

continue using those centralized locations.

---

# 74. Public vs Tenant-Private Blockchain Data

Explicitly classify every field displayed by:

```text
Passport
Proof detail
Verify dashboard
Trust graph
Search
```

before exposing it.

A blockchain transaction hash may be public while internal review notes are not.

Do not equate "on-chain" with "everything about the tenant is public".

---

# 75. Performance

After tenantization inspect:

```text
N+1 queries
tenant-scoped indexes
pagination
large tenant datasets
large public datasets
search
reports
audit logs
graph loading
```

Do not load all tenant records into memory.

Do not remove pagination simply to simplify implementation.

---

# 76. Large Tenant Test

Create production-like test data representing:

```text
1 tenant
10 tenants
100 tenants
large user membership counts
large work counts
large audit history
```

The exact scale should reflect realistic expected use.

Verify queries remain bounded and tenant-specific.

---

# 77. Backup and Recovery

The agent must document how tenant migration can be recovered if deployment fails.

At minimum identify:

```text
database backup strategy
migration recovery strategy
application rollback
data validation
post-migration reconciliation
```

Do not claim rollback safety without evidence.

---

# 78. Documentation

When tenantization is complete, update only relevant documentation.

Document:

```text
tenant model
membership model
tenant resolution
authorization
database migration
API behavior
tenant switching
cache isolation
background job behavior
public/private boundary
deployment sequence
testing strategy
```

Do not create duplicate documentation that conflicts with this file.

---

# 79. Mandatory Current Phase Execution Plan

The current agent must execute the following phases in order.

## Phase A — Baseline

```text
git status
git branch
git diff
package manifests
Prisma schema
migrations
frontend routes
backend routes
auth
contract configuration
tests
```

Do not modify yet.

## Phase B — Code Graph

```text
GitNexus context
Graphify query
Graphify report
critical execution paths
```

## Phase C — Fix Current Runtime Blocker

Resolve:

```text
VerifyPage.tsx
ReferenceError: submissions is not defined
```

Prove:

```text
/verify renders
authorized verifier sees real data
unauthorized verifier receives correct restriction
```

## Phase D — Tenant Architecture Design

Produce an evidence-based map:

```text
User
 ↓
Membership
 ↓
Tenant
 ↓
Tenant-scoped resources
```

Classify every Prisma model.

## Phase E — Migration Plan

Document:

```text
new models
changed models
new relationships
new indexes
new constraints
data backfill
compatibility strategy
```

Do not edit old migrations.

## Phase F — Implementation

Implement:

```text
tenant model
membership model
tenant context
authorization
tenant-aware services
tenant-aware repositories
tenant-aware queries
tenant-aware cache keys
tenant-aware audit
tenant-aware jobs/events where present
tenant-aware UI
tenant switching where required
```

## Phase G — Data Migration

Run the new migration against realistic data.

Verify:

```text
no records lost
no records left unowned
no cross-tenant links
no duplicate constraint failures
```

## Phase H — Adversarial Testing

Attack the system from:

```text
UI
direct API
database access patterns
tenant switching
role manipulation
resource ID manipulation
retry
concurrency
cache
jobs
events
```

## Phase I — Full Regression

Run:

```text
frontend tests
backend tests
API tests
Prisma tests
tenant isolation tests
TrustGraph lifecycle tests
production build
```

## Phase J — Graph Validation

Run:

```bash
npm run graphify:update
node .gitnexus/run.cjs detect-changes --scope all --repo .
```

Then inspect changed critical paths.

---

# 80. Required Acceptance Matrix

The final result must provide a table equivalent to:

| Area | Requirement | Evidence | Result |
|---|---|---|---|
| Runtime | VerifyPage no longer crashes | test/runtime evidence | PASS/FAIL |
| Auth | user identity verified server-side | code/test | PASS/FAIL |
| Tenant | tenant context authoritative | code/test | PASS/FAIL |
| Isolation | cross-tenant reads blocked | integration test | PASS/FAIL |
| Isolation | cross-tenant writes blocked | integration test | PASS/FAIL |
| Roles | tenant role enforced server-side | API test | PASS/FAIL |
| DB | all tenant models scoped correctly | schema/migration | PASS/FAIL |
| Migration | existing data preserved | migration test | PASS/FAIL |
| Cache | tenant context included | code/test | PASS/FAIL |
| Jobs | tenant context preserved | code/test | PASS/FAIL |
| Events | tenant isolation preserved | test | PASS/FAIL |
| Audit | tenant-aware audit trail | test | PASS/FAIL |
| Public | public proof boundary correct | E2E | PASS/FAIL |
| Blockchain | real Monad state preserved | E2E | PASS/FAIL |
| Tests | regression suite passes | CI/local evidence | PASS/FAIL |
| Graphify | graph synchronized | command output | PASS/FAIL |
| GitNexus | impact/change analysis complete | command output | PASS/FAIL |

---

# 81. Final Release Gate

The agent MUST NOT declare the multi-tenant migration complete until all applicable gates pass.

```text
[ ] VerifyPage runtime blocker fixed
[ ] Existing routes still work
[ ] Existing TrustGraph lifecycle still works
[ ] Authentication works
[ ] Tenant context is authoritative
[ ] Membership authorization works
[ ] Cross-tenant read denied
[ ] Cross-tenant write denied
[ ] Cross-tenant update denied
[ ] Cross-tenant delete denied
[ ] Tenant-scoped repositories verified
[ ] Tenant-scoped indexes verified
[ ] Composite constraints verified
[ ] Migration created as a NEW migration
[ ] Old migrations untouched
[ ] Existing data preserved
[ ] No orphan records
[ ] No tenantless records where prohibited
[ ] Cache isolated
[ ] Jobs isolated
[ ] Events isolated
[ ] Audit isolated
[ ] Public/private boundary verified
[ ] Direct API attack tests pass
[ ] Concurrency tests pass
[ ] Retry tests pass
[ ] Production build passes
[ ] No mock/simulation in production path
[ ] No Docker dependency
[ ] Graphify updated
[ ] GitNexus impact reviewed
[ ] GitNexus detect-changes reviewed
```

If one critical gate fails:

```text
RELEASE BLOCKED
```

---

# 82. Final Report Format

The agent must finish with:

## 1. Executive Summary

## 2. Current Runtime Defects

## 3. Architecture Reality

## 4. Single-Tenant → Multi-Tenant Design

## 5. Tenant Boundary Map

## 6. Prisma Schema Changes

## 7. Migration Plan

## 8. Authentication / Tenant Context

## 9. Authorization / RBAC

## 10. API Changes

## 11. Repository Changes

## 12. Frontend Changes

## 13. Cache Changes

## 14. Job / Event Changes

## 15. Audit Changes

## 16. Blockchain Boundary

## 17. Security Findings

## 18. Cross-Tenant Attack Results

## 19. Tests Executed

## 20. Graphify Findings

## 21. GitNexus Findings

## 22. Remaining Risks

## 23. Files Changed

## 24. Database Migration Created

## 25. Final Release Decision

Use one:

```text
RELEASE APPROVED
```

or:

```text
RELEASE APPROVED WITH CONDITIONS
```

or:

```text
RELEASE BLOCKED
```

Never use "100% complete" without executable evidence.

---

# 83. Mandatory Working Style

The agent must:

```text
Inspect first.
Understand second.
Impact-analyze third.
Plan fourth.
Edit fifth.
Test sixth.
Graph-sync seventh.
Regression-test eighth.
Change-analyze ninth.
Report tenth.
```

The agent must not:

```text
guess
fake
simulate
hide
silence
rewrite unnecessarily
edit old migrations
trust UI-only authorization
trust client-supplied tenant IDs
declare success from compilation alone
```

---

# 84. Definition of Production Ready

Production-ready means:

```text
Real functionality
+
Real persistence
+
Real authorization
+
Real tenant isolation
+
Real error handling
+
Real auditability
+
Real concurrency behavior
+
Real retry behavior
+
Real tests
+
Real deployment compatibility
+
Real operational observability
```

A green build alone is not production readiness.

A passing unit test alone is not production readiness.

A working screenshot alone is not production readiness.

---

# 85. Final Commandment

```text
BUILD LESS.
UNDERSTAND MORE.
ISOLATE TENANTS.
VERIFY EVERYTHING.
TRUST EVIDENCE.
```

The agent's goal is not to make the repository look complete.

The goal is to make the system actually correct.
