#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { build } from "../src/build.js";
import { init } from "../src/init.js";

const fail = (msg) => { console.error(`rr: ${msg}`); process.exit(1); };
const log = (msg) => console.log(msg);

const usage = `rr — a build system for composable HTML documents

Usage:
  rr build <doc.rr.html> [-o out.html] [--theme rr] [--css file.css]
                                          expand <rr-*> components into one self-contained .html
  rr init <name>                          scaffold a starter <name>.rr.html
  rr --help | --version

By default, build emits <doc>.html beside the source with structural CSS and
neutral design tokens only — style it by redefining the tokens (--css inlines
your stylesheet), or opt into the bundled look with --theme rr.`;

const args = process.argv.slice(2);
const cmd = args[0];

if (!cmd || cmd === "--help" || cmd === "-h") {
  console.log(usage);
  process.exit(cmd ? 0 : 1);
}

if (cmd === "--version" || cmd === "-v") {
  const pkg = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8"));
  console.log(pkg.version);
  process.exit(0);
}

if (cmd === "init") {
  init({ name: args[1], fail, log });
  process.exit(0);
}

if (cmd === "build") {
  const rest = args.slice(1);
  const flagValue = (name) => {
    const at = rest.indexOf(name);
    return at !== -1 ? rest.splice(at, 2)[1] : null;
  };
  const outArg = flagValue("-o");
  const theme = flagValue("--theme");
  const cssPath = flagValue("--css");
  if (theme && theme !== "rr") fail(`unknown theme "${theme}" — the bundled theme is "rr"`);
  const srcPath = rest[0];
  if (!srcPath) fail("usage: rr build <doc.rr.html> [-o out.html] [--theme rr] [--css file.css]");
  const outPath = outArg ? outArg : resolve(srcPath).replace(/\.rr\.html$/, ".html");
  if (resolve(outPath) === resolve(srcPath)) fail("source must end in .rr.html, or pass -o <out.html>");
  await build({ srcPath, outPath, theme, cssPath, fail, log });
  process.exit(0);
}

fail(`unknown command "${cmd}". Run \`rr --help\`.`);
