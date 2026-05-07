import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { simpleGit } from "simple-git";
import { initIntent } from "./init.js";

export async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "intent-test-"));
}

export async function makeTempRepo(): Promise<string> {
  const dir = await makeTempDir();
  const git = simpleGit(dir);
  await git.init();
  await git.addConfig("user.email", "test@example.com");
  await git.addConfig("user.name", "Test");
  return dir;
}

export async function makeTempIntentRepo(): Promise<string> {
  const dir = await makeTempRepo();
  await initIntent(dir, { project: "test-project" });
  return dir;
}

export async function cleanup(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}
