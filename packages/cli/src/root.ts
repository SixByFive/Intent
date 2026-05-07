import { findGitRoot } from "@dev-sixbyfive/intent-core";
import { printError } from "./output.js";

export async function resolveRoot(): Promise<string | null> {
  const result = await findGitRoot(process.cwd());
  if (!result.ok) {
    printError(result.error);
    return null;
  }
  return result.value;
}
