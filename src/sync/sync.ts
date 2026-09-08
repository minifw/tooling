import fs from "node:fs/promises";
import path from "node:path";
import {
  copyFiles,
  type CopyFileResult,
  type CopyFilesOptions,
} from "../copy-files/copy-files";
import { validatePackage } from "../validate-package/validate-package";

const staticDirectory: string = path.resolve(import.meta.dir, "../../static");

/** Configures how static files are copied into a package repository. */
export type SyncOptions = CopyFilesOptions;

function isCheckedStaticFile(filepath: string): boolean {
  return !filepath.startsWith(".husky/");
}

async function getStaticFiles(directory = staticDirectory): Promise<string[]> {
  const files = await fs.readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    files.map(async (file) => {
      const filepath = path.join(directory, file.name);
      if (file.isFile()) return [filepath];
      if (file.isDirectory()) return getStaticFiles(filepath);
      return [];
    }),
  );

  return nestedFiles.flat();
}

/**
 * Lists paths managed by static assets, relative to the supplied static
 * directory.
 */
export async function getManagedFilePaths(
  directory = staticDirectory,
): Promise<string[]> {
  const files = await getStaticFiles(directory);
  return files.map((filepath) =>
    path.relative(directory, filepath).split(path.sep).join("/"),
  );
}

/** Lists managed static files that must remain synchronized in Git. */
export async function checkStaticFiles(
  rootDirectory: string,
): Promise<string[]> {
  validatePackage(rootDirectory);

  const inputs = await getStaticFiles();
  const outOfSyncFiles = await Promise.all(
    inputs.map(async (input) => {
      const relativePath = path.relative(staticDirectory, input);
      if (!isCheckedStaticFile(relativePath)) return;

      try {
        const [inputContents, outputContents] = await Promise.all([
          fs.readFile(input),
          fs.readFile(path.join(rootDirectory, relativePath)),
        ]);
        return inputContents.equals(outputContents) ? undefined : relativePath;
      } catch {
        return relativePath;
      }
    }),
  );

  return outOfSyncFiles
    .filter((filepath): filepath is string => filepath !== undefined)
    .toSorted();
}

/** Copies all static assets into a validated @minifw package repository. */
export async function syncStaticFiles(
  rootDirectory: string,
  options: SyncOptions = {},
): Promise<CopyFileResult[]> {
  validatePackage(rootDirectory);

  const inputs = await getStaticFiles();
  return copyFiles(inputs, rootDirectory, {
    ...options,
    getOutputRelativePath: (input) => path.relative(staticDirectory, input),
  });
}
