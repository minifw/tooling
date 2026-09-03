import fs from "node:fs/promises";
import path from "node:path";
import { MiniToolingError } from "../mini-tooling-error/mini-tooling-error";

export type CopyFileEvent =
	| { type: "started"; input: string; output: string }
	| { type: "succeeded"; input: string; output: string }
	| { type: "failed"; input: string; output: string; error: unknown };

export type CopyFileResult =
	| { input: string; output: string; success: true }
	| { input: string; output: string; success: false; error: unknown };

export interface CopyFilesOptions {
	concurrency?: number;
	getOutputRelativePath?: (input: string) => string;
	onEvent?: (event: CopyFileEvent) => void;
}

export async function readFile(filepath: string): Promise<Buffer> {
	const resolved = path.resolve(process.cwd(), filepath);

	try {
		return await fs.readFile(resolved);
	} catch {
		throw new MiniToolingError("CopyFilesCannotReadFile", resolved);
	}
}

export async function writeFile(data: Buffer, filepath: string): Promise<void> {
	const resolved = path.resolve(process.cwd(), filepath);

	try {
		await fs.writeFile(resolved, data);
	} catch {
		throw new MiniToolingError("CopyFilesCannotWriteFile", resolved);
	}
}

async function validateOutputDirectory(directory: string): Promise<string> {
	const resolved = path.resolve(process.cwd(), directory);

	try {
		const stats = await fs.stat(resolved);
		if (!stats.isDirectory())
			throw new MiniToolingError("CopyFilesInvalidOutputDirectory", resolved);
	} catch (error) {
		if (error instanceof MiniToolingError) throw error;
		throw new MiniToolingError("CopyFilesNoOutputDirectory", resolved);
	}

	return resolved;
}

function getOutputPath(
	input: string,
	outputDirectory: string,
	outputRelativePath = path.basename(input),
): string {
	return path.resolve(outputDirectory, outputRelativePath);
}

export async function copyFile(
	input: string,
	outputDirectory: string,
	outputRelativePath?: string,
): Promise<{ input: string; output: string }> {
	const resolvedInput = path.resolve(process.cwd(), input);
	const data = await readFile(resolvedInput);
	const resolvedOutputDirectory =
		await validateOutputDirectory(outputDirectory);
	const output = getOutputPath(
		resolvedInput,
		resolvedOutputDirectory,
		outputRelativePath,
	);

	await fs.mkdir(path.dirname(output), { recursive: true });
	await writeFile(data, output);
	return { input: resolvedInput, output };
}

export async function copyFiles(
	input: string[],
	outputDirectory: string,
	{ concurrency = 5, getOutputRelativePath, onEvent }: CopyFilesOptions = {},
): Promise<CopyFileResult[]> {
	if (!Number.isInteger(concurrency) || concurrency < 1)
		throw new MiniToolingError("CopyFilesInvalidConcurrency", concurrency);

	const results: CopyFileResult[] = [];
	let nextIndex = 0;

	async function copyNextFile(): Promise<void> {
		while (nextIndex < input.length) {
			const index = nextIndex++;
			const source = path.resolve(process.cwd(), input[index]!);
			const outputRelativePath = getOutputRelativePath?.(source);
			const output = getOutputPath(
				source,
				path.resolve(process.cwd(), outputDirectory),
				outputRelativePath,
			);

			onEvent?.({ type: "started", input: source, output });

			try {
				const copied = await copyFile(
					source,
					outputDirectory,
					outputRelativePath,
				);
				const result: CopyFileResult = { ...copied, success: true };
				results[index] = result;
				onEvent?.({ type: "succeeded", ...copied });
			} catch (error) {
				const result: CopyFileResult = {
					input: source,
					output,
					success: false,
					error,
				};
				results[index] = result;
				onEvent?.({ type: "failed", input: source, output, error });
			}
		}
	}

	await Promise.all(
		Array.from({ length: Math.min(concurrency, input.length) }, copyNextFile),
	);

	return results;
}
