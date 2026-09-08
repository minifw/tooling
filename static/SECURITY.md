# Security Policy

## Support Policy

Each `@minifw/<package>` repository is versioned and released independently. The
package maintainer supports two major-version lines at a time:

- The latest major version is **active**. It receives new features, bug fixes,
  and security fixes.
- The immediately preceding major version is **LTS**. It receives bug fixes and
  security fixes, but no new features.

When a package releases a new major version, its active version becomes LTS, its
previous LTS version becomes unsupported, and the new major becomes active.
Before a package's first major release, it has no LTS version.

## Reporting Issues

Report bugs and suspected vulnerabilities through the affected package's public
issue tracker. Include the package name and version, the Bun version, steps to
reproduce, and the observed and expected behavior.

For a high-severity vulnerability where public disclosure could put users at
risk, contact that package's maintainer by email first. The maintainer will
acknowledge the report, assess the impact, coordinate a fix, and agree on public
disclosure timing with the reporter.
