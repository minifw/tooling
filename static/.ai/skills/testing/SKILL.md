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
- Keep unit tests near the behavior they cover when that matches the local
  convention; use fixtures for integration scenarios that require real files.
- Inspect `package.json` to identify focused and full test commands.

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
2. Run the narrowest relevant test while iterating.
3. Assert observable behavior rather than incidental implementation details.
4. Run the package's required format, lint, typecheck, and full test validation
   before completion.
