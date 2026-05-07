import { Command } from "commander";
import { writePlan, listPlans, updatePlan, type PlanFrontmatter } from "@intent/core";
import { printError, printSuccess, printHeader, printDim } from "../output.js";
import { resolveRoot } from "../root.js";

export function makePlanCommand(): Command {
  const cmd = new Command("plan");
  cmd.description("Manage plans");

  cmd
    .command("create <name>")
    .description("Create a new plan file")
    .option("--title <title>", "Plan title")
    .option("--system <system>", "System this plan belongs to")
    .option("--status <status>", "Initial status", "draft")
    .action(async (name: string, opts: { title?: string; system?: string; status?: string }) => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      const id = `plan-${name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;
      const now = new Date().toISOString();

      const frontmatter: PlanFrontmatter = {
        id,
        title: opts.title ?? name,
        type: "plan",
        status: (opts.status as PlanFrontmatter["status"]) ?? "draft",
        created: now,
        updated: now,
        system: opts.system,
        decisions: [],
        constraints: [],
        tags: [],
      };

      const body = `## Goal\n\n\n\n## Reason\n\n\n\n## Rules\n\n`;

      const result = await writePlan(root, frontmatter, body);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      printSuccess(`Created plan: ${result.value}`);
    });

  cmd
    .command("update <name>")
    .description("Update a plan's status or title")
    .option("--status <status>", "New status: draft | active | archived | superseded")
    .option("--title <title>", "New title")
    .action(async (name: string, opts: { status?: string; title?: string }) => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      if (!opts.status && !opts.title) {
        printError({ code: "INVALID_INPUT", message: "Provide at least --status or --title" });
        process.exit(1);
        return;
      }

      const updates: Partial<PlanFrontmatter> = {};
      if (opts.status) updates.status = opts.status as PlanFrontmatter["status"];
      if (opts.title) updates.title = opts.title;

      const result = await updatePlan(root, name, updates);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      printSuccess(`Updated plan: ${result.value}`);
    });

  cmd
    .command("list")
    .description("List all plans")
    .action(async () => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      const result = await listPlans(root);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      if (result.value.length === 0) {
        printDim("No plans found. Run 'intent plan create <name>' to create one.");
        return;
      }

      printHeader("Plans");
      for (const plan of result.value) {
        const fm = plan.frontmatter;
        console.log(`  ${fm.id}  ${fm.title}  [${fm.status}]${fm.system ? `  system:${fm.system}` : ""}`);
      }
    });

  return cmd;
}
