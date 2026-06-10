import { Command } from "commander";
import { writeDecision, readDecision, listDecisions, nextDecisionId, updateDecision, type DecisionFrontmatter } from "@dev-sixbyfive/intent-core";
import { printError, printSuccess, printHeader, printDim } from "../output.js";
import { resolveRoot } from "../root.js";
import chalk from "chalk";

export function makeDecisionCommand(): Command {
  const cmd = new Command("decision");
  cmd.description("Manage architectural decisions");

  cmd
    .command("add")
    .description("Record a new architectural decision")
    .option("--title <title>", "Decision title", "Untitled Decision")
    .option("--system <system>", "System this decision belongs to")
    .option("--status <status>", "Initial status", "active")
    .action(async (opts: { title?: string; system?: string; status?: string }) => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      const idResult = await nextDecisionId(root);
      if (!idResult.ok) {
        printError(idResult.error);
        process.exit(1);
        return;
      }

      const now = new Date().toISOString();
      const frontmatter: DecisionFrontmatter = {
        id: idResult.value,
        title: opts.title ?? "Untitled Decision",
        type: "decision",
        status: (opts.status as DecisionFrontmatter["status"]) ?? "active",
        created: now,
        updated: now,
        system: opts.system,
        plans: [],
        tags: [],
      };

      const body = `## Context\n\n\n\n## Decision\n\n\n\n## Consequences\n\n`;

      const result = await writeDecision(root, frontmatter, body);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      printSuccess(`Created decision ${idResult.value}: ${result.value}`);
    });

  cmd
    .command("update <id>")
    .description("Update a decision's status or title")
    .option("--status <status>", "New status: draft | active | archived | superseded")
    .option("--title <title>", "New title")
    .option("--system <system>", "New system")
    .action(async (id: string, opts: { status?: string; title?: string; system?: string }) => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      if (!opts.status && !opts.title && !opts.system) {
        printError({ code: "INVALID_INPUT", message: "Provide at least --status, --title, or --system" });
        process.exit(1);
        return;
      }

      const updates: Partial<DecisionFrontmatter> = {};
      if (opts.status) updates.status = opts.status as DecisionFrontmatter["status"];
      if (opts.title) updates.title = opts.title;
      if (opts.system) updates.system = opts.system;

      const result = await updateDecision(root, id, updates);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      printSuccess(`Updated decision: ${result.value}`);
    });

  cmd
    .command("show <id>")
    .description("Show full details of a decision")
    .action(async (id: string) => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      const result = await readDecision(root, id);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      const { frontmatter: fm, body } = result.value;
      const statusColor = fm.status === "active" ? chalk.green : fm.status === "archived" ? chalk.dim : chalk.yellow;
      printHeader(`${fm.id}  ${fm.title}  ${statusColor(`[${fm.status}]`)}`);
      if (fm.system) console.log(`  ${chalk.dim("System:")}  ${fm.system}`);
      if (fm.tags.length) console.log(`  ${chalk.dim("Tags:")}    ${fm.tags.join(", ")}`);
      if (fm.plans.length) console.log(`  ${chalk.dim("Plans:")}   ${fm.plans.join(", ")}`);
      console.log(`  ${chalk.dim("Created:")} ${fm.created}`);
      console.log(`  ${chalk.dim("Updated:")} ${fm.updated}`);
      if (body.trim()) {
        console.log("");
        console.log(body.trim());
      }
    });

  cmd
    .command("list")
    .description("List all decisions")
    .option("--status <status>", "Filter by status: draft | active | archived | superseded")
    .option("--system <system>", "Filter by system")
    .option("--tag <tag>", "Filter by tag")
    .action(async (opts: { status?: string; system?: string; tag?: string }) => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      const result = await listDecisions(root);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      let decisions = result.value;
      if (opts.status) decisions = decisions.filter((d) => d.frontmatter.status === opts.status);
      if (opts.system) decisions = decisions.filter((d) => d.frontmatter.system === opts.system);
      if (opts.tag) decisions = decisions.filter((d) => d.frontmatter.tags.includes(opts.tag!));

      if (decisions.length === 0) {
        printDim("No decisions found. Run 'intent decision add' to record one.");
        return;
      }

      printHeader("Decisions");
      for (const dec of decisions) {
        const fm = dec.frontmatter;
        const statusColor = fm.status === "active" ? chalk.green : fm.status === "archived" ? chalk.dim : chalk.yellow;
        console.log(`  ${fm.id}  ${fm.title}  ${statusColor(`[${fm.status}]`)}${fm.system ? chalk.dim(`  system:${fm.system}`) : ""}`);
      }
    });

  return cmd;
}
