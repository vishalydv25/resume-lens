import { createRequire } from "node:module";
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
const require = createRequire(import.meta.url);
const pkg = require.resolve("pdfjs-dist/package.json");
await mkdir(resolve("public"), { recursive: true });
await copyFile(resolve(dirname(pkg), "build/pdf.worker.min.mjs"), resolve("public/pdf.worker.min.mjs"));
console.log("PDF worker copied to public/.");
