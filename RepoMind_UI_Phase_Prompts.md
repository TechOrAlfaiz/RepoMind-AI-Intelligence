# RepoMind — UI Build Prompts for Antigravity IDE

**How to use this:** Save `repomind_ui.html` and `repomind_showcase.html` (the two mockups already shown to you) into your repo, e.g. under `docs/design-reference/`, and attach them to the Antigravity task alongside each prompt below — that gives the agent the exact markup, spacing, and interaction logic to translate into React instead of guessing. Paste one phase at a time in Plan Mode, review the plan artifact, approve, then move on.

---

### Design tokens (reference — included in every phase prompt below)
```
Fonts: IBM Plex Sans (400/500/600) for UI text, IBM Plex Mono (400/500) for code, citations, file paths, chips.

App shell — dark (default):
  bg #1C1B1A · panel #242220 · panel-2 #2A2825 · border #3A3733
  text-primary #EDEAE4 · text-secondary #A79F93 · text-muted #756E63
  accent (amber) #E8A33D · accent-text #2A1B04 · accent-soft rgba(232,163,61,.14)
  structural (slate) #7FA4B8 · success #8FB482 · danger #D9836A
  code panel bg #1B1A18 · code text #E7E3DA

App shell — light:
  bg #EEF0EF · panel #FFFFFF · panel-2 #F4F5F4 · border #D9DBDA
  text-primary #1E1D1B · text-secondary #5B5850 · text-muted #8B8880
  accent #B36A16 · accent-text #FFF8EC · accent-soft rgba(179,106,22,.10)
  structural #3E6478 · success #4F7A45 · danger #9B3F2B
  (code panel stays dark in both modes — like a real editor theme)

Landing page — dark only, deeper for contrast: bg #141312 · panel #1C1A18 · panel-2 #221F1C · border #34302B
(same text/accent/structural scale as the app shell dark theme)
```

---

### UI Phase 1 — Design tokens and global setup
Set up RepoMind's frontend design system in the React + TypeScript + Tailwind app. Configure Tailwind with the dark/light token values above as CSS custom properties (not hardcoded Tailwind colors), load IBM Plex Sans and IBM Plex Mono from Google Fonts, and set up a `ThemeProvider` that reads `prefers-color-scheme`, allows a manual override, and persists the choice in `localStorage`. Establish base typography (15-16px body, 1.6-1.65 line height) and spacing scale. No screens yet — just the foundation every component below will use. Plan artifact first.

---

### UI Phase 2 — App shell: topbar and sidebar
Build the authenticated app shell from `repomind_ui.html`: a `<Topbar>` with the RepoMind mark, a repo chip (name, branch, a status dot for index state), a theme toggle, and a mobile menu button; and a `<Sidebar>` with a "New chat" button and a scrollable conversation list with an active-item state. Desktop: sidebar is a fixed 220px column. Don't wire up real data yet — use mock props matching the shapes you'll need later (repo name, branch, index status, conversation list). Plan artifact first.

---

### UI Phase 3 — Landing / showcase page
Build the public landing page from `repomind_showcase.html` as its own route, matching its section order: hero (headline + subhead + the animated pipeline diagram — repo → chunks → vector+BM25 → LLM → cited answer, with the traveling pulse dot, respecting `prefers-reduced-motion`), the "source of truth" principle statement, the spec-sheet-style feature list (label + description rows, not cards), the framed product screenshot section, the tech-stack chip row, and the footer. This page doesn't need auth or real data — it's static/marketing. Plan artifact first.

---

### UI Phase 4 — Chat workspace
Build the `<ChatPane>`: a scrollable message list supporting user messages (right-aligned) and assistant messages (full-width, with inline citation markers as small clickable buttons like `[1]` `[2]`), a "Sources" chip row under each assistant message, and a composer (text input + send button) pinned to the bottom of the pane. Model the data with a `Message` type (`role`, `content`, `citations: Citation[]`) and a `Citation` type (`id`, `label`, `sourceKey`) so this slots cleanly into real streaming data later. Wire citation clicks and source-chip clicks to a shared `activeSource` state (don't build the code viewer yet — just emit the selection). Plan artifact first.

---

### UI Phase 5 — Code viewer panel
Build the `<CodeViewer>`: a header showing file path and commit SHA (or an issue reference for non-code sources), and a line-numbered code block that highlights a given line range with the amber-tinted background and left accent bar. Subscribe to the `activeSource` state from Phase 4 so clicking a citation in chat switches what's shown here, with the brief highlight-flash transition (guarded by `prefers-reduced-motion`). Support a non-code "issue card" variant for citations that point to an issue rather than a file. Plan artifact first.

---

### UI Phase 6 — Mobile responsiveness
Make the app shell responsive below ~880px: the sidebar becomes a slide-in drawer (triggered by the topbar menu button, with a dismiss overlay), and the chat/code panels become a two-tab switcher ("Chat" / "Code") instead of a side-by-side layout — selecting a citation should automatically switch to the Code tab on mobile. Apply safe-area padding (`env(safe-area-inset-*)`) to the outer shell for notches/home indicators. Plan artifact first.

---

### UI Phase 7 — Theming
Finish the light/dark implementation: verify every component in Phases 2-6 reads colors from the theme tokens (no hardcoded hex left in component styles), confirm the code panel intentionally stays dark in both app themes, and confirm the manual toggle in the topbar flips `data-theme` and persists it. Test both themes against every screen built so far. Plan artifact first.

---

### UI Phase 8 — Accessibility and polish
Pass: visible keyboard focus states on all interactive elements (citations, chips, tabs, theme toggle, composer), ARIA labels on icon-only buttons, sufficient contrast in both themes, and a check that no animation runs without a `prefers-reduced-motion: no-preference` guard. Also verify no layout shift when the sidebar drawer opens/closes on mobile. Plan artifact first.
