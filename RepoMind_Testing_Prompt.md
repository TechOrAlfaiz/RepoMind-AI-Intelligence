# RepoMind — End-to-End Testing Prompt

**How to use this:** Paste into Antigravity once the app is running locally (`docker compose up` or your dev servers). It uses the built-in browser preview to actually click through the app rather than just reading code, so make sure the dev server is up first.

---

You are now in QA mode for RepoMind. Open the running application in your browser preview and test it end-to-end like a real user would — don't just read the code, actually click through every flow.

Go through the checklist below in order. After each numbered step: check the browser console for errors or warnings, confirm the UI looks and behaves as intended, and if you find a bug, fix it in the code, reload, and re-test that same step before moving to the next one. Don't stop at the first error — fix it and keep going through the full list. Keep a running log of what you tested and what you fixed as you go.

1. **Landing page** — loads without console errors; the hero pipeline diagram renders and animates (or stays static if reduced-motion is on); every section is visible and correctly laid out at both desktop and mobile widths.
2. **Sign-in / repository connect** — complete the flow end to end; confirm the correct repository name, branch, and index status appear afterward.
3. **Sidebar** — "New chat" creates a fresh conversation; clicking a past conversation switches to it and marks it active.
4. **Chat** — send a question and confirm a response renders with inline citation markers, and that the "Sources" chips under the answer match the citations referenced in the text.
5. **Citations** — click a citation marker in the text, then click its matching source chip separately; both should update the code viewer to the correct file, commit, and highlighted line range. A citation pointing to an issue should show the issue card instead of code.
6. **Mobile viewport (~375px wide)** — the sidebar opens as a drawer from the menu button and closes on overlay tap; the chat/code panels become tabs; clicking a citation on mobile auto-switches to the Code tab.
7. **Theme** — toggle dark/light and confirm every screen (landing, chat, code viewer, sidebar) updates correctly, and that the choice persists after a page reload.
8. **Keyboard navigation** — tab through the composer, citations, source chips, theme toggle, and mobile tabs; every focused element needs a visible focus ring, and nothing should trap keyboard focus.
9. **Edge cases** — an empty conversation state, sending a blank message (should be blocked with a clear inline message, not silently ignored), and a failed or denied repository connect (should show a clear error, never fail silently).
10. **Authorization** (once the backend is wired up) — confirm a user in one workspace genuinely cannot fetch another workspace's repositories or conversations through the API, not just that the UI hides the option.

When you've been through all 10 and everything passes, give me a short summary: what you tested, what bugs you found along the way, and what you changed to fix each one.
