import { describe, it, expect, afterEach } from "vitest";
import { rebuildLinksIndex, readLinksIndex, findRelatedEntries } from "./links.js";
import { writePlan } from "./plans.js";
import { writeDecision } from "./decisions.js";
import { type PlanFrontmatter, type DecisionFrontmatter, type LinksIndex } from "@dev-sixbyfive/intent-schemas";
import { makeTempIntentRepo, cleanup } from "./test-helpers.js";

const dirs: string[] = [];

afterEach(async () => {
  for (const d of dirs.splice(0)) await cleanup(d);
});

const NOW = new Date().toISOString();

function plan(id: string, title = "Plan"): PlanFrontmatter {
  return { id, title, type: "plan", status: "active", created: NOW, updated: NOW, decisions: [], constraints: [], tags: [] };
}

function decision(id: string, title = "Decision"): DecisionFrontmatter {
  return { id, title, type: "decision", status: "active", created: NOW, updated: NOW, plans: [], tags: [] };
}

describe("rebuildLinksIndex", () => {
  it("returns an empty index when no files exist", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    const result = await rebuildLinksIndex(dir);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.entries).toEqual([]);
  });

  it("indexes all plans and decisions", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    await writePlan(dir, plan("plan-alpha"), "");
    await writePlan(dir, plan("plan-beta"), "");
    await writeDecision(dir, decision("DEC-0001"), "");

    const result = await rebuildLinksIndex(dir);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.entries).toHaveLength(3);
      const types = result.value.entries.map((e) => e.type).sort();
      expect(types).toEqual(["decision", "plan", "plan"]);
    }
  });

  it("writes the index to disk and readLinksIndex can read it back", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    await writePlan(dir, plan("plan-foo", "Foo Plan"), "");
    await rebuildLinksIndex(dir);

    const readResult = await readLinksIndex(dir);
    expect(readResult.ok).toBe(true);
    if (readResult.ok) {
      expect(readResult.value.entries[0]?.title).toBe("Foo Plan");
    }
  });

  it("sets generated timestamp", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    const before = Date.now();
    const result = await rebuildLinksIndex(dir);
    const after = Date.now();

    expect(result.ok).toBe(true);
    if (result.ok) {
      const ts = new Date(result.value.generated).getTime();
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    }
  });
});

describe("readLinksIndex", () => {
  it("returns FILE_NOT_FOUND when index does not exist", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    const result = await readLinksIndex(dir);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("FILE_NOT_FOUND");
  });
});

describe("findRelatedEntries", () => {
  const index: LinksIndex = {
    generated: NOW,
    entries: [
      { id: "plan-auth", type: "plan", title: "Auth Plan", filePath: ".intent/plans/auth.md", refs: ["DEC-0001"] },
      { id: "DEC-0001", type: "decision", title: "Use JWTs", filePath: ".intent/decisions/DEC-0001.md", refs: ["plan-auth"] },
      { id: "plan-billing", type: "plan", title: "Billing Plan", filePath: ".intent/plans/billing.md", refs: [] },
    ],
  };

  it("returns empty array when no paths match", () => {
    const result = findRelatedEntries(index, ["src/unrelated.ts"]);
    expect(result).toEqual([]);
  });

  it("finds entries whose filePath matches a changed path", () => {
    const result = findRelatedEntries(index, [".intent/plans/auth.md"]);
    expect(result.map((e) => e.id)).toContain("plan-auth");
  });

  it("does not return duplicate entries", () => {
    const result = findRelatedEntries(index, [
      ".intent/plans/auth.md",
      ".intent/plans/auth.md",
    ]);
    const ids = result.map((e) => e.id);
    expect(ids).toHaveLength(new Set(ids).size);
  });
});
