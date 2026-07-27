// rr build — expands <rr-*> component tags into a self-contained HTML file.
// Tree-shakes per-component CSS/JS and icons so the output ships only what it uses.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const componentsDir = join(packageRoot, "components");
const iconsPath = join(packageRoot, "icons.svg");

// Each components/*.html file holds one or more <template name="x" props="a b=default">
// blocks plus optional file-level <style> / <script> assets, included once if any
// of the file's templates is used.
const TEMPLATE_RE = /<template\s+name="([a-z][a-z0-9-]*)"(?:\s+props="([^"]*)")?\s*>([\s\S]*?)<\/template>/g;
const STYLE_RE = /<style(\s+theme)?>([\s\S]*?)<\/style>/g;
const SCRIPT_RE = /<script>([\s\S]*?)<\/script>/g;
// Matches an innermost <rr-*> element (its body contains no other <rr-),
// so nested components resolve inside-out; templates that themselves use
// <rr-*> tags are resolved on later iterations.
const INNERMOST_RE = /<rr-([a-z][a-z0-9-]*)((?:\s+[a-z][a-z0-9-]*="[^"]*")*)\s*(?:\/>|>((?:(?!<rr-)[\s\S])*?)<\/rr-\1>)/;
const ATTR_RE = /([a-z][a-z0-9-]*)="([^"]*)"/g;
const ICON_USE_RE = /#i-([a-z0-9-]+)/g;
const SYMBOL_RE = /<symbol id="i-([a-z0-9-]+)"[\s\S]*?<\/symbol>/g;

function loadComponents(fail) {
  const components = new Map(); // name -> { html, props: Map(name -> default|null), file }
  const fileAssets = new Map(); // file -> { style, theme, script }
  const files = readdirSync(componentsDir).filter((f) => f.endsWith(".html")).sort();
  for (const f of files) {
    const text = readFileSync(join(componentsDir, f), "utf8");
    // strip HTML comments before extracting assets so prose mentioning
    // <style>/<script> tags can't be mistaken for the tags themselves
    const outsideTemplates = text.replace(TEMPLATE_RE, "").replace(/<!--[\s\S]*?-->/g, "");
    const styleBlocks = [...outsideTemplates.matchAll(STYLE_RE)];
    fileAssets.set(f, {
      style: styleBlocks.filter((m) => !m[1]).map((m) => m[2].trim()).join("\n"),
      theme: styleBlocks.filter((m) => m[1]).map((m) => m[2].trim()).join("\n"),
      script: [...outsideTemplates.matchAll(SCRIPT_RE)].map((m) => m[1].trim()).join("\n"),
    });
    for (const [, name, propDecl = "", html] of text.matchAll(TEMPLATE_RE)) {
      if (components.has(name)) fail(`component "${name}" defined twice (${components.get(name).file} and ${f})`);
      const props = new Map();
      for (const decl of propDecl.split(/\s+/).filter(Boolean)) {
        const eq = decl.indexOf("=");
        eq === -1 ? props.set(decl, null) : props.set(decl.slice(0, eq), decl.slice(eq + 1));
      }
      components.set(name, { html: html.trim(), props, file: f });
    }
  }
  return { components, fileAssets };
}

// Optional highlighter for <rr-code>: resolved from the document's project first,
// then from rr's own dependencies. rr stays zero-dependency — without shiki,
// exhibits render plain (annotation still works) with a hint logged once.
async function loadShiki() {
  const { createRequire } = await import("node:module");
  const { pathToFileURL } = await import("node:url");
  for (const base of [join(process.cwd(), "noop.js"), join(packageRoot, "noop.js")]) {
    try {
      return await import(pathToFileURL(createRequire(base).resolve("shiki")).href);
    } catch {}
  }
  return null;
}

const CODE_RE = /<rr-code\b((?:\s+[a-z][a-z0-9-]*="[^"]*")*)\s*>([\s\S]*?)<\/rr-code>/;
const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Runs before generic expansion so braces, @@, or <rr- sequences inside code are inert.
async function expandCodeExhibits(doc, usedFiles, { fail, log }) {
  if (!CODE_RE.test(doc)) return doc;
  const shiki = await loadShiki();
  if (!shiki) log("note: shiki not found — <rr-code> renders unhighlighted (install with: npm i shiki)");
  usedFiles.add("code.html");
  for (let n = 1; ; n++) {
    const m = doc.match(CODE_RE);
    if (!m) break;
    const attrs = Object.fromEntries([...m[1].matchAll(ATTR_RE)].map((a) => [a[1], a[2]]));
    const { file, lang = "text", start = "1", id = `code-${n}` } = attrs;
    if (!file) fail('<rr-code> requires file="…" (the exhibit label, e.g. a path)');
    let code = m[2].replace(/^\n+|\s+$/g, "");
    const indents = code.split("\n").filter((l) => l.trim()).map((l) => l.match(/^[ \t]*/)[0].length);
    const indent = indents.length ? Math.min(...indents) : 0;
    code = code.split("\n").map((l) => l.slice(indent)).join("\n");
    let html;
    if (shiki) {
      try {
        html = await shiki.codeToHtml(code, { lang, themes: { light: "github-light", dark: "github-dark" }, defaultColor: "light" });
      } catch (e) { fail(`<rr-code file="${file}">: ${e.message}`); }
    } else {
      html = `<pre class="shiki"><code>${code.split("\n").map((l) => `<span class="line">${escapeHtml(l)}</span>`).join("\n")}</code></pre>`;
    }
    html = html.replace("<code", `<code style="--ln-start:${Number(start) - 1}"`);
    const figure = `<figure class="rr-code" data-code-id="${id}" data-file="${file}" data-start="${start}">
<figcaption><rr-icon name="doc"/> <code>${file}</code><span class="grow"></span><span class="hint">click a line to annotate · shift-click extends</span></figcaption>
${html}
</figure>`;
    const out = "collapsed" in attrs
      ? `<details class="src"><summary>${file} — code exhibit</summary>${figure}</details>`
      : figure;
    doc = doc.slice(0, m.index) + out + doc.slice(m.index + m[0].length);
  }
  return doc;
}

export async function build({ srcPath, outPath, theme = null, cssPath = null, fail, log }) {
  const { components, fileAssets } = loadComponents(fail);

  let doc = readFileSync(resolve(srcPath), "utf8");
  if (!/<rr-doc[\s>]/.test(doc)) fail('source must be wrapped in <rr-doc title="…">…</rr-doc>');

  const usedFiles = new Set();
  doc = await expandCodeExhibits(doc, usedFiles, { fail, log });
  for (let guard = 0; ; guard++) {
    const m = doc.match(INNERMOST_RE);
    if (!m) break;
    if (guard > 10000) fail("component expansion did not converge");
    const [whole, name, attrText, children = ""] = m;
    const comp = components.get(name);
    if (!comp) fail(`unknown component <rr-${name}>. Known: ${[...components.keys()].sort().join(", ")}`);
    usedFiles.add(comp.file);
    const attrs = Object.fromEntries([...attrText.matchAll(ATTR_RE)].map((a) => [a[1], a[2]]));
    for (const key of Object.keys(attrs))
      if (!comp.props.has(key)) fail(`<rr-${name}> has no prop "${key}". Props: ${[...comp.props.keys()].join(", ") || "none"}`);
    let html = comp.html;
    for (const [key, dflt] of comp.props) {
      const val = attrs[key] ?? dflt;
      if (val == null) fail(`<rr-${name}> is missing required prop "${key}"`);
      html = html.replaceAll(`{${key}}`, val);
    }
    html = html.replace("<slot/>", children.trim());
    doc = doc.slice(0, m.index) + html + doc.slice(m.index + whole.length);
  }

  // Inline only the icons and component assets the document actually uses.
  const iconsSvg = readFileSync(iconsPath, "utf8");
  const usedIcons = new Set([...doc.matchAll(ICON_USE_RE)].map((m) => m[1]));
  const symbols = [...iconsSvg.matchAll(SYMBOL_RE)].filter((m) => usedIcons.has(m[1]));
  for (const id of usedIcons)
    if (!symbols.some((s) => s[1] === id)) fail(`unknown icon "i-${id}" — see icons.svg for the library`);
  const sprite = symbols.length
    ? `<svg style="display:none" aria-hidden="true">\n  ${symbols.map((s) => s[0]).join("\n  ")}\n</svg>`
    : "";

  const included = [...usedFiles].sort();
  const layers = [
    ...included.map((f) => fileAssets.get(f).style),
    ...(theme ? included.map((f) => fileAssets.get(f).theme) : []),
    ...(cssPath ? [readFileSync(resolve(cssPath), "utf8").trim()] : []),
  ];
  const styles = layers.filter(Boolean).join("\n\n");
  const scripts = included.map((f) => fileAssets.get(f).script).filter(Boolean).join("\n\n");

  doc = doc
    .replace("@@STYLES@@", `<style>\n${styles}\n</style>`)
    .replace("@@SPRITE@@", sprite)
    .replace("@@SCRIPTS@@", scripts ? `<script>\n${scripts}\n</script>` : "");
  if (doc.includes("@@")) fail("unresolved @@ placeholder — is <rr-doc> present exactly once?");

  writeFileSync(resolve(outPath), doc);
  log(`built ${resolve(outPath)}`);
  log(`  components from: ${included.join(", ")}`);
  log(`  icons inlined: ${usedIcons.size ? [...usedIcons].sort().join(", ") : "none"}`);
  log(`  theme: ${theme ?? "none (structural CSS + neutral tokens — bring your own, or pass --theme rr)"}`);
}
