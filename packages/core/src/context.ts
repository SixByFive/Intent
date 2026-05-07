import { type PlanFile, type DecisionFile, type SystemFile } from "@dev-sixbyfive/intent-schemas";
import { type Result, ok } from "./result.js";
import { listPlans } from "./plans.js";
import { listDecisions } from "./decisions.js";
import { listSystems } from "./systems.js";
import { readConfig } from "./config.js";

export interface IntentContext {
  config: { project: string; systems: string[] };
  plans: PlanFile[];
  decisions: DecisionFile[];
  systems: SystemFile[];
}

export interface FilteredContext extends IntentContext {
  system?: string;
}

export async function loadContext(root: string, systemFilter?: string): Promise<Result<FilteredContext>> {
  const [configResult, plansResult, decisionsResult, systemsResult] = await Promise.all([
    readConfig(root),
    listPlans(root),
    listDecisions(root),
    listSystems(root),
  ]);

  if (!configResult.ok) return configResult;

  let plans = plansResult.ok ? plansResult.value : [];
  let decisions = decisionsResult.ok ? decisionsResult.value : [];
  let systems = systemsResult.ok ? systemsResult.value : [];

  if (systemFilter) {
    plans = plans.filter((p) => p.frontmatter.system === systemFilter || p.frontmatter.tags.includes(systemFilter));
    decisions = decisions.filter((d) => d.frontmatter.system === systemFilter || d.frontmatter.tags.includes(systemFilter));
    systems = systems.filter((s) => s.frontmatter.id === `sys-${systemFilter}` || s.frontmatter.title.toLowerCase() === systemFilter.toLowerCase());
  }

  const ctx: FilteredContext = {
    config: {
      project: configResult.value.project,
      systems: configResult.value.systems,
    },
    plans,
    decisions,
    systems,
  };
  if (systemFilter !== undefined) ctx.system = systemFilter;
  return ok(ctx);
}
