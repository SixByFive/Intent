import { type Result, ok } from "./result.js";
import { loadContext } from "./context.js";

export type SearchMatchType = "plan" | "decision" | "system" | "constraint";

export interface SearchMatch {
  type: SearchMatchType;
  id: string;
  title: string;
  excerpt: string;
  score: number;
}

export interface SearchResult {
  query: string;
  matches: SearchMatch[];
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let pos = 0;
  while ((pos = haystack.indexOf(needle, pos)) !== -1) {
    count++;
    pos += needle.length;
  }
  return count;
}

function scoreText(text: string, terms: string[]): number {
  const lower = text.toLowerCase();
  return terms.reduce((n, t) => n + countOccurrences(lower, t), 0);
}

function extractExcerpt(body: string, terms: string[], contextLines = 2): string {
  const lines = body.split("\n");
  const lowerTerms = terms.map((t) => t.toLowerCase());
  const matchIdx = lines.findIndex((l) =>
    lowerTerms.some((t) => l.toLowerCase().includes(t)),
  );
  if (matchIdx === -1) return lines.slice(0, contextLines).filter((l) => l.trim()).join(" ").trim();
  const start = Math.max(0, matchIdx - contextLines);
  const end = Math.min(lines.length, matchIdx + contextLines + 1);
  return lines
    .slice(start, end)
    .filter((l) => l.trim())
    .join(" ")
    .replace(/^#+\s+/, "")
    .trim();
}

export async function searchIntent(root: string, query: string): Promise<Result<SearchResult>> {
  const ctxResult = await loadContext(root);
  if (!ctxResult.ok) return ctxResult;

  const ctx = ctxResult.value;
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  if (terms.length === 0) return ok({ query, matches: [] });

  const matches: SearchMatch[] = [];

  for (const plan of ctx.plans) {
    const fm = plan.frontmatter;
    const score =
      scoreText(fm.title, terms) * 3 +
      scoreText(fm.tags.join(" "), terms) * 2 +
      scoreText(plan.body, terms);
    if (score > 0) {
      matches.push({
        type: "plan",
        id: fm.id,
        title: fm.title,
        excerpt: extractExcerpt(plan.body, terms),
        score,
      });
    }
  }

  for (const dec of ctx.decisions) {
    const fm = dec.frontmatter;
    const score =
      scoreText(fm.title, terms) * 3 +
      scoreText(fm.tags.join(" "), terms) * 2 +
      scoreText(dec.body, terms);
    if (score > 0) {
      matches.push({
        type: "decision",
        id: fm.id,
        title: fm.title,
        excerpt: extractExcerpt(dec.body, terms),
        score,
      });
    }
  }

  for (const sys of ctx.systems) {
    const fm = sys.frontmatter;
    const score =
      scoreText(fm.title, terms) * 3 +
      scoreText(fm.tags.join(" "), terms) * 2 +
      scoreText(sys.body, terms);
    if (score > 0) {
      matches.push({
        type: "system",
        id: fm.id,
        title: fm.title,
        excerpt: extractExcerpt(sys.body, terms),
        score,
      });
    }
  }

  for (const con of ctx.constraints) {
    const fm = con.frontmatter;
    const score =
      scoreText(fm.title, terms) * 3 +
      scoreText(fm.tags.join(" "), terms) * 2 +
      scoreText(con.body, terms);
    if (score > 0) {
      matches.push({
        type: "constraint",
        id: fm.id,
        title: fm.title,
        excerpt: extractExcerpt(con.body, terms),
        score,
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return ok({ query, matches });
}
