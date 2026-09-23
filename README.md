<div align="center">

# ⚡ RepoMind
### **AI Engineering Intelligence & Grounded Codebase Architecture Engine**

*Understand your codebase at the speed of thought with deterministic line-level citations, AST dependency graphs, and blast-radius impact analysis.*

---

[![CI Build](https://img.shields.io/badge/build-passing-emerald.svg?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/TechOrAlfaiz/RepoMind-AI-Intelligence)
[![Tests Passing](https://img.shields.io/badge/tests-21%2F21%20passing-indigo.svg?style=for-the-badge&logo=jest&logoColor=white)](https://github.com/TechOrAlfaiz/RepoMind-AI-Intelligence)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-cyan.svg?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-green.svg?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-purple.svg?style=for-the-badge)](LICENSE)

[**Live Demo**](http://localhost:5173) • [**Architecture**](#-architecture--monorepo-structure) • [**Key Features**](#-core-capabilities) • [**Quickstart**](#-getting-started) • [**CLI Guide**](#-cli-companion) • [**QA Test Suites**](#-automated-qa-suites)

---

</div>

<br/>

## 🌌 Overview

**RepoMind** is an enterprise-grade AI pair-programming and engineering intelligence workstation designed to eliminate context loss, developer onboarding friction, and hallucinated AI explanations.

Unlike generic LLM wrappers that treat source code as raw unstructured text, **RepoMind** operates at the **AST (Abstract Syntax Tree)** and **Dependency Graph** layer. Every file is decomposed along semantic boundaries (classes, functions, interfaces), embedded into high-dimensional vector spaces alongside BM25 sparse indices, and synthesized into answers backed by verified line-level citations `[CTX-n]`.

---

## ⚡ Core Capabilities

### 1. 🎯 Line-Level AST Citations & Zero Hallucination
* **Semantic Tree-sitter Boundaries**: Code is parsed by language-specific grammar trees rather than arbitrary token character counts.
* **Strict Evidence Bounds**: Every assertion references the exact source file and line range (e.g. `src/auth/service.ts:42-67 [CTX-1]`).
* **Post-Gen Citation Validator**: Cross-checks and strips any context IDs invented by the model that do not exist in the retrieved Git tree.

### 2. 🕸️ 2D Interactive Architecture & Dependency Graph
* **Multi-Language Static Analysis**: Discovers imports, calls, dependents, and interface implementations across TypeScript, JavaScript, and Python.
* **Neighborhood Blast-Radius**: Hover any node to isolate immediate dependents; unrelated nodes smoothly dim.
* **Level Clustering**: Toggle between *Services* (Tier 1), *Files* (Tier 2), and *Symbols* (Tier 3) dynamically.

### 3. 💥 Impact Analysis & Blast-Radius Engine
* **Deterministic Risk Breakdown**: Before merging code or renaming an API, calculate direct callers, transitive leaf dependents, and affected test suites.
* **Line-Level Justification**: Explains precisely *why* a component is impacted (e.g., `UserCard.jsx` Line 42 imports `userService.js`).

### 4. 📜 "Why Does This Exist?" Git Archeology
* **Historical Context Without Hallucination**: Maps files and symbols back to commit SHAs, PR discussions, and co-changing files over time.
* **Time Machine Pinning**: Query repository state pinned to any historical commit SHA or Git tag.

### 5. 🛡️ Cryptographic Security & Multi-Tenancy
* **AES-256-GCM Token Vault**: GitHub OAuth credentials and personal access tokens are encrypted with authenticated AES-256-GCM before database writes.
* **Fenced Vector Partitions**: Qdrant vector collections enforce strict tenant and repository filtering to prevent cross-organization leakage.
* **Adversarial Sandbox Isolation**: Treats repository source code and comments as read-only untrusted data, resisting prompt injections.

### 6. 🔄 Real-Time Push & Incremental Diff Indexing
* **HMAC SHA-256 Webhook Verification**: Secures GitHub push events with timing-safe HMAC validation.
* **Zero Full Re-index Invariant**: Computes git commit diffs (`+added`, `~modified`, `-deleted`), updating only the impacted AST chunks in milliseconds.

---

## 🧩 Architecture & Monorepo Structure

```
repomind/
├── apps/
│   ├── api/                         # Express 5 Modular Monolith API Engine
│   │   ├── src/
│   │   │   ├── config/              # Env validation, Mongo, Redis & Qdrant clients
│   │   │   ├── middlewares/         # Correlation ID, Rate-limiter, RBAC guards
│   │   │   ├── modules/
│   │   │   │   ├── architecture/    # AST Static Analyzer, Traversal & Blast-Radius
│   │   │   │   ├── auth/            # GitHub OAuth, AES-256-GCM Token Vault & Sessions
│   │   │   │   ├── chunking/        # Tree-sitter AST Chunker & Hash Invariance
│   │   │   │   ├── ingestion/       # Git Tree Ingestion & Incremental Push Diff
│   │   │   │   ├── intelligence/    # Health Score Engine, Playbook & Time-Machine
│   │   │   │   ├── issues/          # Issue Synchronization & Bug Investigator
│   │   │   │   ├── observability/   # Telemetry, Latency Histogram & Metrics Hub
│   │   │   │   ├── orgs/            # Tenant Organizations & Role Hierarchies
│   │   │   │   ├── prs/             # Pull Request Blast-Radius Advisory
│   │   │   │   ├── rag/             # Hybrid RRF (BM25 + Dense) & Citation Fencer
│   │   │   │   ├── realtime/        # WebSocket Push Notification Gateway
│   │   │   │   ├── repos/           # Repository Management & Git Sync
│   │   │   │   └── webhooks/        # GitHub Webhook HMAC SHA-256 Receiver
│   │   │   ├── server.ts            # Centralized API Server Entrypoint
│   │   │   └── worker.ts            # BullMQ Asynchronous Ingestion Worker
│   │   └── Dockerfile
│   │
│   └── web/                         # React 19 + Tailwind CSS Flagship Client
│       ├── src/
│       │   ├── components/
│       │   │   ├── auth/            # ProtectedRoute Guard & Auth Cards
│       │   │   ├── chat/            # 3-Pane Streaming Chat with Verified Citations
│       │   │   ├── graph/           # 2D Interactive Force Canvas & Inspector
│       │   │   ├── intelligence/    # Health Score, Playbook & Architecture Modals
│       │   │   ├── shell/           # AppShell, Collapsible Sidebar, Tree Explorer
│       │   │   └── viewer/          # Syntax-Highlighted Code Viewer Panel
│       │   ├── context/             # AuthContext, OrgContext, RepoContext, Theme
│       │   ├── layouts/             # PublicLayout, AuthLayout, AppLayout
│       │   └── pages/               # Dashboard, Workspace, Architecture, Profile...
│       └── Dockerfile
│
├── packages/
│   ├── cli/                         # Companion Binary CLI (`repomind`)
│   │   └── bin/repomind.js          # Live Health & Onboarding Synthesis
│   └── shared-types/                # Shared TypeScript Data Contracts & Interfaces
│
├── docker-compose.yml               # MongoDB 7, Redis 7, Qdrant Vector Engine
├── .env.example                     # Environment Configuration Template
└── package.json                     # Monorepo Workspace Root
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: `v20.0.0` or higher
* **npm**: `v10.0.0` or higher
* **Docker & Docker Compose** (Optional for local containerized DB services)

### 1. Clone the Repository
```bash
git clone https://github.com/TechOrAlfaiz/RepoMind-AI-Intelligence.git
cd RepoMind-AI-Intelligence
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
```bash
cp .env.example .env
```
> Configure your `MONGODB_URI`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `OPENAI_API_KEY` (RepoMind includes a built-in deterministic fallback if OpenAI rate limits or quotas are hit).

### 4. Start Infrastructure (Docker)
```bash
docker compose up -d mongodb redis qdrant
```

### 5. Launch Development Services
```bash
# Run backend API and frontend Vite servers concurrently
npm run dev

# Or launch independently:
npm run dev:api    # API Server on http://localhost:4000
npm run dev:web    # Web Client on http://localhost:5173
```

---

## 🧪 Automated QA Suites

RepoMind contains comprehensive end-to-end and unit test suites:

```bash
# Run all automated test suites
npm test

# 1. Unit Test Suite (AST, Hash Invariance, RBAC, Prompt Sandboxing, Citations, HMAC)
npm run test:unit

# 2. Integration Suite (AES-256-GCM Vault, Ingestion Worker, Hybrid Retrieval)
npm run test:integration

# 3. Full End-to-End User Lifecycle Suite (8/8 Journey Steps)
npm run test:e2e

# 4. Flagship Enhancements Suite (Health Score, Playbook, Time-Machine, CLI)
npm run test:enhancements

# 5. Typecheck & Linter (0 Diagnostics)
npm run typecheck
npm run lint

# 6. Production Bundle Build
npm run build
```

---

## 💻 CLI Companion

RepoMind includes a developer companion CLI binary located in `packages/cli`:

```bash
# Display CLI usage instructions
node packages/cli/bin/repomind.js --help

# Compute live repository health grade and test coverage
node packages/cli/bin/repomind.js health <repoId>

# Generate curated onboarding reading curriculum
node packages/cli/bin/repomind.js playbook <repoId>
```

---

## 🔒 Security & Privacy Invariants

1. **Zero Data Leakage**: Isolated organization boundaries enforced at database and vector payload levels.
2. **Timing-Safe HMAC**: All webhooks verified with `crypto.timingSafeEqual`.
3. **No Raw Stack Traces**: Centralized JSON error middleware prevents leaking file paths or database errors in production.
4. **Read-Only Sandbox**: RepoMind operates strictly read-only on your GitHub codebase.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!  
Feel free to check [issues page](https://github.com/TechOrAlfaiz/RepoMind-AI-Intelligence/issues).

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.

<div align="center">
  <sub>Built with engineering excellence by <a href="https://github.com/TechOrAlfaiz">TechOrAlfaiz</a></sub>
</div>
