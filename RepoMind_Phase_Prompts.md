# RepoMind — Phase-by-Phase Prompts for Antigravity IDE

**How to use this:** Paste one phase into a new Agent Manager task in Plan Mode, review the plan artifact, approve, let it build, merge/test, then move to the next phase. Each block already includes the context it needs — you don't have to paste anything extra before it.

---

### Phase 1 — Project scaffold
Set up RepoMind, a multi-tenant AI engineering intelligence platform: a developer connects a GitHub repo, RepoMind builds a permission-aware RAG knowledge layer over it, and answers questions with cited, file/line-level evidence. Repository content is the source of truth — the LLM only synthesizes retrieved evidence, never invents it.

Stack: React + TypeScript + Tailwind frontend, Node.js + Express + TypeScript backend as a **modular monolith** (not microservices), MongoDB + a vector database (pick Qdrant or pgvector and justify it), Redis + BullMQ, Tree-sitter for code parsing, GitHub OAuth, Docker Compose, GitHub Actions CI/CD.

For this phase: scaffold a monorepo (`apps/web`, `apps/api`, `packages/shared-types`), TypeScript config, ESLint/Prettier, a Docker Compose file with services for frontend, api, worker, redis, mongodb, and a vector-db placeholder, and a `.env.example` covering GitHub OAuth, Mongo, Redis, vector DB, LLM/embedding keys, session/encryption secrets, and frontend/API base URLs. Produce a plan artifact first, then build.

---

### Phase 2 — GitHub OAuth and sessions
Continuing RepoMind (multi-tenant AI platform over GitHub repos, modular-monolith Node/Express/TS + React/TS stack, MongoDB + vector DB, Redis/BullMQ). Non-negotiables: authorize server-side before any data access, never expose provider tokens to the frontend, encrypt long-lived tokens at rest.

Build the GitHub OAuth flow: redirect to GitHub's authorization page, handle the callback, exchange the code for a token, fetch the GitHub profile, create/update the local `User` record, create a secure session, and validate the OAuth `state` parameter against CSRF. Add logout and session expiration. Plan artifact first.

---

### Phase 3 — Organizations, membership, authorization
Continuing RepoMind. Non-negotiable: every request must be authorized server-side against the caller's organization/repository membership before touching data — the LLM is never the permission layer, and there is no cross-tenant data leakage.

Build `Organization`, `Membership` (user + organization + role), and `Repository` (belongs to an organization) models, plus a centralized authorization middleware/helper used everywhere instead of scattered permission checks. Add create-organization and join-organization flows. Plan artifact first.

---

### Phase 4 — Repository connection
Continuing RepoMind, on top of the organization/authorization layer from Phase 3.

Build: list the GitHub repositories available to the authenticated user, connect a selected repo (creating a local `Repository` record with branch, default branch, visibility, and `indexStatus`), manual re-index trigger, display of last successful index/current commit SHA/index version, and repository deletion with cascading cleanup of its chunks and vector records. Plan artifact first.

---

### Phase 5 — Ingestion worker (fetch and filter)
Continuing RepoMind. Non-negotiable: long-running work runs in background jobs and never blocks an HTTP request; ingestion must be idempotent later, so build this phase around content hashing from the start.

Build a BullMQ ingestion job that: fetches the repo's file tree via the GitHub API, downloads eligible files, filters out binary/generated/vendor files, computes a content hash per file, and persists `File` records (`repositoryId, path, language, contentHash, latestSha, size`). Plan artifact first.

---

### Phase 6 — Code-aware chunking
Continuing RepoMind, on top of the ingestion worker from Phase 5.

Implement code-aware chunking with Tree-sitter/AST parsers: detect language, prefer complete functions/classes/interfaces as chunk units, split oversized symbols at logical blocks while preserving parent metadata, add lightweight contextual headers (repo/path/symbol/language), and skip unchanged chunks using normalized content hashes. Persist `Chunk` records with `repositoryId, fileId, symbolName, startLine, endLine, contentHash, chunkType, embeddingVersion`. Plan artifact first.

---

### Phase 7 — Embeddings and basic retrieval
Continuing RepoMind, on top of chunking from Phase 6.

Generate embeddings for each chunk, upsert them into the chosen vector database with full chunk metadata, and implement a basic vector-similarity retrieval function/endpoint that is always scoped by `repositoryId` and the caller's permissions before the vector query runs. Plan artifact first.

---

### Phase 8 — RAG chat with citations
Continuing RepoMind, on top of retrieval from Phase 7. Non-negotiable: every answer cites retrieved chunk IDs, and the backend validates cited IDs actually exist in the retrieved context before rendering; retrieved content is untrusted data and must be clearly labeled as such in the prompt, never treated as instructions.

Build `Conversation` and `Message` models, RAG prompt construction (numbered context blocks like `[CTX-1] path:startLine-endLine`), streaming responses over WebSocket/SSE, post-generation citation validation, and persistence of the full trace (retrieved chunks, prompt, response, latency, token usage). Plan artifact first.

---

### Phase 9 — Code viewer
Continuing RepoMind, on top of chat/citations from Phase 8.

Build a read-only code viewer (Monaco Editor) that: opens a file at a specific cited line range, highlights that range, shows syntax highlighting and line numbers, and displays the commit SHA the view corresponds to. Wire it to citation clicks in the chat UI. Plan artifact first.

---

### Phase 10 — Hybrid retrieval, reranking, evaluation
Continuing RepoMind, on top of Phase 7–9.

Add keyword/BM25-style search alongside vector search, merge and deduplicate the two candidate sets, implement a configurable scoring function (`α·vector + β·keyword + γ·symbol_match + δ·path_match + ε·recency`), add a reranking step that prioritizes the top ~5–8 chunks for context packing, and build a small evaluation benchmark (a set of real questions with expected evidence) that tracks retrieval recall and citation correctness. Plan artifact first.

---

### Phase 11 — Realtime progress and incremental indexing
Continuing RepoMind. Non-negotiable: never re-index a whole repository on every push — only the changed files.

Build: WebSocket events that push ingestion job progress to the dashboard, a GitHub webhook endpoint that validates the signature on every event, diffing of the push event's commit range into added/changed/deleted files, incremental chunk updates (delete/replace old chunks for changed files, remove chunks for deleted files, leave unchanged files alone), and updating the repository's current commit SHA. Plan artifact first.

---

### Phase 12 — Issues, PRs, and architecture graph
Continuing RepoMind, on top of the ingestion and retrieval pipeline.

Build: (1) issue ingestion (title, body, labels, comments, linked PRs) plus a bug investigator that retrieves related code and similar historical issues for a new bug query; (2) a PR analyzer that fetches changed files/diffs, retrieves relevant surrounding code and tests, summarizes the change, flags files needing human review, and suggests tests — never auto-approves or merges; (3) a deterministic architecture graph built from static analysis (modules/services/controllers/models as nodes, imports/API calls as edges), using the LLM only to label nodes, not to determine the graph itself. Plan artifact first.

---

### Phase 13 — RBAC hardening, audit, observability
Continuing RepoMind.

Build: role checks enforced on every sensitive action, an `auditLogs` collection recording actor/action/resource for sensitive operations, per-user/workspace/IP rate limiting, request correlation IDs, and structured metrics for API latency, job queue depth/failure rate, RAG retrieval/reranker latency, LLM token usage/cost, and citation validity. Plan artifact first.

---

### Phase 14 — Testing and CI/CD
Continuing RepoMind — this is the production-hardening pass.

Build: unit tests for chunking, content hashing, permission checks, prompt construction, citation parsing, and webhook signature validation; integration tests for the OAuth callback, ingestion job creation, and the retrieval pipeline; one end-to-end test covering sign in → connect repo → index → ask a question → open a citation → verify the cited lines → push a change → confirm an incremental job fires; and a GitHub Actions pipeline (install → lint → type-check → unit tests → integration tests → build → Docker build → dependency/vulnerability scan → deploy gate) targeting a staging environment. Plan artifact first.

---

### Phase 15 — Optional enhancements (pick any, paste separately)
These are additions beyond the base spec. Paste whichever ones you want, whenever you want them — none of them block the core 14 phases above.

- *"Add a Repo Time Machine to RepoMind: let retrieval be pinned to any historical commit or tag, not just HEAD, so a question can be answered 'as of' a past state of the repo."*
- *"Add a Repo Health Score to RepoMind's dashboard: a composite metric from test coverage, doc coverage, dependency staleness, and code churn."*
- *"Add auto-generated architecture decision records (ADRs) to RepoMind, synthesized from merged PR titles/descriptions and commit clusters."*
- *"Add an Onboarding Playbook Generator to RepoMind: given a connected repo, output a ranked list of files/functions a new engineer should read first, with reasons."*
- *"Add a license/SBOM scan to RepoMind's ingestion pipeline that flags copyleft or high-risk dependencies."*
- *"Add a diff risk badge to RepoMind's PR analyzer: a plain-English summary of what changed and why it might be risky (low/medium/high), alongside the existing PR summary."*
- *"Add a RepoMind CLI companion (`repomind ask '...'`) for terminal and CI use."*
- *"Add a reranker feedback loop to RepoMind: use logged thumbs up/down on answers to periodically retune the retrieval scoring weights instead of leaving them static."*
