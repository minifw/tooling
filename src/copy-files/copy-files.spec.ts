import { afterEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
	copyFile,
	copyFiles,
	readFile,
	writeFile,
	type CopyFileEvent,
} from "./copy-files";
import { MiniToolingErrors } from "../mini-tooling-error/mini-tooling-error";

const temporaryDirectories: string[] = [];

function createTemporaryDirectory(): string {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), "minifw-tooling-"));
	temporaryDirectories.push(directory);
	return directory;
}

function createFile(directory: string, name: string, contents: string): string {
	const filepath = path.join(directory, name);
	fs.writeFileSync(filepath, contents);
	return filepath;
}

async function expectRejectedError(
	action: () => Promise<unknown>,
	code: keyof typeof MiniToolingErrors,
) {
	await expect(action()).rejects.toMatchObject({ code });
}

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0))
		fs.rmSync(directory, { force: true, recursive: true });
});

describe("copy files", () => {
	it("reads and writes file contents", async () => {
		const directory = createTemporaryDirectory();
		const input = createFile(directory, "input.txt", "source content");
		const output = path.join(directory, "output.txt");

		expect((await readFile(input)).toString()).toBe("source content");
		await writeFile(Buffer.from("output content"), output);
		expect(fs.readFileSync(output, "utf-8")).toBe("output content");
	});

	it("reports read and write failures", async () => {
		const directory = createTemporaryDirectory();
		const missingFile = path.join(directory, "missing.txt");
		const outputDirectory = path.join(directory, "output.txt");

		fs.mkdirSync(outputDirectory);

		await expectRejectedError(
			() => readFile(missingFile),
			MiniToolingErrors.CopyFilesCannotReadFile,
		);
		await expectRejectedError(
			() => writeFile(Buffer.from("content"), outputDirectory),
			MiniToolingErrors.CopyFilesCannotWriteFile,
		);
	});

	it("copies a file into an existing output directory", async () => {
		const inputDirectory = createTemporaryDirectory();
		const outputDirectory = createTemporaryDirectory();
		const input = createFile(inputDirectory, "input.txt", "source content");

		const copied = await copyFile(input, outputDirectory);

		expect(copied).toEqual({
			input,
			output: path.join(outputDirectory, "input.txt"),
		});
		expect(fs.readFileSync(copied.output, "utf-8")).toBe("source content");
	});

	it("reports invalid copy-file inputs and destinations", async () => {
		const inputDirectory = createTemporaryDirectory();
		const outputDirectory = createTemporaryDirectory();
		const input = createFile(inputDirectory, "input.txt", "source content");
		const invalidOutputDirectory = path.join(
			outputDirectory,
			"not-a-directory",
		);

		fs.writeFileSync(invalidOutputDirectory, "");
		fs.mkdirSync(path.join(outputDirectory, "input.txt"));

		await expectRejectedError(
			() => copyFile(path.join(inputDirectory, "missing.txt"), outputDirectory),
			MiniToolingErrors.CopyFilesCannotReadFile,
		);
		await expectRejectedError(
			() => copyFile(input, path.join(outputDirectory, "missing")),
			MiniToolingErrors.CopyFilesNoOutputDirectory,
		);
		await expectRejectedError(
			() => copyFile(input, invalidOutputDirectory),
			MiniToolingErrors.CopyFilesInvalidOutputDirectory,
		);
		await expectRejectedError(
			() => copyFile(input, outputDirectory),
			MiniToolingErrors.CopyFilesCannotWriteFile,
		);
	});

	it("copies batches with per-file lifecycle events and failures", async () => {
		const inputDirectory = createTemporaryDirectory();
		const outputDirectory = createTemporaryDirectory();
		const firstInput = createFile(inputDirectory, "first.txt", "first");
		const missingInput = path.join(inputDirectory, "missing.txt");
		const lastInput = createFile(inputDirectory, "last.txt", "last");
		const events: CopyFileEvent[] = [];

		const results = await copyFiles(
			[firstInput, missingInput, lastInput],
			outputDirectory,
			{ concurrency: 2, onEvent: (event) => events.push(event) },
		);

		expect(results).toMatchObject([
			{
				input: firstInput,
				output: path.join(outputDirectory, "first.txt"),
				success: true,
			},
			{
				input: missingInput,
				output: path.join(outputDirectory, "missing.txt"),
				success: false,
				error: { code: MiniToolingErrors.CopyFilesCannotReadFile },
			},
			{
				input: lastInput,
				output: path.join(outputDirectory, "last.txt"),
				success: true,
			},
		]);
		expect(events.filter(({ type }) => type === "started")).toHaveLength(3);
		expect(events.filter(({ type }) => type === "succeeded")).toHaveLength(2);
		expect(events.filter(({ type }) => type === "failed")).toMatchObject([
			{
				input: missingInput,
				output: path.join(outputDirectory, "missing.txt"),
				error: { code: MiniToolingErrors.CopyFilesCannotReadFile },
			},
		]);
		expect(
			fs.readFileSync(path.join(outputDirectory, "first.txt"), "utf-8"),
		).toBe("first");
		expect(
			fs.readFileSync(path.join(outputDirectory, "last.txt"), "utf-8"),
		).toBe("last");
	});

	it("rejects invalid batch concurrency", async () => {
		await expectRejectedError(
			() => copyFiles([], "/test/output", { concurrency: 0 }),
			MiniToolingErrors.CopyFilesInvalidConcurrency,
		);
	});
});
