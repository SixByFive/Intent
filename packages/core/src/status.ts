import * as fs from "node:fs/promises";
import { type Result, ok } from "./result.js";
import { listPlans } from "./plans.js";
import { listDecisions } from "./decisions.js";
import { listSystems } from "./systems.js";
import { readConfig } from "./config.js";
import { linksIndexPath } from "./paths.js";
import { validateIntent, type ValidationIssue } from "./validate.js";

export interface PlanStatusSummary {
  id: string;
  title: string;
  status: string;
  system?: string;
}

export interface IntentStatus {
  project: string;
  counts: {
    plans: number;
    decisions: number;
    systems: number;
  };
  plans: {
    active: PlanStatusSummary[];
    draft: PlanStatusSummary[];
    archived: PlanStatusSummary[];
  };
  linksIndex: {
    exists: boolean;
    generated?: string;
  };
  validation: {
    errors: number;
    warnings: number;
    issues: ValidationIssue[];
  };
}

export async function getStatus(root: string): Promise<Result<IntentStatus>> {
  const [configResult, plansResult, decisionsResult, systemsResult, validateResult] =
    await Promise.all([
      readConfig(root),
      listPlans(root),
      listDecisions(root),
      listSystems(root),
      validateIntent(root),
    ]);

  if (!configResult.ok) return configResult;

  const plans = plansResult.ok ? plansResult.value : [];
  const decisions = decisionsResult.ok ? decisionsResult.value : [];
  const systems = systemsResult.ok ? systemsResult.value : [];

  const planSummary = (p: (typeof plans)[number]): PlanStatusSummary => ({
    id: p.frontmatter.id,
    title: p.frontmatter.title,
    status: p.frontmatter.status,
    system: p.frontmatter.system,
  });

  // Check links index
  let linksIndex: IntentStatus["linksIndex"] = { exists: false };
  try {
    const raw = await fs.readFile(linksIndexPath(root), "utf8");
    const parsed = JSON.parse(raw) as { generated?: string };
    linksIndex = { exists: true, generated: parsed.generated };
  } catch {
    linksIndex = { exists: false };
  }

  const validation = validateResult.ok
    ? { errors: validateResult.value.counts.errors, warnings: validateResult.value.counts.warnings, issues: validateResult.value.issues }
    : { errors: 0, warnings: 0, issues: [] };

  return ok({
    project: configResult.value.project,
    counts: {
      plans: plans.length,
      decisions: decisions.length,
      systems: systems.length,
    },
    plans: {
      active: plans.filter((p) => p.frontmatter.status === "active").map(planSummary),
      draft: plans.filter((p) => p.frontmatter.status === "draft").map(planSummary),
      archived: plans.filter((p) => p.frontmatter.status === "archived").map(planSummary),
    },
    linksIndex,
    validation,
  });
}
