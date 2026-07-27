# rr

A zero-dependency Node build system for composable HTML documents. You write a small `.rr.html` file of `<rr-*>` tags; `rr build` expands them into one self-contained HTML file — structural CSS, a tree-shaken icon sprite, light/dark aware — that opens straight from disk with no dependencies, no bundler, and no network.

rr does not impose a design system. Components ship their structure and behavior plus a small neutral token contract; you restyle everything by redefining the tokens (`--css your.css`), or opt into the bundled look with `--theme rr`.

## Why

Most "quick documents" — specs, briefs, reports, changelogs, debriefs — either look like raw markdown or cost an afternoon of hand-written CSS. `rr` gives you a small library of considered, accessible components (cards, callouts, checklists, scorecards, timelines, interactive mini-worlds) so an agent or a human composes a document out of proven pieces. The build fails loudly on unknown components, missing props, and unknown icons — so a composed document is correct by construction, and the output is a single file you can email, commit, or host anywhere.

## Install

```bash
# npm
npm install -g rr-html

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
next: rr build report.rr.html            # your CSS via tokens or --css
      rr build report.rr.html --theme rr # the bundled look
built /path/report.html
  components from: doc.html, status.html, surfaces.html
  icons inlined: bolt, check, clock, doc, warning
  theme: none (structural CSS + neutral tokens — bring your own, or pass --theme rr)
```

Open `report.html` in any browser — everything is inlined.

## Commands

```bash
rr build <doc.rr.html> [-o out.html] [--theme rr] [--css file.css]
                                        # expand components → one self-contained .html
rr init <name>                          # scaffold a starter <name>.rr.html
rr --help | --version
```

By default `build` writes `<doc>.html` next to the source; pass `-o` to choose the path.

## Styling — bring your own design system

The default output carries only structural CSS (layout, interaction states, mechanics) written against a small set of CSS custom properties, with neutral system-font light/dark defaults. To make documents look like *your* product, redefine the tokens — no component CSS to fight:

```css
/* brand.css — inlined into the output with: rr build report.rr.html --css brand.css */
:root {
  --bg: #0a0a0a; --surface: #141414; --line: #262626;
  --fg: #ededed; --muted: #a1a1a1; --accent: #ff5d1f;
  --text: "Inter", system-ui, sans-serif;
  --label: var(--mono); --label-case: uppercase; --label-track: .05em;
}
```

The contract: surfaces (`--bg --surface --line`), ink (`--fg --muted`), semantics (`--accent --amber --green --red`), rhythm (`--s1`…`--s8`), type scale (`--t-display --t-section --t-sub --t-body --t-support --t-chrome`), voices (`--text --mono`), chrome labels (`--label --label-case --label-track`), and `--radius`. Anything deeper is plain CSS on stable class names — read the output, it's yours.

`--theme rr` inlines the bundled theme (see [Conventions](#the-bundled-theme---theme-rr)) after the structural layer instead.

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
| `rr-recall` / `rr-flashcard` | `id`, `title=Recall` / `q`, `a` | Flip-card retrieval check — see below |
| `rr-quiz` / `rr-question` / `rr-choice` / `rr-why` | `id`, `title=Self-check` / `q` / `correct=` / — | Self-check quiz — see below |
| `rr-stack` / `rr-frame` | `label=Calls` / `fn`, `file=`, `note=`, `tone=` | Call-stack tree — see below |
| `rr-types` / `rr-sig` | `label=Shapes` / `name`, `note=`, `tone=` | Function shapes (inputs → outputs) — see below |
| `rr-deck` / `rr-slide` / `rr-beat` / `rr-step` | `id=deck` / `kicker=`, `title=`, `spine=` / `mark=` / `wp=` | Stepped reader-paced deck — see below |

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

### Recall (`rr-recall`) — prefer this over a quiz

The retrieval-first check: a flip card asks (`q`) before it tells (`a`), and the child is an optional deeper note shown with the answer. The reader answers in their head, flips, then self-marks **Got it / Missed it**; **Copy missed** exports the cards they missed as agent-ready text. Because the reader commits before seeing the answer, recall beats multiple choice for making things stick — reach for `rr-recall` first, and keep `rr-quiz` for decisions that carry genuinely plausible wrong turns. Best as 2–4 cards at the close of a section.

```html
<rr-recall id="lease-recall" title="Lease keeper recall">
  <rr-flashcard q="What forces a zombie machine off?" a="Lease expiry after a missed TTL.">
    The reclaim is tied to the lease itself — nothing else needs to notice a crashed run.
  </rr-flashcard>
</rr-recall>
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

### Structure exhibits (`rr-stack`, `rr-types`)

The two views that let a reader judge the abstractions without reading body code: **who calls whom** and **what flows in and out**. `rr-stack` renders a call tree — nest `rr-frame` inside `rr-frame`; `fn` is the function, `file` its home, `note` a plain-words aside. `rr-types` lists function shapes — `rr-sig name="renewLease"` with the signature as the child, written as `(input: Shape) → Outcome` (escape `<` as `&lt;` in generics). Pair a before and after in `rr-panes` and tone the changes — `new` (accent) on added, `gone` (struck) on removed, `amber` on changed — so a deepening stack or a widening signature is visible at a glance.

```html
<rr-stack label="Calls">
  <rr-frame fn="handleRequest" file="server.ts">
    <rr-frame fn="renewLease" file="keeper.ts" tone="new" note="validation extracted"/>
  </rr-frame>
</rr-stack>
```

### Decks (`rr-deck`)

A reader-paced slide format. Put one `rr-deck` directly inside `rr-doc` (no `rr-toc`, no `rr-section`); `rr-slide`s hold the content. The left **spine** is the map — one tick per slide (labelled by `spine=`), subdividing into one dash per step on the current slide — and the HUD gives ←/→, a per-slide progress bar, and a **read as document** toggle that flattens the same source into a scrollable page.

Chunk *inside* a slide and reveal one unit per forward keypress. Two flavors: `rr-step` is a ghost waypoint whose coordinate (`wp="WP 1 · Parse"`) shows from the start while its body stays hidden with space reserved, so revealing it never reflows the slide — use it when the order of arrival is the lesson. `rr-beat` is a teaching chunk that is fully hidden until revealed, then recedes to context once a later beat lands; `mark="<element-id>"` lights something already on the board. Every state is a deep link, so a reader who walked in late can rewind. See [`demo/demo-deck.rr.html`](demo/demo-deck.rr.html).

### The bundled theme (`--theme rr`)

Opt-in with `rr build … --theme rr`. This is **Traverse**, a cartographic design system: a chart-paper light theme (`#f4f5f3`) and a night-navigation dark theme (`#1b2023`), one survey-blue accent (`--accent #2456d6`), Avenir Next for the reading voice and SF Mono for the instrument voice (numbers, labels, coordinates). Two type laws hold every block together:

- **Law 01 — the descending column.** The first line of any column or card is the largest; sizes only decrease downward. A kind-label rides the title line (right-aligned mono) or sits in the footer — never a small kicker stacked *above* a bigger line.
- **Law 02 — the floor.** No content text below 16px and no chrome below 13px. The scale is display 34 / section 26 / sub 19 / body 18 / support 16 / chrome 13.

- 4px radius, 1px hairlines, and **zero box-shadows** — separation is line and contrast, never a drop shadow. One accent; amber = open decision/risk, green = done, red = hard failure only. No gradients, no display fonts.
- Give every jargon term an `rr-term`; it lights the **legend panel** (a fixed card on wide screens, an inline expansion on narrow ones), not a tooltip. Code appears as deliberate `rr-code` exhibits (collapsed by default), never as walls of snippets in prose.
- **Retrieval over recognition:** close a section with `rr-recall` flip cards by default, and keep `rr-quiz` for real decision forks.
- Calm motion: nothing autoplays; movement is feedback to the reader's interaction only, and a survey-blue outline marks `:focus-visible`.
- Interactive mini-worlds live in `rr-stage`, never the prose column — that is the one place to write custom inline JS/SVG.

## How it works

Each file in `components/` declares one or more `<template name="…" props="…">` blocks plus optional file-level `<style>` (structural), `<style theme>` (the bundled look, included only with `--theme rr`), and `<script>`. `rr build` resolves `<rr-*>` tags inside-out (so components nest), substitutes props and `<slot/>`, and then inlines **only** the CSS, JS, and icon symbols the document actually references — structure first, then the theme (if requested), then your `--css` file last so it always wins. The result is a single HTML file with zero external requests.

## License

MIT © Hasan Shoaib
