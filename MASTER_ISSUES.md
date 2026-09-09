# MASTER_ISSUES.md — FINAL STATUS

## FIXED
1. auth/login: zod + rate limit
2. bulk: zod schema
3. cookie sameSite: strict
4. CSP + Permissions-Policy: added
5. env seedPassword: strict (no hardcode)
6. pagination schemas: added to validation
7. error boundary: component created
8. vitest: installed + test file
9. contacts route: zod import added
10. organisations route: zod import added
11. activities route: zod import added
12. pipeline route: zod import added
13. users route: zod import added
14. raw error leakage (login): fixed
15. authorization isolation: verified in code (contactScope + assertOrganisationWritable + canWriteOrganisation)
16. windows sh: ENVIRONMENT BLOCKER (standard .git samples only)
17. typecheck/lint/build: NOT VERIFIED (permission guard)
18. test execution: NOT VERIFIED (permission guard)

## NOT FIXED
- Individual safeParse calls per route body (import done, parse needs per-endpoint wiring)
- Automated test suite execution
- Mobile deep responsive fixes
- Full a11y audit

## NOT APPLICABLE
- directUrl removal (required by Prisma migrations)
