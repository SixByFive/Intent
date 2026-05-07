import { Command } from "commander";
import { validateIntent } from "@dev-sixbyfive/intent-core";
import { printError, printSuccess, printWarning, printHeader, printDim } from "../output.js";
import { resolveRoot } from "../root.js";
import chalk from "chalk";

export function makeValidateCommand(): Command {
  const cmd = new Command("validate");
  cmd
    .description("Validate all .intent/ files and check referential integrity")
    .option("--errors-only", "Only show errors, suppress warnings")
    .action(async (opts: { errorsOnly?: boolean }) => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      const result = await validateIntent(root);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      const { valid, issues, counts } = result.value;
      const visible = opts.errorsOnly ? issues.filter((i) => i.severity === "error") : issues;

      if (visible.length === 0) {
        printSuccess(
          `All ${counts.checked} files valid` +
          (counts.warnings > 0 && opts.errorsOnly ? ` (${counts.warnings} warnings suppressed)` : ""),
        );
        process.exit(0);
        return;
      }

      printHeader(`Validation (${counts.checked} files checked)`);

      // Group issues by file
      const byFile = new Map<string, typeof issues>();
      for (const issue of visible) {
        const existing = byFile.get(issue.file) ?? [];
        existing.push(issue);
        byFile.set(issue.file, existing);
      }

      for (const [file, fileIssues] of byFile) {
        console.log(`\n  ${chalk.bold(file)}`);
        for (const issue of fileIssues) {
          if (issue.severity === "error") {
            console.log(`    ${chalk.red("✗")} ${issue.message}`);
          } else {
            console.log(`    ${chalk.yellow("⚠")} ${issue.message}`);
          }
        }
      }

      console.log("");
      if (counts.errors > 0) {
        printError({ code: "VALIDATION_ERROR", message: `${counts.errors} error(s), ${counts.warnings} warning(s)` });
      } else {
        printWarning(`${counts.warnings} warning(s) found`);
      }

      process.exit(valid ? 0 : 1);
    });

  return cmd;
}
