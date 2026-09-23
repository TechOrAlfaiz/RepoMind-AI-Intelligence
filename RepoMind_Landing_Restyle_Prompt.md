# RepoMind — Landing/Sign-in Page Restyle Prompt (UI only)

**Scope guard — read this first:** This is a pure visual pass. Do not touch auth handlers, form submission logic, routing, API calls, validation, or any state/data logic on this page. Every change below is CSS, markup structure, typography, and animation only. If a change would require touching a handler or a backend call, skip it and leave that piece as-is.

---

The current landing/sign-in split page looks generic — it reads like an AI-SaaS template rather than RepoMind. Specifically:
- The "PRODUCTION ARCHITECTURE" all-caps eyebrow label is a cliché SaaS pattern
- The purple-to-cyan gradient on the "1-Click Developer Login" button doesn't match the rest of the product
- The checkmark-in-circle feature list (2-column, generic green circles) is boilerplate
- The typography is a generic system sans, not the product's actual type system
- Nothing on the page moves or reacts — it's static top to bottom

Restyle it using RepoMind's real design system, established elsewhere in the app:
```
Fonts: IBM Plex Sans (400/500/600) for UI text, IBM Plex Mono (400/500) for code, labels, tags, citations.
Dark palette: bg #141312 (landing) / #1C1B1A (app panels) · panel #1C1A18 · panel-2 #221F1C · border #34302B
text-primary #EDEAE4 · text-secondary #A9A192 · text-muted #746C60
accent (amber) #E8A33D · accent-text #241705 · accent-soft rgba(232,163,61,.12)
structural (slate) #7FA4B8 · success #8FB482
```
Replace the current indigo/purple/cyan palette and default sans font with this everywhere on the page — logo mark, badges, buttons, borders, all of it.

Specific fixes, left panel:
1. Remove the all-caps "PRODUCTION ARCHITECTURE" label. Replace it with a small monospace tag in the same style as the "engineering intelligence" tag pattern used elsewhere (border, rounded corners, lowercase, muted color) — or drop it entirely if the headline already carries enough context.
2. Restyle the "AI Intelligence" pill and the logo mark using the amber/graphite tokens instead of indigo.
3. Rebuild the 4-item checkmark feature list as a compact spec-sheet: a label and short description per row, separated by hairline dividers, no circular icons — matching the feature-list style used on the product showcase page.
4. Give the demo/preview card real motion: when the page loads, animate the sample question typing in character-by-character (or a brief typing-cursor effect), then have the citation `[CTX-1]` and the "Deterministic AST citation validated" line flash/highlight in amber once the code block appears — echoing the actual citation-highlight behavior from the real chat UI. Guard all of this behind `prefers-reduced-motion`.
5. Give the whole hero content (badge, headline, paragraph, demo card, feature list) a subtle staggered entrance on load — small fade + upward motion, offset by roughly 60-80ms per element, not a bounce or anything showy.

Specific fixes, right panel (sign-in):
1. Restyle the card borders, panel background, and text colors to the tokens above so it reads as part of the same product, not a bolted-on auth template.
2. Replace the gradient "1-Click Developer Login" button with a solid amber-accent button; add a real interaction — a slight scale and a soft amber glow on hover/focus, and a pressed state on click — instead of a static gradient with no feedback.
3. Restyle "Continue with GitHub" and "Sign In with Email" as secondary buttons using panel/border tokens, with a visible focus ring for keyboard users.
4. Keep the layout and field order exactly as-is — email, password, forgot-password link, sign-up link, footer links — only restyle, don't rearrange or rename anything.

General:
- Keep the footer's "Created with ♥ by TechOrAlfaiz (Alfaiz)" but restyle the heart and text to the muted/mono tokens so it feels like a deliberate technical signature rather than a template default.
- Check the result in both light and dark mode if the app's theme toggle applies to this page.
- Once done, show me a before/after description of what changed, confirming no functional code (handlers, routes, API calls, form logic) was touched — styling and markup structure only.
