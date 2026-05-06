import { Command } from "commander";
import { exportContext, type ExportTarget } from "@intent/core";
import { printError, printSuccess, printDim } from "../output.js";
import { resolveRoot } from "../root.js";

const TARGETS: Record<ExportTarget, string> = {
  claude: "CLAUDE.md",
  cursor: ".cursor/rules",
  copilot: ".github/copilot-instructions.md",
};

function makeTargetCommand(target: ExportTarget): Command {
  const cmd = new Command(target);
  cmd
    .description(`Export intent context to ${TARGETS[target]}`)
    .option("--system <system>", "Filter to a specific system")
    .action(async (opts: { system?: string }) => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      const result = await exportContext(root, target, { system: opts.system });
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      printSuccess(`Exported intent context → ${result.value}`);
      printDim("Re-run after changing .intent/ files to keep it up to date.");
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
