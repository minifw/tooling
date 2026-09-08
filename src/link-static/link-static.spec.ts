import { afterEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { linkStaticFiles } from "./link-static";

const temporaryDirectories: string[] = [];

function createTemporaryDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "minifw-tooling-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    fs.rmSync(directory, { force: true, recursive: true });
});

describe("linkStaticFiles()", () => {
  it("creates relative links for nested static files and reuses matching links", async () => {
    const inputDirectory = createTemporaryDirectory();
    const outputDirectory = createTemporaryDirectory();
    const input = path.join(inputDirectory, ".github", "workflow.yml");
    fs.mkdirSync(path.dirname(input), { recursive: true });
    fs.writeFileSync(input, "name: CI\n");

    expect(await linkStaticFiles(outputDirectory, inputDirectory)).toEqual([
      ".github/workflow.yml",
    ]);
    expect(
      fs.realpathSync(path.join(outputDirectory, ".github", "workflow.yml")),
    ).toBe(input);
    expect(
      fs.readFileSync(path.join(outputDirectory, ".gitignore"), "utf-8"),
    ).toContain("/.github/workflow.yml");
    expect(
      fs.readFileSync(path.join(outputDirectory, ".gitignore"), "utf-8"),
    ).not.toContain("\n.github/workflow.yml\n");
    expect(await linkStaticFiles(outputDirectory, inputDirectory)).toEqual([
      ".github/workflow.yml",
    ]);
  });

  it("does not replace an existing non-symlink file", async () => {
    const inputDirectory = createTemporaryDirectory();
    const outputDirectory = createTemporaryDirectory();
    fs.writeFileSync(path.join(inputDirectory, "AGENTS.md"), "shared\n");
    fs.writeFileSync(path.join(outputDirectory, "AGENTS.md"), "local\n");

    await expect(
      linkStaticFiles(outputDirectory, inputDirectory),
    ).rejects.toThrow("Refusing to replace existing file");
  });

  it("copies ignore files because Git does not support symbolic links for them", async () => {
    const inputDirectory = createTemporaryDirectory();
    const outputDirectory = createTemporaryDirectory();
    const input = path.join(inputDirectory, ".husky", "_", ".gitignore");
    fs.mkdirSync(path.dirname(input), { recursive: true });
    fs.writeFileSync(input, "*\n");

    await linkStaticFiles(outputDirectory, inputDirectory);

    const output = path.join(outputDirectory, ".husky", "_", ".gitignore");
    expect(fs.lstatSync(output).isSymbolicLink()).toBe(false);
    expect(fs.readFileSync(output, "utf-8")).toBe("*\n");
    fs.writeFileSync(output, "outdated\n");
    await linkStaticFiles(outputDirectory, inputDirectory);
    expect(fs.readFileSync(output, "utf-8")).toBe("*\n");
  });
});
