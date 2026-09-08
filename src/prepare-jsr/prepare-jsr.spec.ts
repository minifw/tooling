import { afterEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MiniToolingErrors } from "../mini-tooling-error/mini-tooling-error";
import { expectError } from "../mini-tooling-error/mini-tooling-error.harness";
import { prepareJsrConfig } from "./prepare-jsr";

const temporaryDirectories: string[] = [];

function createTemporaryDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "minifw-tooling-"));
  temporaryDirectories.push(directory);
  return directory;
}

function writePackage(directory: string, packageInfo: unknown): void {
  fs.writeFileSync(
    path.join(directory, "package.json"),
    JSON.stringify(packageInfo),
  );
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    fs.rmSync(directory, { force: true, recursive: true });
});

describe("prepareJsrConfig()", () => {
  it("derives JSR identity and exports from package metadata", () => {
    const directory = createTemporaryDirectory();
    writePackage(directory, {
      name: "@minifw/example",
      version: "1.2.3",
      license: "MIT",
      exports: { ".": "./src/index.ts", "./helper": "./src/helper.ts" },
      minifwTooling: {
        jsr: {
          publish: {
            include: ["README.md", "src/**/*.ts"],
            exclude: ["**/*.spec.ts"],
          },
        },
      },
    });

    expect(prepareJsrConfig(directory)).toEqual({
      jsrPath: path.join(directory, "jsr.json"),
    });
    expect(
      JSON.parse(fs.readFileSync(path.join(directory, "jsr.json"), "utf8")),
    ).toEqual({
      $schema: "https://jsr.io/schema/config-file.v1.json",
      name: "@minifw/example",
      version: "1.2.3",
      license: "MIT",
      exports: { ".": "./src/index.ts", "./helper": "./src/helper.ts" },
      publish: {
        include: ["README.md", "src/**/*.ts"],
        exclude: ["**/*.spec.ts"],
      },
    });
    expect(
      fs.readFileSync(path.join(directory, ".gitignore"), "utf8"),
    ).toContain("jsr.json");
  });

  it("rejects missing JSR publishing metadata", () => {
    const directory = createTemporaryDirectory();
    writePackage(directory, {
      name: "@minifw/example",
      version: "1.2.3",
      license: "MIT",
      exports: {},
    });

    expectError(
      () => prepareJsrConfig(directory),
      MiniToolingErrors.JsrPrepareInvalidMetadata,
    );
  });

  it("rejects conditional package exports", () => {
    const directory = createTemporaryDirectory();
    writePackage(directory, {
      name: "@minifw/example",
      version: "1.2.3",
      license: "MIT",
      exports: { ".": { import: "./src/index.ts" } },
      minifwTooling: { jsr: { publish: { include: [], exclude: [] } } },
    });

    expectError(
      () => prepareJsrConfig(directory),
      MiniToolingErrors.JsrPrepareInvalidExports,
    );
  });
});
