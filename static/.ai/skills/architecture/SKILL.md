---
name: architecture
description:
  "Use when: changing a package's public API, exports, module boundaries,
  architecture, or server/browser runtime boundaries."
user-invocable: true
---

# Package Architecture

## Repository Boundaries

- Each `@minifw/<package>` repository is independent. Do not introduce local
  dependencies on sibling repositories or assume a shared workspace.
- Read `package.json`, the nearest source module, and its tests before changing
  a package boundary. These define the package's actual layout and validation
  commands.
- Treat paths explicitly exported from `package.json` as public API. Keep
  unexported modules implementation details unless the change deliberately
  expands the public contract.

## Design Rules

- Keep stable public contracts narrow and document intentional changes to
  exports, types, runtime requirements, and compatibility.
- Preserve established error handling, data flow, and runtime behavior unless
  the task explicitly changes them.
- Keep server-only and browser-only code separate when a package has both
  environments. Avoid importing environment-specific APIs across that boundary.
- Prefer the repository's existing module and test organization over creating a
  new convention.

## Procedure

1. Identify the affected public contract and the owning module.
2. Review the current exports and nearest tests for compatibility constraints.
3. Update focused tests for observable behavioral changes.
4. Run the narrowest relevant validation command from `package.json`.
5. Follow the validation procedure in the code-quality skill.
