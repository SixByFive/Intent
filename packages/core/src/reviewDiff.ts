import { type LinkEntry } from "@dev-sixbyfive/intent-schemas";
import { type Result, ok } from "./result.js";
import { getStagedDiff, getUnstagedDiff, getBaseDiff, type DiffSummary } from "./git.js";
import { readLinksIndex, findRelatedEntries, rebuildLinksIndex } from "./links.js";
import { readPlan } from "./plans.js";
import { readDecision } from "./decisions.js";
import { readSystem } from "./systems.js";

export interface ReviewDiffResult {
  diff: DiffSummary;
  relatedEntries: LinkEntry[];
  context: ReviewContext[];
}

export interface ReviewContext {
  entry: LinkEntry;
  body: string;
  frontmatterSummary: string;
}

export async function reviewDiff(
  root: string,
  staged = true,
  base?: string,
): Promise<Result<ReviewDiffResult>> {
  const diffResult = base
    ? await getBaseDiff(root, base)
    : staged
      ? await getStagedDiff(root)
      : await getUnstagedDiff(root);
  if (!diffResult.ok) return diffResult;

  const diff = diffResult.value;
  const changedPaths = diff.files.map((f) => f.path);

  let indexResult = await readLinksIndex(root);
  if (!indexResult.ok) {
    const rebuilt = await rebuildLinksIndex(root);
    if (!rebuilt.ok) return rebuilt;
    indexResult = { ok: true, value: rebuilt.value };
  }

  const relatedEntries = findRelatedEntries(indexResult.value, changedPaths);

  const context: ReviewContext[] = [];
  for (const entry of relatedEntries) {
    let body = "";
    let frontmatterSummary = "";

    if (entry.type === "plan") {
      const name = entry.id.replace(/^plan-/, "");
      const result = await readPlan(root, name);
      if (result.ok) {
        body = result.value.body;
        const fm = result.value.frontmatter;
        frontmatterSummary = `status: ${fm.status}${fm.system ? `, system: ${fm.system}` : ""}`;
      }
    } else if (entry.type === "decision") {
      const result = await readDecision(root, entry.id);
      if (result.ok) {
        body = result.value.body;
        const fm = result.value.frontmatter;
        frontmatterSummary = `status: ${fm.status}${fm.system ? `, system: ${fm.system}` : ""}`;
      }
    } else if (entry.type === "system") {
      const name = entry.id.replace(/^sys-/, "");
      const result = await readSystem(root, name);
      if (result.ok) {
        body = result.value.body;
        frontmatterSummary = `plans: ${result.value.frontmatter.plans.length}, decisions: ${result.value.frontmatter.decisions.length}`;
      }
    }

    context.push({ entry, body, frontmatterSummary });
  }

  return ok({ diff, relatedEntries, context });
}
