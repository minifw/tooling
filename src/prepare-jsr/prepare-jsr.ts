import fs from "node:fs";
import path from "node:path";
import { MiniToolingError } from "../mini-tooling-error/mini-tooling-error";
import {
  getPackageFile,
  getPackageName,
  validatePackage,
} from "../validate-package/validate-package";
import { validateGitignore } from "../validate-gitignore/validate-gitignore";

const jsrSchema = "https://jsr.io/schema/config-file.v1.json";

interface JsrPublishMetadata {
  exclude: string[];
  include: string[];
}

interface PackageManifest {
  exports: Record<string, string>;
  minifwTooling: { jsr: { publish: JsrPublishMetadata } };
  name: string;
  version: string;
}

interface JsrConfig {
  $schema: string;
  exports: Record<string, string>;
  name: string;
  publish: JsrPublishMetadata;
  version: string;
}

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}

function readPackageManifest(directory: string): {
  manifest: PackageManifest;
  packagePath: string;
} {
  const { packageInfo, packagePath } = getPackageFile(directory);
  const name = getPackageName(packageInfo, packagePath);
  let parsed: unknown;

  try {
    parsed = JSON.parse(packageInfo);
  } catch {
    throw new MiniToolingError("PackValidCannotReadPackageFile", packagePath);
  }

  if (!isStringRecord(parsed) || typeof parsed.version !== "string")
    throw new MiniToolingError("PackValidInvalidPackageFile", packagePath);

  if (
    !isStringRecord(parsed.exports) ||
    !Object.values(parsed.exports).every((entry) => typeof entry === "string")
  )
    throw new MiniToolingError("JsrPrepareInvalidExports", packagePath);

  const tooling = parsed.minifwTooling;
  const jsr = isStringRecord(tooling) ? tooling.jsr : undefined;
  const publish = isStringRecord(jsr) ? jsr.publish : undefined;
  if (
    !isStringRecord(publish) ||
    !isStringArray(publish.include) ||
    !isStringArray(publish.exclude)
  )
    throw new MiniToolingError("JsrPrepareInvalidMetadata", packagePath);

  const publishMetadata: JsrPublishMetadata = {
    exclude: publish.exclude,
    include: publish.include,
  };

  return {
    manifest: {
      exports: parsed.exports as Record<string, string>,
      minifwTooling: { jsr: { publish: publishMetadata } },
      name,
      version: parsed.version,
    },
    packagePath,
  };
}

/**
 * Creates a JSR configuration from a package manifest and its JSR publish
 * metadata.
 */
export function prepareJsrConfig(directory: string): { jsrPath: string } {
  const resolvedDirectory = path.resolve(process.cwd(), directory);
  validatePackage(resolvedDirectory);
  const { manifest } = readPackageManifest(resolvedDirectory);
  const jsrPath = path.join(resolvedDirectory, "jsr.json");
  const config: JsrConfig = {
    $schema: jsrSchema,
    name: manifest.name,
    version: manifest.version,
    exports: manifest.exports,
    publish: manifest.minifwTooling.jsr.publish,
  };

  try {
    fs.writeFileSync(jsrPath, `${JSON.stringify(config, undefined, 2)}\n`);
  } catch {
    throw new MiniToolingError("JsrPrepareCannotWriteFile", jsrPath);
  }

  validateGitignore(resolvedDirectory, ["jsr.json"]);
  return { jsrPath };
}
