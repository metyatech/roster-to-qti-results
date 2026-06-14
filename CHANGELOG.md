# Changelog

## 0.2.0

- Standardize on 8-digit student numbers (`candidate_number`) as the canonical candidate identifier.
- `candidate_number` must be exactly 8 digits.
- `candidate_id` and `result_id` must match `candidate_number` if provided.
- Output filename uses `candidate_number`.
- `candidateId` and `context/@sourcedId` in XML use `candidate_number`.

## 0.1.0

- Initial release.
