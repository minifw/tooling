---
name: testing
description:
  "Use when: writing, updating, debugging, or reviewing Bun tests, integration
  suites, end-to-end tests, or test fixtures."
user-invocable: true
---

# Testing

## Test Layout

- Follow the package's established test layout, file suffixes, and test runner.
- Name unit and integration tests `*.spec.ts`; name end-to-end tests
  `*.e2e.spec.ts`.
- Keep unit tests near the behavior they cover when that matches the local
  convention; use fixtures for integration scenarios that require real files.

## What to Test

- Test observable output and public contracts, not internal implementation
  details.
- Exercise relevant integration and runtime boundaries when changing public
  APIs, I/O, client behavior, caching, or error handling.
- Prefer fixtures and end-to-end coverage when a string-only unit test cannot
  establish real packaging, import, or browser behavior.
- Use the package's established artifact and screenshot conventions for browser
  or UI test suites.

## Procedure

1. Add or update the nearest appropriate test.
2. Run `bun run test:unit` for unit and integration suites or `bun run test:e2e`
   for end-to-end suites; do not invoke `bun test` directly.
3. Assert observable behavior rather than incidental implementation details.
4. Finish with `bun run lint:fix`, `bun run test:types`, `bun run test:unit`,
   and `bun run test:e2e` as applicable.
