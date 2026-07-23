// rr init — scaffolds a starter <name>.rr.html document.
import { writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const starter = (title) => `<rr-doc title="${title}">

<rr-toc>
  <rr-toc-link href="#tldr" label="TL;DR"/>
  <rr-toc-link href="#detail" label="Detail"/>
</rr-toc>

<rr-header kicker="Draft" title="${title}" icon="doc">
  <p>One-line lede. Define any <rr-term def="A word the reader may not know.">jargon</rr-term> inline.</p>
</rr-header>

<rr-section id="tldr" title="TL;DR" icon="bolt">
  <rr-tiles>
    <rr-tile icon="check" label="Status" value="Draft" caption="not final"/>
    <rr-tile icon="clock" label="Updated" value="today" caption=""/>
    <rr-tile icon="warning" label="Open" value="1" caption="decision" tone="amber"/>
  </rr-tiles>
  <rr-callout tone="amber"><b>Open decision.</b> Replace this with the real question.</rr-callout>
</rr-section>

<rr-section id="detail" title="Detail" icon="doc">
  <p>Write prose here. Plain HTML — headings, <code>&lt;p&gt;</code>, <code>&lt;table&gt;</code>, lists — is welcome and gets styled by the base sheet.</p>
  <rr-details summary="Extra depth (optional)">
    <p>Collapsed content the reader can skip.</p>
  </rr-details>
</rr-section>

</rr-doc>
`;

export function init({ name, fail, log }) {
  if (!name) fail("usage: rr init <name>");
  const base = name.replace(/\.rr\.html$/, "").replace(/\.html$/, "");
  const outPath = resolve(`${base}.rr.html`);
  if (existsSync(outPath)) fail(`${outPath} already exists`);
  const title = base.replace(/[-_]/g, " ").replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  writeFileSync(outPath, starter(title));
  log(`created ${outPath}`);
  log(`next: rr build ${base}.rr.html`);
}
