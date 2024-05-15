import { build } from "esbuild";

await build({
	entryPoints: ["mod.tsx"],
	bundle: true,
	minify: true,
	format: "esm",
	sourcemap: true,
	outfile: "mod.js",
	external: ["@preact/signals", "jszip", "preact"],
});
