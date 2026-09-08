import fs from "node:fs/promises";
import path from "node:path";
import {
  copyFiles,
  type CopyFileResult,
  type CopyFilesOptions,
} from "../copy-files/copy-files";
import { validatePackage } from "../validate-package/validate-package";

const staticDirectory = path.resolve(import.meta.dir, "../../static");

export interface SyncOptions extends CopyFilesOptions {}

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

export async function getManagedFilePaths(
  directory = staticDirectory,
): Promise<string[]> {
  return (await getStaticFiles(directory)).map((filepath) =>
    path.relative(directory, filepath).split(path.sep).join("/"),
  );
}

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
