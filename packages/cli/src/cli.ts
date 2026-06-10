#!/usr/bin/env node
import { Command } from "commander";
import { makeInitCommand } from "./commands/init.js";
import { makePlanCommand } from "./commands/plan.js";
import { makeDecisionCommand } from "./commands/decision.js";
import { makeSystemCommand } from "./commands/system.js";
import { makeContextCommand } from "./commands/context.js";
import { makeReviewDiffCommand } from "./commands/reviewDiff.js";
import { makeLinkCommand } from "./commands/link.js";
import { makeExportCommand } from "./commands/export.js";
import { makeValidateCommand } from "./commands/validate.js";
import { makeStatusCommand } from "./commands/status.js";
import { makeAgentCommand } from "./commands/agent.js";
import { makeConstraintCommand } from "./commands/constraint.js";
import { makeSearchCommand } from "./commands/search.js";

const program = new Command();

program
  .name("intent")
  .description("Git-native reasoning layer — track the why behind code")
  .version("1.1.0");

program.addCommand(makeInitCommand());
program.addCommand(makePlanCommand());
program.addCommand(makeDecisionCommand());
program.addCommand(makeSystemCommand());
program.addCommand(makeContextCommand());
program.addCommand(makeReviewDiffCommand());
program.addCommand(makeLinkCommand());
program.addCommand(makeExportCommand());
program.addCommand(makeValidateCommand());
program.addCommand(makeStatusCommand());
program.addCommand(makeAgentCommand());
program.addCommand(makeConstraintCommand());
program.addCommand(makeSearchCommand());

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
