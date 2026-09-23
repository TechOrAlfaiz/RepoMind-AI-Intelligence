# RepoMind — End-to-End Real Repository Testing Prompt

> **Instructions for Tester / AI Agent:**  
> Use this prompt to perform comprehensive end-to-end testing of **RepoMind** against a **real GitHub repository** (e.g., owned by `TechOrAlfaiz`) rather than mock fixtures. Follow every phase systematically. If any step fails or uncovers a bug, inspect the logs, fix the root cause in the codebase, verify the fix, and proceed through the full checklist.

---

## ⚙️ Phase 0: Prerequisites & Environment Verification

Before running browser tests, ensure the full infrastructure stack is up and configured:

### 1. Configure Environment Variables (`.env`)
Verify `scratch/repomind/.env` has real values configured (copied from `.env.example`):
```ini
NODE_ENV=development
PORT=4000
API_URL=http://localhost:4000
WEB_URL=http://localhost:5173

# Databases
MONGODB_URI=mongodb://localhost:27017/repomind
REDIS_URL=redis://localhost:6379
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION_NAME=repomind_code_chunks

# GitHub OAuth App (Registered at https://github.com/settings/developers)
# Callback URL: http://localhost:4000/api/auth/github/callback
GITHUB_CLIENT_ID=your_real_github_client_id
GITHUB_CLIENT_SECRET=your_real_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:4000/api/auth/github/callback

# Security Keys
SESSION_SECRET=a_secure_random_session_secret_at_least_32_characters_long
TOKEN_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# LLM & Embeddings
OPENAI_API_KEY=your_real_openai_api_key
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
LLM_MODEL=gpt-4o-mini
```

### 2. Start Supporting Services
Run Docker Compose in the project root to spin up MongoDB, Redis, and Qdrant:
```powershell
docker compose up -d
```
Verify that all three services are healthy:
- MongoDB listening on `localhost:27017`
- Redis listening on `localhost:6379`
- Qdrant UI accessible at `http://localhost:6333/dashboard`

### 3. Start Application Servers
In two separate terminals:
```powershell
# Terminal 1 — Backend API & Worker
npm run dev --workspace=@repomind/api

# Terminal 2 — Frontend Client
npm run dev --workspace=@repomind/web
```
Confirm the backend responds at `http://localhost:4000/api/health` and the web client is running at `http://localhost:5173`.

---

## 📋 Comprehensive Real-Repo Testing Checklist

Target GitHub Account: **`TechOrAlfaiz`**  
Target Repository: `<your-repo>` *(e.g. `TechOrAlfaiz/<repo-name>`)*

---

### Step 1: Real GitHub OAuth & Repository Onboarding
1. Navigate to `http://localhost:5173` in the browser preview.
2. Confirm the landing page loads cleanly without console errors, and click **"Connect with GitHub"** or **"Launch App"**.
3. Authorize the OAuth app via GitHub.
4. Verify redirection back to the RepoMind AppShell at `http://localhost:5173/app`.
5. Open the Repository Selector dropdown in the Topbar / Onboarding modal.
6. Verify your real repositories for `TechOrAlfaiz` are fetched from the GitHub API and displayed.
7. Select your target repository (e.g. `<your-repo>`).
8. **Check:**
   - [ ] Topbar displays the selected repository name, current branch (`main` / `master`), and commit SHA.
   - [ ] No 401/403 or CORS errors appear in the DevTools console.

---

### Step 2: Full Ingestion & Vector Indexing Pipeline
1. Trigger **"Index Repository"** for the connected repository.
2. Monitor the real-time indexing progress bar and status badge (`queued` ➔ `cloning` ➔ `parsing` ➔ `embedding` ➔ `indexed`).
3. Monitor terminal logs in `@repomind/api` to verify:
   - Git shallow clone / file tree traversal succeeded.
   - AST / Tree-sitter chunker broke files into meaningful semantic code blocks.
   - OpenAI `text-embedding-3-small` generated vectors in batches.
   - Embeddings were stored in Qdrant vector collection `repomind_code_chunks`.
   - File metadata and commit references were stored in MongoDB.
4. **Failure Recovery:** If indexing fails on any file (e.g., binary files, minified assets, non-UTF8 encoding, rate limits):
   - Check the worker error log.
   - Ensure file ignore filters (`.gitignore`, lockfiles, images) are properly applied.
   - Fix the parsing/filtering bug in `packages/core` or `apps/api`, re-run indexing, and ensure status updates to `ready`/`indexed`.
5. **Check:**
   - [ ] Indexing reaches 100% and displays status `Indexed` / `Ready`.
   - [ ] Total chunks indexed and file count displayed in UI matches real repo stats.

---

### Step 3: Ground-Truth Codebase Architecture Q&A
Ask **3 to 5 realistic questions** specific to the target repository's actual code structure.

*Example prompts (adapt to your repo's actual stack):*
1. **Entrypoint & Setup:** *"Explain the server initialization and middleware setup in this project. Which files handle routing?"*
2. **Business Logic / Controllers:** *"How does the primary business logic flow work in this codebase? Cite the exact functions and files handling it."*
3. **Database & Models:** *"What database schemas or data models are defined here, and how are relationships represented?"*
4. **Authentication / Security:** *"How is user authentication or token verification implemented in this repository?"*

**Validation Criteria:**
- [ ] Streaming response renders smoothly with markdown formatting and syntax-highlighted code snippets.
- [ ] Inline citation badges (e.g. `[1]`, `[2]`) appear at relevant assertions.
- [ ] A dedicated **"Sources"** panel / chips appear below the answer with file paths, commit SHA, and line numbers (e.g. `src/server.ts:24-68`).
- [ ] **Real Code Verification:** Open the cited file in the GitHub repo directly or in your local editor. Confirm the file path, line numbers, and logic cited match the repository **exactly**.

---

### Step 4: Citation Deep Linking & Code Viewer
1. Click on an inline citation marker (e.g. `[1]`) or a Source chip in the chat response.
2. Verify the **Code Viewer** panel automatically displays:
   - The correct cited file name and path in the header breadcrumb.
   - Syntax highlighting appropriate for the file extension (`.ts`, `.tsx`, `.js`, `.py`, etc.).
   - The exact cited line range highlighted with high-contrast accent markers.
   - The commit hash matching the indexed snapshot.
3. Click the **"View on GitHub"** permalink button. Verify the link matches the exact GitHub URL:
   `https://github.com/TechOrAlfaiz/<repo>/blob/<commit-sha>/<file-path>#L<start>-L<end>`
4. Test clicking multiple different source citations across different files; confirm the Code Viewer updates tabs and highlighted ranges without lag or layout shifts.

---

### Step 5: Negative Testing & Hallucination Prevention
1. Ask RepoMind a question about a feature or technology **completely absent** from this repository.
   - *Example:* *"Where is the Stripe payment webhook handler located in this repository?"* (if the repo does not use Stripe), or *"How is Redis clustering configured in this app?"* (if Redis is not used).
2. **Validation Criteria:**
   - [ ] RepoMind MUST explicitly state that no evidence was found in the indexed repository.
   - [ ] RepoMind must **NOT** invent fictitious file paths or fabricate functions not present in `<your-repo>`.
   - [ ] Confidence score / source citations should either be empty or clearly flagged as low relevance.

---

### Step 6: Incremental Indexing & Webhook Simulation
1. Make a small commit to a test branch of the repository (or modify a test file such as `README.md` or a helper utility).
2. Push the commit to GitHub or simulate a `push` webhook event to `POST /api/webhooks/github`.
3. Check the BullMQ queue in `@repomind/api`:
   - [ ] BullMQ detects the commit diff and performs **incremental indexing**.
   - [ ] Only modified or new files are parsed and embedded.
   - [ ] Untouched files are **not** re-embedded, saving OpenAI API quota.
4. Send a query to RepoMind asking about the newly committed change.
5. Confirm the response cites the new commit SHA and reflects the updated content.

---

### Step 7: UI Experience, Responsive Views & Theme Validation
1. **Desktop View (`> 880px`):**
   - Confirm dual-pane layout: ChatPane on the left, CodeViewer on the right.
   - Verify resizable divider / toggle collapse for the CodeViewer works smoothly.
2. **Mobile View (`375px` width):**
   - Confirm layout switches to tabbed navigation (`Chat` vs `Code`).
   - Clicking a citation inside Chat should auto-switch the active tab to `Code`.
   - Open and close the mobile navigation drawer via hamburger button and backdrop tap.
3. **Theme Switching:**
   - Toggle between **Dark** and **Light** modes via Topbar.
   - Verify contrast and readability for all text, citation chips, and Code Viewer syntax themes.
   - Reload the page; verify the theme choice persists in `localStorage`.
4. **Keyboard Accessibility:**
   - Tab through all interactive elements (prompt input, send button, citation chips, source tabs).
   - Ensure all elements display visible `:focus-visible` outline rings.

---

### Step 8: Edge Cases & Error Boundaries
- [ ] **Empty Message:** Attempt to submit an empty or whitespace-only query in chat. Verify an inline warning appears and the request is prevented.
- [ ] **New Conversation:** Click "+ New Chat". Verify a fresh conversation is created and prepended to the sidebar history.
- [ ] **Conversation Switching:** Switch between past conversations in the sidebar; verify messages and citation states restore correctly.
- [ ] **Network / API Resilience:** Simulate backend disruption; verify toast / banner error states appear cleanly without crashing the UI.

---

## 🛠️ Autonomous Bug-Fixing Directive for AI Agents

If any step fails during testing:
1. **Do not abandon testing.** Inspect the server terminal output and DevTools console.
2. Isolate whether the issue is in:
   - Frontend UI (`apps/web`)
   - API endpoints or OAuth handling (`apps/api`)
   - Ingestion / AST chunking / Qdrant vector logic (`packages/core`)
3. Apply the fix directly to the relevant file.
4. Run `npm run build` to verify clean compilation.
5. Re-run the failed step to confirm resolution.

---

## 📊 Final QA Report Template

When testing is complete, output a structured summary formatted as follows:

```markdown
### 🎯 RepoMind Real-Repo Testing Summary

- **Repository Tested:** TechOrAlfaiz/<repo-name>
- **Branch / Commit:** <branch> @ <short-sha>
- **Total Files Indexed:** <count>
- **Total Semantic Chunks in Qdrant:** <count>

#### 🔍 Queries Evaluated:
1. **Query:** "<question 1>"
   - **Verdict:** [PASS / FAIL]
   - **Citations Checked:** <file>:<lines> — Matches real repo? [Yes/No]
2. **Query:** "<question 2>"
   - **Verdict:** [PASS / FAIL]
   - **Citations Checked:** <file>:<lines> — Matches real repo? [Yes/No]
3. **Negative Query (Anti-Hallucination):** "<question 3>"
   - **Verdict:** [PASS / FAIL] — Correctly refused? [Yes/No]

#### 🐞 Bugs Identified & Fixed:
- **Issue 1:** <description of problem> ➔ **Fix:** <file modified and solution applied>
- **Issue 2:** <description of problem> ➔ **Fix:** <file modified and solution applied>

#### 🏁 Overall Status: [READY FOR PRODUCTION / NEEDS ATTENTION]
```
