import { Command } from "commander";
import { searchIntent } from "@dev-sixbyfive/intent-core";
import { printError, printHeader, printDim } from "../output.js";
import { resolveRoot } from "../root.js";
import chalk from "chalk";

const TYPE_ICONS: Record<string, string> = {
  plan:       chalk.cyan("▸ plan"),
  decision:   chalk.blue("◆ decision"),
  system:     chalk.magenta("● system"),
  constraint: chalk.red("⊘ constraint"),
};

export function makeSearchCommand(): Command {
  const cmd = new Command("search");
  cmd
    .description("Full-text search across all intent files")
    .argument("<query>", "Search terms")
    .action(async (query: string) => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      const result = await searchIntent(root, query);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      const { matches } = result.value;

      if (matches.length === 0) {
        printDim(`No matches for "${query}"`);
        return;
      }

      printHeader(`Search results for "${query}"  (${matches.length})`);
      console.log("");

      for (const match of matches) {
        const icon = TYPE_ICONS[match.type] ?? match.type;
        console.log(`  ${icon}  ${chalk.bold(match.id)}  ${match.title}`);
        if (match.excerpt) {
          console.log(`    ${chalk.dim(match.excerpt.slice(0, 120))}`);
        }
        console.log("");
      }
    });

  return cmd;
}
