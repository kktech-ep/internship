# Security Specification: KKTECH Power Internship System (internship2-2569)

## 1. Data Invariants
1. Students must have a valid student code and belong to KKTECH Power Department.
2. Weekly submissions must reference an existing student ID.
3. Companies must have valid coordinate limits within reasonable regional bounds (Thailand latitude 5-21, longitude 97-106).
4. Submissions must not contain forged scores exceeding maximum allowed scales (mentorRating <= 5.0, teacherScore <= 20).
5. Document IDs must match strict regex `^[a-zA-Z0-9_\-]+$` and length <= 128 characters.

## 2. The "Dirty Dozen" Payloads
1. **Ghost Field Injection**: Adding `isAdmin: true` or `bypassed: true` into student records.
2. **Invalid ID Poisoning**: Using a 2KB string or SQL injection/path traversal in `{studentId}`.
3. **Negative Hours**: Submitting weekly log total hours as negative or extreme values (> 168 hrs).
4. **Invalid Score Range**: Grader setting teacher score to 999 instead of 0-20.
5. **Orphaned Submission**: Creating a weekly submission referencing non-existent student ID.
6. **Student Self-Grading**: Student modifying teacherGrade or teacherScore directly.
7. **Cross-Tenant Overwrite**: Unauthenticated client trying to wipe entire companies collection.
8. **Malicious Long String**: Pushing 10MB JSON into `taskDescription` or `taskTitle`.
9. **Tampered Hash**: Setting verifiedHash to arbitrary unauthorized bypass tokens.
10. **Terminal State Regression**: Trying to alter a finalized and certified weekly report without teacher role.
11. **GPS Coordinates Out of Bounds**: Injecting NaN or out-of-range latitude/longitude into company records.
12. **PII Blanket Harvest**: Scraping emergency contact phone numbers without authorized session.

## 3. Test Runner
Testing rule validations against unauthorized updates, type mismatches, and boundary overflows.
