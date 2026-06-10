import { Command } from "commander";
import { exportContext, watchExport, type ExportTarget } from "@dev-sixbyfive/intent-core";
import { printError, printSuccess, printDim } from "../output.js";
import { resolveRoot } from "../root.js";
import chalk from "chalk";

const TARGETS: Record<ExportTarget, string> = {
  claude:   "CLAUDE.md",
  cursor:   ".cursor/rules",
  copilot:  ".github/copilot-instructions.md",
  windsurf: ".windsurfrules",
  html:     "intent-context.html",
  json:     "intent-context.json",
};

function makeTargetCommand(target: ExportTarget): Command {
  const isHtmlOrJson = target === "html" || target === "json";
  const cmd = new Command(target);
  cmd
    .description(`Export intent context to ${TARGETS[target]}`)
    .option("--system <system>", "Filter to a specific system")
    .option("--watch", "Re-export automatically when .intent/ files change");

  if (target === "html" || target === "json") {
    cmd.description(`Export intent context to ${TARGETS[target]} (overwrites on each run)`);
  }

  cmd.action(async (opts: { system?: string; watch?: boolean }) => {
    const root = await resolveRoot();
    if (root === null) { process.exit(1); return; }

    if (opts.watch) {
      console.log(chalk.dim(`Watching .intent/ → ${TARGETS[target]}  (Ctrl+C to stop)\n`));

      await watchExport(
        root,
        target,
        { system: opts.system },
        (filePath) => {
          const time = new Date().toLocaleTimeString();
          process.stdout.write(`\r${chalk.green("✓")} ${chalk.dim(time)}  Exported → ${filePath}  `);
        },
        (err) => {
          console.error(`\n${chalk.red("✗")} Export error: ${err.message}`);
        },
      );

      // Keep the process alive until SIGINT
      await new Promise<void>((resolve) => process.once("SIGINT", resolve));
      console.log(chalk.dim("\nStopped watching."));
      return;
    }

    const result = await exportContext(root, target, { system: opts.system });
    if (!result.ok) {
      printError(result.error);
      process.exit(1);
      return;
    }

    printSuccess(`Exported intent context → ${result.value}`);
    if (!isHtmlOrJson) printDim("Re-run after changing .intent/ files to keep it up to date.");
  });

  return cmd;
}

export function makeExportCommand(): Command {
  const cmd = new Command("export");
  cmd.description("Export intent context to editor/tool config files");

  for (const target of Object.keys(TARGETS) as ExportTarget[]) {
    cmd.addCommand(makeTargetCommand(target));
  }

  return cmd;
}
