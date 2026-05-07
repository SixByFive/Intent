import { Command } from "commander";
import { writeConstraint, listConstraints, nextConstraintId, type ConstraintFrontmatter } from "@dev-sixbyfive/intent-core";
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
    .command("list")
    .description("List all constraints")
    .action(async () => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      const result = await listConstraints(root);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      if (result.value.length === 0) {
        printDim("No constraints found. Run 'intent constraint add' to record one.");
        return;
      }

      printHeader("Constraints");
      for (const con of result.value) {
        const fm = con.frontmatter;
        const badge = fm.severity === "hard" ? chalk.red("[hard]") : chalk.yellow("[soft]");
        console.log(`  ${fm.id}  ${fm.title}  ${badge}${fm.system ? chalk.dim(`  system:${fm.system}`) : ""}`);
      }
    });

  return cmd;
}
