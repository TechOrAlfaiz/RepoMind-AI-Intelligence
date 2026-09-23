# RepoMind

> Multi-tenant AI engineering intelligence platform that indexes GitHub repositories into a permission-aware RAG knowledge layer with line-level cited evidence.

## Overview

RepoMind indexes repository files into high-dimensional AST vector chunks. Code content serves as the definitive source of truth:
- Every synthesized answer cites retrieved chunk IDs and specific file/line numbers.
- The backend validates cited line ranges against retrieved chunks before serving answers.
- Strict server-side RBAC ensures zero cross-tenant data leakage.

## Tech Stack

- **Monorepo**: npm workspaces (`apps/web`, `apps/api`, `packages/shared-types`)
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite, Monaco Editor (Phase 9)
- **Backend**: Node.js, Express, TypeScript (Modular Monolith)
- **Primary Database**: MongoDB 7.0 (Mongoose)
- **Vector Database**: **Qdrant** (Payload metadata filtering for tenant and repository isolation)
- **Queue / Async Processing**: Redis 7, BullMQ
- **Code AST Parser**: Tree-sitter
- **Containerization**: Docker Compose

## Architecture & Monorepo Structure

```
repomind/
├── apps/
│   ├── api/                 # Modular Monolith Express API & BullMQ Worker
│   │   ├── src/
│   │   │   ├── config/      # Environment and service clients
│   │   │   ├── modules/     # Domain modules (auth, orgs, repos, ingestion, rag)
│   │   │   ├── server.ts    # HTTP Server & healthcheck
│   │   │   └── worker.ts    # Background Worker entrypoint
│   │   └── Dockerfile
│   └── web/                 # React + Vite + Tailwind CSS Frontend
│       ├── src/
│       └── Dockerfile
├── packages/
│   └── shared-types/        # Shared TypeScript interfaces and contracts
├── docker-compose.yml       # Mongo, Redis, Qdrant, API, Worker, Web
└── .env.example             # Comprehensive configuration template
```

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Start Infrastructure (Docker)
```bash
docker compose up -d mongodb redis qdrant
```

### 4. Run Development Servers
```bash
# Start all workspaces concurrently
npm run dev

# Or run API & Web independently
npm run dev:api
npm run dev:web
```

API will run on [http://localhost:4000](http://localhost:4000) (`/health` endpoint).  
Web dashboard will run on [http://localhost:5173](http://localhost:5173).  
Qdrant vector dashboard will run on [http://localhost:6333/dashboard](http://localhost:6333/dashboard).

## 14-Phase Implementation Roadmap

1. **Phase 1: Project Scaffold** (Monorepo, Docker Compose, Qdrant selection) [COMPLETED]
2. **Phase 2: GitHub OAuth and Sessions**
3. **Phase 3: Organizations, Membership, Authorization**
4. **Phase 4: Repository Connection**
5. **Phase 5: Ingestion Worker (BullMQ)**
6. **Phase 6: Code-Aware AST Chunking (Tree-sitter)**
7. **Phase 7: Embeddings and Scoped Vector Retrieval**
8. **Phase 8: RAG Chat with Line Citations**
9. **Phase 9: Monaco Code Viewer**
10. **Phase 10: Hybrid Retrieval, Reranking & Evaluation**
11. **Phase 11: Realtime Progress & Incremental Indexing**
12. **Phase 12: Issues, PRs, and Architecture Graph**
13. **Phase 13: RBAC Hardening, Audit & Observability**
14. **Phase 14: Production Hardening, Testing & CI/CD**
