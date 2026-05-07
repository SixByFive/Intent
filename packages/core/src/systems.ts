import * as fs from "node:fs/promises";
import * as path from "node:path";
import { SystemFrontmatterSchema, type SystemFrontmatter, type SystemFile } from "@dev-sixbyfive/intent-schemas";
import { type Result, ok, err, intentError } from "./result.js";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.js";
import { systemsDir, systemPath } from "./paths.js";

export async function readSystem(root: string, name: string): Promise<Result<SystemFile>> {
  const fp = systemPath(root, name);
  let content: string;
  try {
    content = await fs.readFile(fp, "utf8");
  } catch (cause) {
    return err(intentError("FILE_NOT_FOUND", `System '${name}' not found at ${fp}`, cause));
  }

  const parsed = parseFrontmatter(content, SystemFrontmatterSchema, fp);
  if (!parsed.ok) return parsed;

  return ok({ frontmatter: parsed.value.frontmatter, body: parsed.value.body, filePath: fp });
}

export async function listSystems(root: string): Promise<Result<SystemFile[]>> {
  const dir = systemsDir(root);
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return ok([]);
  }

  const systems: SystemFile[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const name = entry.slice(0, -3);
    const result = await readSystem(root, name);
    if (result.ok) systems.push(result.value);
  }

  return ok(systems);
}

export async function writeSystem(root: string, frontmatter: SystemFrontmatter, body: string): Promise<Result<string>> {
  const name = frontmatter.id.replace(/^sys-/, "");
  const fp = systemPath(root, name);
  const content = serializeFrontmatter(frontmatter as unknown as Record<string, unknown>, body);

  try {
    await fs.mkdir(path.dirname(fp), { recursive: true });
    await fs.writeFile(fp, content, "utf8");
    return ok(fp);
  } catch (cause) {
    return err(intentError("WRITE_ERROR", `Failed to write system to ${fp}`, cause));
  }
}
