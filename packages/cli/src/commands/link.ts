import { Command } from "commander";
import { rebuildLinksIndex } from "@intent/core";
import { printError, printSuccess } from "../output.js";
import { resolveRoot } from "../root.js";

export function makeLinkCommand(): Command {
  const cmd = new Command("link");
  cmd
    .description("Rebuild the .intent/links/index.json index")
    .action(async () => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      const result = await rebuildLinksIndex(root);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      printSuccess(`Links index rebuilt — ${result.value.entries.length} entries`);
    });

  return cmd;
}
