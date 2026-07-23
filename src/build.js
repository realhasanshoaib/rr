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
const STYLE_RE = /<style>([\s\S]*?)<\/style>/g;
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
  const fileAssets = new Map(); // file -> { style, script }
  const files = readdirSync(componentsDir).filter((f) => f.endsWith(".html")).sort();
  for (const f of files) {
    const text = readFileSync(join(componentsDir, f), "utf8");
    const outsideTemplates = text.replace(TEMPLATE_RE, "");
    fileAssets.set(f, {
      style: [...outsideTemplates.matchAll(STYLE_RE)].map((m) => m[1].trim()).join("\n"),
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

export function build({ srcPath, outPath, fail, log }) {
  const { components, fileAssets } = loadComponents(fail);

  let doc = readFileSync(resolve(srcPath), "utf8");
  if (!/<rr-doc[\s>]/.test(doc)) fail('source must be wrapped in <rr-doc title="…">…</rr-doc>');

  const usedFiles = new Set();
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
  const styles = included.map((f) => fileAssets.get(f).style).filter(Boolean).join("\n\n");
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
}
