# Roster CSV Input Specification

## Overview

- Encoding: UTF-8
- UTF-8 BOM: allowed
- Delimiter: comma (,)
- Header row: required
- Line endings: CRLF or LF

## Required columns

| Column           | Type   | Description                                                                       |
| ---------------- | ------ | --------------------------------------------------------------------------------- |
| candidate_number | string | Candidate number used for `context/@sourcedId` (must contain at least one digit). |
| candidate_name   | string | Candidate display name used for `candidateName` session identifier.               |

## Optional columns

| Column            | Type   | Description                                                                  |
| ----------------- | ------ | ---------------------------------------------------------------------------- |
| candidate_account | string | Optional account identifier stored in `candidateAccount` session identifier. |
| candidate_id      | string | Optional candidate identifier stored in `candidateId` session identifier.    |
| result_id         | string | Output filename identifier. Defaults to `candidate_number` when omitted.     |

## Validation rules

- `candidate_number` must include at least one digit (used by qti-reporter to derive the candidate number).
- `result_id` must be unique across all rows (after defaulting to `candidate_number`).
- Empty rows are rejected.

## Example

```csv
candidate_number,candidate_name,candidate_account,result_id
1001,山田太郎,student001@example.com,1001
1002,佐藤花子,student002@example.com,1002
```
