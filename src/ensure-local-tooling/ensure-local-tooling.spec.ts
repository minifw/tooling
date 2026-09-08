import { describe, expect, it } from "bun:test";
import { MiniToolingErrors } from "../mini-tooling-error/mini-tooling-error";
import { ensureLocalTooling } from "./ensure-local-tooling";

describe("ensureLocalTooling()", () => {
  it("installs the latest tooling package as a development dependency", async () => {
    const commands: { command: string[]; options: { cwd: string } }[] = [];

    await ensureLocalTooling("/example", async (command, options) => {
      commands.push({ command, options });
      return 0;
    });

    expect(commands).toEqual([
      {
        command: [process.execPath, "add", "--dev", "@minifw/tooling@latest"],
        options: { cwd: "/example" },
      },
    ]);
  });

  it("reports failed installation commands", async () => {
    await expect(
      ensureLocalTooling("/example", async () => 1),
    ).rejects.toMatchObject({
      code: MiniToolingErrors.LocalToolingInstallFailed,
    });
  });
});
