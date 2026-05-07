import { type Result, ok, intentError } from "./result.js";
import { listPlans } from "./plans.js";
import { listDecisions } from "./decisions.js";
import { listSystems } from "./systems.js";
import { readConfig } from "./config.js";

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  file: string;
  severity: ValidationSeverity;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  counts: { checked: number; errors: number; warnings: number };
}

export async function validateIntent(root: string): Promise<Result<ValidationResult>> {
  const issues: ValidationIssue[] = [];

  const configResult = await readConfig(root);
  if (!configResult.ok) {
    return ok({
      valid: false,
      issues: [{ file: ".intent/intent.json", severity: "error", message: configResult.error.message }],
      counts: { checked: 1, errors: 1, warnings: 0 },
    });
  }

  const [plansResult, decisionsResult, systemsResult] = await Promise.all([
    listPlans(root),
    listDecisions(root),
    listSystems(root),
  ]);

  // Collect parse/validation errors from each list
  // listX returns ok([]) on missing dir, so errors here are real parse failures
  const allPlans = plansResult.ok ? plansResult.value : [];
  const allDecisions = decisionsResult.ok ? decisionsResult.value : [];
  const allSystems = systemsResult.ok ? systemsResult.value : [];

  // Build lookup sets for referential integrity checks
  const decisionIds = new Set(allDecisions.map((d) => d.frontmatter.id));
  const planIds = new Set(allPlans.map((p) => p.frontmatter.id));
  const systemIds = new Set(allSystems.map((s) => s.frontmatter.id));

  // Check plans
  for (const plan of allPlans) {
    const fm = plan.frontmatter;
    const file = plan.filePath;

    for (const ref of fm.decisions) {
      if (!decisionIds.has(ref)) {
        issues.push({ file, severity: "error", message: `References unknown decision: ${ref}` });
      }
    }

    if (fm.system && !systemIds.has(`sys-${fm.system}`) && !systemIds.has(fm.system)) {
      issues.push({ file, severity: "warning", message: `References unknown system: ${fm.system}` });
    }

    if (fm.status === "draft") {
      issues.push({ file, severity: "warning", message: `Plan is still in draft status` });
    }
  }

  // Check decisions
  for (const dec of allDecisions) {
    const fm = dec.frontmatter;
    const file = dec.filePath;

    for (const ref of fm.plans) {
      if (!planIds.has(ref)) {
        issues.push({ file, severity: "error", message: `References unknown plan: ${ref}` });
      }
    }

    if (fm.supersedes && !decisionIds.has(fm.supersedes)) {
      issues.push({ file, severity: "warning", message: `Supersedes unknown decision: ${fm.supersedes}` });
    }
  }

  // Check systems
  for (const sys of allSystems) {
    const fm = sys.frontmatter;
    const file = sys.filePath;

    for (const ref of fm.plans) {
      if (!planIds.has(ref)) {
        issues.push({ file, severity: "error", message: `References unknown plan: ${ref}` });
      }
    }

    for (const ref of fm.decisions) {
      if (!decisionIds.has(ref)) {
        issues.push({ file, severity: "error", message: `References unknown decision: ${ref}` });
      }
    }
  }

  const checked = 1 + allPlans.length + allDecisions.length + allSystems.length;
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;

  return ok({
    valid: errors === 0,
    issues,
    counts: { checked, errors, warnings },
  });
}
