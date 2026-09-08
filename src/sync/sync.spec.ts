import { afterEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { syncStaticFiles } from "./sync";
import { MiniToolingErrors } from "../mini-tooling-error/mini-tooling-error";

const temporaryDirectories: string[] = [];
const staticDirectory = path.resolve(import.meta.dir, "../../static");

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

function createRepository(name: string): string {
  const directory = createTemporaryDirectory();
  fs.writeFileSync(
    path.join(directory, "package.json"),
    JSON.stringify({ name }),
  );
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    fs.rmSync(directory, { force: true, recursive: true });
});

describe("syncStaticFiles()", () => {
  it("copies every static file into a valid @minifw repository", async () => {
    const repository = createRepository("@minifw/example");

    const results = await syncStaticFiles(repository, { concurrency: 1 });
    const staticFiles = getStaticFiles();

    expect(results).toHaveLength(staticFiles.length);
    expect(results).toMatchObject(
      staticFiles.map((_, index) => ({ success: true })),
    );
    for (const filepath of staticFiles) {
      const relativePath = path.relative(staticDirectory, filepath);
      expect(fs.readFileSync(path.join(repository, relativePath), "utf8")).toBe(
        fs.readFileSync(filepath, "utf8"),
      );
    }
  });

  it("rejects repositories outside the @minifw organization", async () => {
    const repository = createRepository("@other/example");

    await expect(syncStaticFiles(repository)).rejects.toMatchObject({
      code: MiniToolingErrors.PackValidInvalidPackageOrg,
    });
  });
});
