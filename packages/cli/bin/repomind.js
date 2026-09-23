#!/usr/bin/env node

/**
 * RepoMind CLI Companion
 * Terminal & CI interface for Code RAG, Health Analysis, and Onboarding Playbooks.
 */

const DEFAULT_API_URL = process.env.REPOMIND_API_URL || "http://localhost:3000";

// ANSI Terminal Colors
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const MAGENTA = "\x1b[35m";
const RED = "\x1b[31m";
const BLUE = "\x1b[34m";

function printBanner() {
  console.log(`
${CYAN}${BOLD}╔═══════════════════════════════════════════════════════════╗
║                 RepoMind CLI Companion                    ║
║      Engineering Intelligence & Line-Level Cited RAG      ║
╚═══════════════════════════════════════════════════════════╝${RESET}
`);
}

function printHelp() {
  printBanner();
  console.log(`${BOLD}USAGE:${RESET}`);
  console.log(`  $ repomind <command> [options]\n`);
  console.log(`${BOLD}COMMANDS:${RESET}`);
  console.log(`  ${GREEN}ask${RESET} "<question>"       Ask a cited RAG question across a repository`);
  console.log(`  ${GREEN}health${RESET} <repoId>          Inspect repository health score, test coverage & churn`);
  console.log(`  ${GREEN}playbook${RESET} <repoId>        Generate pedagogical onboarding reading roadmap`);
  console.log(`  ${GREEN}help${RESET}                    Show this help guide\n`);
  console.log(`${BOLD}OPTIONS:${RESET}`);
  console.log(`  --repo <repoId>         Target repository ID (Required for ask)`);
  console.log(`  --commit <sha>          Pin Time Machine query to a historical commit SHA`);
  console.log(`  --api <url>             RepoMind API endpoint (default: http://localhost:3000)`);
  console.log(`  --json                  Output raw JSON response for CI/CD scripting\n`);
  console.log(`${BOLD}EXAMPLES:${RESET}`);
  console.log(`  $ repomind ask "Where is JWT token signing handled?" --repo repo-1`);
  console.log(`  $ repomind ask "How was auth implemented before v2?" --repo repo-1 --commit 7a8b9c0`);
  console.log(`  $ repomind health repo-1`);
  console.log(`  $ repomind playbook repo-1\n`);
}

function parseArgs(args) {
  const parsed = {
    command: args[0] || "help",
    positional: [],
    flags: {},
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        parsed.flags[key] = next;
        i++;
      } else {
        parsed.flags[key] = true;
      }
    } else {
      parsed.positional.push(arg);
    }
  }

  return parsed;
}

async function handleAsk(parsed) {
  const question = parsed.positional[0] || parsed.flags.question;
  const repoId = parsed.flags.repo || parsed.positional[1];
  const commitSha = parsed.flags.commit;
  const apiUrl = parsed.flags.api || DEFAULT_API_URL;
  const isJson = Boolean(parsed.flags.json);

  if (!question) {
    console.error(`${RED}Error: Please provide a question string.${RESET}`);
    console.error(`Example: repomind ask "Where is token signing implemented?" --repo <id>`);
    process.exit(1);
  }

  if (!repoId) {
    console.error(`${RED}Error: Please specify target repository with --repo <repoId>${RESET}`);
    process.exit(1);
  }

  if (!isJson) {
    printBanner();
    console.log(`${CYAN}Querying repository ${BOLD}${repoId}${RESET}${commitSha ? ` (Time Machine: ${YELLOW}${commitSha.substring(0, 7)}${RESET})` : ""}...`);
    console.log(`${DIM}Question: "${question}"${RESET}\n`);
  }

  try {
    const endpoint = `${apiUrl}/api/repos/${repoId}/time-machine/ask`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: question,
        atCommitSha: commitSha,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API returned HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();

    if (isJson) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    console.log(`${GREEN}${BOLD}ANSWER:${RESET}`);
    console.log(data.answer);
    console.log("\n" + "─".repeat(60));

    if (data.citations && data.citations.length > 0) {
      console.log(`${MAGENTA}${BOLD}VALIDATED CODE CITATIONS (${data.citations.length}):${RESET}`);
      data.citations.forEach((c, idx) => {
        console.log(`  ${BOLD}[CTX-${c.contextIndex || idx + 1}]${RESET} ${CYAN}${c.filePath}${RESET} lines ${c.startLine}-${c.endLine} ${c.symbolName ? `(${c.symbolName})` : ""}`);
        if (c.snippet) {
          console.log(`${DIM}${c.snippet.split("\n").slice(0, 3).map((l) => "    " + l).join("\n")}${RESET}`);
        }
      });
    }

    console.log(`\n${DIM}Latency: ${data.trace?.latencyMs || 0}ms | Tokens: ${data.trace?.tokenUsage?.totalTokens || 0}${RESET}\n`);
  } catch (err) {
    console.error(`${RED}Command failed: ${err.message}${RESET}`);
    process.exit(1);
  }
}

async function handleHealth(parsed) {
  const repoId = parsed.positional[0] || parsed.flags.repo || parsed.flags.repoId;
  const apiUrl = parsed.flags.api || parsed.flags.apiUrl || DEFAULT_API_URL;
  const isJson = Boolean(parsed.flags.json);

  if (!repoId) {
    console.error(`${RED}Error: Please specify repository ID. Example: repomind health <repoId>${RESET}`);
    process.exit(1);
  }

  try {
    const endpoint = `${apiUrl}/api/repos/${repoId}/health`;
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`API returned HTTP ${res.status}: ${err}`);
    }

    const data = await res.json();

    if (isJson) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    printBanner();
    const gradeColor = data.grade === "A" ? GREEN : data.grade === "B" ? CYAN : data.grade === "C" ? YELLOW : RED;
    console.log(`${BOLD}Repository:${RESET} ${data.repositoryName} (${data.repositoryId})`);
    console.log(`${BOLD}Overall Health Score:${RESET} ${gradeColor}${BOLD}${data.overallScore}/100 [GRADE: ${data.grade}]${RESET}\n`);

    console.log(`${BOLD}METRICS BREAKDOWN:${RESET}`);
    console.log(`  • Test Coverage:        ${GREEN}${data.metrics.testCoverage.score}/100${RESET} - ${data.metrics.testCoverage.summary}`);
    console.log(`  • Documentation:        ${CYAN}${data.metrics.docCoverage.score}/100${RESET} - ${data.metrics.docCoverage.summary}`);
    console.log(`  • Dependency Freshness: ${BLUE}${data.metrics.dependencyFreshness.score}/100${RESET} - ${data.metrics.dependencyFreshness.summary}`);
    console.log(`  • Churn Stability:      ${MAGENTA}${data.metrics.codeChurnStability.score}/100${RESET} - ${data.metrics.codeChurnStability.summary}\n`);

    if (data.recommendations && data.recommendations.length > 0) {
      console.log(`${BOLD}RECOMMENDATIONS:${RESET}`);
      data.recommendations.forEach((r) => console.log(`  → ${r}`));
    }
    console.log();
  } catch (err) {
    console.error(`${RED}Failed to retrieve health score: ${err.message}${RESET}`);
    process.exit(1);
  }
}

async function handlePlaybook(parsed) {
  const repoId = parsed.positional[0] || parsed.flags.repo || parsed.flags.repoId;
  const apiUrl = parsed.flags.api || parsed.flags.apiUrl || DEFAULT_API_URL;
  const isJson = Boolean(parsed.flags.json);

  if (!repoId) {
    console.error(`${RED}Error: Please specify repository ID. Example: repomind playbook <repoId>${RESET}`);
    process.exit(1);
  }

  try {
    const endpoint = `${apiUrl}/api/repos/${repoId}/playbook`;
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`API returned HTTP ${res.status}: ${err}`);
    }

    const data = await res.json();

    if (isJson) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    printBanner();
    console.log(`${BOLD}ONBOARDING PLAYBOOK FOR:${RESET} ${CYAN}${data.repositoryName}${RESET}`);
    console.log(`${DIM}${data.summary}${RESET}`);
    console.log(`Estimated Reading Duration: ${BOLD}${data.totalEstimatedMinutes} minutes${RESET}\n`);

    data.steps.forEach((s) => {
      console.log(`${GREEN}Step ${s.rank}:${RESET} ${BOLD}${s.title}${RESET} ${DIM}(${s.estimatedMinutes}m · ${s.importance})${RESET}`);
      console.log(`  File: ${CYAN}${s.filePath}${RESET}${s.startLine ? ` (lines ${s.startLine}-${s.endLine})` : ""}`);
      console.log(`  Goal: ${s.readingGoal}`);
      if (s.snippet) {
        console.log(`${DIM}  Preview:\n${s.snippet.split("\n").slice(0, 2).map((l) => "    " + l).join("\n")}${RESET}`);
      }
      console.log();
    });
  } catch (err) {
    console.error(`${RED}Failed to generate playbook: ${err.message}${RESET}`);
    process.exit(1);
  }
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const parsed = parseArgs(rawArgs);

  switch (parsed.command.toLowerCase()) {
    case "ask":
      await handleAsk(parsed);
      break;
    case "health":
      await handleHealth(parsed);
      break;
    case "playbook":
      await handlePlaybook(parsed);
      break;
    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;
    default:
      console.error(`${RED}Unknown command: '${parsed.command}'${RESET}\n`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("CLI Execution Error:", err);
  process.exit(1);
});
