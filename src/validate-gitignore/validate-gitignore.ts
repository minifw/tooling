import fs from "node:fs";
import path from "node:path";
import { MiniToolingError } from "../mini-tooling-error/mini-tooling-error";

/** Identifies the .gitignore section maintained by this package. */
export const managedSectionComment =
  '# managed by @minifw/tooling - run "bunx @minifw/tooling sync" to update';

/** Reads a directory's .gitignore file, treating a missing file as empty. */
export function getGitignoreFile(directory: string): {
  gitignoreInfo: string;
  gitignorePath: string;
} {
  const resolvedDirectory = path.resolve(process.cwd(), directory);

  if (!fs.existsSync(resolvedDirectory))
    throw new MiniToolingError("GitignoreValidNoDir", resolvedDirectory);
  if (!fs.statSync(resolvedDirectory).isDirectory())
    throw new MiniToolingError("GitignoreValidInvalidDir", resolvedDirectory);

  const gitignorePath = path.join(resolvedDirectory, ".gitignore");
  if (!fs.existsSync(gitignorePath))
    return { gitignoreInfo: "", gitignorePath };
  if (!fs.statSync(gitignorePath).isFile())
    throw new MiniToolingError("GitignoreValidInvalidFile", gitignorePath);

  try {
    return {
      gitignoreInfo: fs.readFileSync(gitignorePath, "utf8"),
      gitignorePath,
    };
  } catch {
    throw new MiniToolingError("GitignoreValidCannotReadFile", gitignorePath);
  }
}

function normalizeEntry(entry: string): string {
  return entry.trim().replace(/^\.?(?:\/)+/, "");
}

/** Returns managed paths that are not already ignored. */
export function getMissingGitignoreEntries(
  gitignoreInfo: string,
  managedFiles: string[],
): string[] {
  const existingEntries = new Set(
    gitignoreInfo
      .split(/\r?\n/)
      .map((entry) => normalizeEntry(entry))
      .filter((entry) => entry.length > 0 && !entry.startsWith("#")),
  );

  return managedFiles.filter(
    (filepath) => !existingEntries.has(normalizeEntry(filepath)),
  );
}

/** Inserts paths into the managed .gitignore section. */
export function addGitignoreEntries(
  gitignoreInfo: string,
  entries: string[],
): string {
  if (entries.length === 0) return gitignoreInfo;

  const lines = gitignoreInfo.split(/\r?\n/);
  const sectionIndex = lines.findIndex(
    (line) => line.trim() === managedSectionComment,
  );

  if (sectionIndex === -1) {
    const existingInfo = gitignoreInfo.trimEnd();
    return `${existingInfo}${existingInfo ? "\n\n" : ""}${managedSectionComment}\n${entries.join("\n")}\n`;
  }

  let insertionIndex = sectionIndex + 1;
  while (
    insertionIndex < lines.length &&
    lines[insertionIndex]!.trim() !== "" &&
    !lines[insertionIndex]!.trim().startsWith("#")
  )
    insertionIndex++;

  lines.splice(insertionIndex, 0, ...entries);
  return lines.join("\n");
}

/** Removes the given paths from .gitignore content. */
export function removeGitignoreEntries(
  gitignoreInfo: string,
  entries: readonly string[],
): string {
  if (entries.length === 0) return gitignoreInfo;

  const normalizedEntries = new Set(
    entries.map((entry) => normalizeEntry(entry)),
  );
  return gitignoreInfo
    .split(/\r?\n/)
    .filter((line) => !normalizedEntries.has(normalizeEntry(line)))
    .join("\n");
}

/** Writes .gitignore content, mapping file-system failures to tooling errors. */
export function writeGitignoreFile(
  filepath: string,
  gitignoreInfo: string,
): void {
  try {
    fs.writeFileSync(filepath, gitignoreInfo);
  } catch {
    throw new MiniToolingError("GitignoreValidCannotWriteFile", filepath);
  }
}

/** Configures entries removed from the tooling-managed .gitignore section. */
export interface ValidateGitignoreOptions {
  obsoleteEntries?: readonly string[];
}

/** Adds missing managed paths and removes obsolete paths from a .gitignore file. */
export function validateGitignore(
  directory: string,
  managedFiles: string[],
  { obsoleteEntries = [] }: ValidateGitignoreOptions = {},
): { addedEntries: string[]; gitignorePath: string; removedEntries: string[] } {
  const { gitignoreInfo, gitignorePath } = getGitignoreFile(directory);
  const existingEntries = new Set(
    gitignoreInfo.split(/\r?\n/).map((entry) => normalizeEntry(entry)),
  );
  const updatedInfo = removeGitignoreEntries(gitignoreInfo, obsoleteEntries);
  const removedEntries = obsoleteEntries.filter((entry) =>
    existingEntries.has(normalizeEntry(entry)),
  );
  const addedEntries = getMissingGitignoreEntries(updatedInfo, managedFiles);
  const finalInfo = addGitignoreEntries(updatedInfo, addedEntries);

  if (finalInfo !== gitignoreInfo) writeGitignoreFile(gitignorePath, finalInfo);

  return { addedEntries, gitignorePath, removedEntries };
}
