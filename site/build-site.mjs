// Builds the landing page with rr itself, then injects SEO meta into the head.
// Run: node site/build-site.mjs   (from repo root)
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const siteDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(siteDir, "..");
const src = join(siteDir, "index.rr.html");
const out = join(siteDir, "public", "index.html");

execFileSync(process.execPath, [join(repoRoot, "bin", "rr.js"), "build", src, "-o", out], { stdio: "inherit" });

const url = "https://rr.hasanshoaib.com/";
const title = "rr — compose HTML documents from components";
const desc = "Compose <rr-*> components into one self-contained, themed HTML file. Zero-dependency Node CLI. Annotate code, quiz readers, ship one file.";
const meta = `<meta name="description" content="${desc}">
<link rel="canonical" href="${url}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.png" sizes="512x512" type="image/png">
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${url}og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${url}og.png">`;

let html = readFileSync(out, "utf8");
const anchor = `<title>${title}</title>`;
if (!html.includes(anchor)) throw new Error("could not find <title> anchor to inject meta");
html = html.replace(anchor, `${anchor}\n${meta}`);
writeFileSync(out, html);
console.log(`injected SEO meta into ${out}`);
