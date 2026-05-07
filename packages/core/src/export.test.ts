import { describe, it, expect, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { exportContext, formatContextBlock } from "./export.js";
import { writePlan } from "./plans.js";
import { writeDecision } from "./decisions.js";
import { type PlanFrontmatter, type DecisionFrontmatter } from "@intent/schemas";
import { loadContext } from "./context.js";
import { makeTempIntentRepo, cleanup } from "./test-helpers.js";

const dirs: string[] = [];

afterEach(async () => {
  for (const d of dirs.splice(0)) await cleanup(d);
});

const NOW = new Date().toISOString();

function plan(id: string): PlanFrontmatter {
  return { id, title: "Test Plan", type: "plan", status: "active", created: NOW, updated: NOW, decisions: [], constraints: [], tags: [] };
}

function decision(id: string): DecisionFrontmatter {
  return { id, title: "Test Decision", type: "decision", status: "active", created: NOW, updated: NOW, plans: [], tags: [] };
}

describe("formatContextBlock", () => {
  it("contains the marker comments", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    const ctxResult = await loadContext(dir);
    expect(ctxResult.ok).toBe(true);
    if (!ctxResult.ok) return;

    const block = formatContextBlock(ctxResult.value);
    expect(block).toContain("<!-- intent-context:start -->");
    expect(block).toContain("<!-- intent-context:end -->");
  });

  it("includes plan and decision titles", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    await writePlan(dir, { ...plan("plan-foo"), title: "Foo Plan" }, "body");
    await writeDecision(dir, { ...decision("DEC-0001"), title: "Use Redis" }, "body");

    const ctxResult = await loadContext(dir);
    expect(ctxResult.ok).toBe(true);
    if (!ctxResult.ok) return;

    const block = formatContextBlock(ctxResult.value);
    expect(block).toContain("Foo Plan");
    expect(block).toContain("Use Redis");
  });
});

describe("exportContext", () => {
  it("writes to CLAUDE.md for the claude target", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    const result = await exportContext(dir, "claude");
    expect(result.ok).toBe(true);

    const content = await fs.readFile(path.join(dir, "CLAUDE.md"), "utf8");
    expect(content).toContain("<!-- intent-context:start -->");
  });

  it("writes to .cursor/rules for the cursor target", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    const result = await exportContext(dir, "cursor");
    expect(result.ok).toBe(true);

    const content = await fs.readFile(path.join(dir, ".cursor", "rules"), "utf8");
    expect(content).toContain("<!-- intent-context:start -->");
  });

  it("writes to .github/copilot-instructions.md for the copilot target", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    const result = await exportContext(dir, "copilot");
    expect(result.ok).toBe(true);

    const content = await fs.readFile(path.join(dir, ".github", "copilot-instructions.md"), "utf8");
    expect(content).toContain("<!-- intent-context:start -->");
  });

  it("updates the block in-place on re-run (idempotent)", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    await exportContext(dir, "claude");
    await writePlan(dir, { ...plan("plan-new"), title: "New Plan" }, "body");
    await exportContext(dir, "claude");

    const content = await fs.readFile(path.join(dir, "CLAUDE.md"), "utf8");

    // only one copy of the markers
    const startCount = (content.match(/intent-context:start/g) ?? []).length;
    const endCount = (content.match(/intent-context:end/g) ?? []).length;
    expect(startCount).toBe(1);
    expect(endCount).toBe(1);
    expect(content).toContain("New Plan");
  });

  it("appends the block to an existing file without clobbering it", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    const claudeMd = path.join(dir, "CLAUDE.md");
    await fs.writeFile(claudeMd, "# My existing docs\n\nKeep this.\n", "utf8");

    await exportContext(dir, "claude");

    const content = await fs.readFile(claudeMd, "utf8");
    expect(content).toContain("Keep this.");
    expect(content).toContain("<!-- intent-context:start -->");
  });
});
