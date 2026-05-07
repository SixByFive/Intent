import * as fs from "node:fs/promises";
import * as path from "node:path";
import { DecisionFrontmatterSchema, type DecisionFrontmatter, type DecisionFile } from "@dev-sixbyfive/intent-schemas";
import { type Result, ok, err, intentError } from "./result.js";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.js";
import { decisionsDir, decisionPath } from "./paths.js";

export async function readDecision(root: string, id: string): Promise<Result<DecisionFile>> {
  const fp = decisionPath(root, id);
  let content: string;
  try {
    content = await fs.readFile(fp, "utf8");
  } catch (cause) {
    return err(intentError("FILE_NOT_FOUND", `Decision '${id}' not found at ${fp}`, cause));
  }

  const parsed = parseFrontmatter(content, DecisionFrontmatterSchema, fp);
  if (!parsed.ok) return parsed;

  return ok({ frontmatter: parsed.value.frontmatter, body: parsed.value.body, filePath: fp });
}

export async function listDecisions(root: string): Promise<Result<DecisionFile[]>> {
  const dir = decisionsDir(root);
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return ok([]);
  }

  const decisions: DecisionFile[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const id = entry.slice(0, -3);
    const result = await readDecision(root, id);
    if (result.ok) decisions.push(result.value);
  }

  return ok(decisions);
}

export async function nextDecisionId(root: string): Promise<Result<string>> {
  const result = await listDecisions(root);
  if (!result.ok) return result;

  const ids = result.value
    .map((d) => parseInt(d.frontmatter.id.replace("DEC-", ""), 10))
    .filter((n) => !isNaN(n));

  const next = ids.length === 0 ? 1 : Math.max(...ids) + 1;
  return ok(`DEC-${String(next).padStart(4, "0")}`);
}

export async function updateDecision(
  root: string,
  id: string,
  updates: Partial<Pick<DecisionFrontmatter, "title" | "status" | "system" | "tags">>,
): Promise<Result<string>> {
  const readResult = await readDecision(root, id);
  if (!readResult.ok) return readResult;
  const updated: DecisionFrontmatter = { ...readResult.value.frontmatter, ...updates, updated: new Date().toISOString() };
  return writeDecision(root, updated, readResult.value.body);
}

export async function writeDecision(root: string, frontmatter: DecisionFrontmatter, body: string): Promise<Result<string>> {
  const fp = decisionPath(root, frontmatter.id);
  const content = serializeFrontmatter(frontmatter as unknown as Record<string, unknown>, body);

  try {
    await fs.mkdir(path.dirname(fp), { recursive: true });
    await fs.writeFile(fp, content, "utf8");
    return ok(fp);
  } catch (cause) {
    return err(intentError("WRITE_ERROR", `Failed to write decision to ${fp}`, cause));
  }
}
