---
name: build-release
description:
  "Use when: changing build output, TypeScript declarations, package exports or
  metadata, package publishing, or preparing a release."
user-invocable: true
---

# Build and Release

## Distribution Contract

- Each package defines its own build and distribution contract in
  `package.json`: entry points, exports, files, types, and publish registry.
- Do not assume source is published directly or that build output uses a
  particular directory. Inspect package scripts and packaging metadata first.
- Keep unexported modules private unless a release intentionally expands the
  public API.

## Commands

- Use the package scripts declared in `package.json` for build, typecheck,
  lint, test, and release validation.
- Run `npm pack --dry-run` before an npm release to inspect the publishable
  contents.

## Release Procedure

1. Update version and package metadata deliberately.
2. Run the package's documented lint, typecheck, build, and test commands.
3. Run `npm pack --dry-run`; verify the intended artifacts, `README.md`,
  `LICENSE`, and package metadata would ship.
4. Install the packed tarball in a clean consumer project and verify its public
  entry points before publishing.
