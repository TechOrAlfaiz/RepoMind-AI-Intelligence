import type { SymbolEntity } from "@repomind/shared-types";
import type { ExtractedImport, ExtractedCall, ExtractedEndpoint, FileAstAnalysis } from "./ts-ast-analyzer.js";

export class PythonAstAnalyzer {
  /**
   * Deterministically parses a Python file using line/block lexical scanning.
   */
  public analyzeSource(filePath: string, sourceCode: string): FileAstAnalysis {
    const lines = sourceCode.split(/\r?\n/);
    const symbols: SymbolEntity[] = [];
    const imports: ExtractedImport[] = [];
    const calls: ExtractedCall[] = [];
    const endpoints: ExtractedEndpoint[] = [];
    const testedModules: string[] = [];

    const isTestFile =
      filePath.includes("test_") ||
      filePath.includes("_test.py") ||
      filePath.startsWith("tests/") ||
      filePath.startsWith("test/");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const lineNum = i + 1;

      // 1. Imports: import os, sys | from .auth import AuthService
      if (trimmed.startsWith("import ") || trimmed.startsWith("from ")) {
        let modSpecifier = "";
        const importedSymbols: string[] = [];

        if (trimmed.startsWith("from ")) {
          const fromMatch = trimmed.match(/^from\s+([.\w]+)\s+import\s+([\w\s,*]+)/);
          if (fromMatch) {
            modSpecifier = fromMatch[1];
            const syms = fromMatch[2].split(",").map((s) => s.trim().split(/\s+as\s+/)[0]);
            importedSymbols.push(...syms);
          }
        } else {
          const importMatch = trimmed.match(/^import\s+([.\w]+)/);
          if (importMatch) {
            modSpecifier = importMatch[1];
            importedSymbols.push(modSpecifier);
          }
        }

        if (modSpecifier) {
          imports.push({
            moduleSpecifier: modSpecifier,
            importedSymbols,
            isDefault: false,
            isNamespace: false,
            line: lineNum,
            snippet: line.trim(),
          });

          if (isTestFile && (modSpecifier.startsWith(".") || !modSpecifier.includes("pytest"))) {
            testedModules.push(modSpecifier);
          }
        }
      }

      // 2. Route Decorators: @app.get("/api/v1/users")
      if (trimmed.startsWith("@") && (trimmed.includes(".get(") || trimmed.includes(".post(") || trimmed.includes(".put(") || trimmed.includes(".delete("))) {
        const routeMatch = trimmed.match(/@(\w+)\.(get|post|put|delete)\(\s*["']([^"']+)["']/i);
        if (routeMatch) {
          endpoints.push({
            method: routeMatch[2].toUpperCase() as any,
            path: routeMatch[3],
            line: lineNum,
          });
        }
      }

      // 3. Functions and Classes
      if (trimmed.startsWith("def ") || trimmed.startsWith("async def ")) {
        const fnMatch = trimmed.match(/^(?:async\s+)?def\s+([a-zA-Z0-9_]+)/);
        if (fnMatch) {
          const name = fnMatch[1];
          symbols.push({
            id: `sym_${filePath}_${name}_L${lineNum}`,
            fileId: filePath,
            name,
            type: isTestFile || name.startsWith("test_") ? "test" : "function",
            startLine: lineNum,
            endLine: lineNum, // block scanner will refine if multi-line
            signature: trimmed.split(":")[0],
          });
        }
      } else if (trimmed.startsWith("class ")) {
        const classMatch = trimmed.match(/^class\s+([a-zA-Z0-9_]+)/);
        if (classMatch) {
          const name = classMatch[1];
          symbols.push({
            id: `sym_${filePath}_${name}_L${lineNum}`,
            fileId: filePath,
            name,
            type: "class",
            startLine: lineNum,
            endLine: lineNum,
            signature: trimmed.split(":")[0],
          });
        }
      }

      // 4. Calls: my_service.do_something()
      const callMatch = trimmed.match(/([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)?)\s*\(/);
      if (callMatch && !["if", "for", "while", "def", "class", "print", "len", "range"].includes(callMatch[1])) {
        calls.push({
          callee: callMatch[1],
          line: lineNum,
          snippet: trimmed.substring(0, 100),
        });
      }
    }

    return {
      filePath,
      language: "javascript", // mapped for shared representation
      symbols,
      imports,
      calls,
      renders: [],
      endpoints,
      apiCalls: [],
      heritage: [],
      isTestFile,
      testedModules,
    };
  }
}

export const pythonAstAnalyzer = new PythonAstAnalyzer();
