import { expect } from "bun:test";
import { MiniToolingError, type MiniToolingErrors } from "./mini-tooling-error";

export function expectError(
  action: () => unknown,
  code: keyof typeof MiniToolingErrors,
) {
  let error: unknown;

  try {
    action();
  } catch (caughtError) {
    error = caughtError;
  }

  expect(error).toBeInstanceOf(MiniToolingError);
  expect(error).toMatchObject({ code });
}
