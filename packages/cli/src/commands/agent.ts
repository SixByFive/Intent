import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Command } from "commander";
import {
  prepareAgentContext,
  reviewAgent,
  nextDecisionId,
  writeDecision,
  type DecisionFrontmatter,
} from "@dev-sixbyfive/intent-core";
import { printError, printSuccess, printWarning, printHeader, printDim } from "../output.js";
import { resolveRoot } from "../root.js";
import chalk from "chalk";

// ─── agent prepare ────────────────────────────────────────────────────────────

function makePrepareCommand(): Command {
  const cmd = new Command("prepare");
  cmd
    .description("Get intent context relevant to a task. Falls back to full context if no task given.")
    .argument("[task]", "Natural-language description of what you are about to work on")
    .option("--hook", "Machine-readable output: emit JSON then exit (for use in hooks)")
    .action(async (task: string | undefined, opts: { hook?: boolean }) => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      const result = await prepareAgentContext(root, task ?? null);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      const r = result.value;

      if (opts.hook) {
        // Emit JSON for programmatic consumption (Claude Code hooks etc.)
        process.stdout.write(JSON.stringify({
          task: r.task,
          plans: r.plans.map((p) => ({ id: p.frontmatter.id, title: p.frontmatter.title, status: p.frontmatter.status })),
          decisions: r.decisions.map((d) => ({ id: d.frontmatter.id, title: d.frontmatter.title })),
          systems: r.systems.map((s) => ({ id: s.frontmatter.id, title: s.frontmatter.title })),
          formatted: r.formatted,
        }, null, 2));
        return;
      }

      // Human output
      const taskLabel = r.task ? chalk.bold(`"${r.task}"`) : chalk.dim("(all context)");
      printHeader(`Intent context for ${taskLabel}`);

      if (r.plans.length === 0 && r.decisions.length === 0 && r.systems.length === 0) {
        printDim("No intent files found. Run 'intent init' to get started.");
        return;
      }

      if (r.plans.length > 0) {
        console.log(`\n  ${chalk.cyan("Plans")} (${r.plans.length})`);
        for (const p of r.plans) {
          const statusColor = p.frontmatter.status === "active" ? chalk.green : chalk.yellow;
          console.log(`    ${statusColor("●")} ${chalk.bold(p.frontmatter.id)}  ${p.frontmatter.title}`);
        }
      }

      if (r.decisions.length > 0) {
        console.log(`\n  ${chalk.cyan("Decisions")} (${r.decisions.length})`);
        for (const d of r.decisions) {
          console.log(`    ${chalk.blue("◆")} ${chalk.bold(d.frontmatter.id)}  ${d.frontmatter.title}`);
        }
      }

      if (r.systems.length > 0) {
        console.log(`\n  ${chalk.cyan("Systems")} (${r.systems.length})`);
        for (const s of r.systems) {
          console.log(`    ${chalk.magenta("▸")} ${chalk.bold(s.frontmatter.id)}  ${s.frontmatter.title}`);
        }
      }

      console.log(`\n${r.formatted}`);
    });

  return cmd;
}

// ─── agent review ─────────────────────────────────────────────────────────────

function makeReviewCommand(): Command {
  const cmd = new Command("review");
  cmd
    .description("Review diff against intent and optionally scaffold missing decisions")
    .option("--base <ref>", "Diff against a git ref instead of staged changes")
    .option("--unstaged", "Review unstaged changes instead of staged")
    .option("--hook", "Machine-readable output: emit JSON then exit, no interactive prompts")
    .action(async (opts: { base?: string; unstaged?: boolean; hook?: boolean }) => {
      const root = await resolveRoot();
      if (root === null) { process.exit(1); return; }

      const staged = !opts.unstaged;
      const result = await reviewAgent(root, staged, opts.base);
      if (!result.ok) {
        printError(result.error);
        process.exit(1);
        return;
      }

      const r = result.value;

      // ── Hook mode ──────────────────────────────────────────────────────────
      if (opts.hook) {
        process.stdout.write(JSON.stringify({
          valid: r.validation.valid,
          counts: r.validation.counts,
          checklist: r.checklist,
          suggestDecision: r.suggestDecision,
        }, null, 2));
        process.exit(r.validation.valid ? 0 : 1);
        return;
      }

      // ── Human output ───────────────────────────────────────────────────────
      printHeader("Agent review");

      // Diff section
      const diffItems = r.checklist.filter((c) => c.category === "diff");
      if (diffItems.length > 0) {
        console.log(`\n  ${chalk.cyan("Diff coverage")}`);
        for (const item of diffItems) {
          const icon = item.status === "ok" ? chalk.green("✓") : chalk.yellow("⚠");
          console.log(`    ${icon} ${item.message}`);
        }
      }

      // Validation section
      const valItems = r.checklist.filter((c) => c.category === "validation");
      if (valItems.length > 0) {
        console.log(`\n  ${chalk.cyan("Validation")}`);
        for (const item of valItems) {
          const icon =
            item.status === "ok" ? chalk.green("✓") :
            item.status === "error" ? chalk.red("✗") :
            chalk.yellow("⚠");
          const fileHint = item.file ? chalk.dim(`  ${item.file}`) : "";
          console.log(`    ${icon} ${item.message}${fileHint}`);
        }
      }

      // Summary line
      const errors = r.checklist.filter((c) => c.status === "error").length;
      const warnings = r.checklist.filter((c) => c.status === "warning").length;
      console.log("");
      if (errors === 0 && warnings === 0) {
        printSuccess("All checks passed");
      } else if (errors > 0) {
        printError({ code: "VALIDATION_ERROR", message: `${errors} error(s), ${warnings} warning(s)` });
      } else {
        printWarning(`${warnings} warning(s)`);
      }

      // ── Phase 2: interactive decision scaffold ─────────────────────────────
      if (r.suggestDecision) {
        console.log("");
        const rl = readline.createInterface({ input, output });
        try {
          const answer = await rl.question(
            chalk.cyan("  Did you make architectural decisions not captured above?") + " [y/N] ",
          );

          if (answer.trim().toLowerCase() === "y") {
            await scaffoldDecision(root, rl);
          }
        } finally {
          rl.close();
        }
      }

      process.exit(r.validation.valid ? 0 : 1);
    });

  return cmd;
}

// ─── Decision scaffolding ────────────────────────────────────────────────────

async function scaffoldDecision(
  root: string,
  rl: readline.Interface,
): Promise<void> {
  console.log(chalk.dim("\n  Answer a few questions to scaffold a new decision record.\n"));

  const title = (await rl.question("  Title (short, imperative): ")).trim();
  if (!title) {
    printWarning("Skipped — no title provided.");
    return;
  }

  const context = (await rl.question("  Context (what was the situation?): ")).trim();
  const decision = (await rl.question("  Decision (what did you decide?): ")).trim();
  const consequences = (await rl.question("  Consequences (tradeoffs, follow-ups): ")).trim();

  const idResult = await nextDecisionId(root);
  if (!idResult.ok) {
    printError(idResult.error);
    return;
  }

  const now = new Date().toISOString();
  const frontmatter: DecisionFrontmatter = {
    id: idResult.value,
    title,
    type: "decision",
    status: "draft",
    created: now,
    updated: now,
    plans: [],
    tags: [],
  };

  const body = [
    "## Context\n",
    context || "_TODO: describe the situation that prompted this decision._",
    "\n## Decision\n",
    decision || "_TODO: state what was decided._",
    "\n## Consequences\n",
    consequences || "_TODO: describe tradeoffs and follow-up actions._",
  ].join("\n");

  const writeResult = await writeDecision(root, frontmatter, body);
  if (!writeResult.ok) {
    printError(writeResult.error);
    return;
  }

  printSuccess(`Created ${idResult.value} (draft) — edit ${writeResult.value} to finalise`);
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function makeAgentCommand(): Command {
  const cmd = new Command("agent");
  cmd.description("AI agent workflow helpers (prepare context, review diff, scaffold decisions)");
  cmd.addCommand(makePrepareCommand());
  cmd.addCommand(makeReviewCommand());
  return cmd;
}
