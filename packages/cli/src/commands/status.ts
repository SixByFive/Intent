import { Command } from "commander";
import { getStatus } from "@dev-sixbyfive/intent-core";
import { printError, printHeader, printDim, printSuccess, printWarning } from "../output.js";
import { resolveRoot } from "../root.js";
import chalk from "chalk";

export function makeStatusCommand(): Command {
  const cmd = new Command("status");
  cmd
    .description("Show a health overview of the .intent/ directory")
    .action(async () => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      const result = await getStatus(root);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      const s = result.value;

      console.log(`\nProject: ${chalk.bold(s.project)}`);
      console.log(
        `  ${chalk.cyan(s.counts.plans)} plan(s)   ` +
        `${chalk.cyan(s.counts.decisions)} decision(s)   ` +
        `${chalk.cyan(s.counts.systems)} system(s)`,
      );

      // Active plans
      if (s.plans.active.length > 0) {
        printHeader("Active plans");
        for (const p of s.plans.active) {
          const sys = p.system ? chalk.dim(`  [${p.system}]`) : "";
          console.log(`  ${chalk.green("●")} ${p.id}  ${p.title}${sys}`);
        }
      }

      // Draft plans
      if (s.plans.draft.length > 0) {
        printHeader("Draft plans");
        for (const p of s.plans.draft) {
          const sys = p.system ? chalk.dim(`  [${p.system}]`) : "";
          console.log(`  ${chalk.yellow("○")} ${p.id}  ${p.title}${sys}`);
        }
      }

      // Links index
      console.log("");
      if (s.linksIndex.exists && s.linksIndex.generated) {
        const age = Date.now() - new Date(s.linksIndex.generated).getTime();
        const ageStr = age < 60_000
          ? "just now"
          : age < 3_600_000
            ? `${Math.floor(age / 60_000)}m ago`
            : `${Math.floor(age / 3_600_000)}h ago`;
        printDim(`Links index: up to date (${ageStr})`);
      } else {
        printWarning("Links index missing — run 'intent link' to generate it");
      }

      // Validation summary
      if (s.validation.errors === 0 && s.validation.warnings === 0) {
        printSuccess("No validation issues");
      } else {
        if (s.validation.errors > 0) {
          console.log("");
          printHeader("Validation issues");
          for (const issue of s.validation.issues) {
            if (issue.severity === "error") {
              console.log(`  ${chalk.red("✗")} ${chalk.dim(issue.file)}`);
              console.log(`    ${issue.message}`);
            }
          }
          printError({ code: "VALIDATION_ERROR", message: `${s.validation.errors} error(s) — run 'intent validate' for details` });
        }
        if (s.validation.warnings > 0) {
          printWarning(`${s.validation.warnings} warning(s) — run 'intent validate' for details`);
        }
      }
    });

  return cmd;
}
