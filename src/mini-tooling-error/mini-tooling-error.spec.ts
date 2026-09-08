import { describe, expect, it } from "bun:test";
import { MiniToolingError, MiniToolingErrors } from "./mini-tooling-error";

describe("MiniToolingError", () => {
  it("exports error-code constants", () => {
    expect(MiniToolingErrors.PackValidNoDir).toBe("PackValidNoDir");
  });

  it("creates errors with standard Error behavior and metadata", () => {
    const error = new MiniToolingError("PackValidNoDir", "/test/directory");

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      name: "MiniToolingError",
      code: MiniToolingErrors.PackValidNoDir,
      message:
        'Package validation failed: directory "/test/directory" could not be found.',
    });
    expect(error.toString()).toBe(
      'MiniToolingError: Package validation failed: directory "/test/directory" could not be found.',
    );
    expect(error.stack).toContain(error.message);
  });
});
