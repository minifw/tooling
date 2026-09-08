interface MiniToolingErrorData {
  message: string;
}

export const MiniToolingErrors = {
  GitignoreValidNoDir: "GitignoreValidNoDir",
  GitignoreValidInvalidDir: "GitignoreValidInvalidDir",
  GitignoreValidInvalidFile: "GitignoreValidInvalidFile",
  GitignoreValidCannotReadFile: "GitignoreValidCannotReadFile",
  GitignoreValidCannotWriteFile: "GitignoreValidCannotWriteFile",
  CopyFilesCannotReadFile: "CopyFilesCannotReadFile",
  CopyFilesNoOutputDirectory: "CopyFilesNoOutputDirectory",
  CopyFilesInvalidOutputDirectory: "CopyFilesInvalidOutputDirectory",
  CopyFilesCannotWriteFile: "CopyFilesCannotWriteFile",
  CopyFilesInvalidConcurrency: "CopyFilesInvalidConcurrency",
  LocalToolingInstallFailed: "LocalToolingInstallFailed",
  JsrPrepareInvalidMetadata: "JsrPrepareInvalidMetadata",
  JsrPrepareInvalidExports: "JsrPrepareInvalidExports",
  JsrPrepareCannotWriteFile: "JsrPrepareCannotWriteFile",
  PackValidNoDir: "PackValidNoDir",
  PackValidInvalidDir: "PackValidInvalidDir",
  PackValidNoPackageFile: "PackValidNoPackageFile",
  PackValidInvalidPackageFile: "PackValidInvalidPackageFile",
  PackValidCannotReadPackageFile: "PackValidCannotReadPackageFile",
  PackValidNoPackageName: "PackValidNoPackageName",
  PackValidInvalidPackageName: "PackValidInvalidPackageName",
  PackValidNoPackageOrg: "PackValidNoPackageOrg",
  PackValidMalformedPackageOrg: "PackValidMalformedPackageOrg",
  PackValidInvalidPackageOrg: "PackValidInvalidPackageOrg",
} as const;

export type MiniToolingErrorCode = keyof typeof MiniToolingErrors;

type ErrorFactory = (...arguments_: never[]) => MiniToolingErrorData;

const errorList: Record<MiniToolingErrorCode, ErrorFactory> = {
  GitignoreValidNoDir: (directory: string) => ({
    message: `Gitignore validation failed: directory "${directory}" could not be found.`,
  }),
  GitignoreValidInvalidDir: (directory: string) => ({
    message: `Gitignore validation failed: the provided path "${directory}" is not a directory.`,
  }),
  GitignoreValidInvalidFile: (filepath: string) => ({
    message: `Gitignore validation failed: "${filepath}" is not a file.`,
  }),
  GitignoreValidCannotReadFile: (filepath: string) => ({
    message: `Gitignore validation failed: could not read "${filepath}".`,
  }),
  GitignoreValidCannotWriteFile: (filepath: string) => ({
    message: `Gitignore validation failed: could not write "${filepath}".`,
  }),
  CopyFilesCannotReadFile: (filepath: string) => ({
    message: `File copy failed: could not read "${filepath}".`,
  }),
  CopyFilesNoOutputDirectory: (directory: string) => ({
    message: `File copy failed: output directory "${directory}" could not be found.`,
  }),
  CopyFilesInvalidOutputDirectory: (directory: string) => ({
    message: `File copy failed: output path "${directory}" is not a directory.`,
  }),
  CopyFilesCannotWriteFile: (filepath: string) => ({
    message: `File copy failed: could not write "${filepath}".`,
  }),
  CopyFilesInvalidConcurrency: (concurrency: number) => ({
    message: `File copy failed: concurrency must be a positive integer, received "${concurrency}".`,
  }),
  LocalToolingInstallFailed: (directory: string) => ({
    message: `Local tooling installation failed in "${directory}".`,
  }),
  JsrPrepareInvalidMetadata: (filepath: string) => ({
    message: `JSR preparation failed: "${filepath}" must define minifwTooling.jsr.publish.include and minifwTooling.jsr.publish.exclude as string arrays.`,
  }),
  JsrPrepareInvalidExports: (filepath: string) => ({
    message: `JSR preparation failed: "${filepath}" must define exports as a map of string export paths to string source paths.`,
  }),
  JsrPrepareCannotWriteFile: (filepath: string) => ({
    message: `JSR preparation failed: could not write "${filepath}".`,
  }),
  PackValidNoDir: (filepath: string) => ({
    message: `Package validation failed: directory "${filepath}" could not be found.`,
  }),
  PackValidInvalidDir: (filepath: string) => ({
    message: `Package validation failed: the provided path "${filepath}" is not a directory.`,
  }),
  PackValidNoPackageFile: (filepath: string) => ({
    message: `Package validation failed: package file "${filepath}"" could not be found.`,
  }),
  PackValidInvalidPackageFile: (filepath: string) => ({
    message: `Package validation failed: "${filepath}" is not a valid package file.`,
  }),
  PackValidCannotReadPackageFile: (filepath: string) => ({
    message: `Package validation failed: error reading package file: "${filepath}".`,
  }),
  PackValidNoPackageName: (filepath: string) => ({
    message: `Package validation failed: package file "${filepath}" does not define a name.`,
  }),
  PackValidInvalidPackageName: (filepath: string, providedName: unknown) => ({
    message: `Package validation failed: package file "${filepath}" has an invalid name: "${JSON.stringify(providedName)}".`,
  }),
  PackValidNoPackageOrg: (filepath: string, providedName: string) => ({
    message: `Package validation failed: the package file "${filepath}" has a name with no organization: "${providedName}".`,
  }),
  PackValidMalformedPackageOrg: (
    filepath: string,
    providedName: string,
    providedOrg: string,
  ) => ({
    message: `Package validation failed: the provided package name in "${filepath}": "${providedName}" has a malformed organization: "${providedOrg}".`,
  }),
  PackValidInvalidPackageOrg: (
    filepath: string,
    providedName: string,
    organization: string,
  ) => ({
    message: `Package validation failed: the package file "${filepath}" has a name of "${providedName}" with an invalid organization: "${organization}".\n\nThis tool is designed only for use with "@minifw/*" repositories.`,
  }),
};

export class MiniToolingError<
  Code extends MiniToolingErrorCode = MiniToolingErrorCode,
> extends Error {
  constructor(
    public readonly code: Code,
    ...arguments_: unknown[]
  ) {
    const createError = errorList[code] as unknown as (
      ...arguments__: unknown[]
    ) => MiniToolingErrorData;

    const { message } = createError(...arguments_);
    super(message);
    this.name = "MiniToolingError";
  }
}
