import fs from "node:fs/promises";
import path from "node:path";
import {
  copyFiles,
  type CopyFileResult,
  type CopyFilesOptions,
} from "../copy-files/copy-files";
import { MiniToolingError } from "../mini-tooling-error/mini-tooling-error";
import {
  getPackageFile,
  validatePackage,
} from "../validate-package/validate-package";

const staticDirectory: string = path.resolve(import.meta.dir, "../../static");

/** Configures how static files are copied into a package repository. */
export type SyncOptions = CopyFilesOptions;

function isCheckedStaticFile(filepath: string): boolean {
  return !filepath.startsWith(".husky/");
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Lists static file paths excluded by a repository's package manifest. */
export function getExcludedStaticFiles(rootDirectory: string): Set<string> {
  const { packageInfo, packagePath } = getPackageFile(rootDirectory);
  const packageManifest = JSON.parse(packageInfo) as Record<string, unknown>;
  const tooling = packageManifest.minifwTooling;

  if (tooling === undefined) return new Set();
  if (!isRecord(tooling))
    throw new MiniToolingError("SyncInvalidExclude", packagePath);

  const sync = tooling.sync;
  if (sync === undefined) return new Set();
  if (!isRecord(sync))
    throw new MiniToolingError("SyncInvalidExclude", packagePath);

  if (!isStringArray(sync.exclude))
    throw new MiniToolingError("SyncInvalidExclude", packagePath);

  return new Set(sync.exclude);
}

async function getStaticFiles(
  directory = staticDirectory,
  excludedFiles: ReadonlySet<string> = new Set(),
  rootDirectory = directory,
): Promise<string[]> {
  const files = await fs.readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    files.map(async (file) => {
      const filepath = path.join(directory, file.name);
      if (file.isFile()) return [filepath];
      if (file.isDirectory())
        return getStaticFiles(filepath, excludedFiles, rootDirectory);
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

/**
 * Lists paths managed by static assets, relative to the supplied static
 * directory.
 */
export async function getManagedFilePaths(
  directory = staticDirectory,
  excludedFiles: ReadonlySet<string> = new Set(),
): Promise<string[]> {
  const files = await getStaticFiles(directory, excludedFiles);
  return files.map((filepath) =>
    path.relative(directory, filepath).split(path.sep).join("/"),
  );
}

/** Lists managed static files that must remain synchronized in Git. */
export async function checkStaticFiles(
  rootDirectory: string,
): Promise<string[]> {
  validatePackage(rootDirectory);

  const inputs = await getStaticFiles(
    staticDirectory,
    getExcludedStaticFiles(rootDirectory),
  );
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

  const inputs = await getStaticFiles(
    staticDirectory,
    getExcludedStaticFiles(rootDirectory),
  );
  return copyFiles(inputs, rootDirectory, {
    ...options,
    getOutputRelativePath: (input) => path.relative(staticDirectory, input),
  });
}
