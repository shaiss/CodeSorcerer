import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    format: ["esm"],
    tsconfig: "./tsconfig.json",
    external: ["dotenv", "fs", "path", "@elizaos/core"],
});
