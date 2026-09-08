import fs from "node:fs/promises";
import path from "node:path";
import {
  copyFiles,
  type CopyFileResult,
  type CopyFilesOptions,
} from "../copy-files/copy-files";
import { validatePackage } from "../validate-package/validate-package";

const staticDirectory = path.resolve(import.meta.dir, "../../static");

export type SyncOptions = CopyFilesOptions;

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
