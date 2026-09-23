import { typeScriptAstAnalyzer } from "../src/modules/architecture/analyzer/ts-ast-analyzer.js";
import { pythonAstAnalyzer } from "../src/modules/architecture/analyzer/python-analyzer.js";
import { dependencyNormalizer } from "../src/modules/architecture/analyzer/dependency-normalizer.js";
import { GraphTraversalEngine } from "../src/modules/architecture/graph-traversal.js";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

async function runTests() {
  console.log("\n==============================================");
  console.log("RepoMind Architecture & Impact Engine Tests");
  console.log("==============================================\n");

  // TEST 1: TypeScript AST Analyzer
  console.log("[Test 1] Testing TypeScript AST Analyzer...");
  const sampleUserService = `
import { hashData } from "../utils/crypto.js";
import { UserModel } from "../models/user.model.js";

export class UserService {
  public async getUser(userId: string) {
    const user = await UserModel.findById(userId);
    return user;
  }

  public validateUser(token: string): boolean {
    return token.length > 10;
  }
}

export function formatUserName(u: { firstName: string; lastName: string }): string {
  return \`\${u.firstName} \${u.lastName}\`;
}
`;

  const tsAnalysis = typeScriptAstAnalyzer.analyzeSource("src/services/userService.ts", sampleUserService);
  assert(tsAnalysis.imports.length === 2, "Extracted 2 import declarations from userService.ts");
  assert(tsAnalysis.imports.some((i) => i.moduleSpecifier === "../utils/crypto.js"), "Identified crypto utility import");
  assert(tsAnalysis.symbols.some((s) => s.name === "UserService"), "Extracted UserService class symbol");
  assert(tsAnalysis.symbols.some((s) => s.name === "formatUserName"), "Extracted formatUserName function symbol");

  // TEST 2: React Component & Render Extraction
  console.log("\n[Test 2] Testing JSX Component & Render Analyzer...");
  const sampleUserCard = `
import React from "react";
import { formatUserName } from "../services/userService.js";
import { Avatar } from "./Avatar.jsx";

export const UserCard = ({ user }) => {
  const name = formatUserName(user);
  return (
    <div className="card">
      <Avatar user={user} />
      <h3>{name}</h3>
    </div>
  );
};
`;

  const jsxAnalysis = typeScriptAstAnalyzer.analyzeSource("src/components/UserCard.jsx", sampleUserCard);
  assert(jsxAnalysis.renders.some((r) => r.componentName === "Avatar"), "Identified <Avatar /> component render in UserCard.jsx");
  assert(jsxAnalysis.calls.some((c) => c.callee === "formatUserName"), "Identified function call to formatUserName");

  // TEST 3: Express Router & API Endpoint Extraction
  console.log("\n[Test 3] Testing Express Router Endpoint Analyzer...");
  const sampleRouter = `
import express from "express";
import { UserService } from "../services/userService.js";

export const userRouter = express.Router();
userRouter.get("/api/users/:id", async (req, res) => {
  const service = new UserService();
  const user = await service.getUser(req.params.id);
  res.json(user);
});
`;

  const routerAnalysis = typeScriptAstAnalyzer.analyzeSource("src/routes/user.router.ts", sampleRouter);
  assert(routerAnalysis.endpoints.length === 1, "Extracted 1 REST route endpoint");
  assert(routerAnalysis.endpoints[0].path === "/api/users/:id", "Extracted endpoint path /api/users/:id");

  // TEST 4: Python Analyzer
  console.log("\n[Test 4] Testing Python AST Analyzer...");
  const samplePyCode = `
from .services import AuthService
from fastapi import FastAPI

app = FastAPI()

@app.get("/api/v1/auth/status")
def get_auth_status():
    auth = AuthService()
    return auth.check()
`;

  const pyAnalysis = pythonAstAnalyzer.analyzeSource("api/auth_router.py", samplePyCode);
  assert(pyAnalysis.imports.some((i) => i.moduleSpecifier === ".services"), "Extracted Python relative import");
  assert(pyAnalysis.endpoints.some((e) => e.path === "/api/v1/auth/status"), "Extracted Python FastAPI route decorator");

  // TEST 5: Test File Detection & Target Linking
  console.log("\n[Test 5] Testing Test Suite Analyzer...");
  const sampleTestCode = `
import { UserService } from "../services/userService.js";

describe("UserService", () => {
  it("should validate valid tokens", () => {
    const s = new UserService();
    expect(s.validateUser("long_valid_token_123")).toBe(true);
  });
});
`;

  const testAnalysis = typeScriptAstAnalyzer.analyzeSource("tests/userService.test.ts", sampleTestCode);
  assert(testAnalysis.isTestFile === true, "Flagged file as test suite");
  assert(testAnalysis.testedModules.includes("../services/userService.js"), "Identified target module under test");

  // TEST 6: Dependency Normalizer & Graph Construction
  console.log("\n[Test 6] Testing Dependency Normalizer...");
  const allAnalyses = [tsAnalysis, jsxAnalysis, routerAnalysis, pyAnalysis, testAnalysis];
  const fileLinesMap = new Map<string, number>([
    ["src/services/userService.ts", 40],
    ["src/components/UserCard.jsx", 25],
    ["src/routes/user.router.ts", 30],
    ["api/auth_router.py", 20],
    ["tests/userService.test.ts", 35],
  ]);

  const { nodes, edges } = dependencyNormalizer.normalize(allAnalyses, fileLinesMap);
  assert(nodes.length === 5, `Normalized ${nodes.length} graph nodes`);
  assert(edges.length >= 3, `Extracted ${edges.length} directed relationships`);

  // Verify Typed Edges
  const userCardToServiceEdge = edges.find((e) => e.source.includes("UserCard") && e.target.includes("userService"));
  assert(userCardToServiceEdge !== undefined, "Extracted UserCard.jsx -> userService.ts dependency edge");
  assert(userCardToServiceEdge?.evidence?.sourceLine !== undefined, "Attached source line evidence to dependency edge");

  const testEdge = edges.find((e) => e.type === "TESTS" && e.target.includes("userService"));
  assert(testEdge !== undefined && testEdge.type === "TESTS", "Extracted TESTS relationship edge from test file");

  // TEST 7: Graph Traversal & Deterministic Impact Engine
  console.log("\n[Test 7] Testing Deterministic Impact Analysis Engine...");
  const traversal = new GraphTraversalEngine(nodes, edges);
  const userServNode = nodes.find((n) => n.path === "src/services/userService.ts")!;

  const impact = traversal.analyzeImpact("repo_test", userServNode.id, "modify");
  assert(impact.totalAffected >= 2, `Computed impact blast radius of ${impact.totalAffected} affected files`);
  assert(impact.highImpact.some((e) => e.path.includes("UserCard.jsx")), "UserCard.jsx classified as HIGH IMPACT");
  assert(impact.highImpact.some((e) => e.type === "test"), "Dedicated test file classified as HIGH IMPACT");
  assert(impact.recommendedValidations.length > 0, "Generated recommended validation checklist");

  console.log("\n==============================================");
  console.log("✅ ALL ARCHITECTURE & IMPACT ENGINE TESTS PASSED");
  console.log("==============================================\n");
}

runTests().catch((e) => {
  console.error("Test execution error:", e);
  process.exit(1);
});
