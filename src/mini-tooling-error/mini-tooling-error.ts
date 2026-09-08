interface MiniToolingErrorData {
  message: string;
}

const errorList = {
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
} as const satisfies Record<
  string,
  (...arguments_: never[]) => MiniToolingErrorData
>;

export type MiniToolingErrorCode = keyof typeof errorList;

type MiniToolingErrorArguments<Code extends MiniToolingErrorCode> = Parameters<
  (typeof errorList)[Code]
>;

export const MiniToolingErrors = Object.fromEntries(
  Object.keys(errorList).map((code) => [code, code]),
) as {
  readonly [Code in MiniToolingErrorCode]: Code;
};

export class MiniToolingError<
  Code extends MiniToolingErrorCode = MiniToolingErrorCode,
> extends Error {
  constructor(
    public readonly code: Code,
    ...arguments_: MiniToolingErrorArguments<Code>
  ) {
    const createError = errorList[code] as (
      ...arguments__: MiniToolingErrorArguments<Code>
    ) => MiniToolingErrorData;

    const { message } = createError(...arguments_);
    super(message);
    this.name = "MiniToolingError";
  }
}
