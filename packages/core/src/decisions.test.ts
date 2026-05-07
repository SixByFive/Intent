import { describe, it, expect, afterEach } from "vitest";
import { writeDecision, readDecision, listDecisions, nextDecisionId } from "./decisions.js";
import { type DecisionFrontmatter } from "@dev-sixbyfive/intent-schemas";
import { makeTempIntentRepo, cleanup } from "./test-helpers.js";

const dirs: string[] = [];

afterEach(async () => {
  for (const d of dirs.splice(0)) await cleanup(d);
});

function makeDecisionFm(overrides: Partial<DecisionFrontmatter> = {}): DecisionFrontmatter {
  const now = new Date().toISOString();
  return {
    id: "DEC-0001",
    title: "Use Postgres",
    type: "decision",
    status: "active",
    created: now,
    updated: now,
    plans: [],
    tags: [],
    ...overrides,
  };
}

describe("writeDecision / readDecision", () => {
  it("round-trips a decision file", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    const fm = makeDecisionFm({ id: "DEC-0001", title: "Use Postgres" });
    await writeDecision(dir, fm, "## Context\n\nWe needed a DB.");

    const result = await readDecision(dir, "DEC-0001");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.frontmatter.id).toBe("DEC-0001");
      expect(result.value.frontmatter.title).toBe("Use Postgres");
      expect(result.value.body).toContain("We needed a DB.");
    }
  });

  it("returns FILE_NOT_FOUND for missing decision", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    const result = await readDecision(dir, "DEC-9999");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("FILE_NOT_FOUND");
  });
});

describe("nextDecisionId", () => {
  it("returns DEC-0001 when no decisions exist", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    const result = await nextDecisionId(dir);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("DEC-0001");
  });

  it("increments from the highest existing id", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    await writeDecision(dir, makeDecisionFm({ id: "DEC-0001" }), "");
    await writeDecision(dir, makeDecisionFm({ id: "DEC-0003" }), "");

    const result = await nextDecisionId(dir);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("DEC-0004");
  });

  it("zero-pads to 4 digits", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    await writeDecision(dir, makeDecisionFm({ id: "DEC-0001" }), "");
    const result = await nextDecisionId(dir);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toMatch(/^DEC-\d{4}$/);
  });
});

describe("listDecisions", () => {
  it("returns empty array when no decisions exist", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    const result = await listDecisions(dir);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual([]);
  });

  it("returns all written decisions", async () => {
    const dir = await makeTempIntentRepo();
    dirs.push(dir);

    await writeDecision(dir, makeDecisionFm({ id: "DEC-0001" }), "");
    await writeDecision(dir, makeDecisionFm({ id: "DEC-0002", title: "Use Redis" }), "");

    const result = await listDecisions(dir);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toHaveLength(2);
  });
});
