import path from "node:path";

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp", ".bmp", ".tiff",
  ".pdf", ".zip", ".tar", ".gz", ".rar", ".7z", ".bz2",
  ".exe", ".dll", ".so", ".dylib", ".bin", ".wasm",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".mp3", ".mp4", ".mov", ".avi", ".mkv", ".wav",
  ".pyc", ".class", ".o", ".obj",
]);

const EXCLUDED_DIRECTORIES = [
  "node_modules/",
  "vendor/",
  "dist/",
  "build/",
  ".git/",
  ".next/",
  "coverage/",
  ".turbo/",
  "out/",
  "target/",
  ".cache/",
  ".idea/",
  ".vscode/",
  "__pycache__/",
  ".serverless/",
];

const EXCLUDED_FILENAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "composer.lock",
  "gemfile.lock",
  "cargo.lock",
  "poetry.lock",
]);

const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB limit

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".c": "c",
  ".h": "c",
  ".cpp": "cpp",
  ".hpp": "cpp",
  ".cc": "cpp",
  ".cs": "csharp",
  ".rb": "ruby",
  ".php": "php",
  ".swift": "swift",
  ".kt": "kotlin",
  ".scala": "scala",
  ".sh": "shell",
  ".bash": "shell",
  ".zsh": "shell",
  ".sql": "sql",
  ".html": "html",
  ".css": "css",
  ".scss": "scss",
  ".json": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".md": "markdown",
  ".dockerfile": "dockerfile",
};

/**
 * Checks if a repository file should be ingested based on extension, path, size, and vendor filters.
 */
export function shouldIngestFile(filePath: string, sizeBytes?: number): boolean {
  // Normalize path separators to forward slash
  const normalizedPath = filePath.replace(/\\/g, "/");
  const fileName = path.basename(normalizedPath).toLowerCase();
  const ext = path.extname(normalizedPath).toLowerCase();

  // 1. Check max size
  if (sizeBytes !== undefined && sizeBytes > MAX_FILE_SIZE_BYTES) {
    return false;
  }

  // 2. Check binary extensions
  if (BINARY_EXTENSIONS.has(ext)) {
    return false;
  }

  // 3. Check minified bundles & source maps
  if (fileName.endsWith(".min.js") || fileName.endsWith(".min.css") || fileName.endsWith(".map")) {
    return false;
  }

  // 4. Check excluded exact filenames (e.g. lockfiles)
  if (EXCLUDED_FILENAMES.has(fileName)) {
    return false;
  }

  // 5. Check vendor and generated directories
  for (const dir of EXCLUDED_DIRECTORIES) {
    if (normalizedPath.startsWith(dir) || normalizedPath.includes(`/${dir}`)) {
      return false;
    }
  }

  return true;
}

/**
 * Detects programming language based on file extension and special filenames.
 */
export function detectLanguage(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  const fileName = path.basename(normalized);
  const ext = path.extname(normalized);

  if (fileName === "dockerfile") return "dockerfile";
  if (fileName === "makefile") return "makefile";

  return EXTENSION_LANGUAGE_MAP[ext] || "plaintext";
}
