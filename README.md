# @minifw/tooling

Shared configuration, automation, and AI guidance for independently versioned
`@minifw/<package>` repositories.

The canonical managed files live in [`static/`](static/). In package
repositories, `bunx @minifw/tooling sync` copies them into the repository root
and records their paths in `.gitignore`. Do not edit the copied files directly;
update their `static/` source here and synchronize the affected repositories.

`sync` also installs or upgrades `@minifw/tooling` as a local development
dependency. It provides, but does not create or validate use of, shared base
configurations at `@minifw/tooling/eslint`, `@minifw/tooling/prettier`, and
`@minifw/tooling/tsconfig`. Each package chooses whether and how to consume
them, including its own configuration exceptions.

## Static Development

Run `bun run link-static` to create relative symbolic links from every file in
`static/` to its matching root path. The command is idempotent and refuses to
replace a file or a symbolic link that points elsewhere. Static `.gitignore`
files are copied because Git does not support symbolic links for ignore files.
It also records each generated root path in `.gitignore`, leaving the canonical
`static/` files and package-local configuration files visible to Git.

## Development

```bash
bun install
```

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.4.0. [Bun](https://bun.com)
is a fast all-in-one JavaScript runtime.
