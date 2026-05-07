import * as fs from "node:fs/promises";
import * as path from "node:path";
import { ConstraintFrontmatterSchema, type ConstraintFrontmatter, type ConstraintFile } from "@dev-sixbyfive/intent-schemas";
import { type Result, ok, err, intentError } from "./result.js";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.js";
import { constraintsDir, constraintPath } from "./paths.js";

export async function readConstraint(root: string, id: string): Promise<Result<ConstraintFile>> {
  const fp = constraintPath(root, id);
  let content: string;
  try {
    content = await fs.readFile(fp, "utf8");
  } catch (cause) {
    return err(intentError("FILE_NOT_FOUND", `Constraint '${id}' not found at ${fp}`, cause));
  }

  const parsed = parseFrontmatter(content, ConstraintFrontmatterSchema, fp);
  if (!parsed.ok) return parsed;

  return ok({ frontmatter: parsed.value.frontmatter, body: parsed.value.body, filePath: fp });
}

export async function listConstraints(root: string): Promise<Result<ConstraintFile[]>> {
  const dir = constraintsDir(root);
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return ok([]);
  }

  const constraints: ConstraintFile[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const id = entry.slice(0, -3);
    const result = await readConstraint(root, id);
    if (result.ok) constraints.push(result.value);
  }

  return ok(constraints);
}

export async function nextConstraintId(root: string): Promise<Result<string>> {
  const result = await listConstraints(root);
  if (!result.ok) return result;

  const ids = result.value
    .map((c) => parseInt(c.frontmatter.id.replace("CON-", ""), 10))
    .filter((n) => !isNaN(n));

  const next = ids.length === 0 ? 1 : Math.max(...ids) + 1;
  return ok(`CON-${String(next).padStart(4, "0")}`);
}

export async function writeConstraint(root: string, frontmatter: ConstraintFrontmatter, body: string): Promise<Result<string>> {
  const fp = constraintPath(root, frontmatter.id);
  const content = serializeFrontmatter(frontmatter as unknown as Record<string, unknown>, body);

  try {
    await fs.mkdir(path.dirname(fp), { recursive: true });
    await fs.writeFile(fp, content, "utf8");
    return ok(fp);
  } catch (cause) {
    return err(intentError("WRITE_ERROR", `Failed to write constraint to ${fp}`, cause));
  }
}

export async function updateConstraint(
  root: string,
  id: string,
  updates: Partial<Pick<ConstraintFrontmatter, "title" | "severity" | "system" | "tags">>,
): Promise<Result<string>> {
  const readResult = await readConstraint(root, id);
  if (!readResult.ok) return readResult;
  const updated: ConstraintFrontmatter = { ...readResult.value.frontmatter, ...updates, updated: new Date().toISOString() };
  return writeConstraint(root, updated, readResult.value.body);
}
