# QTI Results Output Specification

## Overview
- Output format: QTI 3.0 Results Reporting XML (`assessmentResult`).
- One output file per roster entry.
- File naming: `assessmentResult-<resultId>.xml`.

## Namespaces
- Default namespace: `http://www.imsglobal.org/xsd/imsqti_result_v3p0`
- XML Schema instance namespace: `http://www.w3.org/2001/XMLSchema-instance`
- Schema location: `http://www.imsglobal.org/xsd/imsqti_result_v3p0 http://www.imsglobal.org/xsd/imsqti_result_v3p0.xsd`

## Document structure (subset)

```
assessmentResult
  context (required)
    @sourcedId (required)
    sessionIdentifier (candidateName, materialTitle, optional candidateId/account)
  testResult (required)
    @identifier (required)
    @datestamp (required)
  itemResult (required, 1+)
    @identifier (required)
    @sequenceIndex (required)
    @datestamp (required)
    @sessionStatus = "final" (required)
```

## Mapping rules

- `context/@sourcedId`: `candidate_number`
- `sessionIdentifier[sourceID="candidateName"]`: `candidate_name`
- `sessionIdentifier[sourceID="materialTitle"]`: `--material-title`
- `sessionIdentifier[sourceID="candidateId"]`: `candidate_id` when provided
- `sessionIdentifier[sourceID="candidateAccount"]`: `candidate_account` when provided
- `testResult/@identifier`: `--test-id`
- `testResult/@datestamp`: `--end-at` (ISO 8601 string)
- `itemResult/@identifier`: assessment-test item identifier (order preserved)
- `itemResult/@sequenceIndex`: 1-based order in assessment-test
- `itemResult/@datestamp`: `--end-at`

## Notes

- Response and outcome variables are intentionally omitted; they can be populated later using `apply-to-qti-results`.
- The assessment test order controls item sequencing and must match the item sources used during scoring updates.