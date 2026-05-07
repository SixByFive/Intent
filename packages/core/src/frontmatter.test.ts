import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.js";

const TestSchema = z.object({
  title: z.string(),
  count: z.number().default(0),
});

describe("parseFrontmatter", () => {
  it("parses valid frontmatter and body", () => {
    const content = `---\ntitle: Hello\n---\n\nBody text here.`;
    const result = parseFrontmatter(content, TestSchema, "test.md");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.frontmatter.title).toBe("Hello");
      expect(result.value.frontmatter.count).toBe(0);
      expect(result.value.body).toBe("Body text here.");
    }
  });

  it("returns VALIDATION_ERROR for invalid frontmatter", () => {
    const content = `---\ncount: 5\n---\n\nNo title here.`;
    const result = parseFrontmatter(content, TestSchema, "test.md");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns PARSE_ERROR for malformed YAML", () => {
    const content = `---\ntitle: {\n---`;
    const result = parseFrontmatter(content, TestSchema, "test.md");
    expect(result.ok).toBe(false);
  });

  it("trims leading and trailing whitespace from body", () => {
    const content = `---\ntitle: T\n---\n\n  \nBody\n  `;
    const result = parseFrontmatter(content, TestSchema, "test.md");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.body).toBe("Body");
  });

  it("handles empty body", () => {
    const content = `---\ntitle: T\n---\n`;
    const result = parseFrontmatter(content, TestSchema, "test.md");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.body).toBe("");
  });
});

describe("serializeFrontmatter", () => {
  it("round-trips through parseFrontmatter", () => {
    const frontmatter = { title: "Hello", count: 3 };
    const body = "Some body text.";
    const serialized = serializeFrontmatter(frontmatter, body);
    const parsed = parseFrontmatter(serialized, TestSchema, "test.md");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.frontmatter.title).toBe("Hello");
      expect(parsed.value.frontmatter.count).toBe(3);
      expect(parsed.value.body).toBe("Some body text.");
    }
  });
});
