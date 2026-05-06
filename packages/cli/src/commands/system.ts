import { Command } from "commander";
import { writeSystem, listSystems, type SystemFrontmatter } from "@intent/core";
import { printError, printSuccess, printHeader, printDim } from "../output.js";
import { resolveRoot } from "../root.js";

export function makeSystemCommand(): Command {
  const cmd = new Command("system");
  cmd.description("Manage system definitions");

  cmd
    .command("create <name>")
    .description("Create a new system definition")
    .option("--title <title>", "System title")
    .action(async (name: string, opts: { title?: string }) => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      const id = `sys-${name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;
      const now = new Date().toISOString();

      const frontmatter: SystemFrontmatter = {
        id,
        title: opts.title ?? name,
        type: "system",
        created: now,
        updated: now,
        plans: [],
        decisions: [],
        tags: [],
      };

      const body = `## Overview\n\n\n\n## Boundaries\n\n\n\n## Key Decisions\n\n`;

      const result = await writeSystem(root, frontmatter, body);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      printSuccess(`Created system: ${result.value}`);
    });

  cmd
    .command("list")
    .description("List all systems")
    .action(async () => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      const result = await listSystems(root);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      if (result.value.length === 0) {
        printDim("No systems found. Run 'intent system create <name>' to create one.");
        return;
      }

      printHeader("Systems");
      for (const sys of result.value) {
        const fm = sys.frontmatter;
        console.log(`  ${fm.id}  ${fm.title}`);
      }
    });

  return cmd;
}
