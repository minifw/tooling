---
name: code-quality
description:
  "Use when: resolving or configuring ESLint, TypeScript ESLint, Unicorn, JSDoc
  linting, Prettier, formatting warnings, or code-quality scripts."
user-invocable: true
---

# Code Quality

## Tooling Ownership

- ESLint parses TypeScript with `typescript-eslint` and reports Prettier
  differences as warnings.
- Prettier, including `prettier-plugin-jsdoc`, owns source and JSDoc formatting.
- TypeScript owns unused-local and unused-parameter validation because it
  correctly understands this repository's type and documentation patterns.
- Unicorn protects general JavaScript quality; narrowly configure exceptions
  only for documented runtime compatibility constraints.

## Intentional Exceptions

- Required JSDoc is limited to exported declarations. Internal comments are
  optional and concise.

## Commands

- Inspect `package.json` for the repository's lint, format, typecheck, and test
  commands before validation.

## Required Validation

- After a source or configuration change, run the package's relevant format,
  lint, typecheck, and test scripts.
- After a documentation-only change, run the package's formatter when one is
  available.
- Apply deterministic formatter and lint fixes before reporting remaining
  findings.

## Procedure

1. Identify the exact rule and determine whether it catches a real bug, a
   runtime-compatibility conflict, or an intentional fixture behavior.
2. Prefer a compatible code fix when a rule catches a real bug.
3. If a rule conflicts with an intentional runtime dependency or test fixture,
   add the narrowest config override and document why.
4. Follow the required validation procedure above.
