import ts from "typescript";
import crypto from "node:crypto";
import type { ChunkType, ContextualHeader } from "@repomind/shared-types";

export interface ParsedChunk {
  symbolName?: string;
  startLine: number;
  endLine: number;
  content: string;
  contentHash: string;
  chunkType: ChunkType;
  header: ContextualHeader;
}

const MAX_CHUNK_LINES = 60;
const MAX_CHUNK_CHARS = 1600;

/**
 * Computes SHA-256 hash of normalized content.
 */
function hashContent(content: string): string {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex");
}

/**
 * Builds a lightweight contextual header prepended to the chunk.
 */
export function formatContextualHeader(header: ContextualHeader): string {
  const symbolPart = header.symbolName ? ` | Symbol: ${header.symbolName} (${header.scope || "symbol"})` : "";
  const base = `Repo: ${header.repository} | Path: ${header.path}${symbolPart} | Language: ${header.language}`;

  const lang = header.language.toLowerCase();
  if (lang === "python" || lang === "shell" || lang === "yaml" || lang === "dockerfile") {
    return `# ${base}\n`;
  }
  if (lang === "sql") {
    return `-- ${base}\n`;
  }
  if (lang === "html" || lang === "markdown") {
    return `<!-- ${base} -->\n`;
  }
  return `// ${base}\n`;
}

/**
 * Splits an oversized symbol (> 60 lines or > 1600 chars) into logical sub-blocks while preserving parent metadata.
 */
function splitOversizedChunk(
  repoName: string,
  filePath: string,
  language: string,
  symbolName: string,
  chunkType: ChunkType,
  lines: string[],
  startLineOffset: number,
): ParsedChunk[] {
  const subChunks: ParsedChunk[] = [];
  const chunkSize = 40;
  const overlap = 8;

  let currentStart = 0;
  let partIndex = 1;

  while (currentStart < lines.length) {
    const currentEnd = Math.min(currentStart + chunkSize, lines.length);
    const sliceLines = lines.slice(currentStart, currentEnd);
    const content = sliceLines.join("\n");

    const chunkStartLine = startLineOffset + currentStart;
    const chunkEndLine = startLineOffset + currentEnd - 1;

    const subSymbolName = `${symbolName} [Part ${partIndex}]`;
    const header: ContextualHeader = {
      repository: repoName,
      path: filePath,
      symbolName: subSymbolName,
      language,
      scope: symbolName,
    };

    subChunks.push({
      symbolName: subSymbolName,
      startLine: chunkStartLine,
      endLine: chunkEndLine,
      content,
      contentHash: hashContent(content),
      chunkType,
      header,
    });

    if (currentEnd >= lines.length) break;
    currentStart += chunkSize - overlap;
    partIndex++;
  }

  return subChunks;
}

/**
 * Chunks TypeScript/JavaScript code using the TypeScript Compiler API AST.
 */
function chunkTypeScriptAST(
  repoName: string,
  filePath: string,
  language: string,
  sourceCode: string,
): ParsedChunk[] {
  const chunks: ParsedChunk[] = [];
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") || filePath.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const lines = sourceCode.split(/\r?\n/);
  const coveredRanges: Array<{ start: number; end: number }> = [];

  function addChunk(node: ts.Node, name: string, type: ChunkType, scope?: string) {
    const startPos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    const endPos = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

    const startLine = startPos.line + 1;
    const endLine = endPos.line + 1;

    // Check bounds
    const chunkLines = lines.slice(startPos.line, endPos.line + 1);
    const content = chunkLines.join("\n");

    coveredRanges.push({ start: startLine, end: endLine });

    if (chunkLines.length > MAX_CHUNK_LINES || content.length > MAX_CHUNK_CHARS) {
      const subChunks = splitOversizedChunk(
        repoName,
        filePath,
        language,
        name,
        type,
        chunkLines,
        startLine,
      );
      chunks.push(...subChunks);
      return;
    }

    const header: ContextualHeader = {
      repository: repoName,
      path: filePath,
      symbolName: name,
      language,
      scope: scope || type,
    };

    chunks.push({
      symbolName: name,
      startLine,
      endLine,
      content,
      contentHash: hashContent(content),
      chunkType: type,
      header,
    });
  }

  function visit(node: ts.Node, parentClass?: string) {
    if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.text;
      // If class is small, chunk as whole class. If large, chunk methods individually.
      const startPos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      const endPos = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
      const classLineCount = endPos.line - startPos.line + 1;

      if (classLineCount <= MAX_CHUNK_LINES) {
        addChunk(node, className, "class");
      } else {
        // Chunk methods individually
        node.members.forEach((member) => {
          if (ts.isMethodDeclaration(member) && member.name) {
            const methodName = member.name.getText(sourceFile);
            addChunk(member, `${className}.${methodName}`, "method", className);
          }
        });
      }
    } else if (ts.isFunctionDeclaration(node) && node.name) {
      addChunk(node, node.name.text, "function");
    } else if (ts.isInterfaceDeclaration(node)) {
      addChunk(node, node.name.text, "interface");
    } else if (ts.isTypeAliasDeclaration(node)) {
      addChunk(node, node.name.text, "type");
    } else if (ts.isVariableStatement(node)) {
      // Check for arrow functions: const foo = () => ...
      node.declarationList.declarations.forEach((decl) => {
        if (decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) {
          addChunk(node, decl.name.getText(sourceFile), "function");
        }
      });
    }

    ts.forEachChild(node, (child) => visit(child, parentClass));
  }

  visit(sourceFile);

  // If no AST symbols extracted (or file has extra top-level code), capture residual blocks
  if (chunks.length === 0) {
    return chunkSlidingWindow(repoName, filePath, language, sourceCode);
  }

  return chunks;
}

/**
 * Chunks Python code using indentation-aware block scanner for functions and classes.
 */
function chunkPythonAST(
  repoName: string,
  filePath: string,
  language: string,
  sourceCode: string,
): ParsedChunk[] {
  const lines = sourceCode.split(/\r?\n/);
  const chunks: ParsedChunk[] = [];

  let currentSymbol: { name: string; type: ChunkType; startLine: number; indent: number } | null = null;
  let symbolLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;

    // Detect class or def at root or inside class
    const isDef = trimmed.startsWith("def ") || trimmed.startsWith("async def ");
    const isClass = trimmed.startsWith("class ");

    if ((isDef || isClass) && (currentSymbol === null || indent <= currentSymbol.indent)) {
      if (currentSymbol && symbolLines.length > 0) {
        // Save previous symbol
        const content = symbolLines.join("\n");
        const endLine = currentSymbol.startLine + symbolLines.length - 1;
        chunks.push({
          symbolName: currentSymbol.name,
          startLine: currentSymbol.startLine,
          endLine,
          content,
          contentHash: hashContent(content),
          chunkType: currentSymbol.type,
          header: {
            repository: repoName,
            path: filePath,
            symbolName: currentSymbol.name,
            language,
            scope: currentSymbol.type,
          },
        });
      }

      const match = trimmed.match(/^(?:async\s+)?(?:def|class)\s+([a-zA-Z0-9_]+)/);
      const name = match ? match[1] : `symbol_L${i + 1}`;
      const type: ChunkType = isClass ? "class" : "function";

      currentSymbol = { name, type, startLine: i + 1, indent };
      symbolLines = [line];
    } else if (currentSymbol) {
      symbolLines.push(line);
    }
  }

  // Flush last symbol
  if (currentSymbol && symbolLines.length > 0) {
    const content = symbolLines.join("\n");
    chunks.push({
      symbolName: currentSymbol.name,
      startLine: currentSymbol.startLine,
      endLine: currentSymbol.startLine + symbolLines.length - 1,
      content,
      contentHash: hashContent(content),
      chunkType: currentSymbol.type,
      header: {
        repository: repoName,
        path: filePath,
        symbolName: currentSymbol.name,
        language,
        scope: currentSymbol.type,
      },
    });
  }

  if (chunks.length === 0) {
    return chunkSlidingWindow(repoName, filePath, language, sourceCode);
  }

  return chunks;
}

/**
 * Sliding window chunker with overlap for flat files, documentation, and generic scripts.
 */
function chunkSlidingWindow(
  repoName: string,
  filePath: string,
  language: string,
  sourceCode: string,
): ParsedChunk[] {
  const lines = sourceCode.split(/\r?\n/);
  const chunks: ParsedChunk[] = [];
  const chunkSize = 40;
  const overlap = 8;

  let currentStart = 0;
  let partIndex = 1;

  while (currentStart < lines.length) {
    const currentEnd = Math.min(currentStart + chunkSize, lines.length);
    const sliceLines = lines.slice(currentStart, currentEnd);
    const content = sliceLines.join("\n");

    const startLine = currentStart + 1;
    const endLine = currentEnd;
    const name = `block_${partIndex}`;

    chunks.push({
      symbolName: name,
      startLine,
      endLine,
      content,
      contentHash: hashContent(content),
      chunkType: "block",
      header: {
        repository: repoName,
        path: filePath,
        symbolName: name,
        language,
      },
    });

    if (currentEnd >= lines.length) break;
    currentStart += chunkSize - overlap;
    partIndex++;
  }

  return chunks;
}

/**
 * Main entrypoint for code-aware AST chunking.
 */
export function chunkCodeFile(
  repoName: string,
  filePath: string,
  language: string,
  sourceCode: string,
): ParsedChunk[] {
  const lang = language.toLowerCase();

  if (lang === "typescript" || lang === "javascript") {
    return chunkTypeScriptAST(repoName, filePath, language, sourceCode);
  }

  if (lang === "python") {
    return chunkPythonAST(repoName, filePath, language, sourceCode);
  }

  return chunkSlidingWindow(repoName, filePath, language, sourceCode);
}
