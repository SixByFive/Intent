import { type PlanFile, type DecisionFile, type SystemFile } from "@intent/schemas";
import { type Result, ok } from "./result.js";
import { loadContext, type FilteredContext } from "./context.js";
import { reviewDiff, type ReviewDiffResult } from "./reviewDiff.js";
import { validateIntent, type ValidationResult } from "./validate.js";
import { formatContextBlock } from "./export.js";

// ─── Tokeniser ───────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "up", "out", "as", "is", "it", "its",
  "be", "was", "are", "were", "been", "has", "have", "had", "do", "does",
  "did", "will", "would", "could", "should", "may", "might", "can",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

function scoreText(tokens: string[], text: string): number {
  const words = tokenize(text);
  return tokens.reduce((n, t) => n + words.filter((w) => w === t).length, 0);
}

function scorePlan(tokens: string[], p: PlanFile): number {
  if (tokens.length === 0) return 1;
  return (
    scoreText(tokens, p.frontmatter.title) * 3 +
    p.frontmatter.tags.reduce((n, tag) => n + (tokens.includes(tag.toLowerCase()) ? 2 : 0), 0) +
    Math.min(scoreText(tokens, p.body), 5)
  );
}

function scoreDecision(tokens: string[], d: DecisionFile): number {
  if (tokens.length === 0) return 1;
  return (
    scoreText(tokens, d.frontmatter.title) * 3 +
    d.frontmatter.tags.reduce((n, tag) => n + (tokens.includes(tag.toLowerCase()) ? 2 : 0), 0) +
    Math.min(scoreText(tokens, d.body), 5)
  );
}

function scoreSystem(tokens: string[], s: SystemFile): number {
  if (tokens.length === 0) return 1;
  return (
    scoreText(tokens, s.frontmatter.title) * 3 +
    s.frontmatter.tags.reduce((n, tag) => n + (tokens.includes(tag.toLowerCase()) ? 2 : 0), 0) +
    Math.min(scoreText(tokens, s.body), 5)
  );
}

// ─── Prepare ─────────────────────────────────────────────────────────────────

export interface PrepareResult {
  task: string | null;
  plans: PlanFile[];
  decisions: DecisionFile[];
  systems: SystemFile[];
  config: FilteredContext["config"];
  formatted: string;
}

export async function prepareAgentContext(
  root: string,
  task: string | null,
): Promise<Result<PrepareResult>> {
  const ctxResult = await loadContext(root);
  if (!ctxResult.ok) return ctxResult;

  const ctx = ctxResult.value;
  const tokens = task ? tokenize(task) : [];

  // Score every item
  const planScores = new Map(ctx.plans.map((p) => [p.frontmatter.id, scorePlan(tokens, p)]));
  const decisionScores = new Map(ctx.decisions.map((d) => [d.frontmatter.id, scoreDecision(tokens, d)]));
  const systemScores = new Map(ctx.systems.map((s) => [s.frontmatter.id, scoreSystem(tokens, s)]));

  let matchedPlans = ctx.plans.filter((p) => (planScores.get(p.frontmatter.id) ?? 0) > 0);
  let matchedDecisions = ctx.decisions.filter((d) => (decisionScores.get(d.frontmatter.id) ?? 0) > 0);
  let matchedSystems = ctx.systems.filter((s) => (systemScores.get(s.frontmatter.id) ?? 0) > 0);

  // Nothing scored → fall back to full context
  if (task && matchedPlans.length === 0 && matchedDecisions.length === 0 && matchedSystems.length === 0) {
    matchedPlans = [...ctx.plans];
    matchedDecisions = [...ctx.decisions];
    matchedSystems = [...ctx.systems];
  }

  // Transitively pull in decisions referenced by matched plans
  const decisionIds = new Set(matchedDecisions.map((d) => d.frontmatter.id));
  for (const p of matchedPlans) {
    for (const decId of p.frontmatter.decisions) {
      if (!decisionIds.has(decId)) {
        const dec = ctx.decisions.find((d) => d.frontmatter.id === decId);
        if (dec) { matchedDecisions.push(dec); decisionIds.add(decId); }
      }
    }
  }

  // Transitively pull in plans referenced by matched decisions
  const planIds = new Set(matchedPlans.map((p) => p.frontmatter.id));
  for (const d of matchedDecisions) {
    for (const planId of d.frontmatter.plans) {
      if (!planIds.has(planId)) {
        const plan = ctx.plans.find((pp) => pp.frontmatter.id === planId);
        if (plan) { matchedPlans.push(plan); planIds.add(planId); }
      }
    }
  }

  // Sort by score descending
  matchedPlans.sort((a, b) => (planScores.get(b.frontmatter.id) ?? 0) - (planScores.get(a.frontmatter.id) ?? 0));
  matchedDecisions.sort((a, b) => (decisionScores.get(b.frontmatter.id) ?? 0) - (decisionScores.get(a.frontmatter.id) ?? 0));
  matchedSystems.sort((a, b) => (systemScores.get(b.frontmatter.id) ?? 0) - (systemScores.get(a.frontmatter.id) ?? 0));

  const filtered: FilteredContext = { ...ctx, plans: matchedPlans, decisions: matchedDecisions, systems: matchedSystems };
  const formatted = formatContextBlock(filtered);

  return ok({ task, plans: matchedPlans, decisions: matchedDecisions, systems: matchedSystems, config: ctx.config, formatted });
}

// ─── Review ──────────────────────────────────────────────────────────────────

export interface ChecklistItem {
  status: "ok" | "warning" | "error";
  category: "diff" | "validation";
  message: string;
  file?: string;
}

export interface AgentReviewReport {
  diff: ReviewDiffResult | null;
  validation: ValidationResult;
  checklist: ChecklistItem[];
  /** True when changed files have no linked intent entries — good prompt to create a decision */
  suggestDecision: boolean;
}

export async function reviewAgent(
  root: string,
  staged = true,
  base?: string,
): Promise<Result<AgentReviewReport>> {
  const [diffResult, validateResult] = await Promise.all([
    reviewDiff(root, staged, base),
    validateIntent(root),
  ]);

  if (!validateResult.ok) return validateResult;

  const checklist: ChecklistItem[] = [];
  let diffValue: ReviewDiffResult | null = null;

  // ── Diff checklist ─────────────────────────────────────────────────────────
  if (diffResult.ok) {
    diffValue = diffResult.value;
    if (diffValue.relatedEntries.length === 0 && diffValue.diff.files.length > 0) {
      checklist.push({
        status: "warning",
        category: "diff",
        message: "No intent entries linked to changed files — consider linking or creating a plan",
      });
    } else {
      for (const entry of diffValue.relatedEntries) {
        checklist.push({
          status: "ok",
          category: "diff",
          message: `Changes covered by ${entry.type} ${entry.id}`,
        });
      }
    }
  } else {
    checklist.push({
      status: "warning",
      category: "diff",
      message: `Could not read diff: ${diffResult.error.message}`,
    });
  }

  // ── Validation checklist ───────────────────────────────────────────────────
  const validation = validateResult.value;
  if (validation.issues.length === 0) {
    checklist.push({ status: "ok", category: "validation", message: "All intent files valid" });
  } else {
    for (const issue of validation.issues) {
      checklist.push({
        status: issue.severity === "error" ? "error" : "warning",
        category: "validation",
        message: issue.message,
        file: issue.file,
      });
    }
  }

  const suggestDecision =
    diffValue !== null &&
    diffValue.relatedEntries.length === 0 &&
    diffValue.diff.files.length > 0;

  return ok({ diff: diffValue, validation, checklist, suggestDecision });
}
