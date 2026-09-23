/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      screens: {
        "shell-desktop": "880px",
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "system-ui", "-apple-system", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
        plex: ["'IBM Plex Sans'", "'Plus Jakarta Sans'", "sans-serif"],
        "plex-mono": ["'IBM Plex Mono'", "'JetBrains Mono'", "monospace"],
      },
      colors: {
        // RepoMind Design Token Scale (CSS Custom Properties)
        bg: "var(--bg-app)",
        panel: "var(--panel)",
        "panel-2": "var(--panel-2)",
        border: "var(--border-subtle)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        accent: "var(--accent)",
        "accent-text": "var(--accent-text)",
        "accent-soft": "var(--accent-soft)",
        structural: "var(--structural)",
        success: "var(--success)",
        danger: "var(--danger)",
        "code-bg": "var(--code-bg)",
        "code-text": "var(--code-text)",
        "code-panel": "var(--code-panel)",
        "code-panel-2": "var(--code-panel-2)",
        "code-border": "var(--code-border)",
        "code-muted": "var(--code-muted)",
        // UI UX Pro Max Semantic Relationship Scale
        rel: {
          import: "#6366F1",     // Indigo - Direct dependency
          api: "#06B6D4",        // Cyan - API Endpoint / Route
          component: "#A855F7",  // Purple - JSX Render
          test: "#10B981",       // Emerald - Test Suite
          db: "#F59E0B",         // Amber - Model / Schema
          danger: "#EF4444",     // Red - High Blast Radius
          warning: "#F59E0B",    // Amber - Medium Blast Radius
          info: "#3B82F6",       // Blue - Indirect Transitive
        },
        // Obsidian Surface Tokens
        obsidian: {
          950: "#06090F",
          900: "#080C14",
          850: "#0B101B",
          800: "#0E1524",
          750: "#131D31",
          700: "#1A263F",
          600: "#243354",
        },
        // Retained brand palette
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          900: "#312e81",
        },
      },
    },
  },
  plugins: [],
};
