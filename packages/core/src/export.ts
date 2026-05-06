import * as fs from "node:fs/promises";
import * as path from "node:path";
import { type Result, ok, err, intentError } from "./result.js";
import { loadContext, type FilteredContext } from "./context.js";

export type ExportTarget = "claude" | "cursor" | "copilot";

export interface ExportOptions {
  system?: string;
}

const MARKER_START = "<!-- intent-context:start -->";
const MARKER_END = "<!-- intent-context:end -->";

export function formatContextBlock(ctx: FilteredContext): string {
  const lines: string[] = [];

  lines.push(MARKER_START);
  lines.push("");
  lines.push("## Intent Context");
  if (ctx.system) lines.push(`*System: ${ctx.system}*`);
  lines.push("");

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

export async function exportContext(
  root: string,
  target: ExportTarget,
  options: ExportOptions = {},
): Promise<Result<string>> {
  const ctxResult = await loadContext(root, options.system);
  if (!ctxResult.ok) return ctxResult;

  const block = formatContextBlock(ctxResult.value);
  const targetPath = resolveTargetPath(root, target);

  const writeResult = await upsertBlock(targetPath, block, target);
  if (!writeResult.ok) return writeResult;

  return ok(targetPath);
}

function resolveTargetPath(root: string, target: ExportTarget): string {
  switch (target) {
    case "claude":
      return path.join(root, "CLAUDE.md");
    case "cursor":
      return path.join(root, ".cursor", "rules");
    case "copilot":
      return path.join(root, ".github", "copilot-instructions.md");
  }
}

async function upsertBlock(filePath: string, block: string, target: ExportTarget): Promise<Result<void>> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  let existing = "";
  try {
    existing = await fs.readFile(filePath, "utf8");
  } catch {
    // file doesn't exist yet — start fresh
  }

  let updated: string;
  const startIdx = existing.indexOf(MARKER_START);
  const endIdx = existing.indexOf(MARKER_END);

  if (startIdx !== -1 && endIdx !== -1) {
    // replace existing block in-place
    updated = existing.slice(0, startIdx) + block + existing.slice(endIdx + MARKER_END.length);
  } else if (existing.trim() === "") {
    updated = preamble(target) + block + "\n";
  } else {
    // append to existing file
    updated = existing.trimEnd() + "\n\n" + block + "\n";
  }

  try {
    await fs.writeFile(filePath, updated, "utf8");
    return ok(undefined);
  } catch (cause) {
    return err(intentError("WRITE_ERROR", `Failed to write to ${filePath}`, cause));
  }
}

function preamble(target: ExportTarget): string {
  switch (target) {
    case "claude":
      return "# Project Context\n\n";
    case "cursor":
      return "";
    case "copilot":
      return "";
  }
}
