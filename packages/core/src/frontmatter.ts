import matter from "gray-matter";
import { z } from "zod";
import { type Result, ok, err, intentError } from "./result.js";

export interface ParsedFile<T> {
  frontmatter: T;
  body: string;
}

export function parseFrontmatter<Output, Input = unknown>(
  content: string,
  schema: z.ZodType<Output, z.ZodTypeDef, Input>,
  filePath: string,
): Result<ParsedFile<Output>> {
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(content);
  } catch (cause) {
    return err(intentError("PARSE_ERROR", `Failed to parse frontmatter in ${filePath}`, cause));
  }

  const result = schema.safeParse(parsed.data);
  if (!result.success) {
    const messages = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
    return err(intentError("VALIDATION_ERROR", `Invalid frontmatter in ${filePath}: ${messages}`));
  }

  return ok({ frontmatter: result.data as Output, body: parsed.content.trim() });
}

export function serializeFrontmatter<T extends Record<string, unknown>>(
  frontmatter: T,
  body: string,
): string {
  return matter.stringify(body, frontmatter);
}
