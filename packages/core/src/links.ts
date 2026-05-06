import * as fs from "node:fs/promises";
import { LinksIndexSchema, type LinksIndex, type LinkEntry } from "@intent/schemas";
import { type Result, ok, err, intentError } from "./result.js";
import { linksDir, linksIndexPath } from "./paths.js";
import { listPlans } from "./plans.js";
import { listDecisions } from "./decisions.js";
import { listSystems } from "./systems.js";

export async function readLinksIndex(root: string): Promise<Result<LinksIndex>> {
  const fp = linksIndexPath(root);
  let raw: string;
  try {
    raw = await fs.readFile(fp, "utf8");
  } catch (cause) {
    return err(intentError("FILE_NOT_FOUND", `Links index not found. Run 'intent link' to generate.`, cause));
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (cause) {
    return err(intentError("PARSE_ERROR", "Failed to parse links index", cause));
  }

  const result = LinksIndexSchema.safeParse(json);
  if (!result.success) {
    return err(intentError("VALIDATION_ERROR", "Links index is malformed"));
  }

  return ok(result.data);
}

export async function rebuildLinksIndex(root: string): Promise<Result<LinksIndex>> {
  const [plans, decisions, systems] = await Promise.all([
    listPlans(root),
    listDecisions(root),
    listSystems(root),
  ]);

  const entries: LinkEntry[] = [];

  if (plans.ok) {
    for (const plan of plans.value) {
      entries.push({
        id: plan.frontmatter.id,
        type: "plan",
        title: plan.frontmatter.title,
        filePath: plan.filePath,
        refs: [...plan.frontmatter.decisions, ...plan.frontmatter.constraints],
      });
    }
  }

  if (decisions.ok) {
    for (const dec of decisions.value) {
      entries.push({
        id: dec.frontmatter.id,
        type: "decision",
        title: dec.frontmatter.title,
        filePath: dec.filePath,
        refs: [...dec.frontmatter.plans],
      });
    }
  }

  if (systems.ok) {
    for (const sys of systems.value) {
      entries.push({
        id: sys.frontmatter.id,
        type: "system",
        title: sys.frontmatter.title,
        filePath: sys.filePath,
        refs: [...sys.frontmatter.plans, ...sys.frontmatter.decisions],
      });
    }
  }

  const index: LinksIndex = {
    generated: new Date().toISOString(),
    entries,
  };

  try {
    await fs.mkdir(linksDir(root), { recursive: true });
    await fs.writeFile(linksIndexPath(root), JSON.stringify(index, null, 2) + "\n", "utf8");
  } catch (cause) {
    return err(intentError("WRITE_ERROR", "Failed to write links index", cause));
  }

  return ok(index);
}

export function findRelatedEntries(index: LinksIndex, changedPaths: string[]): LinkEntry[] {
  const related: LinkEntry[] = [];
  const seen = new Set<string>();

  for (const entry of index.entries) {
    if (seen.has(entry.id)) continue;

    const isDirectlyChanged = changedPaths.some(
      (p) => entry.filePath.endsWith(p) || p.endsWith(entry.filePath),
    );

    if (isDirectlyChanged) {
      related.push(entry);
      seen.add(entry.id);
      continue;
    }

    const isReferenced = changedPaths.some((p) =>
      entry.refs.some((ref) => p.includes(ref) || ref.includes(p)),
    );

    if (isReferenced) {
      related.push(entry);
      seen.add(entry.id);
    }
  }

  return related;
}
