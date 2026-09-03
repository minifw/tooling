import { afterEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const temporaryDirectories: string[] = [];
const cliPath = path.resolve(import.meta.dir, "cli.ts");
const staticDirectory = path.resolve(import.meta.dir, "../static");

function getStaticFiles(directory = staticDirectory): string[] {
	return fs.readdirSync(directory, { withFileTypes: true }).flatMap((file) => {
		const filepath = path.join(directory, file.name);
		if (file.isFile()) return [filepath];
		if (file.isDirectory()) return getStaticFiles(filepath);
		return [];
	});
}

function createTemporaryDirectory(): string {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), "minifw-tooling-"));
	temporaryDirectories.push(directory);
	return directory;
}

function stripAnsi(value: string): string {
	return value.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, "");
}

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0))
		fs.rmSync(directory, { force: true, recursive: true });
});

describe("minifw-tooling sync", () => {
	it("synchronizes static files through the CLI", async () => {
		const repository = createTemporaryDirectory();
		fs.writeFileSync(
			path.join(repository, "package.json"),
			JSON.stringify({ name: "@minifw/example" }),
		);

		const child = Bun.spawn(
			[
				process.execPath,
				cliPath,
				"sync",
				"--root-dir",
				repository,
				"--concurrency",
				"1",
			],
			{ stderr: "pipe", stdout: "pipe" },
		);

		expect(await child.exited).toBe(0);
		const output = stripAnsi(await new Response(child.stderr).text());
		expect(output).toContain("Validated repository.");
		expect(output).toContain("Synchronized 3 files.");
		expect(output).toContain("Updated .gitignore with 3 entries.");
		for (const filepath of getStaticFiles()) {
			const relativePath = path.relative(staticDirectory, filepath);
			expect(
				fs.readFileSync(path.join(repository, relativePath), "utf-8"),
			).toBe(fs.readFileSync(filepath, "utf-8"));
		}
	});

	it("reports every file that fails to synchronize", async () => {
		const repository = createTemporaryDirectory();
		fs.writeFileSync(
			path.join(repository, "package.json"),
			JSON.stringify({ name: "@minifw/example" }),
		);
		fs.mkdirSync(path.join(repository, "AGENTS.md"));
		fs.mkdirSync(path.join(repository, "eslint.config.ts"));

		const child = Bun.spawn(
			[process.execPath, cliPath, "sync", "--root-dir", repository],
			{ stderr: "pipe", stdout: "pipe" },
		);

		expect(await child.exited).toBe(1);
		const output = stripAnsi(await new Response(child.stderr).text());
		expect(output).toContain("Validated repository.");
		expect(output).toContain(
			"Failed to copy 2 files:\n- AGENTS.md: File copy failed: could not write",
		);
	});

	it("exits cleanly when repository validation fails before copying", async () => {
		const repository = createTemporaryDirectory();
		fs.writeFileSync(
			path.join(repository, "package.json"),
			JSON.stringify({ name: "example" }),
		);

		const child = Bun.spawn(
			[process.execPath, cliPath, "sync", "--root-dir", repository],
			{ stderr: "pipe", stdout: "pipe" },
		);

		expect(await child.exited).toBe(1);
		const output = stripAnsi(await new Response(child.stderr).text());
		expect(output).toContain("Repository validation failed.");
		expect(output).toContain("PackValidNoPackageOrg");
	});
});
