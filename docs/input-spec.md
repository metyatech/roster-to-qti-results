# Roster CSV Input Specification

## Overview

- Encoding: UTF-8
- UTF-8 BOM: allowed
- Delimiter: comma (,)
- Header row: required
- Line endings: CRLF or LF

## Required columns

| Column           | Type   | Description                                                                |
| ---------------- | ------ | -------------------------------------------------------------------------- |
| candidate_number | string | Candidate number used for `context/@sourcedId` (must be exactly 8 digits). |
| candidate_name   | string | Candidate display name used for `candidateName` session identifier.        |

## Optional columns

| Column            | Type   | Description                                                                  |
| ----------------- | ------ | ---------------------------------------------------------------------------- |
| candidate_account | string | Optional account identifier stored in `candidateAccount` session identifier. |
| candidate_id      | string | Optional candidate identifier. If provided, MUST match `candidate_number`.   |
| result_id         | string | Output filename identifier. If provided, MUST match `candidate_number`.      |

## Validation rules

- `candidate_number` must be exactly 8 digits.
- `candidate_number` must be unique across all rows.
- `candidate_id` must match `candidate_number` if provided.
- `result_id` must match `candidate_number` if provided.
- Empty rows are rejected.

## Example

```csv
candidate_number,candidate_name,candidate_account,result_id
25020001,山田太郎,student001@example.com,25020001
25020002,佐藤花子,student002@example.com,25020002
```
