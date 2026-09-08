import { afterEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
	addGitignoreEntries,
	getGitignoreFile,
	getMissingGitignoreEntries,
	managedSectionComment,
	removeGitignoreEntries,
	validateGitignore,
	writeGitignoreFile,
} from "./validate-gitignore";
import { MiniToolingErrors } from "../mini-tooling-error/mini-tooling-error";
import { expectError } from "../mini-tooling-error/mini-tooling-error.harness";

const temporaryDirectories: string[] = [];
const managedFiles = ["AGENTS.md", "eslint.config.ts", "test/example.md"];

function createTemporaryDirectory(): string {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), "minifw-tooling-"));
	temporaryDirectories.push(directory);
	return directory;
}

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0))
		fs.rmSync(directory, { force: true, recursive: true });
});

describe("validateGitignore()", () => {
	it("finds existing gitignore files and represents missing files as empty", () => {
		const directory = createTemporaryDirectory();
		const gitignorePath = path.join(directory, ".gitignore");

		expect(getGitignoreFile(directory)).toEqual({
			gitignoreInfo: "",
			gitignorePath,
		});
		fs.writeFileSync(gitignorePath, "node_modules\n");
		expect(getGitignoreFile(directory)).toEqual({
			gitignoreInfo: "node_modules\n",
			gitignorePath,
		});
	});

	it("reports invalid directories and gitignore paths", () => {
		const directory = createTemporaryDirectory();
		const filepath = path.join(directory, "file");
		const unreadableDirectory = createTemporaryDirectory();
		fs.writeFileSync(filepath, "");
		fs.mkdirSync(path.join(directory, ".gitignore"));
		fs.symlinkSync("/proc/1/mem", path.join(unreadableDirectory, ".gitignore"));

		expectError(
			() => getGitignoreFile(path.join(directory, "missing")),
			MiniToolingErrors.GitignoreValidNoDir,
		);
		expectError(
			() => getGitignoreFile(filepath),
			MiniToolingErrors.GitignoreValidInvalidDir,
		);
		expectError(
			() => getGitignoreFile(directory),
			MiniToolingErrors.GitignoreValidInvalidFile,
		);
		expectError(
			() => getGitignoreFile(unreadableDirectory),
			MiniToolingErrors.GitignoreValidCannotReadFile,
		);
		expectError(
			() => writeGitignoreFile("/proc/minifw-tooling-test", ""),
			MiniToolingErrors.GitignoreValidCannotWriteFile,
		);
	});

	it("finds missing managed files without moving existing entries", () => {
		const gitignoreInfo = "AGENTS.md\n/test/example.md\nnode_modules\n";

		expect(getMissingGitignoreEntries(gitignoreInfo, managedFiles)).toEqual([
			"eslint.config.ts",
		]);
		expect(addGitignoreEntries(gitignoreInfo, ["eslint.config.ts"])).toBe(
			`${gitignoreInfo.trimEnd()}\n\n${managedSectionComment}\neslint.config.ts\n`,
		);
	});

	it("adds missing entries under the existing managed section", () => {
		const gitignoreInfo = `${managedSectionComment}\nAGENTS.md\n\nnode_modules\n`;

		expect(addGitignoreEntries(gitignoreInfo, ["test/example.md"])).toBe(
			`${managedSectionComment}\nAGENTS.md\ntest/example.md\n\nnode_modules\n`,
		);
	});

	it("removes paths that are no longer tooling-managed", () => {
		const gitignoreInfo = `${managedSectionComment}\nAGENTS.md\neslint.config.ts\nprettier.config.ts\n`;

		expect(
			removeGitignoreEntries(gitignoreInfo, [
				"eslint.config.ts",
				"prettier.config.ts",
			]),
		).toBe(`${managedSectionComment}\nAGENTS.md\n`);
	});

	it("creates and updates gitignore files with only missing managed entries", () => {
		const directory = createTemporaryDirectory();

		expect(validateGitignore(directory, managedFiles)).toMatchObject({
			addedEntries: managedFiles,
		});
		expect(validateGitignore(directory, managedFiles)).toMatchObject({
			addedEntries: [],
		});
		expect(fs.readFileSync(path.join(directory, ".gitignore"), "utf-8")).toBe(
			`${managedSectionComment}\n${managedFiles.join("\n")}\n`,
		);
	});

	it("removes obsolete entries while adding currently managed files", () => {
		const directory = createTemporaryDirectory();
		fs.writeFileSync(path.join(directory, ".gitignore"), "eslint.config.ts\n");

		expect(
			validateGitignore(directory, ["AGENTS.md"], {
				obsoleteEntries: ["eslint.config.ts"],
			}),
		).toMatchObject({
			addedEntries: ["AGENTS.md"],
			removedEntries: ["eslint.config.ts"],
		});
	});
});
