#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";
import { getManagedFilePaths } from "../sync/sync";
import { validateGitignore } from "../validate-gitignore/validate-gitignore";

const staticDirectory = path.resolve(import.meta.dir, "../../static");
const rootDirectory = path.resolve(import.meta.dir, "../..");

async function getStaticFiles(directory: string): Promise<string[]> {
	const entries = await fs.readdir(directory, { withFileTypes: true });
	const nestedFiles = await Promise.all(
		entries.map(async (entry) => {
			const filepath = path.join(directory, entry.name);
			if (entry.isFile()) return [filepath];
			if (entry.isDirectory()) return getStaticFiles(filepath);
			return [];
		}),
	);

	return nestedFiles.flat();
}

/** Creates relative root-level links for every file in the static asset directory. */
export async function linkStaticFiles(
	outputDirectory = rootDirectory,
	inputDirectory = staticDirectory,
): Promise<string[]> {
	const inputs = await getStaticFiles(inputDirectory);
	const linkedFiles: string[] = [];

	for (const input of inputs) {
		const relativePath = path.relative(inputDirectory, input);
		const output = path.join(outputDirectory, relativePath);
		const target = path.relative(path.dirname(output), input);

		await fs.mkdir(path.dirname(output), { recursive: true });
		if (path.basename(output) === ".gitignore") {
			try {
				const stats = await fs.lstat(output);
				if (stats.isSymbolicLink()) await fs.unlink(output);
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
			}

			await fs.copyFile(input, output);
			linkedFiles.push(relativePath);
			continue;
		}

		try {
			const stats = await fs.lstat(output);
			if (!stats.isSymbolicLink())
				throw new Error(`Refusing to replace existing file: ${output}`);

			const existingTarget = await fs.readlink(output);
			if (path.resolve(path.dirname(output), existingTarget) !== input)
				throw new Error(`Refusing to replace existing symbolic link: ${output}`);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
			await fs.symlink(target, output);
		}

		linkedFiles.push(relativePath);
	}

	const managedPaths = await getManagedFilePaths(inputDirectory);
	validateGitignore(
		outputDirectory,
		managedPaths.map((filepath) => `/${filepath}`),
		{ obsoleteEntries: managedPaths },
	);
	return linkedFiles;
}

if (import.meta.main) {
	await linkStaticFiles();
}