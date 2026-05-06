import { Command } from "commander";
import { writeDecision, listDecisions, nextDecisionId, type DecisionFrontmatter } from "@intent/core";
import { printError, printSuccess, printHeader, printDim } from "../output.js";
import { resolveRoot } from "../root.js";

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
    .command("list")
    .description("List all decisions")
    .action(async () => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      const result = await listDecisions(root);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      if (result.value.length === 0) {
        printDim("No decisions found. Run 'intent decision add' to record one.");
        return;
      }

      printHeader("Decisions");
      for (const dec of result.value) {
        const fm = dec.frontmatter;
        console.log(`  ${fm.id}  ${fm.title}  [${fm.status}]${fm.system ? `  system:${fm.system}` : ""}`);
      }
    });

  return cmd;
}
