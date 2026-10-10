# Graph Report - trust-graph  (2026-10-10)

## Corpus Check
- 108 files · ~92,426 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1170 nodes · 1648 edges · 73 communities (63 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c569e01e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useWorkRegistry.ts
- TrustGraphRegistry
- trustGraphService.ts
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
- trustGraph.test.ts
- package.json
- addresses/SKILL.md
- addresses/SKILL.zh.md
- devDependencies
- ProofOfWorkRegistryComprehensiveTest
- gas/SKILL.md
- gas/SKILL.zh.md
- scripts
- index.ts
- Agent steps
- Writing tests
- Skills
- 82. Final Report Format
- AGENTS.md
- Setting up e2e
- deploy.cjs
- integration.test.ts
- dependencies
- Verify the playground
- Running a bug bash
- why-monad/SKILL.md
- why-monad/SKILL.zh.md
- 79. Mandatory Current Phase Execution Plan
- Create a verification skill
- compilerOptions
- Debugging a failing run
- Exploring without a test
- run
- Work
- 3. Absolute Rules
- Driving the app over MCP
- vite.config.ts
- 11. Graphify — Mandatory Graph-First Engineering
- e2e: agentic end-to-end tests in TypeScript
- Monad Tooling & Infrastructure
- Monad 工具与基础设施
- 60. Testing Strategy
- 6. Product Invariants
- 17. Tenant Data Classification
- 65. Severity
- Status
- 7. Existing Domain Actors
- WorkType
- e2e
- approveVerifier
- onlyVerifier
- 10. Mandatory Code Intelligence Workflow
- AGENTS.md — TrustGraph Autonomous Engineering System
- vite-env.d.ts
- 13. Multi-Tenant Migration — Primary Current Phase
- 1. Project Identity

## God Nodes (most connected - your core abstractions)
1. `ProofOfWorkRegistryComprehensiveTest` - 39 edges
2. `ProofOfWorkRegistry` - 37 edges
3. `trustGraphService` - 36 edges
4. `TrustGraphRegistry` - 34 edges
5. `TrustGraphRegistryComprehensiveTest` - 26 edges
6. `82. Final Report Format` - 26 edges
7. `compilerOptions` - 18 edges
8. `react` - 17 edges
9. `scripts` - 16 edges
10. `VerifyPage()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Page 3 — Trust Graph (`/graph/:address`)` --references--> `Evidence`  [INFERRED]
  README.md → src/types/index.ts
- `Doctor` --references--> `run()`  [INFERRED]
  .agents/skills/create-verification-skill/references/example/verify-playground/SKILL.md → test/integration.test.ts
- `Flags` --references--> `run()`  [INFERRED]
  .agents/skills/e2e/references/explore.md → test/integration.test.ts
- `Reading the result` --references--> `run()`  [INFERRED]
  .agents/skills/e2e/references/explore.md → test/integration.test.ts
- `1. Current State` --references--> `approveVerifier()`  [INFERRED]
  PROJECT_AUDIT.md → contracts/ProofOfWorkRegistry.sol

## Import Cycles
- None detected.

## Communities (73 total, 10 thin omitted)

### Community 0 - "useWorkRegistry.ts"
Cohesion: 0.06
Nodes (89): Presentation & Business Logic Coupling, lucide-react, react, react-dom, react-router-dom, @tanstack/react-query, viem, wagmi (+81 more)

### Community 1 - "TrustGraphRegistry"
Cohesion: 0.04
Nodes (36): TrustGraphRegistry, ValidityStatus, EXPIRED, INVALID_ISSUER, NOT_FOUND, REVOKED, VALID, AttestationIssued (+28 more)

### Community 2 - "trustGraphService.ts"
Cohesion: 0.09
Nodes (21): getProfileForAddress(), MOCK_ATTESTATIONS, MOCK_ISSUERS, MOCK_PASSPORTS, MOCK_VERIFIERS, MOCK_WORKS, DEMO_WALLETS, REGISTRY_ADDRESS_CONFIGURED (+13 more)

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
Cohesion: 0.08
Nodes (13): ProofOfWorkRegistry, OwnershipTransferred, VerifierApproved, VerifierRemoved, WorkRejected, WorkRevoked, WorkSubmitted, WorkVerified (+5 more)

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
Cohesion: 0.10
Nodes (19): isIssuer(), 1. Product Model, 2. Core User Roles, 3. Supported Claim Types, 4. Four Primary MVP Pages, 5. Smart Contract Architecture, 6. Testing & Verification, 7. Demo Personas (+11 more)

### Community 14 - "scaffold/SKILL.md"
Cohesion: 0.12
Nodes (16): Checklist, Decide what to put onchain, Don't try to build smart contracts from scratch, Known gotchas — apply up front, Manual Verification (Fallback Only), Monskills metadata, Next.js default tsconfig target is too low for viem/wagmi, Parameters (+8 more)

### Community 15 - "scaffold/SKILL.zh.md"
Cohesion: 0.12
Nodes (16): Monskills metadata, Next.js 默认 tsconfig target 过低，无法使用 BigInt, 决定哪些内容放在链上, 参数说明, 善用 OpenZeppelin, 在前端使用 Wagmi, 尽可能使用 useSendTransactionSync, 已知坑点 — 提前处理 (+8 more)

### Community 16 - "trustGraph.test.ts"
Cohesion: 0.17
Nodes (11): RFC-2119, assertValidTransition(), computeCanonicalEvidenceHash(), computeDeterministicWorkId(), computeSha256Node(), __dirname, __filename, runTests() (+3 more)

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

### Community 21 - "ProofOfWorkRegistryComprehensiveTest"
Cohesion: 0.05
Nodes (20): Actor, ProofOfWorkRegistryComprehensiveTest, attacker, attackerActor, EVIDENCE_HASH_1, EVIDENCE_HASH_2, EVIDENCE_HASH_3, METADATA_URI_1 (+12 more)

### Community 22 - "gas/SKILL.md"
Cohesion: 0.14
Nodes (13): Always Set Explicit Gas Limits for Known Costs, Base Fee Controller, Block and Transaction Limits, Cold State Access is Much More Expensive, Developer Guidelines, Displaying Gas Costs to Users, EIP-1559 Transaction Pricing, Gas Estimation in Frontend Code (+5 more)

### Community 23 - "gas/SKILL.zh.md"
Cohesion: 0.14
Nodes (13): EIP-1559 交易定价, 交易排序, 冷状态访问价格大幅提高, 前端代码中的 Gas 估算, 区块和交易限制, 向用户显示 Gas 费用, 基础费用控制器, 对已知成本始终设置明确的 Gas 上限 (+5 more)

### Community 24 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, build, compile, deploy, deploy:work, dev, graphify, graphify:query (+8 more)

### Community 25 - "index.ts"
Cohesion: 0.09
Nodes (30): isVerifier(), 1. Current State, 2. Tech Stack, 3. Architecture, 4.1 Existing Chain Configuration, 4.2 Existing Wallet Configuration, 4.3 Existing Contract (`ProofOfWorkRegistry.sol`), 4.4 Existing ABI Handling (+22 more)

### Community 26 - "Agent steps"
Cohesion: 0.15
Nodes (13): act: one goal, Agent steps, assert, waitFor, extract: one question, Beyond the built-in agent, Budgets and cost, Choose an agent, Configure a model, In CI (+5 more)

### Community 27 - "Writing tests"
Cohesion: 0.14
Nodes (13): A complete file, Actions, app, expect, Fixtures, Habits, Locators, Reads (+5 more)

### Community 28 - "Skills"
Cohesion: 0.15
Nodes (12): [Addresses](/addresses/SKILL.md), [Concepts](/concepts/SKILL.md), Feedback, [Gas](/gas/SKILL.md), [Indexer](/indexer/SKILL.md), [Scaffold](/scaffold/SKILL.md), Skills, [Tooling & Infra](/tooling-and-infra/SKILL.md) (+4 more)

### Community 29 - "82. Final Report Format"
Cohesion: 0.08
Nodes (26): 10. API Changes, 11. Repository Changes, 12. Frontend Changes, 13. Cache Changes, 14. Job / Event Changes, 15. Audit Changes, 16. Blockchain Boundary, 17. Security Findings (+18 more)

### Community 30 - "AGENTS.md"
Cohesion: 0.03
Nodes (73): 12. Never Rename by Find-and-Replace, 14. Multi-Tenancy Definition, 15. Tenant Context Contract, 16. Tenant Resolution, 18. Database Multi-Tenant Requirements, 19. Expected Core Multi-Tenant Entities, 20. Membership Model, 21. Tenant Isolation — Mandatory Defense in Depth (+65 more)

### Community 31 - "Setting up e2e"
Cohesion: 0.18
Nodes (11): Done when, Environment variables the runner reads, Existing MCP registration, Let the runner start the app, Mobile targets, Requirements, Scaffold, Setting up e2e (+3 more)

### Community 32 - "deploy.cjs"
Cohesion: 0.20
Nodes (8): solc, { createWalletClient, createPublicClient, http }, { defineChain }, fs, monadTestnet, path, { privateKeyToAccount }, solc

### Community 33 - "integration.test.ts"
Cohesion: 0.08
Nodes (21): abi, artifact, artifactPath, attackerAcct, attackerW, __dirname, EV_1, EV_2 (+13 more)

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

### Community 39 - "79. Mandatory Current Phase Execution Plan"
Cohesion: 0.18
Nodes (11): 79. Mandatory Current Phase Execution Plan, Phase A — Baseline, Phase B — Code Graph, Phase C — Fix Current Runtime Blocker, Phase D — Tenant Architecture Design, Phase E — Migration Plan, Phase F — Implementation, Phase G — Data Migration (+3 more)

### Community 40 - "Create a verification skill"
Cohesion: 0.25
Nodes (7): 1. Interview the repo, not the user, 2. Generate the skill, 3. Seed the feature map, 4. Prove the generated skill before handing it over, 5. Hand over, Create a verification skill, Rules

### Community 41 - "compilerOptions"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 42 - "Debugging a failing run"
Cohesion: 0.33
Nodes (6): Debugging a failing run, Error codes, Flaky tests, Is it the app?, Read the failure, Tools

### Community 43 - "Exploring without a test"
Cohesion: 0.29
Nodes (6): Exploring without a test, Flags, Reading the result, Start signed in, What a run does, When it does not fit

### Community 44 - "run"
Cohesion: 0.16
Nodes (14): Commands, Continuous integration, Exit codes, Output, Running tests, The replay cache, c(), canonicalEvidenceHash() (+6 more)

### Community 45 - "Work"
Cohesion: 0.18
Nodes (11): Work, createdAt, evidenceHash, metadataUri, status, statusReason, verifiedAt, verifier (+3 more)

### Community 46 - "3. Absolute Rules"
Cohesion: 0.25
Nodes (8): 3.1 No Mock or Simulated Production Features, 3.2 No Docker, 3.3 No Unnecessary Frameworks, 3.4 RESTful APIs, 3.5 Existing Folder Structure, 3.6 Reusable React Components, 3.7 Prisma Migration Rule, 3. Absolute Rules

### Community 47 - "Driving the app over MCP"
Cohesion: 0.33
Nodes (5): Driving the app over MCP, Rules, Setup, Tools, Workflow

### Community 48 - "vite.config.ts"
Cohesion: 0.33
Nodes (3): vite, @vitejs/plugin-react, configDirectory

### Community 49 - "11. Graphify — Mandatory Graph-First Engineering"
Cohesion: 0.29
Nodes (7): 11.1 First Step for Unfamiliar Architecture, 11.2 Trace a Flow, 11.3 Explain a Critical Node, 11.4 Keep Graphify Synchronized, 11.5 Full Extraction, 11.6 Graph-First Rule, 11. Graphify — Mandatory Graph-First Engineering

### Community 51 - "e2e: agentic end-to-end tests in TypeScript"
Cohesion: 0.40
Nodes (5): e2e: agentic end-to-end tests in TypeScript, Feedback, Rules, Topics, Workflow

### Community 52 - "Monad Tooling & Infrastructure"
Cohesion: 0.40
Nodes (4): Categories, How to use this skill, Important notes, Monad Tooling & Infrastructure

### Community 53 - "Monad 工具与基础设施"
Cohesion: 0.40
Nodes (4): Monad 工具与基础设施, 如何使用此技能, 类别, 重要说明

### Community 54 - "60. Testing Strategy"
Cohesion: 0.33
Nodes (6): 60. Testing Strategy, API, E2E, Integration, Regression, Unit

### Community 55 - "6. Product Invariants"
Cohesion: 0.33
Nodes (6): 6.1 Evidence Before Reputation, 6.2 Pending Is Not Verified, 6.3 No Blockchain State Hallucination, 6.4 Real Blockchain Transactions, 6.5 Revocation Preserves History, 6. Product Invariants

### Community 56 - "17. Tenant Data Classification"
Cohesion: 0.40
Nodes (5): 17. Tenant Data Classification, AUDIT, GLOBAL, TENANT_SCOPED, USER_SCOPED_WITHIN_TENANT

### Community 57 - "65. Severity"
Cohesion: 0.40
Nodes (5): 65. Severity, P0 — Critical, P1 — High, P2 — Medium, P3 — Low

### Community 58 - "Status"
Cohesion: 0.40
Nodes (5): Status, PENDING, REJECTED, REVOKED, VERIFIED

### Community 59 - "7. Existing Domain Actors"
Cohesion: 0.50
Nodes (4): 7. Existing Domain Actors, Authorized Verifier / Issuer, Developer / Subject, Public Viewer / Auditor

### Community 60 - "WorkType"
Cohesion: 0.50
Nodes (4): WorkType, GITHUB_CONTRIBUTION, HACKATHON_PROJECT, SMART_CONTRACT

### Community 62 - "approveVerifier"
Cohesion: 0.50
Nodes (4): approveVerifier(), removeVerifier(), transferOwnership(), onlyOwner()

### Community 63 - "onlyVerifier"
Cohesion: 0.50
Nodes (4): rejectWork(), revokeWork(), verifyWork(), onlyVerifier()

### Community 64 - "10. Mandatory Code Intelligence Workflow"
Cohesion: 0.67
Nodes (3): 10.1 GitNexus — Mandatory Before Editing, 10.2 GitNexus — Mandatory Before Commit, 10. Mandatory Code Intelligence Workflow

## Knowledge Gaps
- **24 isolated node(s):** `SMART_CONTRACT`, `GITHUB_CONTRIBUTION`, `HACKATHON_PROJECT`, `PENDING`, `VERIFIED` (+19 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 796 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `viem` connect `useWorkRegistry.ts` to `deploy.cjs`, `package.json`, `trustGraphService.ts`, `integration.test.ts`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **What connects `SMART_CONTRACT`, `GITHUB_CONTRIBUTION`, `HACKATHON_PROJECT` to the rest of the system?**
  _24 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useWorkRegistry.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06019283746556474 - nodes in this community are weakly interconnected._
- **Why does `Evidence` connect `index.ts` to `TrustGraph`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `TrustGraphRegistry` be split into smaller, more focused modules?**
  _Cohesion score 0.04421768707482993 - nodes in this community are weakly interconnected._
- **Should `trustGraphService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08687943262411348 - nodes in this community are weakly interconnected._
- **Should `para CLI — behavioral notes` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._