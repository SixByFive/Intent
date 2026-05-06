import { Command } from "commander";
import { reviewDiff } from "@intent/core";
import { printError, printHeader, printDim, printInfo } from "../output.js";
import { resolveRoot } from "../root.js";
import chalk from "chalk";

export function makeReviewDiffCommand(): Command {
  const cmd = new Command("review-diff");
  cmd
    .description("Show intent context relevant to the current git diff")
    .option("--all", "Include unstaged changes (default: staged only)")
    .option("--base <ref>", "Diff against a git ref (e.g. origin/main) instead of staged/unstaged")
    .action(async (opts: { all?: boolean; base?: string }) => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      const staged = !opts.all;
      const result = await reviewDiff(root, staged, opts.base);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      const { diff, context } = result.value;

      if (diff.files.length === 0) {
        printDim(staged ? "No staged changes. Use --all to include unstaged." : "No changes found.");
        return;
      }

      printHeader(`Changed files (${diff.files.length})`);
      for (const f of diff.files) {
        const sign = f.status === "deleted" ? chalk.red("-") : f.status === "added" ? chalk.green("+") : chalk.yellow("~");
        console.log(`  ${sign} ${f.path}`);
      }

      if (context.length === 0) {
        console.log("");
        printDim("No related intent context found for these changes.");
        printDim("Run 'intent link' to rebuild the index if you expect results.");
        return;
      }

      printHeader(`Related intent context (${context.length})`);
      for (const item of context) {
        const typeLabel = chalk.bold(`[${item.entry.type}]`);
        console.log(`\n  ${typeLabel} ${item.entry.id} — ${item.entry.title}`);
        if (item.frontmatterSummary) {
          printDim(`    ${item.frontmatterSummary}`);
        }
        if (item.body) {
          const lines = item.body.split("\n").slice(0, 8);
          for (const line of lines) {
            if (line.startsWith("#")) {
              console.log(chalk.bold(`    ${line}`));
            } else if (line.trim()) {
              console.log(`    ${line}`);
            }
          }
          if (item.body.split("\n").length > 8) {
            printDim(`    … (${item.entry.filePath})`);
          }
        }
      }

      console.log("");
      printInfo("Review this context before committing.");
    });

  return cmd;
}
