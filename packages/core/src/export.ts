import * as fsp from "node:fs/promises";
import { watch as fsWatch } from "node:fs";
import * as path from "node:path";
import { type Result, ok, err, intentError } from "./result.js";
import { loadContext, type FilteredContext } from "./context.js";
import { intentDir, plansDir, decisionsDir, systemsDir, constraintsDir } from "./paths.js";

export type ExportTarget = "claude" | "cursor" | "copilot" | "windsurf" | "html" | "json";

export interface ExportOptions {
  system?: string;
}

export interface WatchHandle {
  stop: () => void;
}

const MARKER_START = "<!-- intent-context:start -->";
const MARKER_END = "<!-- intent-context:end -->";

// ─── Markdown formatter ───────────────────────────────────────────────────────

export function formatContextBlock(ctx: FilteredContext): string {
  const lines: string[] = [];

  lines.push(MARKER_START);
  lines.push("");
  lines.push("## Intent Context");
  if (ctx.system) lines.push(`*System: ${ctx.system}*`);
  lines.push("");

  lines.push("### Agent Instructions");
  lines.push("");
  lines.push("This project uses [Intent](https://github.com/SixByFive/intent) to track the *why* behind code.");
  lines.push("When `.intent/` is present, follow these rules:");
  lines.push("");
  lines.push("1. **Before starting a task** — call `intent agent prepare \"<task>\"` or the `intent_agent_prepare` MCP tool to load relevant plans and decisions.");
  lines.push("2. **After making changes** — call `intent agent review` or `intent_agent_review` to verify alignment and catch broken references.");
  lines.push("3. **If you made an architectural decision** not covered by an existing record, create one: `intent decision add` or let `intent agent review` scaffold it interactively.");
  lines.push("4. **If a plan's work is complete**, update its `status` to `archived` in the frontmatter.");
  lines.push("5. **Commit `.intent/` files** alongside the code changes they describe.");
  lines.push("");

  if (ctx.constraints.length > 0) {
    lines.push("### Constraints");
    lines.push("");
    for (const con of ctx.constraints) {
      const fm = con.frontmatter;
      lines.push(`**${fm.id}** — ${fm.title} \`[${fm.severity}]\``);
      if (fm.system) lines.push(`System: ${fm.system}`);
      if (con.body) {
        const excerpt = excerptBody(con.body, 3);
        if (excerpt) lines.push("", excerpt);
      }
      lines.push("");
    }
  }

  if (ctx.plans.length > 0) {
    lines.push("### Active Plans");
    lines.push("");
    for (const plan of ctx.plans) {
      const fm = plan.frontmatter;
      lines.push(`**${fm.id}** — ${fm.title} \`[${fm.status}]\``);
      if (fm.system) lines.push(`System: ${fm.system}`);
      if (plan.body) {
        const excerpt = excerptBody(plan.body, 6);
        if (excerpt) lines.push("", excerpt);
      }
      lines.push("");
    }
  }

  if (ctx.decisions.length > 0) {
    lines.push("### Architectural Decisions");
    lines.push("");
    for (const dec of ctx.decisions) {
      const fm = dec.frontmatter;
      lines.push(`**${fm.id}** — ${fm.title} \`[${fm.status}]\``);
      if (fm.system) lines.push(`System: ${fm.system}`);
      if (dec.body) {
        const excerpt = excerptBody(dec.body, 4);
        if (excerpt) lines.push("", excerpt);
      }
      lines.push("");
    }
  }

  if (ctx.systems.length > 0) {
    lines.push("### Systems");
    lines.push("");
    for (const sys of ctx.systems) {
      const fm = sys.frontmatter;
      lines.push(`**${fm.id}** — ${fm.title}`);
      if (sys.body) {
        const excerpt = excerptBody(sys.body, 3);
        if (excerpt) lines.push("", excerpt);
      }
      lines.push("");
    }
  }

  lines.push(MARKER_END);
  return lines.join("\n");
}

function excerptBody(body: string, maxLines: number): string {
  return body
    .split("\n")
    .slice(0, maxLines)
    .filter((l) => l.trim())
    .map((l) => `> ${l}`)
    .join("\n");
}

// ─── HTML formatter ───────────────────────────────────────────────────────────

export function formatContextBlockHtml(ctx: FilteredContext): string {
  const data = {
    generated: new Date().toISOString(),
    project: ctx.config.project,
    system: ctx.system ?? null,
    constraints: ctx.constraints.map((c) => ({ ...c.frontmatter, body: c.body })),
    plans: ctx.plans.map((p) => ({ ...p.frontmatter, body: p.body })),
    decisions: ctx.decisions.map((d) => ({ ...d.frontmatter, body: d.body })),
    systems: ctx.systems.map((s) => ({ ...s.frontmatter, body: s.body })),
  };

  const lines: string[] = [
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head>`,
    `<meta charset="UTF-8">`,
    `<meta name="generator" content="intent">`,
    `<title>Intent Context${ctx.system ? ` — ${esc(ctx.system)}` : ""}</title>`,
    `<script type="application/json" id="intent-data">`,
    JSON.stringify(data, null, 2),
    `</script>`,
    `<style>body{font-family:system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;line-height:1.6}article{border:1px solid #e2e8f0;border-radius:6px;padding:1rem 1.25rem;margin:.75rem 0}article h3{margin:0 0 .5rem}dl{display:grid;grid-template-columns:max-content 1fr;gap:.25rem .75rem;margin:.5rem 0}dt{color:#64748b;font-size:.85em}dd{margin:0}code{background:#f1f5f9;padding:.1em .3em;border-radius:3px;font-size:.9em}section{margin:2rem 0}h2{border-bottom:2px solid #e2e8f0;padding-bottom:.4rem}</style>`,
    `</head>`,
    `<body>`,
    `<header>`,
    `<h1>Intent Context</h1>`,
    `<p>Project: <strong>${esc(ctx.config.project)}</strong>` +
      (ctx.system ? ` · System: <strong>${esc(ctx.system)}</strong>` : "") +
      ` · Generated: <time>${new Date().toISOString()}</time></p>`,
    `</header>`,
    ``,
    `<section id="agent-instructions">`,
    `<h2>Agent Instructions</h2>`,
    `<p>This project uses <a href="https://github.com/SixByFive/intent">Intent</a> to track the <em>why</em> behind code. When <code>.intent/</code> is present, follow these rules:</p>`,
    `<ol>`,
    `<li><strong>Before starting a task</strong> — call <code>intent agent prepare "&lt;task&gt;"</code> or the <code>intent_agent_prepare</code> MCP tool to load relevant plans and decisions.</li>`,
    `<li><strong>After making changes</strong> — call <code>intent agent review</code> or <code>intent_agent_review</code> to verify alignment and catch broken references.</li>`,
    `<li><strong>If you made an architectural decision</strong> not covered by an existing record, create one: <code>intent decision add</code> or let <code>intent agent review</code> scaffold it interactively.</li>`,
    `<li><strong>If a plan's work is complete</strong>, update its <code>status</code> to <code>archived</code>.</li>`,
    `<li><strong>Commit <code>.intent/</code> files</strong> alongside the code changes they describe.</li>`,
    `</ol>`,
    `</section>`,
  ];

  if (ctx.constraints.length > 0) {
    lines.push(``, `<section id="constraints">`, `<h2>Constraints</h2>`);
    for (const con of ctx.constraints) {
      const fm = con.frontmatter;
      lines.push(
        `<article data-id="${esc(fm.id)}" data-severity="${fm.severity}"${fm.system ? ` data-system="${esc(fm.system)}"` : ""}>`,
        `<h3><code>${esc(fm.id)}</code> — ${esc(fm.title)}</h3>`,
        `<dl><dt>Severity</dt><dd>${fm.severity}</dd>` +
          (fm.system ? `<dt>System</dt><dd>${esc(fm.system)}</dd>` : "") +
          (fm.tags.length ? `<dt>Tags</dt><dd>${fm.tags.map(esc).join(", ")}</dd>` : "") +
          `</dl>`,
        con.body.trim() ? `<div class="body">${bodyToHtml(con.body)}</div>` : "",
        `</article>`,
      );
    }
    lines.push(`</section>`);
  }

  if (ctx.plans.length > 0) {
    lines.push(``, `<section id="plans">`, `<h2>Plans</h2>`);
    for (const plan of ctx.plans) {
      const fm = plan.frontmatter;
      lines.push(
        `<article data-id="${esc(fm.id)}" data-status="${fm.status}"${fm.system ? ` data-system="${esc(fm.system)}"` : ""}>`,
        `<h3><code>${esc(fm.id)}</code> — ${esc(fm.title)}</h3>`,
        `<dl><dt>Status</dt><dd>${fm.status}</dd>` +
          (fm.system ? `<dt>System</dt><dd>${esc(fm.system)}</dd>` : "") +
          (fm.tags.length ? `<dt>Tags</dt><dd>${fm.tags.map(esc).join(", ")}</dd>` : "") +
          (fm.decisions.length ? `<dt>Decisions</dt><dd>${fm.decisions.map(esc).join(", ")}</dd>` : "") +
          `</dl>`,
        plan.body.trim() ? `<div class="body">${bodyToHtml(plan.body)}</div>` : "",
        `</article>`,
      );
    }
    lines.push(`</section>`);
  }

  if (ctx.decisions.length > 0) {
    lines.push(``, `<section id="decisions">`, `<h2>Architectural Decisions</h2>`);
    for (const dec of ctx.decisions) {
      const fm = dec.frontmatter;
      lines.push(
        `<article data-id="${esc(fm.id)}" data-status="${fm.status}"${fm.system ? ` data-system="${esc(fm.system)}"` : ""}>`,
        `<h3><code>${esc(fm.id)}</code> — ${esc(fm.title)}</h3>`,
        `<dl><dt>Status</dt><dd>${fm.status}</dd>` +
          (fm.system ? `<dt>System</dt><dd>${esc(fm.system)}</dd>` : "") +
          (fm.tags.length ? `<dt>Tags</dt><dd>${fm.tags.map(esc).join(", ")}</dd>` : "") +
          (fm.plans.length ? `<dt>Plans</dt><dd>${fm.plans.map(esc).join(", ")}</dd>` : "") +
          `</dl>`,
        dec.body.trim() ? `<div class="body">${bodyToHtml(dec.body)}</div>` : "",
        `</article>`,
      );
    }
    lines.push(`</section>`);
  }

  if (ctx.systems.length > 0) {
    lines.push(``, `<section id="systems">`, `<h2>Systems</h2>`);
    for (const sys of ctx.systems) {
      const fm = sys.frontmatter;
      lines.push(
        `<article data-id="${esc(fm.id)}"${fm.tags.length ? ` data-tags="${fm.tags.map(esc).join(",")}"` : ""}>`,
        `<h3><code>${esc(fm.id)}</code> — ${esc(fm.title)}</h3>`,
        fm.tags.length ? `<dl><dt>Tags</dt><dd>${fm.tags.map(esc).join(", ")}</dd></dl>` : "",
        sys.body.trim() ? `<div class="body">${bodyToHtml(sys.body)}</div>` : "",
        `</article>`,
      );
    }
    lines.push(`</section>`);
  }

  lines.push(`</body>`, `</html>`);
  return lines.join("\n");
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inlineHtml(text: string): string {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function bodyToHtml(body: string): string {
  const result: string[] = [];
  let inList = false;

  for (const line of body.split("\n")) {
    const t = line.trim();
    if (t === "") {
      if (inList) { result.push("</ul>"); inList = false; }
      continue;
    }
    if (t.startsWith("### ")) {
      if (inList) { result.push("</ul>"); inList = false; }
      result.push(`<h4>${inlineHtml(t.slice(4))}</h4>`);
    } else if (t.startsWith("## ")) {
      if (inList) { result.push("</ul>"); inList = false; }
      result.push(`<h3>${inlineHtml(t.slice(3))}</h3>`);
    } else if (t.startsWith("# ")) {
      if (inList) { result.push("</ul>"); inList = false; }
      result.push(`<h2>${inlineHtml(t.slice(2))}</h2>`);
    } else if (t.startsWith("- ") || t.startsWith("* ")) {
      if (!inList) { result.push("<ul>"); inList = true; }
      result.push(`<li>${inlineHtml(t.slice(2))}</li>`);
    } else if (t.startsWith("> ")) {
      if (inList) { result.push("</ul>"); inList = false; }
      result.push(`<blockquote>${inlineHtml(t.slice(2))}</blockquote>`);
    } else {
      if (inList) { result.push("</ul>"); inList = false; }
      result.push(`<p>${inlineHtml(t)}</p>`);
    }
  }
  if (inList) result.push("</ul>");
  return result.join("\n");
}

// ─── JSON formatter ───────────────────────────────────────────────────────────

export function formatContextBlockJson(ctx: FilteredContext): string {
  return JSON.stringify(
    {
      generated: new Date().toISOString(),
      project: ctx.config.project,
      system: ctx.system ?? null,
      constraints: ctx.constraints.map((c) => ({ ...c.frontmatter, body: c.body })),
      plans: ctx.plans.map((p) => ({ ...p.frontmatter, body: p.body })),
      decisions: ctx.decisions.map((d) => ({ ...d.frontmatter, body: d.body })),
      systems: ctx.systems.map((s) => ({ ...s.frontmatter, body: s.body })),
    },
    null,
    2,
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

const MARKDOWN_TARGETS = new Set<ExportTarget>(["claude", "cursor", "copilot", "windsurf"]);

export async function exportContext(
  root: string,
  target: ExportTarget,
  options: ExportOptions = {},
): Promise<Result<string>> {
  const ctxResult = await loadContext(root, options.system);
  if (!ctxResult.ok) return ctxResult;

  const ctx = ctxResult.value;
  const targetPath = resolveTargetPath(root, target);

  if (target === "html") {
    const content = formatContextBlockHtml(ctx);
    return writeFile(targetPath, content);
  }

  if (target === "json") {
    const content = formatContextBlockJson(ctx);
    return writeFile(targetPath, content);
  }

  // Markdown targets: upsert block in place
  const block = formatContextBlock(ctx);
  const writeResult = await upsertBlock(targetPath, block, target);
  if (!writeResult.ok) return writeResult;
  return ok(targetPath);
}

async function writeFile(filePath: string, content: string): Promise<Result<string>> {
  try {
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    await fsp.writeFile(filePath, content, "utf8");
    return ok(filePath);
  } catch (cause) {
    return err(intentError("WRITE_ERROR", `Failed to write to ${filePath}`, cause));
  }
}

function resolveTargetPath(root: string, target: ExportTarget): string {
  switch (target) {
    case "claude":   return path.join(root, "CLAUDE.md");
    case "cursor":   return path.join(root, ".cursor", "rules");
    case "copilot":  return path.join(root, ".github", "copilot-instructions.md");
    case "windsurf": return path.join(root, ".windsurfrules");
    case "html":     return path.join(root, "intent-context.html");
    case "json":     return path.join(root, "intent-context.json");
  }
}

async function upsertBlock(filePath: string, block: string, target: ExportTarget): Promise<Result<void>> {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });

  let existing = "";
  try {
    existing = await fsp.readFile(filePath, "utf8");
  } catch {
    // file doesn't exist yet — start fresh
  }

  let updated: string;
  const startIdx = existing.indexOf(MARKER_START);
  const endIdx = existing.indexOf(MARKER_END);

  if (startIdx !== -1 && endIdx !== -1) {
    updated = existing.slice(0, startIdx) + block + existing.slice(endIdx + MARKER_END.length);
  } else if (existing.trim() === "") {
    updated = preamble(target) + block + "\n";
  } else {
    updated = existing.trimEnd() + "\n\n" + block + "\n";
  }

  try {
    await fsp.writeFile(filePath, updated, "utf8");
    return ok(undefined);
  } catch (cause) {
    return err(intentError("WRITE_ERROR", `Failed to write to ${filePath}`, cause));
  }
}

function preamble(target: ExportTarget): string {
  if (target === "claude") return "# Project Context\n\n";
  return "";
}

// ─── Watch ────────────────────────────────────────────────────────────────────

export async function watchExport(
  root: string,
  target: ExportTarget,
  options: ExportOptions = {},
  onUpdate: (filePath: string) => void,
  onError: (err: Error) => void,
): Promise<WatchHandle> {
  // Initial export
  const initial = await exportContext(root, target, options);
  if (initial.ok) onUpdate(initial.value);
  else onError(new Error(initial.error.message));

  const dirs: string[] = [intentDir(root)];
  for (const d of [plansDir(root), decisionsDir(root), systemsDir(root), constraintsDir(root)]) {
    try { await fsp.access(d); dirs.push(d); } catch { /* doesn't exist yet */ }
  }

  let debounce: ReturnType<typeof setTimeout> | null = null;

  const watchers = dirs.map((dir) =>
    fsWatch(dir, (_event, filename) => {
      if (!filename) return;
      // Skip generated outputs and the links index to avoid re-export loops
      const name = path.basename(filename);
      if (name === "index.json" || name === ".agent-session.json") return;
      if (MARKDOWN_TARGETS.has(target) && (name === "intent-context.html" || name === "intent-context.json")) return;

      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(async () => {
        const result = await exportContext(root, target, options);
        if (result.ok) onUpdate(result.value);
        else onError(new Error(result.error.message));
      }, 250);
    }),
  );

  return { stop: () => watchers.forEach((w) => w.close()) };
}
