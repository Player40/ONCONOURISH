import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const outputPath = join(tmpdir(), `onconourish-eval-${process.pid}.json`);
const reportPath = join(process.cwd(), "docs", "EVAL_REPORT.md");
const args = ["exec", "vitest", "run", "src/evaluation", "--reporter=json", `--outputFile=${outputPath}`];
const result = spawnSync("pnpm", args, { encoding: "utf8" });
if (result.error) {
  writeFileSync(reportPath, `# Evaluation report\n\n**Result:** Runner failed before tests started.\n\n\`\`\`text\n${result.error.message}\n\`\`\`\n`);
  process.stderr.write(`${result.error.message}\n`);
  process.exitCode = 1;
} else {
  let reportData;
  let parseError;
  if (existsSync(outputPath)) {
    try {
      reportData = JSON.parse(readFileSync(outputPath, "utf8"));
    } catch (error) {
      parseError = error instanceof Error ? error.message : String(error);
    } finally {
      unlinkSync(outputPath);
    }
  }

  const failures = (reportData?.testResults ?? []).flatMap((suite) =>
    (suite.assertionResults ?? [])
      .filter((test) => test.status === "failed")
      .map((test) => ({
        name: test.fullName ?? test.title ?? "Unnamed scenario",
        file: suite.name ?? "Unknown test file",
        details: (test.failureMessages ?? []).join("\n").trim(),
      })),
  );
  const generatedAt = new Date().toISOString();
  const summary = reportData
    ? `- Test suites: ${reportData.numPassedTestSuites ?? 0} passed, ${reportData.numFailedTestSuites ?? 0} failed\n- Scenarios: ${reportData.numPassedTests ?? 0} passed, ${reportData.numFailedTests ?? 0} failed, ${reportData.numPendingTests ?? 0} pending`
    : `- Structured test results were unavailable.${parseError ? ` Report parsing failed: ${parseError}` : ""}`;
  const failureDetails = failures.length
    ? failures.map(({ name, file, details }) => `### ${name}\n\nFile: \`${file}\`\n\n\`\`\`text\n${details || "No failure details were provided by the test runner."}\n\`\`\``).join("\n\n")
    : reportData
      ? "None."
      : `Runner output:\n\n\`\`\`text\n${[result.stdout, result.stderr].filter(Boolean).join("\n").trim() || "No output was provided."}\n\`\`\``;
  const report = [
    "# Evaluation report",
    "",
    `Generated: ${generatedAt}`,
    "",
    `**Result:** ${result.status === 0 && reportData ? "PASS" : "FAIL"}`,
    "",
    "Command: `pnpm eval` (runs `pnpm exec vitest run src/evaluation --reporter=json`)",
    "",
    "## Results",
    "",
    summary,
    "",
    "## Failures",
    "",
    failureDetails,
    "",
    "This deterministic suite evaluates prototype behavior only. It does not establish clinical validity, safety in care, or effectiveness.",
    "",
  ].join("\n");
  writeFileSync(reportPath, report);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0 || !reportData) process.exitCode = result.status ?? 1;
}
