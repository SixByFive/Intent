import { simpleGit, type SimpleGit } from "simple-git";
import { type Result, ok, err, intentError } from "./result.js";

export interface DiffSummary {
  files: DiffFile[];
  raw: string;
}

export interface DiffFile {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed";
  additions: number;
  deletions: number;
}

export async function findGitRoot(cwd: string): Promise<Result<string>> {
  const git: SimpleGit = simpleGit(cwd);
  try {
    const root = await git.revparse(["--show-toplevel"]);
    return ok(root.trim());
  } catch (cause) {
    return err(intentError("GIT_ERROR", "Not inside a git repository", cause));
  }
}

export async function getStagedDiff(root: string): Promise<Result<DiffSummary>> {
  const git: SimpleGit = simpleGit(root);
  try {
    const raw = await git.diff(["--cached"]);
    const summary = await git.diffSummary(["--cached"]);

    const files: DiffFile[] = summary.files.map((f) => ({
      path: f.file,
      status: inferStatus(f),
      additions: "insertions" in f ? f.insertions : 0,
      deletions: "deletions" in f ? f.deletions : 0,
    }));

    return ok({ files, raw });
  } catch (cause) {
    return err(intentError("GIT_ERROR", "Failed to get staged diff", cause));
  }
}

export async function getUnstagedDiff(root: string): Promise<Result<DiffSummary>> {
  const git: SimpleGit = simpleGit(root);
  try {
    const raw = await git.diff([]);
    const summary = await git.diffSummary([]);

    const files: DiffFile[] = summary.files.map((f) => ({
      path: f.file,
      status: inferStatus(f),
      additions: "insertions" in f ? f.insertions : 0,
      deletions: "deletions" in f ? f.deletions : 0,
    }));

    return ok({ files, raw });
  } catch (cause) {
    return err(intentError("GIT_ERROR", "Failed to get unstaged diff", cause));
  }
}

export async function getHeadDiff(root: string): Promise<Result<DiffSummary>> {
  const git: SimpleGit = simpleGit(root);
  try {
    const raw = await git.diff(["HEAD"]);
    const summary = await git.diffSummary(["HEAD"]);

    const files: DiffFile[] = summary.files.map((f) => ({
      path: f.file,
      status: inferStatus(f),
      additions: "insertions" in f ? f.insertions : 0,
      deletions: "deletions" in f ? f.deletions : 0,
    }));

    return ok({ files, raw });
  } catch (cause) {
    return err(intentError("GIT_ERROR", "Failed to get HEAD diff", cause));
  }
}

export async function getBaseDiff(root: string, base: string): Promise<Result<DiffSummary>> {
  const git: SimpleGit = simpleGit(root);
  try {
    const raw = await git.diff([`${base}...HEAD`]);
    const summary = await git.diffSummary([`${base}...HEAD`]);

    const files: DiffFile[] = summary.files.map((f) => ({
      path: f.file,
      status: inferStatus(f),
      additions: "insertions" in f ? f.insertions : 0,
      deletions: "deletions" in f ? f.deletions : 0,
    }));

    return ok({ files, raw });
  } catch (cause) {
    return err(intentError("GIT_ERROR", `Failed to diff against ${base}`, cause));
  }
}

function inferStatus(f: { file: string }): DiffFile["status"] {
  const file = f as { file: string; binary?: boolean };
  const name = file.file;
  if (name.includes(" => ")) return "renamed";
  return "modified";
}
