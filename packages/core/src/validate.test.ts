import { describe, it, expect, afterEach } from "vitest";
import { validateIntent } from "./validate.js";
import { writePlan } from "./plans.js";
import { writeDecision } from "./decisions.js";
import { writeSystem } from "./systems.js";
import { type PlanFrontmatter, type DecisionFrontmatter, type SystemFrontmatter } from "@intent/schemas";
import { makeTempIntentRepo, cleanup } from "./test-helpers.js";

const dirs: string[] = [];
afterEach(async () => { for (const d of dirs.splice(0)) await cleanup(d); });

const NOW = new Date().toISOString();

function plan(id: string, overrides: Partial<PlanFrontmatter> = {}): PlanFrontmatter {
  return { id, title: "Plan", type: "plan", status: "active", created: NOW, updated: NOW, decisions: [], constraints: [], tags: [], ...overrides };
}

function decision(id: string, overrides: Partial<DecisionFrontmatter> = {}): DecisionFrontmatter {
  return { id, title: "Decision", type: "decision", status: "active", created: NOW, updated: NOW, plans: [], tags: [], ...overrides };
}

function system(id: string, overrides: Partial<SystemFrontmatter> = {}): SystemFrontmatter {
  return { id, title: "System", type: "system", created: NOW, updated: NOW, plans: [], decisions: [], tags: [], ...overrides };
}

describe("validateIntent", () => {
  it("returns valid with no issues on a clean repo", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    await writePlan(dir, plan("plan-foo"), "");
    await writeDecision(dir, decision("DEC-0001"), "");

    const result = await validateIntent(dir);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.valid).toBe(true);
    expect(result.value.issues).toHaveLength(0);
  });

  it("reports error for plan referencing unknown decision", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    await writePlan(dir, plan("plan-foo", { decisions: ["DEC-9999"] }), "");

    const result = await validateIntent(dir);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.valid).toBe(false);
    const errors = result.value.issues.filter((i) => i.severity === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain("DEC-9999");
  });

  it("reports error for decision referencing unknown plan", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    await writeDecision(dir, decision("DEC-0001", { plans: ["plan-missing"] }), "");

    const result = await validateIntent(dir);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const errors = result.value.issues.filter((i) => i.severity === "error");
    expect(errors.some((e) => e.message.includes("plan-missing"))).toBe(true);
  });

  it("reports error for system referencing unknown decision", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    await writeSystem(dir, system("sys-foo", { decisions: ["DEC-9999"] }), "");

    const result = await validateIntent(dir);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const errors = result.value.issues.filter((i) => i.severity === "error");
    expect(errors.some((e) => e.message.includes("DEC-9999"))).toBe(true);
  });

  it("warns on draft plans", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    await writePlan(dir, plan("plan-foo", { status: "draft" }), "");

    const result = await validateIntent(dir);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.valid).toBe(true); // warnings don't fail validation
    const warnings = result.value.issues.filter((i) => i.severity === "warning");
    expect(warnings.some((w) => w.message.includes("draft"))).toBe(true);
  });

  it("counts checked files correctly", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    await writePlan(dir, plan("plan-a"), "");
    await writePlan(dir, plan("plan-b"), "");
    await writeDecision(dir, decision("DEC-0001"), "");

    const result = await validateIntent(dir);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 1 config + 2 plans + 1 decision
    expect(result.value.counts.checked).toBe(4);
  });

  it("passes when all cross-references resolve", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    await writePlan(dir, plan("plan-foo", { decisions: ["DEC-0001"] }), "");
    await writeDecision(dir, decision("DEC-0001", { plans: ["plan-foo"] }), "");
    await writeSystem(dir, system("sys-bar", { plans: ["plan-foo"], decisions: ["DEC-0001"] }), "");

    const result = await validateIntent(dir);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const errors = result.value.issues.filter((i) => i.severity === "error");
    expect(errors).toHaveLength(0);
  });
});
