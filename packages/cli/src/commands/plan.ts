import { Command } from "commander";
import { writePlan, readPlan, listPlans, updatePlan, type PlanFrontmatter } from "@dev-sixbyfive/intent-core";
import { printError, printSuccess, printHeader, printDim } from "../output.js";
import { resolveRoot } from "../root.js";
import chalk from "chalk";

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
    .option("--system <system>", "New system")
    .action(async (name: string, opts: { status?: string; title?: string; system?: string }) => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      if (!opts.status && !opts.title && !opts.system) {
        printError({ code: "INVALID_INPUT", message: "Provide at least --status, --title, or --system" });
        process.exit(1);
        return;
      }

      const updates: Partial<PlanFrontmatter> = {};
      if (opts.status) updates.status = opts.status as PlanFrontmatter["status"];
      if (opts.title) updates.title = opts.title;
      if (opts.system) updates.system = opts.system;

      const result = await updatePlan(root, name, updates);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      printSuccess(`Updated plan: ${result.value}`);
    });

  cmd
    .command("show <name>")
    .description("Show full details of a plan")
    .action(async (name: string) => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      const result = await readPlan(root, name);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      const { frontmatter: fm, body } = result.value;
      const statusColor = fm.status === "active" ? chalk.green : fm.status === "archived" ? chalk.dim : chalk.yellow;
      printHeader(`${fm.id}  ${fm.title}  ${statusColor(`[${fm.status}]`)}`);
      if (fm.system) console.log(`  ${chalk.dim("System:")}    ${fm.system}`);
      if (fm.tags.length) console.log(`  ${chalk.dim("Tags:")}      ${fm.tags.join(", ")}`);
      if (fm.decisions.length) console.log(`  ${chalk.dim("Decisions:")} ${fm.decisions.join(", ")}`);
      console.log(`  ${chalk.dim("Created:")}   ${fm.created}`);
      console.log(`  ${chalk.dim("Updated:")}   ${fm.updated}`);
      if (body.trim()) {
        console.log("");
        console.log(body.trim());
      }
    });

  cmd
    .command("list")
    .description("List all plans")
    .option("--status <status>", "Filter by status: draft | active | archived | superseded")
    .option("--system <system>", "Filter by system")
    .option("--tag <tag>", "Filter by tag")
    .action(async (opts: { status?: string; system?: string; tag?: string }) => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      const result = await listPlans(root);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      let plans = result.value;
      if (opts.status) plans = plans.filter((p) => p.frontmatter.status === opts.status);
      if (opts.system) plans = plans.filter((p) => p.frontmatter.system === opts.system);
      if (opts.tag) plans = plans.filter((p) => p.frontmatter.tags.includes(opts.tag!));

      if (plans.length === 0) {
        printDim("No plans found. Run 'intent plan create <name>' to create one.");
        return;
      }

      printHeader("Plans");
      for (const plan of plans) {
        const fm = plan.frontmatter;
        const statusColor = fm.status === "active" ? chalk.green : fm.status === "archived" ? chalk.dim : chalk.yellow;
        console.log(`  ${fm.id}  ${fm.title}  ${statusColor(`[${fm.status}]`)}${fm.system ? chalk.dim(`  system:${fm.system}`) : ""}`);
      }
    });

  return cmd;
}
