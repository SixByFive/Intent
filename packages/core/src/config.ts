import * as fs from "node:fs/promises";
import { IntentConfigSchema, type IntentConfig } from "@intent/schemas";
import { type Result, ok, err, intentError } from "./result.js";
import { configPath, intentDir } from "./paths.js";

export async function readConfig(root: string): Promise<Result<IntentConfig>> {
  const p = configPath(root);
  let raw: string;
  try {
    raw = await fs.readFile(p, "utf8");
  } catch (cause) {
    return err(intentError("NOT_INITIALIZED", `No intent.json found at ${p}. Run 'intent init' first.`, cause));
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (cause) {
    return err(intentError("PARSE_ERROR", `Failed to parse intent.json`, cause));
  }

  const result = IntentConfigSchema.safeParse(json);
  if (!result.success) {
    const messages = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
    return err(intentError("VALIDATION_ERROR", `Invalid intent.json: ${messages}`));
  }

  return ok(result.data);
}

export async function writeConfig(root: string, config: IntentConfig): Promise<Result<void>> {
  const p = configPath(root);
  try {
    await fs.writeFile(p, JSON.stringify(config, null, 2) + "\n", "utf8");
    return ok(undefined);
  } catch (cause) {
    return err(intentError("WRITE_ERROR", `Failed to write intent.json`, cause));
  }
}

export async function isInitialized(root: string): Promise<boolean> {
  try {
    await fs.access(intentDir(root));
    return true;
  } catch {
    return false;
  }
}
