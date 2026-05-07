import { Command } from "commander";
import { loadContext } from "@dev-sixbyfive/intent-core";
import { printError, printHeader, printDim } from "../output.js";
import { resolveRoot } from "../root.js";

export function makeContextCommand(): Command {
  const cmd = new Command("context");
  cmd
    .description("Show intent context for the project (or a specific system)")
    .argument("[system]", "Filter to a specific system")
    .action(async (system?: string) => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      const result = await loadContext(root, system);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      const ctx = result.value;
      console.log(`\nProject: ${ctx.config.project}`);
      if (system) console.log(`System:  ${system}`);

      if (ctx.plans.length > 0) {
        printHeader("Plans");
        for (const plan of ctx.plans) {
          const fm = plan.frontmatter;
          console.log(`  ${fm.id}  ${fm.title}  [${fm.status}]`);
          if (plan.body) {
            const firstLine = plan.body.split("\n").find((l: string) => l.trim() && !l.startsWith("#"));
            if (firstLine) printDim(`    ${firstLine.trim()}`);
          }
        }
      }

      if (ctx.decisions.length > 0) {
        printHeader("Decisions");
        for (const dec of ctx.decisions) {
          const fm = dec.frontmatter;
          console.log(`  ${fm.id}  ${fm.title}  [${fm.status}]`);
        }
      }

      if (ctx.systems.length > 0) {
        printHeader("Systems");
        for (const sys of ctx.systems) {
          const fm = sys.frontmatter;
          console.log(`  ${fm.id}  ${fm.title}`);
        }
      }

      if (ctx.plans.length === 0 && ctx.decisions.length === 0 && ctx.systems.length === 0) {
        printDim("No intent context found. Run 'intent plan create <name>' to get started.");
      }
    });

  return cmd;
}
