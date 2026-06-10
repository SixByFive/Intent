import { Command } from "commander";
import { writeConstraint, readConstraint, listConstraints, updateConstraint, nextConstraintId, type ConstraintFrontmatter } from "@dev-sixbyfive/intent-core";
import { printError, printSuccess, printHeader, printDim } from "../output.js";
import { resolveRoot } from "../root.js";
import chalk from "chalk";

export function makeConstraintCommand(): Command {
  const cmd = new Command("constraint");
  cmd.description("Manage constraints");

  cmd
    .command("add")
    .description("Record a new constraint")
    .option("--title <title>", "Constraint title", "Untitled Constraint")
    .option("--severity <severity>", "hard or soft", "hard")
    .option("--system <system>", "System this constraint belongs to")
    .action(async (opts: { title?: string; severity?: string; system?: string }) => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      const severity = opts.severity === "soft" ? "soft" : "hard";

      const idResult = await nextConstraintId(root);
      if (!idResult.ok) {
        printError(idResult.error);
        process.exit(1);
        return;
      }

      const now = new Date().toISOString();
      const frontmatter: ConstraintFrontmatter = {
        id: idResult.value,
        title: opts.title ?? "Untitled Constraint",
        type: "constraint",
        severity,
        created: now,
        updated: now,
        system: opts.system,
        plans: [],
        tags: [],
      };

      const body = `## Description\n\n\n\n## Rationale\n\n`;

      const result = await writeConstraint(root, frontmatter, body);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      printSuccess(`Created ${idResult.value} [${severity}]: ${result.value}`);
    });

  cmd
    .command("update <id>")
    .description("Update a constraint's severity or title")
    .option("--title <title>", "New title")
    .option("--severity <severity>", "New severity: hard | soft")
    .option("--system <system>", "New system")
    .action(async (id: string, opts: { title?: string; severity?: string; system?: string }) => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      if (!opts.title && !opts.severity && !opts.system) {
        printError({ code: "INVALID_INPUT", message: "Provide at least --title, --severity, or --system" });
        process.exit(1);
        return;
      }

      const updates: Partial<ConstraintFrontmatter> = {};
      if (opts.title) updates.title = opts.title;
      if (opts.severity) updates.severity = opts.severity as ConstraintFrontmatter["severity"];
      if (opts.system) updates.system = opts.system;

      const result = await updateConstraint(root, id, updates);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      printSuccess(`Updated constraint: ${result.value}`);
    });

  cmd
    .command("show <id>")
    .description("Show full details of a constraint")
    .action(async (id: string) => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      const result = await readConstraint(root, id);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      const { frontmatter: fm, body } = result.value;
      const badge = fm.severity === "hard" ? chalk.red("[hard]") : chalk.yellow("[soft]");
      printHeader(`${fm.id}  ${fm.title}  ${badge}`);
      if (fm.system) console.log(`  ${chalk.dim("System:")}  ${fm.system}`);
      if (fm.tags.length) console.log(`  ${chalk.dim("Tags:")}    ${fm.tags.join(", ")}`);
      console.log(`  ${chalk.dim("Created:")} ${fm.created}`);
      console.log(`  ${chalk.dim("Updated:")} ${fm.updated}`);
      if (body.trim()) {
        console.log("");
        console.log(body.trim());
      }
    });

  cmd
    .command("list")
    .description("List all constraints")
    .option("--severity <severity>", "Filter by severity: hard | soft")
    .option("--system <system>", "Filter by system")
    .option("--tag <tag>", "Filter by tag")
    .action(async (opts: { severity?: string; system?: string; tag?: string }) => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      const result = await listConstraints(root);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      let constraints = result.value;
      if (opts.severity) constraints = constraints.filter((c) => c.frontmatter.severity === opts.severity);
      if (opts.system) constraints = constraints.filter((c) => c.frontmatter.system === opts.system);
      if (opts.tag) constraints = constraints.filter((c) => c.frontmatter.tags.includes(opts.tag!));

      if (constraints.length === 0) {
        printDim("No constraints found. Run 'intent constraint add' to record one.");
        return;
      }

      printHeader("Constraints");
      for (const con of constraints) {
        const fm = con.frontmatter;
        const badge = fm.severity === "hard" ? chalk.red("[hard]") : chalk.yellow("[soft]");
        console.log(`  ${fm.id}  ${fm.title}  ${badge}${fm.system ? chalk.dim(`  system:${fm.system}`) : ""}`);
      }
    });

  return cmd;
}
