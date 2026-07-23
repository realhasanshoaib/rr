# rr

A zero-dependency Node build system for composable HTML documents. You write a small `.rr.html` file of `<rr-*>` tags; `rr build` expands them into one polished, self-contained HTML file — canonical CSS, a tree-shaken icon sprite, and both light/dark themes — that opens straight from disk with no dependencies, no bundler, and no network.

## Why

Most "quick documents" — specs, briefs, reports, changelogs, debriefs — either look like raw markdown or cost an afternoon of hand-written CSS. `rr` gives you a small library of considered, accessible components (cards, callouts, checklists, scorecards, timelines, interactive mini-worlds) so an agent or a human composes a document out of proven pieces instead of reinventing a design system every time. The build fails loudly on unknown components, missing props, and unknown icons — so a composed document is correct by construction, and the output is a single file you can email, commit, or host anywhere.

## Install

```bash
# npm
npm install -g rr-cli

# Homebrew (macOS)
brew install hhushhas/tap/rr

# Scoop (Windows)
scoop install https://raw.githubusercontent.com/hhushhas/rr/main/scoop/rr.json
```

## Quickstart

```bash
rr init report          # scaffolds report.rr.html
rr build report.rr.html # emits report.html beside it
```

```
created /path/report.rr.html
next: rr build report.rr.html
built /path/report.html
  components from: doc.html, status.html, surfaces.html
  icons inlined: bolt, check, clock, doc, warning
```

Open `report.html` in any browser — everything is inlined.

## Commands

```bash
rr build <doc.rr.html> [-o out.html]   # expand components → one self-contained .html
rr init <name>                          # scaffold a starter <name>.rr.html
rr --help | --version
```

By default `build` writes `<doc>.html` next to the source; pass `-o` to choose the path.

## Authoring

Wrap everything in `<rr-doc title="…">`. Props are attributes; children go between the tags. Plain HTML is welcome anywhere — headings, `<p>`, `<table>`, `<pre>`, lists, `.wide` — all styled by the base sheet. See [`demo/demo.rr.html`](demo/demo.rr.html) for a full worked example and [`demo/demo.html`](demo/demo.html) for what it produces.

```html
<rr-doc title="Weekly report">
  <rr-header kicker="Team update" title="Week 30" icon="doc">
    <p>Shipped the <rr-term def="A time-limited permit.">lease</rr-term> keeper.</p>
  </rr-header>
  <rr-section id="tldr" title="TL;DR" icon="bolt">
    <rr-tiles>
      <rr-tile icon="check" label="Shipped" value="3" caption="features"/>
      <rr-tile icon="warning" label="Open" value="1" caption="decision" tone="amber"/>
    </rr-tiles>
    <rr-callout tone="amber"><b>Open decision.</b> Pick the TTL.</rr-callout>
  </rr-section>
</rr-doc>
```

### Components

| Component | Props (`=` marks a default) | Purpose |
|---|---|---|
| `rr-doc` | `title`, `lang=en` | Document shell (required, once) |
| `rr-toc` / `rr-toc-link` | — / `href`, `label` | Sticky section nav |
| `rr-header` | `kicker`, `title`, `icon=doc` | Title block; children = lede |
| `rr-section` | `id`, `title`, `icon` | H2 section with anchor |
| `rr-icon` | `name` | Inline SVG icon (see `icons.svg` for names) |
| `rr-term` | `def` | Hover/focus definition for jargon |
| `rr-details` | `summary` | Collapsible depth |
| `rr-card` / `rr-cols2` | — | Surface / two columns |
| `rr-tiles` / `rr-tile` | — / `icon`, `label`, `value`, `caption`, `tone=` | TL;DR stat row |
| `rr-badge` | `tone=` | Inline status (`accent green amber red`) |
| `rr-callout` | `tone=` | Info / open decision (`amber`) / failure (`red`) |
| `rr-progress` | `label`, `pct`, `n`, `tone=` | Bar with n/m label |
| `rr-checklist` / `rr-done` / `rr-todo` | `label` / — / — | Launch checklist card |
| `rr-glossary` / `rr-def` | — / `term` | Definition grid |
| `rr-journey` / `rr-stop` / `rr-sep` | — / `tone=` / — | Flow strip; changed stop gets `tone="new"` |
| `rr-panes` / `rr-before` / `rr-after` | — / `label=Before` / `label=After` | Before/after panels |
| `rr-phases` / `rr-phase` | — / `label`, `caption`, `state=` | Timeline (`done`, `now`, or empty) |
| `rr-scorecard` / `rr-score-row` | — / `promised`, `delivered`, `verdict`, `tone` | Promised vs delivered |
| `rr-stage` | `id`, `crumb` | Fullbleed mini-world stage; children = head extras |
| `rr-stage-body` / `rr-band` / `rr-block` | — / `label` / `icon`, `title`, `caption`, `tone=` | Stage content (`tone="is-new"` glows) |
| `rr-readout` / `rr-stat` | — / `label`, `value`, `tone=` | Stage stat strip (`tone="hot"` = red) |
| `rr-legend` / `rr-key` | — / `kind` | State legend (`new lit dim green amber`) |
| `rr-slider` | `id`, `label`, `min`, `max`, `value`, `step=1`, `unit=` | Range input with live readout |
| `rr-code` | `file`, `lang`, `start=1`, `collapsed` (flag), `id=` | Annotatable code exhibit — see below |
| `rr-quiz` / `rr-question` / `rr-choice` / `rr-why` | `id`, `title=Self-check` / `q` / `correct=` / — | Self-check quiz — see below |

### Code exhibits (`rr-code`)

Content is raw text — paste code as-is, no HTML escaping (only a literal `</rr-code>` inside the code would break it). If [shiki](https://shiki.style) is installed (in your project or globally — `npm i shiki`; rr resolves it from either), exhibits are syntax-highlighted **at build time** with dual light/dark themes; without it they render plain, and everything else still works. The output is always static — no highlighter ships to the browser.

Readers click a line (shift-click for a range) to attach a note. A floating **Copy annotations** button exports every note as plain text — `file L42-44:`, the quoted code lines, and the note — ready to paste into a coding agent or a review thread. Annotations persist per document in `localStorage`.

```html
<rr-code file="keeper/lease.ts" lang="ts" start="42">
async function renewLease(lease: Lease) {
  ...
}
</rr-code>
```

### Quizzes (`rr-quiz`)

Mark the correct `rr-choice` with `correct="1"` and always include an `rr-why` explaining the answer in plain words. Answers reveal instantly, persist per document, and **Copy results** exports the score plus every missed question with its correct answer — so a follow-up conversation (with a person or an agent) starts from the reader's actual gaps.

```html
<rr-quiz id="basics" title="Lease basics">
  <rr-question q="What forces a zombie machine off?">
    <rr-choice>Billing reconciliation</rr-choice>
    <rr-choice correct="1">Lease expiry after a missed TTL</rr-choice>
    <rr-why>Reclaim is tied to the lease itself — nothing else needs to notice.</rr-why>
  </rr-question>
</rr-quiz>
```

### Conventions

- One accent color; amber = open decision/risk, green = done, red = hard failure only. No gradients, no display fonts.
- Give every jargon term an `rr-term`. Code appears as deliberate `rr-code` exhibits (collapsed by default), never as walls of snippets in prose.
- Calm motion: nothing autoplays; movement is feedback to the reader's interaction only.
- Interactive mini-worlds live in `rr-stage`, never the prose column — that is the one place to write custom inline JS/SVG.

## How it works

Each file in `components/` declares one or more `<template name="…" props="…">` blocks plus optional file-level `<style>`/`<script>`. `rr build` resolves `<rr-*>` tags inside-out (so components nest), substitutes props and `<slot/>`, and then inlines **only** the CSS, JS, and icon symbols the document actually references. The result is a single HTML file with zero external requests.

## License

MIT © Hasan Shoaib
