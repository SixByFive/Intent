import { describe, it, expect } from "vitest";
import {
  PlanFrontmatterSchema,
  DecisionFrontmatterSchema,
  SystemFrontmatterSchema,
  ConstraintFrontmatterSchema,
  IntentConfigSchema,
  LinksIndexSchema,
} from "./index.js";

const NOW = "2024-01-01T00:00:00Z";

describe("PlanFrontmatterSchema", () => {
  const valid = {
    id: "plan-auth-rewrite",
    title: "Auth rewrite",
    type: "plan",
    status: "active",
    created: NOW,
    updated: NOW,
    decisions: [],
    constraints: [],
    tags: [],
  };

  it("accepts a valid plan", () => {
    expect(PlanFrontmatterSchema.safeParse(valid).success).toBe(true);
  });

  it("fills default arrays when omitted", () => {
    const result = PlanFrontmatterSchema.safeParse({ ...valid, decisions: undefined, tags: undefined, constraints: undefined });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
      expect(result.data.decisions).toEqual([]);
      expect(result.data.constraints).toEqual([]);
    }
  });

  it("accepts optional system field", () => {
    const result = PlanFrontmatterSchema.safeParse({ ...valid, system: "marketplace" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.system).toBe("marketplace");
  });

  it("rejects invalid id format", () => {
    expect(PlanFrontmatterSchema.safeParse({ ...valid, id: "auth-rewrite" }).success).toBe(false);
    expect(PlanFrontmatterSchema.safeParse({ ...valid, id: "plan-Auth-Rewrite" }).success).toBe(false);
    expect(PlanFrontmatterSchema.safeParse({ ...valid, id: "plan-" }).success).toBe(false);
  });

  it("rejects invalid status", () => {
    expect(PlanFrontmatterSchema.safeParse({ ...valid, status: "pending" }).success).toBe(false);
  });

  it("rejects missing required fields", () => {
    expect(PlanFrontmatterSchema.safeParse({ ...valid, title: undefined }).success).toBe(false);
    expect(PlanFrontmatterSchema.safeParse({ ...valid, type: undefined }).success).toBe(false);
  });

  it("rejects wrong type literal", () => {
    expect(PlanFrontmatterSchema.safeParse({ ...valid, type: "decision" }).success).toBe(false);
  });
});

describe("DecisionFrontmatterSchema", () => {
  const valid = {
    id: "DEC-0001",
    title: "Use Postgres",
    type: "decision",
    status: "active",
    created: NOW,
    updated: NOW,
    plans: [],
    tags: [],
  };

  it("accepts a valid decision", () => {
    expect(DecisionFrontmatterSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts DEC-NNNN format variants", () => {
    expect(DecisionFrontmatterSchema.safeParse({ ...valid, id: "DEC-0042" }).success).toBe(true);
    expect(DecisionFrontmatterSchema.safeParse({ ...valid, id: "DEC-9999" }).success).toBe(true);
  });

  it("rejects invalid DEC id format", () => {
    expect(DecisionFrontmatterSchema.safeParse({ ...valid, id: "DEC-1" }).success).toBe(false);
    expect(DecisionFrontmatterSchema.safeParse({ ...valid, id: "dec-0001" }).success).toBe(false);
    expect(DecisionFrontmatterSchema.safeParse({ ...valid, id: "0001" }).success).toBe(false);
  });

  it("accepts optional supersedes field", () => {
    const result = DecisionFrontmatterSchema.safeParse({ ...valid, supersedes: "DEC-0000" });
    expect(result.success).toBe(true);
  });
});

describe("SystemFrontmatterSchema", () => {
  const valid = {
    id: "sys-marketplace",
    title: "Marketplace",
    type: "system",
    created: NOW,
    updated: NOW,
    plans: [],
    decisions: [],
    tags: [],
  };

  it("accepts a valid system", () => {
    expect(SystemFrontmatterSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid sys id format", () => {
    expect(SystemFrontmatterSchema.safeParse({ ...valid, id: "marketplace" }).success).toBe(false);
    expect(SystemFrontmatterSchema.safeParse({ ...valid, id: "sys-Market-Place" }).success).toBe(false);
  });
});

describe("ConstraintFrontmatterSchema", () => {
  const valid = {
    id: "CON-0001",
    title: "Max 5 listings for free users",
    type: "constraint",
    severity: "hard",
    created: NOW,
    updated: NOW,
    plans: [],
    tags: [],
  };

  it("accepts a valid constraint", () => {
    expect(ConstraintFrontmatterSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts soft severity", () => {
    expect(ConstraintFrontmatterSchema.safeParse({ ...valid, severity: "soft" }).success).toBe(true);
  });

  it("rejects invalid CON id format", () => {
    expect(ConstraintFrontmatterSchema.safeParse({ ...valid, id: "CON-1" }).success).toBe(false);
    expect(ConstraintFrontmatterSchema.safeParse({ ...valid, id: "con-0001" }).success).toBe(false);
  });

  it("rejects invalid severity", () => {
    expect(ConstraintFrontmatterSchema.safeParse({ ...valid, severity: "medium" }).success).toBe(false);
  });
});

describe("IntentConfigSchema", () => {
  const valid = {
    version: "1",
    project: "my-app",
    systems: [],
    created: NOW,
  };

  it("accepts a valid config", () => {
    expect(IntentConfigSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects wrong version", () => {
    expect(IntentConfigSchema.safeParse({ ...valid, version: "2" }).success).toBe(false);
    expect(IntentConfigSchema.safeParse({ ...valid, version: 1 }).success).toBe(false);
  });

  it("rejects empty project name", () => {
    expect(IntentConfigSchema.safeParse({ ...valid, project: "" }).success).toBe(false);
  });
});

describe("LinksIndexSchema", () => {
  const valid = {
    generated: NOW,
    entries: [
      { id: "plan-foo", type: "plan", title: "Foo", filePath: ".intent/plans/foo.md", refs: [] },
    ],
  };

  it("accepts a valid links index", () => {
    expect(LinksIndexSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts all entry types", () => {
    for (const type of ["plan", "decision", "system", "constraint"]) {
      const result = LinksIndexSchema.safeParse({
        ...valid,
        entries: [{ ...valid.entries[0], type }],
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects unknown entry types", () => {
    const result = LinksIndexSchema.safeParse({
      ...valid,
      entries: [{ ...valid.entries[0], type: "unknown" }],
    });
    expect(result.success).toBe(false);
  });
});
