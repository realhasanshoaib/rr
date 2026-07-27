// Builds the landing page: highlights every <pre data-lang="…"> block with
// shiki at build time, then writes the finished page to public/. Also rebuilds
// the /demo page from demo/demo.rr.html with the bundled theme.
// Run: node site/build-site.mjs   (from repo root)
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { codeToHtml } from "shiki";

const siteDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(siteDir, "..");

const BLOCK_RE = /<pre data-lang="([a-z]+)"><code>([\s\S]*?)<\/code><\/pre>/g;
const unescape = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

let html = readFileSync(join(siteDir, "index.src.html"), "utf8");
const blocks = [...html.matchAll(BLOCK_RE)];
for (const [whole, lang, body] of blocks) {
  const highlighted = await codeToHtml(unescape(body), { lang, theme: "github-dark-default" });
  html = html.replace(whole, highlighted);
}
const out = join(siteDir, "public", "index.html");
writeFileSync(out, html);
console.log(`built ${out} (${blocks.length} code blocks highlighted)`);

execFileSync(
  process.execPath,
  [join(repoRoot, "bin", "rr.js"), "build", join(repoRoot, "demo", "demo.rr.html"), "-o", join(siteDir, "public", "demo.html"), "--theme", "rr"],
  { stdio: "inherit" },
);
