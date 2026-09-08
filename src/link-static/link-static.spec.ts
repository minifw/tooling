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
  it("creates relative links for non-workflow static files and reuses matching links", async () => {
    const inputDirectory = createTemporaryDirectory();
    const outputDirectory = createTemporaryDirectory();
    const input = path.join(inputDirectory, ".ai", "skill.md");
    fs.mkdirSync(path.dirname(input), { recursive: true });
    fs.writeFileSync(input, "name: CI\n");

    expect(await linkStaticFiles(outputDirectory, inputDirectory)).toEqual([
      ".ai/skill.md",
    ]);
    expect(fs.realpathSync(path.join(outputDirectory, ".ai", "skill.md"))).toBe(
      input,
    );
    expect(
      fs.readFileSync(path.join(outputDirectory, ".gitignore"), "utf8"),
    ).toContain("/.ai/skill.md");
    expect(
      fs.readFileSync(path.join(outputDirectory, ".gitignore"), "utf8"),
    ).not.toContain("\n.ai/skill.md\n");
    expect(await linkStaticFiles(outputDirectory, inputDirectory)).toEqual([
      ".ai/skill.md",
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
    expect(fs.readFileSync(output, "utf8")).toBe("*\n");
    fs.writeFileSync(output, "outdated\n");
    await linkStaticFiles(outputDirectory, inputDirectory);
    expect(fs.readFileSync(output, "utf8")).toBe("*\n");
  });

  it("copies GitHub workflows so Actions can load tracked workflow files", async () => {
    const inputDirectory = createTemporaryDirectory();
    const outputDirectory = createTemporaryDirectory();
    const input = path.join(inputDirectory, ".github", "workflows", "ci.yml");
    const output = path.join(outputDirectory, ".github", "workflows", "ci.yml");
    fs.mkdirSync(path.dirname(input), { recursive: true });
    fs.writeFileSync(input, "name: CI\n");
    fs.writeFileSync(path.join(inputDirectory, "AGENTS.md"), "shared\n");

    await linkStaticFiles(outputDirectory, inputDirectory);

    expect(fs.lstatSync(output).isSymbolicLink()).toBe(false);
    expect(fs.readFileSync(output, "utf8")).toBe("name: CI\n");
    expect(
      fs.readFileSync(path.join(outputDirectory, ".gitignore"), "utf8"),
    ).not.toContain("/.github/workflows/ci.yml");
    fs.writeFileSync(input, "name: Updated CI\n");
    await linkStaticFiles(outputDirectory, inputDirectory);
    expect(fs.readFileSync(output, "utf8")).toBe("name: Updated CI\n");
  });
});
