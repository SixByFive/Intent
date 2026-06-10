import * as path from "node:path";

export const INTENT_DIR = ".intent";
export const CONFIG_FILE = "intent.json";
export const PLANS_DIR = "plans";
export const DECISIONS_DIR = "decisions";
export const SYSTEMS_DIR = "systems";
export const CONSTRAINTS_DIR = "constraints";
export const LINKS_DIR = "links";
export const LINKS_INDEX_FILE = "index.json";

export function intentDir(root: string): string {
  return path.join(root, INTENT_DIR);
}

export function configPath(root: string): string {
  return path.join(root, INTENT_DIR, CONFIG_FILE);
}

export function plansDir(root: string): string {
  return path.join(root, INTENT_DIR, PLANS_DIR);
}

export function decisionsDir(root: string): string {
  return path.join(root, INTENT_DIR, DECISIONS_DIR);
}

export function systemsDir(root: string): string {
  return path.join(root, INTENT_DIR, SYSTEMS_DIR);
}

export function constraintsDir(root: string): string {
  return path.join(root, INTENT_DIR, CONSTRAINTS_DIR);
}

export function linksDir(root: string): string {
  return path.join(root, INTENT_DIR, LINKS_DIR);
}

export function linksIndexPath(root: string): string {
  return path.join(root, INTENT_DIR, LINKS_DIR, LINKS_INDEX_FILE);
}

export function planPath(root: string, name: string): string {
  return path.join(root, INTENT_DIR, PLANS_DIR, `${name}.md`);
}

export function decisionPath(root: string, id: string): string {
  return path.join(root, INTENT_DIR, DECISIONS_DIR, `${id}.md`);
}

export function systemPath(root: string, name: string): string {
  return path.join(root, INTENT_DIR, SYSTEMS_DIR, `${name}.md`);
}

export function constraintPath(root: string, id: string): string {
  return path.join(root, INTENT_DIR, CONSTRAINTS_DIR, `${id}.md`);
}

export const AGENT_SESSION_FILE = ".agent-session.json";

export function agentSessionPath(root: string): string {
  return path.join(root, INTENT_DIR, AGENT_SESSION_FILE);
}
