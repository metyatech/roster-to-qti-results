# roster-to-qti-results

Generate QTI 3.0 Results Reporting XML from roster CSV files and an assessment test.
This tool builds "seed" results that can be enriched later with scoring updates and
rendered with qti-reporter.

## Overview

- Input: roster CSV + QTI assessment test XML
- Output: one QTI Results Reporting XML per roster entry
- Use case: bootstrap results for rubric-based scoring workflows without Track LMS data

## Setup

```sh
npm install
```

## Development commands

```sh
npm run lint
npm test
npm run build
npm run roster-to-qti-results -- --help
```

## CLI usage

```sh
roster-to-qti-results \
  --roster roster.csv \
  --assessment-test assessment-test.qti.xml \
  --test-result-identifier "WEB-EXAM-2026" \
  --test-result-datestamp 2026-01-27T10:00:00+09:00 \
  --output qti-results
```

### Required options

- `--roster <path>`: roster CSV path (use `-` to read from stdin)
- `--assessment-test <path>`: QTI assessment test XML

### Optional options

- `--output <dir>`: output directory (default: `<roster-dir>/qti-results`)
- `--test-result-identifier <value>`: testResult identifier (default: `assessment-test`)
- `--test-result-datestamp <value>`: ISO 8601 datetime (or `now` for current UTC time)
- `--dry-run`: validate and print output plan without writing files
- `--json`: emit a machine-readable summary to stdout
- `--force` / `--yes`: overwrite existing output files
- `--quiet`: suppress non-error logs
- `--verbose`: verbose logs
- `--version` / `-V`: show version
- `--help` / `-h`: show help

## Roster CSV format

See `docs/input-spec.md` for the full specification.

## Output

See `docs/output-spec.md` for the QTI Results Reporting structure.

## Environment variables

None.

## Release

1. Update `CHANGELOG.md` with the new version notes.
2. Bump the version in `package.json`.
3. Run `npm run lint` and `npm test`.
4. Create a Git tag `vX.Y.Z` and push it.
5. Create a GitHub Release from the corresponding changelog section.

## SemVer policy

- **Major**: breaking changes to CLI options, CSV schema, or output structure.
- **Minor**: new options or output fields that are backwards compatible.
- **Patch**: bug fixes and internal changes without behavior changes.
