import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parse as parseCsv } from "csv-parse/sync";

const RESULTS_NAMESPACE = "http://www.imsglobal.org/xsd/imsqti_result_v3p0";
const XSI_NAMESPACE = "http://www.w3.org/2001/XMLSchema-instance";
const SCHEMA_LOCATION = `${RESULTS_NAMESPACE} ${RESULTS_NAMESPACE}.xsd`;

const HELP_TEXT = `roster-to-qti-results

Usage:
  roster-to-qti-results --roster <path> --assessment-test <path> \
    [options]

Required options:
  --roster <path>           Roster CSV path (use '-' to read from stdin)
  --assessment-test <path>  QTI assessment test XML

Optional options:
  --output <dir>            Output directory (default: <roster-dir>/qti-results)
  --test-result-identifier <value>  testResult identifier (default: assessment-test)
  --test-result-datestamp <value>   ISO 8601 datetime or 'now'
  --dry-run                 Validate and print output plan without writing files
  --json                    Emit machine-readable summary to stdout
  --force, --yes            Overwrite existing output files
  --quiet                   Suppress non-error logs
  --verbose                 Verbose logs
  --version, -V             Show version
  --help, -h                Show help
`;

type CliArgs = {
  roster: string | null;
  assessmentTest: string | null;
  testResultIdentifier: string | null;
  testResultDatestamp: string | null;
  outputDir: string | null;
  dryRun: boolean;
  json: boolean;
  force: boolean;
  quiet: boolean;
  verbose: boolean;
  help: boolean;
  version: boolean;
};

type RosterRow = {
  candidateNumber: string;
  candidateName: string;
  candidateAccount?: string;
  candidateId?: string;
  resultId: string;
};

type OutputPlan = {
  resultId: string;
  path: string;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    roster: null,
    assessmentTest: null,
    testResultIdentifier: null,
    testResultDatestamp: null,
    outputDir: null,
    dryRun: false,
    json: false,
    force: false,
    quiet: false,
    verbose: false,
    help: false,
    version: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (arg === "--version" || arg === "-V") {
      args.version = true;
      continue;
    }
    if (arg === "--roster") {
      args.roster = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (arg === "--assessment-test") {
      args.assessmentTest = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (arg === "--test-result-identifier") {
      args.testResultIdentifier = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (arg === "--test-result-datestamp") {
      args.testResultDatestamp = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (arg === "--output") {
      args.outputDir = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (arg === "--json") {
      args.json = true;
      continue;
    }
    if (arg === "--force" || arg === "--yes") {
      args.force = true;
      continue;
    }
    if (arg === "--quiet") {
      args.quiet = true;
      continue;
    }
    if (arg === "--verbose") {
      args.verbose = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function readPackageVersion(): string {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const pkgPath = path.join(rootDir, "package.json");
  const raw = fs.readFileSync(pkgPath, "utf8");
  const pkg = JSON.parse(raw) as { version?: string };
  return pkg.version ?? "0.0.0";
}

function resolveDefaultOutputDir(rosterPath: string): string {
  if (rosterPath === "-") {
    return path.resolve("qti-results");
  }
  return path.join(path.dirname(path.resolve(rosterPath)), "qti-results");
}

function readRosterCsv(rosterPath: string): RosterRow[] {
  const csvText =
    rosterPath === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(rosterPath, "utf8");
  const records = parseCsv(csvText, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<Record<string, string>>;

  if (!records.length) {
    throw new Error("Roster CSV is empty.");
  }

  const rows: RosterRow[] = [];
  const seen = new Set<string>();

  records.forEach((record, index) => {
    const candidateNumber = record["candidate_number"]?.trim();
    const candidateName = record["candidate_name"]?.trim();
    const candidateAccount = record["candidate_account"]?.trim();
    const candidateId = record["candidate_id"]?.trim();
    const resultIdRaw = record["result_id"]?.trim();

    if (!candidateNumber) {
      throw new Error(`Missing candidate_number at row ${index + 2}.`);
    }
    if (!/\d/.test(candidateNumber)) {
      throw new Error("candidate_number must include at least one digit");
    }
    if (!candidateName) {
      throw new Error(`Missing candidate_name at row ${index + 2}.`);
    }

    const resultId = resultIdRaw || candidateNumber;
    if (!resultId) {
      throw new Error(`Missing result_id at row ${index + 2}.`);
    }
    if (seen.has(resultId)) {
      throw new Error(`Duplicate result_id: ${resultId}`);
    }
    seen.add(resultId);

    rows.push({
      candidateNumber,
      candidateName,
      candidateAccount: candidateAccount || undefined,
      candidateId: candidateId || undefined,
      resultId,
    });
  });

  return rows;
}

function readAssessmentTestItemIds(assessmentTestPath: string): string[] {
  const xml = fs.readFileSync(assessmentTestPath, "utf8");
  const pattern = /<qti-assessment-item-ref\b[^>]*\bidentifier\s*=\s*(["'])([^"']+)\1[^>]*\/?\s*>/g;
  const itemIds: string[] = [];
  let match = pattern.exec(xml);
  while (match) {
    itemIds.push(match[2]);
    match = pattern.exec(xml);
  }

  if (itemIds.length === 0) {
    throw new Error("No assessment item refs found in assessment test.");
  }

  const seen = new Set<string>();
  for (const itemId of itemIds) {
    if (!itemId) {
      throw new Error("Assessment test item identifier is empty.");
    }
    if (seen.has(itemId)) {
      throw new Error(`Duplicate assessment test item identifier: ${itemId}`);
    }
    seen.add(itemId);
  }

  return itemIds;
}

function resolveEndAt(raw: string): string {
  if (raw === "now") {
    return new Date().toISOString();
  }
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) {
    throw new Error("--test-result-datestamp must be an ISO 8601 datetime or 'now'.");
  }
  return raw;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildAssessmentResultXml(options: {
  row: RosterRow;
  testResultIdentifier: string;
  testResultDatestamp?: string;
  itemIds: string[];
}): string {
  const { row, testResultIdentifier, testResultDatestamp, itemIds } = options;
  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(
    `<assessmentResult xmlns="${RESULTS_NAMESPACE}" xmlns:xsi="${XSI_NAMESPACE}" xsi:schemaLocation="${SCHEMA_LOCATION}">`,
  );
  lines.push(`  <context sourcedId="${escapeXml(row.candidateNumber)}">`);
  lines.push(
    `    <sessionIdentifier sourceID="candidateName" identifier="${escapeXml(row.candidateName)}" />`,
  );
  if (row.candidateId) {
    lines.push(
      `    <sessionIdentifier sourceID="candidateId" identifier="${escapeXml(row.candidateId)}" />`,
    );
  }
  if (row.candidateAccount) {
    lines.push(
      `    <sessionIdentifier sourceID="candidateAccount" identifier="${escapeXml(row.candidateAccount)}" />`,
    );
  }
  lines.push("  </context>");
  if (testResultDatestamp) {
    lines.push(
      `  <testResult identifier="${escapeXml(testResultIdentifier)}" datestamp="${escapeXml(testResultDatestamp)}" />`,
    );
  } else {
    lines.push(`  <testResult identifier="${escapeXml(testResultIdentifier)}" />`);
  }
  itemIds.forEach((itemId, index) => {
    if (testResultDatestamp) {
      lines.push(
        `  <itemResult identifier="${escapeXml(itemId)}" sequenceIndex="${index + 1}" datestamp="${escapeXml(testResultDatestamp)}" sessionStatus="final" />`,
      );
    } else {
      lines.push(
        `  <itemResult identifier="${escapeXml(itemId)}" sequenceIndex="${index + 1}" sessionStatus="final" />`,
      );
    }
  });
  lines.push(`</assessmentResult>`);
  return `${lines.join("\n")}\n`;
}

function buildOutputPlan(outputDir: string, rows: RosterRow[]): OutputPlan[] {
  return rows.map((row) => ({
    resultId: row.resultId,
    path: path.join(outputDir, `assessmentResult-${row.resultId}.xml`),
  }));
}

function ensureWritable(outputDir: string, outputs: OutputPlan[], force: boolean): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    return;
  }

  for (const output of outputs) {
    if (fs.existsSync(output.path) && !force) {
      throw new Error(`Output file already exists: ${output.path} (use --force to overwrite)`);
    }
  }
}

function writeOutputs(
  outputs: OutputPlan[],
  rows: RosterRow[],
  options: {
    testResultIdentifier: string;
    testResultDatestamp?: string;
    itemIds: string[];
  },
): void {
  const rowByResult = new Map(rows.map((row) => [row.resultId, row]));
  outputs.forEach((output) => {
    const row = rowByResult.get(output.resultId);
    if (!row) {
      throw new Error(`Missing roster row for resultId: ${output.resultId}`);
    }
    const xml = buildAssessmentResultXml({
      row,
      testResultIdentifier: options.testResultIdentifier,
      testResultDatestamp: options.testResultDatestamp,
      itemIds: options.itemIds,
    });
    fs.writeFileSync(output.path, xml, "utf8");
  });
}

function logInfo(message: string, args: CliArgs): void {
  if (args.quiet) {
    return;
  }
  process.stderr.write(`${message}\n`);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    process.stdout.write(HELP_TEXT);
    return;
  }
  if (args.version) {
    process.stdout.write(`${readPackageVersion()}\n`);
    return;
  }

  if (!args.roster || !args.assessmentTest) {
    process.stderr.write("Missing required arguments.\n\n");
    process.stderr.write(HELP_TEXT);
    process.exit(1);
  }

  if (args.outputDir !== null && !args.outputDir) {
    throw new Error("--output must be a non-empty path.");
  }

  const testResultIdentifier = args.testResultIdentifier || "assessment-test";
  const testResultDatestamp = args.testResultDatestamp
    ? resolveEndAt(args.testResultDatestamp)
    : undefined;
  const outputDir = args.outputDir
    ? path.resolve(args.outputDir)
    : resolveDefaultOutputDir(args.roster);

  const rows = readRosterCsv(args.roster);
  const itemIds = readAssessmentTestItemIds(args.assessmentTest);
  const outputs = buildOutputPlan(outputDir, rows);

  if (args.dryRun) {
    if (args.json) {
      process.stdout.write(`${JSON.stringify({ mode: "dry-run", outputDir, outputs }, null, 2)}\n`);
    } else {
      logInfo(`Dry run: ${outputs.length} file(s) would be written to ${outputDir}`, args);
    }
    return;
  }

  ensureWritable(outputDir, outputs, args.force);
  writeOutputs(outputs, rows, {
    testResultIdentifier,
    testResultDatestamp,
    itemIds,
  });

  if (args.json) {
    process.stdout.write(`${JSON.stringify({ mode: "write", outputDir, outputs }, null, 2)}\n`);
  } else if (args.verbose) {
    logInfo(`Wrote ${outputs.length} file(s) to ${outputDir}`, args);
  }
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
