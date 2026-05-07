#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  findGitRoot,
  loadContext,
  reviewDiff,
  rebuildLinksIndex,
  listPlans,
  listDecisions,
  listSystems,
  exportContext,
  formatContextBlock,
  validateIntent,
  getStatus,
  prepareAgentContext,
  reviewAgent,
  type ExportTarget,
} from "@dev-sixbyfive/intent-core";

const server = new Server(
  { name: "intent", version: "0.0.1" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "intent_context",
      description: "Get all intent context (plans, decisions, systems) for the project. Optionally filter by system.",
      inputSchema: {
        type: "object",
        properties: {
          system: { type: "string", description: "Filter to a specific system name" },
          cwd: { type: "string", description: "Working directory (defaults to process.cwd())" },
        },
      },
    },
    {
      name: "intent_review_diff",
      description: "Get intent context relevant to the current git diff. Use before committing to check what reasoning applies.",
      inputSchema: {
        type: "object",
        properties: {
          staged: { type: "boolean", description: "Review staged changes only (default: true)" },
          base: { type: "string", description: "Diff against a git ref (e.g. origin/main) instead of staged/unstaged" },
          cwd: { type: "string", description: "Working directory (defaults to process.cwd())" },
        },
      },
    },
    {
      name: "intent_list_plans",
      description: "List all plans in the project",
      inputSchema: {
        type: "object",
        properties: {
          cwd: { type: "string", description: "Working directory" },
        },
      },
    },
    {
      name: "intent_list_decisions",
      description: "List all architectural decisions in the project",
      inputSchema: {
        type: "object",
        properties: {
          cwd: { type: "string", description: "Working directory" },
        },
      },
    },
    {
      name: "intent_list_systems",
      description: "List all system definitions in the project",
      inputSchema: {
        type: "object",
        properties: {
          cwd: { type: "string", description: "Working directory" },
        },
      },
    },
    {
      name: "intent_rebuild_links",
      description: "Rebuild the .intent/links/index.json index",
      inputSchema: {
        type: "object",
        properties: {
          cwd: { type: "string", description: "Working directory" },
        },
      },
    },
    {
      name: "intent_validate",
      description: "Validate all .intent/ files and check referential integrity. Returns issues grouped by file.",
      inputSchema: {
        type: "object",
        properties: {
          cwd: { type: "string", description: "Working directory" },
        },
      },
    },
    {
      name: "intent_status",
      description: "Get a health overview of the .intent/ directory: plan counts, active/draft plans, links index state, and validation summary.",
      inputSchema: {
        type: "object",
        properties: {
          cwd: { type: "string", description: "Working directory" },
        },
      },
    },
    {
      name: "intent_agent_prepare",
      description: "Get intent context relevant to a task. Scores plans/decisions/systems by keyword match against the task description, pulls in cross-referenced items transitively. Falls back to full context when nothing matches.",
      inputSchema: {
        type: "object",
        properties: {
          task: { type: "string", description: "Natural-language description of the task you are about to work on" },
          cwd: { type: "string", description: "Working directory" },
        },
      },
    },
    {
      name: "intent_agent_review",
      description: "Review the current diff against intent and validate all files. Returns a checklist and flags whether unlinked changes suggest a new decision record is needed.",
      inputSchema: {
        type: "object",
        properties: {
          staged: { type: "boolean", description: "Review staged changes only (default: true)" },
          base: { type: "string", description: "Diff against a git ref instead of staged/unstaged" },
          cwd: { type: "string", description: "Working directory" },
        },
      },
    },
    {
      name: "intent_export",
      description: "Export intent context as a formatted markdown block, or write it to a target file (claude, cursor, copilot).",
      inputSchema: {
        type: "object",
        properties: {
          target: {
            type: "string",
            enum: ["claude", "cursor", "copilot", "markdown"],
            description: "Export target. Use 'markdown' to return the block as text without writing a file.",
          },
          system: { type: "string", description: "Filter to a specific system" },
          cwd: { type: "string", description: "Working directory" },
        },
        required: ["target"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const cwd = (args?.["cwd"] as string | undefined) ?? process.cwd();

  const rootResult = await findGitRoot(cwd);
  if (!rootResult.ok) {
    return { content: [{ type: "text", text: `Error: ${rootResult.error.message}` }], isError: true };
  }
  const root = rootResult.value;

  if (name === "intent_context") {
    const system = args?.["system"] as string | undefined;
    const result = await loadContext(root, system);
    if (!result.ok) {
      return { content: [{ type: "text", text: `Error: ${result.error.message}` }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify(result.value, null, 2) }] };
  }

  if (name === "intent_review_diff") {
    const staged = (args?.["staged"] as boolean | undefined) ?? true;
    const base = args?.["base"] as string | undefined;
    const result = await reviewDiff(root, staged, base);
    if (!result.ok) {
      return { content: [{ type: "text", text: `Error: ${result.error.message}` }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify(result.value, null, 2) }] };
  }

  if (name === "intent_list_plans") {
    const result = await listPlans(root);
    if (!result.ok) {
      return { content: [{ type: "text", text: `Error: ${result.error.message}` }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify(result.value, null, 2) }] };
  }

  if (name === "intent_list_decisions") {
    const result = await listDecisions(root);
    if (!result.ok) {
      return { content: [{ type: "text", text: `Error: ${result.error.message}` }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify(result.value, null, 2) }] };
  }

  if (name === "intent_list_systems") {
    const result = await listSystems(root);
    if (!result.ok) {
      return { content: [{ type: "text", text: `Error: ${result.error.message}` }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify(result.value, null, 2) }] };
  }

  if (name === "intent_rebuild_links") {
    const result = await rebuildLinksIndex(root);
    if (!result.ok) {
      return { content: [{ type: "text", text: `Error: ${result.error.message}` }], isError: true };
    }
    return { content: [{ type: "text", text: `Rebuilt index with ${result.value.entries.length} entries` }] };
  }

  if (name === "intent_validate") {
    const result = await validateIntent(root);
    if (!result.ok) {
      return { content: [{ type: "text", text: `Error: ${result.error.message}` }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify(result.value, null, 2) }] };
  }

  if (name === "intent_status") {
    const result = await getStatus(root);
    if (!result.ok) {
      return { content: [{ type: "text", text: `Error: ${result.error.message}` }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify(result.value, null, 2) }] };
  }

  if (name === "intent_agent_prepare") {
    const task = args?.["task"] as string | undefined ?? null;
    const result = await prepareAgentContext(root, task);
    if (!result.ok) {
      return { content: [{ type: "text", text: `Error: ${result.error.message}` }], isError: true };
    }
    const r = result.value;
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          task: r.task,
          plans: r.plans.map((p) => ({ id: p.frontmatter.id, title: p.frontmatter.title, status: p.frontmatter.status })),
          decisions: r.decisions.map((d) => ({ id: d.frontmatter.id, title: d.frontmatter.title })),
          systems: r.systems.map((s) => ({ id: s.frontmatter.id, title: s.frontmatter.title })),
          formatted: r.formatted,
        }, null, 2),
      }],
    };
  }

  if (name === "intent_agent_review") {
    const staged = (args?.["staged"] as boolean | undefined) ?? true;
    const base = args?.["base"] as string | undefined;
    const result = await reviewAgent(root, staged, base);
    if (!result.ok) {
      return { content: [{ type: "text", text: `Error: ${result.error.message}` }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify(result.value, null, 2) }] };
  }

  if (name === "intent_export") {
    const target = args?.["target"] as string;
    const system = args?.["system"] as string | undefined;

    if (target === "markdown") {
      const ctxResult = await loadContext(root, system);
      if (!ctxResult.ok) {
        return { content: [{ type: "text", text: `Error: ${ctxResult.error.message}` }], isError: true };
      }
      return { content: [{ type: "text", text: formatContextBlock(ctxResult.value) }] };
    }

    const validTargets: ExportTarget[] = ["claude", "cursor", "copilot"];
    if (!validTargets.includes(target as ExportTarget)) {
      return { content: [{ type: "text", text: `Unknown target: ${target}` }], isError: true };
    }

    const result = await exportContext(root, target as ExportTarget, { system });
    if (!result.ok) {
      return { content: [{ type: "text", text: `Error: ${result.error.message}` }], isError: true };
    }
    return { content: [{ type: "text", text: `Exported intent context → ${result.value}` }] };
  }

  return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
});

const transport = new StdioServerTransport();
await server.connect(transport);
