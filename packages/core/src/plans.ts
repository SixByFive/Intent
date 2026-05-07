import * as fs from "node:fs/promises";
import * as path from "node:path";
import { PlanFrontmatterSchema, type PlanFrontmatter, type PlanFile } from "@intent/schemas";
import { type Result, ok, err, intentError } from "./result.js";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.js";
import { plansDir, planPath } from "./paths.js";

export async function readPlan(root: string, name: string): Promise<Result<PlanFile>> {
  const fp = planPath(root, name);
  let content: string;
  try {
    content = await fs.readFile(fp, "utf8");
  } catch (cause) {
    return err(intentError("FILE_NOT_FOUND", `Plan '${name}' not found at ${fp}`, cause));
  }

  const parsed = parseFrontmatter(content, PlanFrontmatterSchema, fp);
  if (!parsed.ok) return parsed;

  return ok({ frontmatter: parsed.value.frontmatter, body: parsed.value.body, filePath: fp });
}

export async function listPlans(root: string): Promise<Result<PlanFile[]>> {
  const dir = plansDir(root);
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return ok([]);
  }

  const plans: PlanFile[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const name = entry.slice(0, -3);
    const result = await readPlan(root, name);
    if (result.ok) plans.push(result.value);
  }

  return ok(plans);
}

export async function updatePlan(
  root: string,
  name: string,
  updates: Partial<Pick<PlanFrontmatter, "title" | "status" | "system" | "tags">>,
): Promise<Result<string>> {
  const readResult = await readPlan(root, name);
  if (!readResult.ok) return readResult;
  const updated: PlanFrontmatter = { ...readResult.value.frontmatter, ...updates, updated: new Date().toISOString() };
  return writePlan(root, updated, readResult.value.body);
}

export async function writePlan(root: string, frontmatter: PlanFrontmatter, body: string): Promise<Result<string>> {
  const name = frontmatter.id.replace(/^plan-/, "");
  const fp = planPath(root, name);
  const content = serializeFrontmatter(frontmatter as unknown as Record<string, unknown>, body);

  try {
    await fs.mkdir(path.dirname(fp), { recursive: true });
    await fs.writeFile(fp, content, "utf8");
    return ok(fp);
  } catch (cause) {
    return err(intentError("WRITE_ERROR", `Failed to write plan to ${fp}`, cause));
  }
}
