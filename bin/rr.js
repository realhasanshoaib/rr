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
  rr build <doc.rr.html> [-o out.html]   expand <rr-*> components into one self-contained .html
  rr init <name>                          scaffold a starter <name>.rr.html
  rr --help | --version

By default, build emits <doc>.html beside the source.`;

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
  const outFlag = rest.indexOf("-o");
  const outArg = outFlag !== -1 ? rest.splice(outFlag, 2)[1] : null;
  const srcPath = rest[0];
  if (!srcPath) fail("usage: rr build <doc.rr.html> [-o out.html]");
  const outPath = outArg ? outArg : resolve(srcPath).replace(/\.rr\.html$/, ".html");
  if (resolve(outPath) === resolve(srcPath)) fail("source must end in .rr.html, or pass -o <out.html>");
  build({ srcPath, outPath, fail, log });
  process.exit(0);
}

fail(`unknown command "${cmd}". Run \`rr --help\`.`);
