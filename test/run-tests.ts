import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const FIXTURES = path.join(ROOT, "test", "fixtures");
const CLI_PATH = path.join(ROOT, "src", "cli.ts");
const TSX_CLI = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");

function runCli(args: string[], options?: { input?: string; cwd?: string }) {
  const result = spawnSync(process.execPath, [TSX_CLI, CLI_PATH, ...args], {
    encoding: "utf8",
    input: options?.input,
    cwd: options?.cwd,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status === null) {
    throw new Error("CLI process failed to start.");
  }
  return {
    status: result.status,
    stdout: result.stdout?.toString() ?? "",
    stderr: result.stderr?.toString() ?? "",
  };
}

function testBasicGeneration() {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "qti-results-"));
  const rosterPath = path.join(FIXTURES, "roster.csv");
  const assessmentTest = path.join(FIXTURES, "assessment-test.qti.xml");
  const endAt = "2026-01-27T10:00:00+09:00";

  const result = runCli([
    "--roster",
    rosterPath,
    "--assessment-test",
    assessmentTest,
    "--test-result-identifier",
    "WEB-EXAM-2026",
    "--test-result-datestamp",
    endAt,
    "--output",
    outputDir,
  ]);

  assert.strictEqual(result.status, 0, result.stderr || result.stdout);

  const first = path.join(outputDir, "assessmentResult-2001.xml");
  const second = path.join(outputDir, "assessmentResult-2002.xml");
  assert.ok(fs.existsSync(first), "expected first output XML");
  assert.ok(fs.existsSync(second), "expected second output XML");

  const xml = fs.readFileSync(first, "utf8");
  assert.ok(xml.includes('<context sourcedId="1001"'));
  assert.ok(xml.includes('sourceID="candidateName" identifier="山田太郎"'));
  assert.ok(!xml.includes('sourceID="materialTitle"'), "materialTitle should not be emitted");
  assert.ok(
    xml.includes('<testResult identifier="WEB-EXAM-2026" datestamp="2026-01-27T10:00:00+09:00"'),
  );
  assert.ok(xml.includes('<itemResult identifier="item-001" sequenceIndex="1"'));
  assert.ok(xml.includes('<itemResult identifier="item-002" sequenceIndex="2"'));
}

function testDryRunJson() {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "qti-results-"));
  const rosterPath = path.join(FIXTURES, "roster.csv");
  const assessmentTest = path.join(FIXTURES, "assessment-test.qti.xml");

  const result = runCli([
    "--roster",
    rosterPath,
    "--assessment-test",
    assessmentTest,
    "--test-result-identifier",
    "WEB-EXAM-2026",
    "--test-result-datestamp",
    "2026-01-27T10:00:00+09:00",
    "--output",
    outputDir,
    "--dry-run",
    "--json",
  ]);

  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.strictEqual(payload.mode, "dry-run");
  assert.strictEqual(payload.outputDir, outputDir);
  assert.strictEqual(payload.outputs.length, 2);
  assert.ok(!fs.existsSync(path.join(outputDir, "assessmentResult-2001.xml")));
}

function testInvalidCandidateNumber() {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "qti-results-"));
  const rosterPath = path.join(FIXTURES, "roster-invalid.csv");
  const assessmentTest = path.join(FIXTURES, "assessment-test.qti.xml");

  const result = runCli([
    "--roster",
    rosterPath,
    "--assessment-test",
    assessmentTest,
    "--test-result-identifier",
    "WEB-EXAM-2026",
    "--test-result-datestamp",
    "2026-01-27T10:00:00+09:00",
    "--output",
    outputDir,
  ]);

  assert.notStrictEqual(result.status, 0);
  assert.ok(result.stderr.includes("candidate_number must include at least one digit"));
}

function testDefaultOutputDirFromRoster() {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "qti-results-cwd-"));
  const rosterDir = fs.mkdtempSync(path.join(os.tmpdir(), "qti-results-roster-"));
  const rosterPath = path.join(rosterDir, "roster.csv");
  const assessmentTest = path.join(rosterDir, "assessment-test.qti.xml");

  fs.copyFileSync(path.join(FIXTURES, "roster.csv"), rosterPath);
  fs.copyFileSync(path.join(FIXTURES, "assessment-test.qti.xml"), assessmentTest);

  try {
    const result = runCli(["--roster", rosterPath, "--assessment-test", assessmentTest], {
      cwd: workDir,
    });

    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    const outputDir = path.join(rosterDir, "qti-results");
    assert.ok(fs.existsSync(path.join(outputDir, "assessmentResult-2001.xml")));
    assert.ok(fs.existsSync(path.join(outputDir, "assessmentResult-2002.xml")));
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
    fs.rmSync(rosterDir, { recursive: true, force: true });
  }
}

function testBomRoster() {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "qti-results-"));
  const rosterPath = path.join(FIXTURES, "roster-bom.csv");
  const assessmentTest = path.join(FIXTURES, "assessment-test.qti.xml");

  const result = runCli([
    "--roster",
    rosterPath,
    "--assessment-test",
    assessmentTest,
    "--output",
    outputDir,
  ]);

  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  const first = path.join(outputDir, "assessmentResult-1001.xml");
  const second = path.join(outputDir, "assessmentResult-1002.xml");
  assert.ok(fs.existsSync(first), "expected first output XML");
  assert.ok(fs.existsSync(second), "expected second output XML");
}

function testOptionalDatestamp() {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "qti-results-"));
  const rosterPath = path.join(FIXTURES, "roster.csv");
  const assessmentTest = path.join(FIXTURES, "assessment-test.qti.xml");

  const result = runCli([
    "--roster",
    rosterPath,
    "--assessment-test",
    assessmentTest,
    "--output",
    outputDir,
  ]);

  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  const xml = fs.readFileSync(path.join(outputDir, "assessmentResult-2001.xml"), "utf8");
  assert.ok(xml.includes('<testResult identifier="assessment-test"'));
  assert.ok(!xml.includes("datestamp="), "datestamp should be omitted when not provided");
}

function run() {
  testBasicGeneration();
  testDryRunJson();
  testInvalidCandidateNumber();
  testDefaultOutputDirFromRoster();
  testBomRoster();
  testOptionalDatestamp();
  console.log("All tests passed.");
}

run();
