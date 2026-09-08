import { afterEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createProgram } from "./cli";

const temporaryDirectories: string[] = [];
const staticDirectory = path.resolve(import.meta.dir, "../static");
let exitCode: number | undefined;

function getStaticFiles(directory = staticDirectory): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((file) => {
    const filepath = path.join(directory, file.name);
    if (file.isFile()) return [filepath];
    if (file.isDirectory()) return getStaticFiles(filepath);
    return [];
  });
}

function createTemporaryDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "minifw-tooling-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    fs.rmSync(directory, { force: true, recursive: true });
  exitCode = undefined;
});

describe("minifw-tooling sync", () => {
  it("synchronizes static files through the CLI", async () => {
    const repository = createTemporaryDirectory();
    const installedDirectories: string[] = [];
    fs.writeFileSync(
      path.join(repository, "package.json"),
      JSON.stringify({ name: "@minifw/example" }),
    );

    await createProgram({
      ensureLocalTooling: async (directory) => {
        installedDirectories.push(directory);
      },
    }).parseAsync(["sync", "--root-dir", repository, "--concurrency", "1"], {
      from: "user",
    });

    const staticFiles = getStaticFiles();
    expect(installedDirectories).toEqual([repository]);
    expect(fs.existsSync(path.join(repository, "eslint.config.ts"))).toBe(
      false,
    );
    expect(fs.existsSync(path.join(repository, "prettier.config.ts"))).toBe(
      false,
    );
    const gitignore = fs.readFileSync(
      path.join(repository, ".gitignore"),
      "utf8",
    );
    expect(gitignore).toContain("/jsr.json");
    expect(gitignore).toContain("/.husky/**");
    expect(gitignore).not.toContain("/AGENTS.md");
    expect(gitignore).not.toContain("/.github/workflows/ci.yml");
    for (const filepath of staticFiles) {
      const relativePath = path.relative(staticDirectory, filepath);
      expect(fs.readFileSync(path.join(repository, relativePath), "utf8")).toBe(
        fs.readFileSync(filepath, "utf8"),
      );
    }
  });

  it("reports every file that fails to synchronize", async () => {
    const repository = createTemporaryDirectory();
    fs.writeFileSync(
      path.join(repository, "package.json"),
      JSON.stringify({ name: "@minifw/example" }),
    );
    fs.mkdirSync(path.join(repository, "AGENTS.md"));
    fs.mkdirSync(path.join(repository, "eslint.config.ts"));

    await createProgram({
      ensureLocalTooling: async () => {},
      setExitCode: (code) => {
        exitCode = code;
      },
    }).parseAsync(["sync", "--root-dir", repository], { from: "user" });

    expect(exitCode).toBe(1);
  });

  it("exits cleanly when repository validation fails before copying", async () => {
    const repository = createTemporaryDirectory();
    fs.writeFileSync(
      path.join(repository, "package.json"),
      JSON.stringify({ name: "example" }),
    );

    await expect(
      createProgram().parseAsync(["sync", "--root-dir", repository], {
        from: "user",
      }),
    ).rejects.toMatchObject({ code: "PackValidNoPackageOrg" });
  });
});

describe("minifw-tooling prepare", () => {
  it("generates JSR configuration through the CLI", async () => {
    const repository = createTemporaryDirectory();
    fs.writeFileSync(
      path.join(repository, "package.json"),
      JSON.stringify({
        name: "@minifw/example",
        version: "1.2.3",
        license: "MIT",
        exports: { ".": "./src/index.ts" },
        minifwTooling: {
          jsr: {
            publish: { include: ["src/**/*.ts"], exclude: ["**/*.spec.ts"] },
          },
        },
      }),
    );

    await createProgram().parseAsync(["prepare", "--root-dir", repository], {
      from: "user",
    });

    expect(
      JSON.parse(fs.readFileSync(path.join(repository, "jsr.json"), "utf8")),
    ).toMatchObject({
      name: "@minifw/example",
      version: "1.2.3",
      license: "MIT",
      exports: { ".": "./src/index.ts" },
    });
  });
});
