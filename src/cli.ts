#!/usr/bin/env bun
import path from "node:path";
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { ensureLocalTooling } from "./ensure-local-tooling/ensure-local-tooling";
import { prepareJsrConfig } from "./prepare-jsr/prepare-jsr";
import {
  checkStaticFiles,
  getManagedFilePaths,
  syncStaticFiles,
} from "./sync/sync";
import { MiniToolingError } from "./mini-tooling-error/mini-tooling-error";
import { validateGitignore } from "./validate-gitignore/validate-gitignore";
import { validatePackage } from "./validate-package/validate-package";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Overrides CLI runtime dependencies, primarily for integration tests. */
export interface CliDependencies {
  ensureLocalTooling?: typeof ensureLocalTooling;
  prepareJsrConfig?: typeof prepareJsrConfig;
  setExitCode?(code: number): void;
}

/** Creates the command-line program for synchronizing package-managed files. */
export function createProgram({
  ensureLocalTooling: installLocalTooling = ensureLocalTooling,
  prepareJsrConfig: prepareJsr = prepareJsrConfig,
  setExitCode = (code) => {
    process.exitCode = code;
  },
}: CliDependencies = {}): Command {
  const program = new Command();

  program
    .name("minifw-tooling")
    .description("Shared tooling for @minifw repositories");

  program
    .command("sync")
    .description("Synchronize package-managed files into a repository")
    .option("--root-dir <directory>", "repository directory", process.cwd())
    .option("--concurrency <count>", "simultaneous file copies", Number, 5)
    .option("--check", "check static files without installing or copying")
    .action(async ({ check, rootDir, concurrency }) => {
      const rootDirectory = path.resolve(rootDir);
      const validationSpinner = ora("Validating repository...").start();

      try {
        validatePackage(rootDirectory);
        validationSpinner.succeed("Validated repository.");
      } catch (error) {
        validationSpinner.fail("Repository validation failed.");
        throw error;
      }

      if (check) {
        const outOfSyncFiles = await checkStaticFiles(rootDirectory);
        if (outOfSyncFiles.length === 0) {
          console.log("Static files are synchronized.");
          return;
        }

        console.error(
          chalk.red(
            `Static files are out of sync:\n${outOfSyncFiles.map((filepath) => `- ${filepath}`).join("\n")}`,
          ),
        );
        setExitCode(1);
        return;
      }

      const installationSpinner = ora("Installing local tooling...").start();

      try {
        await installLocalTooling(rootDirectory);
        installationSpinner.succeed("Installed local tooling.");
      } catch (error) {
        installationSpinner.fail("Local tooling installation failed.");
        throw error;
      }

      const activeFiles = new Set<string>();
      const copySpinner = ora("Copying files...").start();
      let results;

      try {
        results = await syncStaticFiles(rootDirectory, {
          concurrency,
          onEvent: (event) => {
            const filename = path.basename(event.output);

            if (event.type === "started") activeFiles.add(filename);
            else activeFiles.delete(filename);

            copySpinner.text =
              activeFiles.size > 0
                ? `Copying files... (${[...activeFiles].join(", ")})`
                : "Copying files...";
          },
        });
      } catch (error) {
        copySpinner.fail("Copying files failed.");
        throw error;
      }
      const failures = results.filter((result) => !result.success);

      if (failures.length === 0) {
        copySpinner.succeed(`Synchronized ${results.length} files.`);
        const gitignoreSpinner = ora("Validating .gitignore...").start();

        try {
          const managedFilePaths = await getManagedFilePaths();
          const { addedEntries } = validateGitignore(
            rootDirectory,
            ["/jsr.json", "/.husky/**"],
            {
              obsoleteEntries: [
                ...managedFilePaths,
                ...managedFilePaths.map((filepath) => `/${filepath}`),
                "eslint.config.ts",
                "prettier.config.ts",
                "tsconfig.json",
              ],
            },
          );
          gitignoreSpinner.succeed(
            addedEntries.length > 0
              ? `Updated generated-file ignores with ${addedEntries.length} entries.`
              : "Validated .gitignore.",
          );
          return;
        } catch (error) {
          gitignoreSpinner.fail(".gitignore validation failed.");
          throw error;
        }
      }

      copySpinner.fail(chalk.red(`Failed to copy ${failures.length} files.`));
      console.error(chalk.red(`Failed to copy ${failures.length} files:`));
      for (const failure of failures)
        console.error(
          `${chalk.red("-")} ${path.basename(failure.output)}: ${getErrorMessage(failure.error)}`,
        );
      setExitCode(1);
    });

  program
    .command("prepare")
    .description("Generate the JSR configuration for a repository")
    .option("--root-dir <directory>", "repository directory", process.cwd())
    .action(({ rootDir }) => {
      const spinner = ora("Preparing JSR configuration...").start();

      try {
        const { jsrPath } = prepareJsr(path.resolve(rootDir));
        spinner.succeed(`Prepared ${path.basename(jsrPath)}.`);
      } catch (error) {
        spinner.fail("JSR configuration preparation failed.");
        throw error;
      }
    });

  return program;
}

/**
 * Parses and runs the tooling command-line interface with the provided
 * arguments.
 */
export async function runCli(argv = process.argv): Promise<void> {
  await createProgram().parseAsync(argv);
}

if (import.meta.main) {
  try {
    await runCli();
  } catch (error) {
    console.error(
      chalk.red(
        error instanceof MiniToolingError
          ? `${chalk.bgRed(chalk.white(chalk.bold("Error")))} ${chalk.bold(error.code)}: ${error.message}\n\n---\n\n${error.stack}`
          : String(error),
      ),
    );
    process.exitCode = 1;
  }
}
