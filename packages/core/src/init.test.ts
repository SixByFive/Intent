import { describe, it, expect, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { initIntent } from "./init.js";
import { isInitialized, readConfig } from "./config.js";
import { makeTempDir, cleanup } from "./test-helpers.js";

const dirs: string[] = [];

afterEach(async () => {
  for (const d of dirs.splice(0)) await cleanup(d);
});

describe("initIntent", () => {
  it("creates all .intent/ subdirectories", async () => {
    const dir = await makeTempDir();
    dirs.push(dir);

    const result = await initIntent(dir, { project: "my-app" });
    expect(result.ok).toBe(true);

    for (const sub of ["plans", "decisions", "systems", "constraints", "links"]) {
      const stat = await fs.stat(path.join(dir, ".intent", sub));
      expect(stat.isDirectory()).toBe(true);
    }
  });

  it("writes intent.json with correct content", async () => {
    const dir = await makeTempDir();
    dirs.push(dir);

    await initIntent(dir, { project: "my-app" });
    const configResult = await readConfig(dir);
    expect(configResult.ok).toBe(true);
    if (configResult.ok) {
      expect(configResult.value.project).toBe("my-app");
      expect(configResult.value.version).toBe("1");
      expect(configResult.value.systems).toEqual([]);
    }
  });

  it("writes .intent/.gitignore", async () => {
    const dir = await makeTempDir();
    dirs.push(dir);

    await initIntent(dir, { project: "test" });
    const gitignore = await fs.readFile(path.join(dir, ".intent", ".gitignore"), "utf8");
    expect(gitignore).toContain("links/");
  });

  it("returns ALREADY_INITIALIZED when .intent/ exists", async () => {
    const dir = await makeTempDir();
    dirs.push(dir);

    await initIntent(dir, { project: "test" });
    const second = await initIntent(dir, { project: "test" });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe("ALREADY_INITIALIZED");
  });

  it("reinitializes with --force", async () => {
    const dir = await makeTempDir();
    dirs.push(dir);

    await initIntent(dir, { project: "old" });
    const result = await initIntent(dir, { project: "new", force: true });
    expect(result.ok).toBe(true);

    const configResult = await readConfig(dir);
    expect(configResult.ok).toBe(true);
    if (configResult.ok) expect(configResult.value.project).toBe("new");
  });

  it("isInitialized returns false before init", async () => {
    const dir = await makeTempDir();
    dirs.push(dir);
    expect(await isInitialized(dir)).toBe(false);
  });

  it("isInitialized returns true after init", async () => {
    const dir = await makeTempDir();
    dirs.push(dir);
    await initIntent(dir, { project: "test" });
    expect(await isInitialized(dir)).toBe(true);
  });
});
