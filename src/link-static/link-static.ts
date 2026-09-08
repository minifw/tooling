#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";
import { getExcludedStaticFiles, getManagedFilePaths } from "../sync/sync";
import { validateGitignore } from "../validate-gitignore/validate-gitignore";

const staticDirectory = path.resolve(import.meta.dir, "../../static");
const rootDirectory = path.resolve(import.meta.dir, "../..");

async function getStaticFiles(
  directory: string,
  rootDirectory = directory,
  excludedFiles: ReadonlySet<string> = new Set(),
): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const filepath = path.join(directory, entry.name);
      if (entry.isFile()) return [filepath];
      if (entry.isDirectory())
        return getStaticFiles(filepath, rootDirectory, excludedFiles);
      return [];
    }),
  );

  return nestedFiles
    .flat()
    .filter(
      (filepath) =>
        !excludedFiles.has(
          path.relative(rootDirectory, filepath).split(path.sep).join("/"),
        ),
    );
}

/** Copies every static asset to its corresponding root-level path. */
export async function linkStaticFiles(
  outputDirectory = rootDirectory,
  inputDirectory = staticDirectory,
  excludedFiles: ReadonlySet<string> = new Set(),
): Promise<string[]> {
  const inputs = await getStaticFiles(
    inputDirectory,
    inputDirectory,
    excludedFiles,
  );
  const linkedFiles: string[] = [];

  for (const input of inputs) {
    const relativePath = path.relative(inputDirectory, input);
    const output = path.join(outputDirectory, relativePath);

    await fs.mkdir(path.dirname(output), { recursive: true });
    try {
      const stats = await fs.lstat(output);
      if (stats.isSymbolicLink()) await fs.unlink(output);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }

    await fs.copyFile(input, output);
    linkedFiles.push(relativePath);
  }

  const managedPaths = await getManagedFilePaths(inputDirectory, excludedFiles);
  validateGitignore(outputDirectory, ["/.husky/**"], {
    obsoleteEntries: [
      ...managedPaths,
      ...managedPaths.map((filepath) => `/${filepath}`),
    ],
  });
  return linkedFiles;
}

if (import.meta.main) {
  await linkStaticFiles(
    rootDirectory,
    staticDirectory,
    getExcludedStaticFiles(rootDirectory),
  );
}
