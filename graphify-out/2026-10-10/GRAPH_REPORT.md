# Graph Report - trust-graph  (2026-10-10)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 933 nodes · 1225 edges · 71 communities (64 shown, 7 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4bea606c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useTrustGraph.ts
- TrustGraphRegistry
- config.ts
- para CLI — behavioral notes
- para CLI —— 行为说明
- Frontend Design (Distinctive, Production-Grade)
- Envio Cloud — workflow recipes
- TrustGraphRegistryComprehensiveTest
- Profile form
- ProofOfWorkRegistry
- compilerOptions
- concepts/SKILL.md
- concepts/SKILL.zh.md
- TrustGraph
- scaffold/SKILL.md
- scaffold/SKILL.zh.md
- runTests
- package.json
- addresses/SKILL.md
- addresses/SKILL.zh.md
- devDependencies
- 6. Recommended Changes (Phase 1 & Onward)
- gas/SKILL.md
- gas/SKILL.zh.md
- scripts
- Proof-of-Work Passport — Project Audit (Phase 1)
- Agent steps
- Writing tests
- Skills
- WorkService
- Proof-of-Work Passport & TrustGraph on Monad
- Setting up e2e
- deploy.cjs
- Work
- dependencies
- Verify the playground
- Running a bug bash
- why-monad/SKILL.md
- why-monad/SKILL.zh.md
- main.tsx
- Create a verification skill
- compilerOptions
- Debugging a failing run
- Exploring without a test
- Running tests
- 10. ROUTING & SURFACE SPECIFICATIONS
- 1. NON-NEGOTIABLE PRODUCT INVARIANTS (THE 5 CARDINAL LAWS)
- Driving the app over MCP
- vite.config.ts
- 13. REPOSITORY AUDITING & AGENT EXECUTION PROTOCOLS
- e2e: agentic end-to-end tests in TypeScript
- Monad Tooling & Infrastructure
- Monad 工具与基础设施
- Status
- 0. SYSTEM IDENTITY, DIRECTIVE HIERARCHY & META-INSTRUCTION
- 2. ACTOR ONTOLOGY & ACCESS CONTROL MATRIX
- 5. SMART CONTRACT SPECIFICATION (`ProofOfWorkRegistry.sol`)
- 6. CRYPTOGRAPHIC EVIDENCE & HASHING ARCHITECTURE
- graphify
- WorkType
- e2e
- 12. DESIGN SYSTEM & VISUAL CRAFT SPECIFICATION
- 4. MATHEMATICAL STATE MACHINE SPECIFICATION
- 8. WALLET HANDLING & NETWORK PROTOCOL
- 9. TRANSACTION UX & ERROR HANDLING PROTOCOL
- vite-env.d.ts

## God Nodes (most connected - your core abstractions)
1. `ProofOfWorkRegistry` - 33 edges
2. `TrustGraphRegistry` - 31 edges
3. `TrustGraphRegistryComprehensiveTest` - 25 edges
4. `Proof-of-Work Passport & TrustGraph on Monad` - 19 edges
5. `compilerOptions` - 18 edges
6. `shortenAddress()` - 15 edges
7. `scripts` - 14 edges
8. `VerificationDetailPage()` - 13 edges
9. `react` - 13 edges
10. `Attestation` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Page 3 — Trust Graph (`/graph/:address`)` --references--> `Evidence`  [INFERRED]
  README.md → src/types/index.ts
- `6. Recommended Changes (Phase 1 & Onward)` --references--> `WorkStatus`  [INFERRED]
  PROJECT_AUDIT.md → src/types/index.ts
- `6. Recommended Changes (Phase 1 & Onward)` --references--> `WorkType`  [INFERRED]
  PROJECT_AUDIT.md → src/types/index.ts
- `5. Existing Problems` --references--> `DeveloperPassport`  [INFERRED]
  PROJECT_AUDIT.md → src/types/index.ts
- `5. Existing Problems` --references--> `WorkRecord`  [INFERRED]
  PROJECT_AUDIT.md → src/types/index.ts

## Import Cycles
- None detected.

## Communities (71 total, 7 thin omitted)

### Community 0 - "useTrustGraph.ts"
Cohesion: 0.10
Nodes (49): Presentation & Business Logic Coupling, lucide-react, react, react-router-dom, wagmi, App(), AppLayout(), Footer() (+41 more)

### Community 1 - "TrustGraphRegistry"
Cohesion: 0.05
Nodes (36): TrustGraphRegistry, ValidityStatus, EXPIRED, INVALID_ISSUER, NOT_FOUND, REVOKED, VALID, AttestationIssued (+28 more)

### Community 2 - "config.ts"
Cohesion: 0.08
Nodes (26): MOCK_ATTESTATIONS, MOCK_ISSUERS, MOCK_PASSPORTS, MOCK_VERIFIERS, MOCK_WORKS, getExplorerAddressUrl(), getExplorerTxUrl(), MONAD_TESTNET_CHAIN_ID (+18 more)

### Community 3 - "para CLI — behavioral notes"
Cohesion: 0.05
Nodes (37): API key management, Configuration resolution order, Environments: beta vs prod, Exit codes, Install and auth — never do these for the user, IP allowlist gotcha, Org / project switching, para CLI — behavioral notes (+29 more)

### Community 4 - "para CLI —— 行为说明"
Cohesion: 0.05
Nodes (37): API Key 管理, IP 白名单坑点, para CLI —— 行为说明, `para create` 是有意排除的, `para doctor` —— 诊断，每次改动接线后都跑, `para init` —— 为团队 pin 住项目, `para keys config` —— 安全、品牌、Ramps、Webhook, 安装与认证 —— 永远不要替用户做这些事 (+29 more)

### Community 5 - "Frontend Design (Distinctive, Production-Grade)"
Cohesion: 0.07
Nodes (29): 10. Questions to Ask (If Needed), 1. Core Design Mandate, 1. Design Direction Summary, 1. Purpose, 2. Design Feasibility & Impact Index (DFII), 2. Design System Snapshot, 2. Tone (Choose One Dominant Direction), 3. Differentiation Anchor (+21 more)

### Community 6 - "Envio Cloud — workflow recipes"
Cohesion: 0.07
Nodes (26): envio-cloud — behavioral notes, Environment variables, Exit codes, GraphQL endpoint — what the frontend talks to, Indexer deletion is irreversible, Install and auth — never do these for the user, IP allowlist — order matters, Allowlist an IP (+18 more)

### Community 7 - "TrustGraphRegistryComprehensiveTest"
Cohesion: 0.07
Nodes (14): Actor, TrustGraphRegistryComprehensiveTest, attacker, attackerActor, CLAIM_CHALLENGE, CLAIM_CONTRACT_DEPLOYED, developer, developerActor (+6 more)

### Community 8 - "Profile form"
Cohesion: 0.08
Nodes (22): Charters, Driving it with e2e, Gotchas, How to get to it (user POV), Profile form, Proof, Sub-features, Charters (+14 more)

### Community 9 - "ProofOfWorkRegistry"
Cohesion: 0.09
Nodes (17): ProofOfWorkRegistry, OwnershipTransferred, VerifierApproved, VerifierRemoved, WorkRejected, WorkRevoked, WorkSubmitted, WorkVerified (+9 more)

### Community 10 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module, moduleResolution (+12 more)

### Community 11 - "concepts/SKILL.md"
Cohesion: 0.10
Nodes (12): Asynchronous Execution, Block States, EIP-7702 (Delegated EOAs), Execution Events and Consensus Events, Parallel Execution, 1. Geth-Compatible WebSocket Events, 2. Monad Extended WebSocket Events, 3. Execution Events SDK (C/C++/Rust) (+4 more)

### Community 12 - "concepts/SKILL.zh.md"
Cohesion: 0.10
Nodes (12): 异步执行, 区块状态, EIP-7702（委托 EOA）, 执行事件和共识事件, 并行执行, 1. Geth 兼容 WebSocket 事件, 2. Monad 扩展 WebSocket 事件, 3. 执行事件 SDK（C/C++/Rust） (+4 more)

### Community 13 - "TrustGraph"
Cohesion: 0.11
Nodes (18): 1. Product Model, 2. Core User Roles, 3. Supported Claim Types, 4. Four Primary MVP Pages, 5. Smart Contract Architecture, 6. Testing & Verification, 7. Demo Personas, Core Functions: (+10 more)

### Community 14 - "scaffold/SKILL.md"
Cohesion: 0.12
Nodes (16): Checklist, Decide what to put onchain, Don't try to build smart contracts from scratch, Known gotchas — apply up front, Manual Verification (Fallback Only), Monskills metadata, Next.js default tsconfig target is too low for viem/wagmi, Parameters (+8 more)

### Community 15 - "scaffold/SKILL.zh.md"
Cohesion: 0.12
Nodes (16): Monskills metadata, Next.js 默认 tsconfig target 过低，无法使用 BigInt, 决定哪些内容放在链上, 参数说明, 善用 OpenZeppelin, 在前端使用 Wagmi, 尽可能使用 useSendTransactionSync, 已知坑点 — 提前处理 (+8 more)

### Community 16 - "runTests"
Cohesion: 0.21
Nodes (6): AttestationRecord, ClaimType, computeSha256Node(), runTests(), TrustGraphEngine, ValidityStatus

### Community 17 - "package.json"
Cohesion: 0.12
Nodes (15): name, private, type, version, autoprefixer, clsx, hardhat, @nomicfoundation/hardhat-toolbox (+7 more)

### Community 18 - "addresses/SKILL.md"
Cohesion: 0.13
Nodes (14): AI & Agent Standards, Bridged Assets BTC-related (on Monad mainnet), Bridged Assets Dollar-related (on Monad mainnet), Bridged Assets ETH-related (on Monad mainnet), Bridged Assets - Others (on Monad mainnet), Canonical contracts (on Monad mainnet), ERC-8004 (same addresses for Monad mainnet and testnet), How to verify if a smart contract has code on a network. (+6 more)

### Community 19 - "addresses/SKILL.zh.md"
Cohesion: 0.13
Nodes (14): AI 与代理标准, ERC-8004（Monad 主网和测试网地址相同）, Monad 主网, Monad 测试网, 代币列表仓库, 其他区块链上的 MON, 协议仓库, 原生发行资产（Monad 主网） (+6 more)

### Community 20 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, autoprefixer, e2e, @e2e-dev/web, hardhat, @nomicfoundation/hardhat-toolbox, postcss, solc (+7 more)

### Community 21 - "6. Recommended Changes (Phase 1 & Onward)"
Cohesion: 0.29
Nodes (14): 5.4 Access Control Constraints, approveVerifier(), isVerifier(), removeVerifier(), transferOwnership(), onlyOwner(), 1. Current State, 5. Existing Problems (+6 more)

### Community 22 - "gas/SKILL.md"
Cohesion: 0.14
Nodes (13): Always Set Explicit Gas Limits for Known Costs, Base Fee Controller, Block and Transaction Limits, Cold State Access is Much More Expensive, Developer Guidelines, Displaying Gas Costs to Users, EIP-1559 Transaction Pricing, Gas Estimation in Frontend Code (+5 more)

### Community 23 - "gas/SKILL.zh.md"
Cohesion: 0.14
Nodes (13): EIP-1559 交易定价, 交易排序, 冷状态访问价格大幅提高, 前端代码中的 Gas 估算, 区块和交易限制, 向用户显示 Gas 费用, 基础费用控制器, 对已知成本始终设置明确的 Gas 上限 (+5 more)

### Community 24 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, compile, deploy, dev, graphify, graphify:query, graphify:update (+6 more)

### Community 25 - "Proof-of-Work Passport — Project Audit (Phase 1)"
Cohesion: 0.14
Nodes (13): 2. Tech Stack, 3. Architecture, 4.1 Existing Chain Configuration, 4.2 Existing Wallet Configuration, 4.3 Existing Contract (`ProofOfWorkRegistry.sol`), 4.4 Existing ABI Handling, 4. Blockchain, 7. Missing Components for Full MVP (+5 more)

### Community 26 - "Agent steps"
Cohesion: 0.15
Nodes (13): act: one goal, Agent steps, assert, waitFor, extract: one question, Beyond the built-in agent, Budgets and cost, Choose an agent, Configure a model, In CI (+5 more)

### Community 27 - "Writing tests"
Cohesion: 0.15
Nodes (13): A complete file, Actions, app, expect, Fixtures, Habits, Locators, Reads (+5 more)

### Community 28 - "Skills"
Cohesion: 0.15
Nodes (12): [Addresses](/addresses/SKILL.md), [Concepts](/concepts/SKILL.md), Feedback, [Gas](/gas/SKILL.md), [Indexer](/indexer/SKILL.md), [Scaffold](/scaffold/SKILL.md), Skills, [Tooling & Infra](/tooling-and-infra/SKILL.md) (+4 more)

### Community 29 - "WorkService"
Cohesion: 0.26
Nodes (4): WorkService, DeveloperPassport, VerifierProfile, WorkRecord

### Community 30 - "Proof-of-Work Passport & TrustGraph on Monad"
Cohesion: 0.17
Nodes (11): 11.1 The Revocation Principles, 11. REVOCATION & HISTORICAL PROVENANCE, 14. DEFINITION OF DONE (THE 20-STEP END-TO-END VERIFICATION RUNBOOK), 15. FINAL PRODUCT PHILOSOPHY & TEST BENCH, 16. SUMMARY COMMANDMENT, 3.1 Type Specification Matrix, 3. DOMAIN TAXONOMY & SUPPORTED WORK TYPES, 7.1 Separation of Concerns Invariants (+3 more)

### Community 31 - "Setting up e2e"
Cohesion: 0.18
Nodes (11): Done when, Environment variables the runner reads, Existing MCP registration, Let the runner start the app, Mobile targets, Requirements, Scaffold, Setting up e2e (+3 more)

### Community 32 - "deploy.cjs"
Cohesion: 0.18
Nodes (9): solc, viem, { createWalletClient, createPublicClient, http }, { defineChain }, fs, monadTestnet, path, { privateKeyToAccount } (+1 more)

### Community 33 - "Work"
Cohesion: 0.20
Nodes (10): Work, createdAt, evidenceHash, metadataUri, status, verifiedAt, verifier, worker (+2 more)

### Community 34 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, clsx, lucide-react, react, react-dom, react-router-dom, tailwind-merge, @tanstack/react-query (+2 more)

### Community 35 - "Verify the playground"
Cohesion: 0.22
Nodes (8): Bug bash, Cleanup, Doctor, Drive, Evidence, Helpers, Launch, Verify the playground

### Community 36 - "Running a bug bash"
Cohesion: 0.22
Nodes (9): 1. Prepare, 2. Plan charters, 3. Fan out, 4. Merge, 5. Triage, 6. Verify, 7. Report, Rules (+1 more)

### Community 37 - "why-monad/SKILL.md"
Cohesion: 0.22
Nodes (8): Ethereum compatible, Extremely low gas cost, Fast block production and finality on Monad, High transaction speed, Higher per transaction gas limit and higher per block gas limit, Higher smart contract size limit on Monad, Huge ecosystem of tooling and infrastructure, Monad supports eth_sendRawTransactionSync

### Community 38 - "why-monad/SKILL.zh.md"
Cohesion: 0.22
Nodes (8): Monad 上更高的智能合约大小限制, Monad 上的快速出块和最终确认, Monad 支持 eth_sendRawTransactionSync, 兼容以太坊, 庞大的工具和基础设施生态系统, 更高的单笔交易 Gas 限制和更高的单区块 Gas 限制, 极低的 Gas 成本, 高交易速度

### Community 39 - "main.tsx"
Cohesion: 0.25
Nodes (6): react-dom, @tanstack/react-query, config, Register, wagmi, queryClient

### Community 40 - "Create a verification skill"
Cohesion: 0.25
Nodes (7): 1. Interview the repo, not the user, 2. Generate the skill, 3. Seed the feature map, 4. Prove the generated skill before handing it over, 5. Hand over, Create a verification skill, Rules

### Community 41 - "compilerOptions"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 42 - "Debugging a failing run"
Cohesion: 0.29
Nodes (6): Debugging a failing run, Error codes, Flaky tests, Is it the app?, Read the failure, Tools

### Community 43 - "Exploring without a test"
Cohesion: 0.29
Nodes (6): Exploring without a test, Flags, Reading the result, Start signed in, What a run does, When it does not fit

### Community 44 - "Running tests"
Cohesion: 0.29
Nodes (6): Commands, Continuous integration, Exit codes, Output, Running tests, The replay cache

### Community 45 - "10. ROUTING & SURFACE SPECIFICATIONS"
Cohesion: 0.33
Nodes (6): 10.1 `/` — Homepage, 10.2 `/passport/:address` — Developer Passport, 10.3 `/submit` — Submit Work, 10.4 `/verify` — Verifier Dashboard, 10.5 `/proof/:id` — Cryptographic Proof Detail Page, 10. ROUTING & SURFACE SPECIFICATIONS

### Community 46 - "1. NON-NEGOTIABLE PRODUCT INVARIANTS (THE 5 CARDINAL LAWS)"
Cohesion: 0.33
Nodes (6): 1. NON-NEGOTIABLE PRODUCT INVARIANTS (THE 5 CARDINAL LAWS), Invariant 1: Evidence Precedes Reputation (No Arbitrary Scores), Invariant 2: Clear Boundary Between Unverified Claim and Verified Proof, Invariant 3: Zero Blockchain State Hallucination (Anti-Simulation Rule), Invariant 4: Real EVM Transactions for Core Lifecycle Mutations, Invariant 5: Strict Bounded Context (Anti-Scope Creep)

### Community 47 - "Driving the app over MCP"
Cohesion: 0.33
Nodes (5): Driving the app over MCP, Rules, Setup, Tools, Workflow

### Community 48 - "vite.config.ts"
Cohesion: 0.33
Nodes (3): vite, @vitejs/plugin-react, configDirectory

### Community 49 - "13. REPOSITORY AUDITING & AGENT EXECUTION PROTOCOLS"
Cohesion: 0.40
Nodes (5): 13. REPOSITORY AUDITING & AGENT EXECUTION PROTOCOLS, Protocol A: Inspect Before Editing, Protocol B: Atomic Incremental Mutations, Protocol C: Zero Error Suppression (The Anti-Silence Rule), Protocol D: Centralized Deployment Configuration

### Community 51 - "e2e: agentic end-to-end tests in TypeScript"
Cohesion: 0.40
Nodes (5): e2e: agentic end-to-end tests in TypeScript, Feedback, Rules, Topics, Workflow

### Community 52 - "Monad Tooling & Infrastructure"
Cohesion: 0.40
Nodes (4): Categories, How to use this skill, Important notes, Monad Tooling & Infrastructure

### Community 53 - "Monad 工具与基础设施"
Cohesion: 0.40
Nodes (4): Monad 工具与基础设施, 如何使用此技能, 类别, 重要说明

### Community 54 - "Status"
Cohesion: 0.40
Nodes (5): Status, PENDING, REJECTED, REVOKED, VERIFIED

### Community 55 - "0. SYSTEM IDENTITY, DIRECTIVE HIERARCHY & META-INSTRUCTION"
Cohesion: 0.50
Nodes (4): 0.1 Autonomous Agent Persona & Operating Context, 0.2 The Foundational Axiom, 0.3 Precedence of Rules, 0. SYSTEM IDENTITY, DIRECTIVE HIERARCHY & META-INSTRUCTION

### Community 56 - "2. ACTOR ONTOLOGY & ACCESS CONTROL MATRIX"
Cohesion: 0.50
Nodes (4): 2.1 Developer (Subject), 2.2 Verifier (Authorized Issuer / Ecosystem Reviewer), 2.3 Public Viewer (Auditor / Hiring Manager / Ecosystem Partner), 2. ACTOR ONTOLOGY & ACCESS CONTROL MATRIX

### Community 57 - "5. SMART CONTRACT SPECIFICATION (`ProofOfWorkRegistry.sol`)"
Cohesion: 0.50
Nodes (4): 5.1 Storage Layout & Data Model, 5.2 Mandatory Contract Interface, 5.3 Mandatory Event Signatures, 5. SMART CONTRACT SPECIFICATION (`ProofOfWorkRegistry.sol`)

### Community 58 - "6. CRYPTOGRAPHIC EVIDENCE & HASHING ARCHITECTURE"
Cohesion: 0.50
Nodes (4): 6.1 The Evidence Pipeline, 6.2 Deterministic Canonical Normalization Protocol, 6.3 Security Guidelines for Evidence, 6. CRYPTOGRAPHIC EVIDENCE & HASHING ARCHITECTURE

### Community 59 - "graphify"
Cohesion: 0.50
Nodes (4): Agent Operational Rules, graphify, Graphify Artifacts, How to Run Graphify

### Community 60 - "WorkType"
Cohesion: 0.50
Nodes (4): WorkType, GITHUB_CONTRIBUTION, HACKATHON_PROJECT, SMART_CONTRACT

### Community 62 - "12. DESIGN SYSTEM & VISUAL CRAFT SPECIFICATION"
Cohesion: 0.67
Nodes (3): 12.1 Color Semantics, 12.2 Accessibility Invariants, 12. DESIGN SYSTEM & VISUAL CRAFT SPECIFICATION

### Community 63 - "4. MATHEMATICAL STATE MACHINE SPECIFICATION"
Cohesion: 0.67
Nodes (3): 4.1 State Definitions, 4.2 State Transition Invariant Table, 4. MATHEMATICAL STATE MACHINE SPECIFICATION

### Community 64 - "8. WALLET HANDLING & NETWORK PROTOCOL"
Cohesion: 0.67
Nodes (3): 8.1 Network Parameters (Monad Testnet), 8.2 Wallet State Engine, 8. WALLET HANDLING & NETWORK PROTOCOL

### Community 65 - "9. TRANSACTION UX & ERROR HANDLING PROTOCOL"
Cohesion: 0.67
Nodes (3): 9.1 Phase Descriptions & UI Requirements, 9.2 Error Recovery & Translation Matrix, 9. TRANSACTION UX & ERROR HANDLING PROTOCOL

## Knowledge Gaps
- **23 isolated node(s):** `EXPIRED`, `INVALID_ISSUER`, `NOT_FOUND`, `REVOKED`, `VALID` (+18 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 619 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Writing tests` connect `Writing tests` to `e2e/SKILL.md`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **What connects `EXPIRED`, `INVALID_ISSUER`, `NOT_FOUND` to the rest of the system?**
  _23 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useTrustGraph.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10187553282182438 - nodes in this community are weakly interconnected._
- **Why does `6. Recommended Changes (Phase 1 & Onward)` connect `6. Recommended Changes (Phase 1 & Onward)` to `useTrustGraph.ts`, `Proof-of-Work Passport — Project Audit (Phase 1)`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Should `TrustGraphRegistry` be split into smaller, more focused modules?**
  _Cohesion score 0.04625346901017576 - nodes in this community are weakly interconnected._
- **Why does `App()` connect `useTrustGraph.ts` to `Writing tests`, `main.tsx`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `config.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08350951374207188 - nodes in this community are weakly interconnected._