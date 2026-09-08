import { MiniToolingError } from "../mini-tooling-error/mini-tooling-error";

const packageName = "@minifw/tooling";

export type RunBunCommand = (
	command: string[],
	options: { cwd: string },
) => Promise<number>;

async function runBunCommand(
	command: string[],
	options: { cwd: string },
): Promise<number> {
	const child = Bun.spawn(command, {
		cwd: options.cwd,
		stderr: "inherit",
		stdout: "inherit",
	});
	return child.exited;
}

/** Installs the latest shared tooling package as a development dependency. */
export async function ensureLocalTooling(
	directory: string,
	runCommand: RunBunCommand = runBunCommand,
): Promise<void> {
	const exitCode = await runCommand(
		[process.execPath, "add", "--dev", `${packageName}@latest`],
		{ cwd: directory },
	);

	if (exitCode !== 0)
		throw new MiniToolingError("LocalToolingInstallFailed", directory);
}