import ts from "typescript";
import type { SymbolEntity } from "@repomind/shared-types";

export interface ExtractedImport {
  moduleSpecifier: string;
  importedSymbols: string[];
  isDefault: boolean;
  isNamespace: boolean;
  line: number;
  snippet: string;
}

export interface ExtractedCall {
  callee: string;
  callerSymbol?: string;
  line: number;
  snippet: string;
}

export interface ExtractedRender {
  componentName: string;
  line: number;
  snippet: string;
}

export interface ExtractedEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "ALL";
  path: string;
  line: number;
  handlerSymbol?: string;
}

export interface ExtractedApiCall {
  method?: string;
  endpointUrl: string;
  line: number;
  snippet: string;
}

export interface FileAstAnalysis {
  filePath: string;
  language: "typescript" | "javascript" | "tsx" | "jsx";
  symbols: SymbolEntity[];
  imports: ExtractedImport[];
  calls: ExtractedCall[];
  renders: ExtractedRender[];
  endpoints: ExtractedEndpoint[];
  apiCalls: ExtractedApiCall[];
  heritage: Array<{ subClass: string; superClass: string; type: "extends" | "implements"; line: number }>;
  isTestFile: boolean;
  testedModules: string[];
}

export class TypeScriptAstAnalyzer {
  /**
   * Deterministically parses a TypeScript or JavaScript source file using the TS Compiler AST.
   */
  public analyzeSource(filePath: string, sourceCode: string): FileAstAnalysis {
    const isTsx = filePath.endsWith(".tsx");
    const isJsx = filePath.endsWith(".jsx");
    const isTs = filePath.endsWith(".ts") || isTsx;
    const scriptKind = isTsx ? ts.ScriptKind.TSX : isJsx ? ts.ScriptKind.JSX : isTs ? ts.ScriptKind.TS : ts.ScriptKind.JS;

    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true,
      scriptKind
    );

    const symbols: SymbolEntity[] = [];
    const imports: ExtractedImport[] = [];
    const calls: ExtractedCall[] = [];
    const renders: ExtractedRender[] = [];
    const endpoints: ExtractedEndpoint[] = [];
    const apiCalls: ExtractedApiCall[] = [];
    const heritage: Array<{ subClass: string; superClass: string; type: "extends" | "implements"; line: number }> = [];
    const testedModules: string[] = [];

    const isTestFile =
      filePath.includes(".test.") ||
      filePath.includes(".spec.") ||
      filePath.includes("__tests__") ||
      filePath.startsWith("test/") ||
      filePath.startsWith("tests/");

    let currentScope: string | undefined = undefined;

    const getLine = (pos: number) => {
      return sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
    };

    const getSnippet = (node: ts.Node, maxLen = 120) => {
      const text = node.getText(sourceFile).replace(/\s+/g, " ").trim();
      return text.length > maxLen ? text.substring(0, maxLen) + "..." : text;
    };

    const visit = (node: ts.Node) => {
      // 1. Static Import Declarations: import { x } from "./y"
      if (ts.isImportDeclaration(node)) {
        if (ts.isStringLiteral(node.moduleSpecifier)) {
          const modPath = node.moduleSpecifier.text;
          const importedSymbols: string[] = [];
          let isDefault = false;
          let isNamespace = false;

          if (node.importClause) {
            if (node.importClause.name) {
              isDefault = true;
              importedSymbols.push(node.importClause.name.text);
            }
            if (node.importClause.namedBindings) {
              if (ts.isNamespaceImport(node.importClause.namedBindings)) {
                isNamespace = true;
                importedSymbols.push(node.importClause.namedBindings.name.text);
              } else if (ts.isNamedImports(node.importClause.namedBindings)) {
                node.importClause.namedBindings.elements.forEach((el) => {
                  importedSymbols.push(el.name.text);
                });
              }
            }
          }

          imports.push({
            moduleSpecifier: modPath,
            importedSymbols,
            isDefault,
            isNamespace,
            line: getLine(node.getStart(sourceFile)),
            snippet: getSnippet(node),
          });

          if (isTestFile && modPath.startsWith(".")) {
            testedModules.push(modPath);
          }
        }
      }

      // 2. CommonJS require("...") or dynamic import("...")
      if (ts.isCallExpression(node)) {
        const expressionText = node.expression.getText(sourceFile);

        if ((expressionText === "require" || expressionText === "import") && node.arguments.length > 0) {
          const firstArg = node.arguments[0];
          if (ts.isStringLiteral(firstArg)) {
            imports.push({
              moduleSpecifier: firstArg.text,
              importedSymbols: [],
              isDefault: true,
              isNamespace: false,
              line: getLine(node.getStart(sourceFile)),
              snippet: getSnippet(node),
            });
            if (isTestFile && firstArg.text.startsWith(".")) {
              testedModules.push(firstArg.text);
            }
          }
        }

        // Express route handlers: app.get("/api/users", ...), router.post(...)
        if (ts.isPropertyAccessExpression(node.expression)) {
          const propName = node.expression.name.text.toLowerCase();
          const objName = node.expression.expression.getText(sourceFile);
          const validMethods = ["get", "post", "put", "delete", "patch", "all"];

          if (
            (objName === "app" || objName === "router" || objName.includes("Router")) &&
            validMethods.includes(propName) &&
            node.arguments.length >= 1
          ) {
            const firstArg = node.arguments[0];
            if (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg)) {
              endpoints.push({
                method: propName.toUpperCase() as any,
                path: firstArg.text,
                line: getLine(node.getStart(sourceFile)),
                handlerSymbol: currentScope,
              });
            }
          }

          // Client API Calls: fetch("/api/..."), axios.get("/api/...")
          if (
            (objName === "axios" || objName === "client" || objName === "api") &&
            validMethods.includes(propName) &&
            node.arguments.length >= 1
          ) {
            const arg = node.arguments[0];
            if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
              apiCalls.push({
                method: propName.toUpperCase(),
                endpointUrl: arg.text,
                line: getLine(node.getStart(sourceFile)),
                snippet: getSnippet(node),
              });
            }
          }
        }

        if (expressionText === "fetch" && node.arguments.length >= 1) {
          const arg = node.arguments[0];
          if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
            apiCalls.push({
              method: "GET",
              endpointUrl: arg.text,
              line: getLine(node.getStart(sourceFile)),
              snippet: getSnippet(node),
            });
          }
        }

        // General function / method call recording
        const calleeText = node.expression.getText(sourceFile);
        if (
          calleeText.length < 60 &&
          !calleeText.includes("\n") &&
          !["console.log", "console.error", "console.warn", "require", "import"].includes(calleeText)
        ) {
          calls.push({
            callee: calleeText,
            callerSymbol: currentScope,
            line: getLine(node.getStart(sourceFile)),
            snippet: getSnippet(node),
          });
        }
      }

      // 3. Functions & Methods
      if (ts.isFunctionDeclaration(node) && node.name) {
        const name = node.name.text;
        const startLine = getLine(node.getStart(sourceFile));
        const endLine = getLine(node.getEnd());
        const previousScope = currentScope;
        currentScope = name;

        symbols.push({
          id: `sym_${filePath}_${name}_L${startLine}`,
          fileId: filePath,
          name,
          type: isTestFile ? "test" : "function",
          startLine,
          endLine,
          signature: node.getText(sourceFile).split(/\{|=>/)[0].trim(),
        });

        ts.forEachChild(node, visit);
        currentScope = previousScope;
        return;
      }

      // Variable statements with Arrow Functions or React Functional Components
      if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.forEach((decl) => {
          if (
            decl.initializer &&
            (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) &&
            ts.isIdentifier(decl.name)
          ) {
            const name = decl.name.text;
            const startLine = getLine(decl.getStart(sourceFile));
            const endLine = getLine(decl.getEnd());
            const isComponent = /^[A-Z]/.test(name);

            symbols.push({
              id: `sym_${filePath}_${name}_L${startLine}`,
              fileId: filePath,
              name,
              type: isComponent ? "component" : "function",
              startLine,
              endLine,
              signature: `const ${name} = (...) => ...`,
            });
          }
        });
      }

      // 4. Classes & Interfaces
      if (ts.isClassDeclaration(node) && node.name) {
        const className = node.name.text;
        const startLine = getLine(node.getStart(sourceFile));
        const endLine = getLine(node.getEnd());
        const previousScope = currentScope;
        currentScope = className;

        symbols.push({
          id: `sym_${filePath}_${className}_L${startLine}`,
          fileId: filePath,
          name: className,
          type: "class",
          startLine,
          endLine,
          signature: `class ${className}`,
        });

        // Heritage: extends / implements
        if (node.heritageClauses) {
          node.heritageClauses.forEach((hc) => {
            const isImplements = hc.token === ts.SyntaxKind.ImplementsKeyword;
            hc.types.forEach((t) => {
              heritage.push({
                subClass: className,
                superClass: t.expression.getText(sourceFile),
                type: isImplements ? "implements" : "extends",
                line: getLine(t.getStart(sourceFile)),
              });
            });
          });
        }

        ts.forEachChild(node, visit);
        currentScope = previousScope;
        return;
      }

      if (ts.isInterfaceDeclaration(node)) {
        const name = node.name.text;
        symbols.push({
          id: `sym_${filePath}_${name}_L${getLine(node.getStart(sourceFile))}`,
          fileId: filePath,
          name,
          type: "interface",
          startLine: getLine(node.getStart(sourceFile)),
          endLine: getLine(node.getEnd()),
          signature: `interface ${name}`,
        });
      }

      if (ts.isTypeAliasDeclaration(node)) {
        const name = node.name.text;
        symbols.push({
          id: `sym_${filePath}_${name}_L${getLine(node.getStart(sourceFile))}`,
          fileId: filePath,
          name,
          type: "type",
          startLine: getLine(node.getStart(sourceFile)),
          endLine: getLine(node.getEnd()),
          signature: `type ${name}`,
        });
      }

      // 5. JSX Renders: <UserCard ... /> or <Modal ... />
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(sourceFile);
        // Only consider custom components (starts with uppercase)
        if (/^[A-Z]/.test(tag)) {
          renders.push({
            componentName: tag,
            line: getLine(node.getStart(sourceFile)),
            snippet: getSnippet(node),
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return {
      filePath,
      language: isTsx ? "tsx" : isJsx ? "jsx" : isTs ? "typescript" : "javascript",
      symbols,
      imports,
      calls,
      renders,
      endpoints,
      apiCalls,
      heritage,
      isTestFile,
      testedModules,
    };
  }
}

export const typeScriptAstAnalyzer = new TypeScriptAstAnalyzer();
