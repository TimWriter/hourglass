// Packs the static `nuxt generate` output (.output/public) into a single,
// fully self-contained HTML file that can be opened directly from disk
// (file://) with no server: Chrome refuses to fetch ES module scripts and
// any local file via fetch() from a file:// page, so the JS/CSS/fonts/logo
// all have to be inlined directly into the HTML rather than linked.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const publicDir = join(root, ".output/public");
const outDir = join(root, ".output/offline");
const outFile = join(outDir, "hourglass.html");

const FONT_MIME = { woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf" };

function readAsset(relUrl) {
  return readFileSync(join(publicDir, relUrl.replace(/^\//, "")));
}

let html = readFileSync(join(publicDir, "index.html"), "utf8");

const scriptMatch = html.match(/<script type="module" src="([^"]+)"[^>]*><\/script>/);
const styleMatch = html.match(/<link rel="stylesheet" href="([^"]+)"[^>]*>/);
if (!scriptMatch || !styleMatch) {
  throw new Error("Expected a single module <script src> and stylesheet <link> in .output/public/index.html — did the build output change shape?");
}

let js = readAsset(scriptMatch[1]).toString("utf8");
let css = readAsset(styleMatch[1]).toString("utf8");

// Inline fonts referenced from the CSS as data: URIs.
css = css.replace(/url\((\/[^)]+?\.(woff2?|ttf|otf))\)/g, (_match, url, ext) => {
  const mime = FONT_MIME[ext];
  return `url(data:${mime};base64,${readAsset(url).toString("base64")})`;
});

// Inline the logo (favicon + sidebar <img>) as a data: URI so nothing
// references an absolute "/logo.png" path at runtime.
const logoDataUri = `data:image/png;base64,${readAsset("/logo.png").toString("base64")}`;
js = js.replaceAll("`/logo.png`", () => `\`${logoDataUri}\``).replaceAll("\"/logo.png\"", () => `"${logoDataUri}"`);
html = html.replace("href=\"/logo.png\"", () => `href="${logoDataUri}"`);

if (!js.includes("data:application/wasm")) {
  throw new Error("Expected the sql.js wasm binary to already be inlined as a data: URI in the JS bundle — check useDatabase.ts's wasmBinary import.");
}
if (js.includes("/_ipx") || js.includes("logo.png")) {
  throw new Error("Found a lingering \"/_ipx\" or \"logo.png\" reference in the JS bundle — the logo/image inlining above did not catch every occurrence.");
}

// Replacement values are passed as functions throughout: String.replace
// treats "$&", "$$", etc. in a *string* replacement specially, and the
// minified js/css blobs being spliced in are large enough to contain
// those sequences incidentally (e.g. regex-escaping helpers use "\\$&").
html = html
  .replace(/<script type="importmap">[\s\S]*?<\/script>/, () => "")
  .replace(/<link rel="modulepreload"[^>]*>/, () => "")
  .replace(styleMatch[0], () => `<style>${css}</style>`)
  .replace(scriptMatch[0], () => `<script type="module">${js}</script>`);

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, html);
console.log(`Wrote ${outFile} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB)`);
