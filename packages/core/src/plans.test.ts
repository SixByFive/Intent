import { describe, it, expect, afterEach } from "vitest";
import { writePlan, readPlan, listPlans } from "./plans.js";
import { type PlanFrontmatter } from "@dev-sixbyfive/intent-schemas";
import { makeTempIntentRepo, cleanup } from "./test-helpers.js";

const dirs: string[] = [];

afterEach(async () => {
  for (const d of dirs.splice(0)) await cleanup(d);
});

function makePlanFm(overrides: Partial<PlanFrontmatter> = {}): PlanFrontmatter {
  const now = new Date().toISOString();
  return {
    id: "plan-test",
    title: "Test Plan",
    type: "plan",
    status: "active",
    created: now,
    updated: now,
    decisions: [],
    constraints: [],
    tags: [],
    ...overrides,
  };
}

describe("writePlan / readPlan", () => {
  it("round-trips a plan file", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    const fm = makePlanFm({ id: "plan-subscriptions", title: "Subscription Tiers" });
    const writeResult = await writePlan(dir, fm, "## Goal\n\nAdd tiers.");
    expect(writeResult.ok).toBe(true);

    const readResult = await readPlan(dir, "subscriptions");
    expect(readResult.ok).toBe(true);
    if (readResult.ok) {
      expect(readResult.value.frontmatter.id).toBe("plan-subscriptions");
      expect(readResult.value.frontmatter.title).toBe("Subscription Tiers");
      expect(readResult.value.body).toContain("Add tiers.");
    }
  });

  it("returns FILE_NOT_FOUND for missing plan", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    const result = await readPlan(dir, "nonexistent");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("FILE_NOT_FOUND");
  });

  it("preserves optional fields", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    const fm = makePlanFm({ system: "marketplace", tags: ["billing"], decisions: ["DEC-0001"] });
    await writePlan(dir, fm, "body");

    const result = await readPlan(dir, "test");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.frontmatter.system).toBe("marketplace");
      expect(result.value.frontmatter.tags).toEqual(["billing"]);
      expect(result.value.frontmatter.decisions).toEqual(["DEC-0001"]);
    }
  });
});

describe("listPlans", () => {
  it("returns empty array when no plans exist", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    const result = await listPlans(dir);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual([]);
  });

  it("returns all written plans", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    await writePlan(dir, makePlanFm({ id: "plan-alpha" }), "alpha");
    await writePlan(dir, makePlanFm({ id: "plan-beta" }), "beta");

    const result = await listPlans(dir);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
      const ids = result.value.map((p) => p.frontmatter.id).sort();
      expect(ids).toEqual(["plan-alpha", "plan-beta"]);
    }
  });
});
