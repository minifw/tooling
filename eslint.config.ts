import { defineConfig } from "eslint/config";
import baseConfig from "@minifw/tooling/eslint";

export default defineConfig(baseConfig, {
  files: ["**/*.e2e.spec.ts"],
  rules: { "unicorn/prevent-abbreviations": "off" },
});
