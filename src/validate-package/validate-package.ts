import path from "node:path";
import fs from "node:fs";
import {
  MiniToolingError,
  MiniToolingErrors,
} from "../mini-tooling-error/mini-tooling-error";

/**
 *
 */
export function getPackageFile(directory: string): {
  packageInfo: string;
  packagePath: string;
} {
  const resolved = path.resolve(process.cwd(), directory);

  const exists = fs.existsSync(resolved);
  if (!exists) throw new MiniToolingError("PackValidNoDir", resolved);

  const stats = fs.statSync(resolved);
  if (!stats.isDirectory())
    throw new MiniToolingError("PackValidInvalidDir", resolved);

  const packagePath = path.join(resolved, "package.json");

  const hasPackage = fs.existsSync(packagePath);
  if (!hasPackage)
    throw new MiniToolingError("PackValidNoPackageFile", packagePath);

  const packageStats = fs.statSync(packagePath);
  if (!packageStats.isFile())
    throw new MiniToolingError("PackValidInvalidPackageFile", packagePath);

  try {
    const packageInfo = fs.readFileSync(packagePath, "utf8");
    return { packageInfo, packagePath };
  } catch {
    throw new MiniToolingError("PackValidCannotReadPackageFile", packagePath);
  }
}

/**
 *
 */
export function getPackageName(packageInfo: string, filepath: string): string {
  let parsed: unknown;

  try {
    parsed = JSON.parse(packageInfo);
  } catch {
    throw new MiniToolingError("PackValidCannotReadPackageFile", filepath);
  }

  if (typeof parsed !== "object" || parsed === null)
    throw new MiniToolingError("PackValidInvalidPackageFile", filepath);

  if (!("name" in parsed))
    throw new MiniToolingError("PackValidNoPackageName", filepath);

  if (typeof parsed.name !== "string")
    throw new MiniToolingError(
      "PackValidInvalidPackageName",
      filepath,
      parsed.name,
    );

  return parsed.name;
}

/**
 *
 */
export function getPackageOwner(name: string, filepath: string): string {
  const parts = name.split("/").filter(Boolean);
  if (parts.length < 2)
    throw new MiniToolingError("PackValidNoPackageOrg", filepath, name);
  if (parts.length > 2)
    throw new MiniToolingError("PackValidInvalidPackageName", filepath, name);
  const rawOrg = parts[0]!;
  if (!rawOrg.startsWith("@"))
    throw new MiniToolingError(
      "PackValidMalformedPackageOrg",
      filepath,
      name,
      rawOrg,
    );

  const org = rawOrg.slice(1);
  return org;
}

/**
 *
 */
export function validatePackage(repoRoot: string): boolean {
  const { packageInfo, packagePath } = getPackageFile(repoRoot);

  const name = getPackageName(packageInfo, packagePath);

  const owner = getPackageOwner(name, packagePath);

  if (owner !== "minifw")
    throw new MiniToolingError(
      "PackValidInvalidPackageOrg",
      packagePath,
      name,
      owner,
    );

  return true;
}
