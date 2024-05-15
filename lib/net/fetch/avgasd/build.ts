import { build } from "esbuild";

import info from "./package.json" with { type: "json" };

await build({
	entryPoints: ["mod.tsx"],
	format: "esm",
	bundle: true,
	minify: false,
	sourcemap: false,
	outfile: "index.js",
	external: Object.keys(info.dependencies),
});
