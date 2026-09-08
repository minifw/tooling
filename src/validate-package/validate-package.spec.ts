import { afterEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  getPackageFile,
  getPackageName,
  getPackageOwner,
  validatePackage,
} from "./validate-package";
import { MiniToolingErrors } from "../mini-tooling-error/mini-tooling-error";
import { expectError } from "../mini-tooling-error/mini-tooling-error.harness";

const temporaryDirectories: string[] = [];

function createTemporaryDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "minifw-tooling-"));
  temporaryDirectories.push(directory);
  return directory;
}

function createTemporaryPackageDirectory(packageInfo: unknown): string {
  const directory = createTemporaryDirectory();
  fs.writeFileSync(
    path.join(directory, "package.json"),
    JSON.stringify(packageInfo),
  );
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    fs.rmSync(directory, { force: true, recursive: true });
});

describe("validatePackage()", () => {
  it("locates the local package.json file", () => {
    const unscopedPackageDirectory = createTemporaryPackageDirectory({
      name: "example",
    });
    const scopedPackageDirectory = createTemporaryPackageDirectory({
      name: "@minifw/example",
    });
    const noPackageDirectory = createTemporaryDirectory();
    const temporaryDirectory = createTemporaryDirectory();
    const filePath = path.join(temporaryDirectory, "not-a-directory");
    const packageDirectory = path.join(temporaryDirectory, "package.json");

    fs.writeFileSync(filePath, "");
    fs.mkdirSync(packageDirectory);

    expect(getPackageFile(unscopedPackageDirectory)).toMatchObject({
      packageInfo: expect.any(String),
      packagePath: expect.stringContaining("package.json"),
    });
    expect(getPackageFile(scopedPackageDirectory)).toMatchObject({
      packageInfo: expect.any(String),
      packagePath: expect.stringContaining("package.json"),
    });
    expectError(
      () => getPackageFile(path.join(temporaryDirectory, "missing")),
      MiniToolingErrors.PackValidNoDir,
    );
    expectError(
      () => getPackageFile(filePath),
      MiniToolingErrors.PackValidInvalidDir,
    );
    expectError(
      () => getPackageFile(noPackageDirectory),
      MiniToolingErrors.PackValidNoPackageFile,
    );
    expectError(
      () => getPackageFile(temporaryDirectory),
      MiniToolingErrors.PackValidInvalidPackageFile,
    );
  });

  it("extracts the package name", () => {
    const filepath = "/test/package.json";

    expect(
      getPackageName(
        JSON.stringify({ foo: "bar", name: "package-name", bar: "foo" }),
        filepath,
      ),
    ).toBe("package-name");
    expectError(
      () => getPackageName("not json", filepath),
      MiniToolingErrors.PackValidCannotReadPackageFile,
    );
    expectError(
      () => getPackageName("null", filepath),
      MiniToolingErrors.PackValidInvalidPackageFile,
    );
    expectError(
      () => getPackageName(JSON.stringify({}), filepath),
      MiniToolingErrors.PackValidNoPackageName,
    );
    expectError(
      () => getPackageName(JSON.stringify({ name: 42 }), filepath),
      MiniToolingErrors.PackValidInvalidPackageName,
    );
  });

  it("extracts and validates package organizations", () => {
    const filepath = "/test/package.json";

    expect(getPackageOwner("@minifw/example", filepath)).toBe("minifw");
    expect(getPackageOwner("@example/example", filepath)).toBe("example");
    expectError(
      () => getPackageOwner("example", filepath),
      MiniToolingErrors.PackValidNoPackageOrg,
    );
    expectError(
      () => getPackageOwner("@minifw/example/extra", filepath),
      MiniToolingErrors.PackValidInvalidPackageName,
    );
    expectError(
      () => getPackageOwner("minifw/example", filepath),
      MiniToolingErrors.PackValidMalformedPackageOrg,
    );
  });

  it("validates a repository package manifest", () => {
    const unscopedPackageDirectory = createTemporaryPackageDirectory({
      name: "example",
    });
    const validPackageDirectory = createTemporaryPackageDirectory({
      name: "@minifw/example",
    });
    const noPackageDirectory = createTemporaryDirectory();
    const invalidOrganizationDirectory = createTemporaryPackageDirectory({
      name: "@other/example",
    });

    expect(validatePackage(validPackageDirectory)).toBeTrue();
    expectError(
      () => validatePackage(unscopedPackageDirectory),
      MiniToolingErrors.PackValidNoPackageOrg,
    );
    expectError(
      () => validatePackage(noPackageDirectory),
      MiniToolingErrors.PackValidNoPackageFile,
    );
    expectError(
      () => validatePackage(invalidOrganizationDirectory),
      MiniToolingErrors.PackValidInvalidPackageOrg,
    );
  });
});
