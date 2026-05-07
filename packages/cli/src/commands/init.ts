import * as path from "node:path";
import { Command } from "commander";
import { initIntent, findGitRoot } from "@dev-sixbyfive/intent-core";
import { printError, printSuccess, printInfo } from "../output.js";

export function makeInitCommand(): Command {
  const cmd = new Command("init");
  cmd
    .description("Initialize a .intent/ directory in the current git repo")
    .option("--project <name>", "Project name (defaults to directory name)")
    .option("--force", "Reinitialize even if .intent/ already exists")
    .action(async (opts: { project?: string; force?: boolean }) => {
      const rootResult = await findGitRoot(process.cwd());
      if (!rootResult.ok) {
        printError(rootResult.error);
        process.exit(1);
      }
      const root = rootResult.value;
      const project = opts.project ?? path.basename(root);

      const result = await initIntent(root, { project, force: opts.force });
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
      }

      printSuccess(`Initialized .intent/ for project "${project}"`);
      printInfo(`Root: ${root}`);
      console.log("");
      console.log("  Next steps:");
      console.log("    intent plan create <name>   — document a plan");
      console.log("    intent decision add          — record a decision");
      console.log("    intent review-diff           — see relevant context before committing");
    });

  return cmd;
}
