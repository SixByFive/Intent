---
id: plan-v1-improvements
title: v1 feature improvements
type: plan
status: archived
created: '2026-06-10T00:00:00.000Z'
updated: '2026-06-10T00:00:00.000Z'
decisions:
  - DEC-0006
  - DEC-0007
  - DEC-0008
constraints:
  - CON-0001
  - CON-0002
tags:
  - cli
  - agents
  - export
  - search
---

## Goal

Extend the v1 feature set with improvements across export formats, agent workflow, and CLI usability.

## Reason

Post-publish audit identified several gaps: constraints were stored but never surfaced in exports or agent context; agents benefit from HTML-structured output over markdown; watch mode was needed for local development; list commands lacked filters; show commands were missing entirely.

## Checklist

- [x] Constraints included in `formatContextBlock`, `formatContextBlockHtml`, and `prepareAgentContext`
- [x] HTML export target (`intent export html` → `intent-context.html`) — semantic structure with embedded JSON blob
- [x] JSON export target (`intent export json` → `intent-context.json`)
- [x] Windsurf export target (`intent export windsurf` → `.windsurfrules`)
- [x] `--watch` flag on all export targets — debounced re-export on `.intent/` file changes
- [x] `intent search <query>` — full-text search across all intent files with ranked excerpts
- [x] `intent plan show <name>` / `intent decision show <id>` / `intent constraint show <id>`
- [x] `--status`, `--system`, `--tag` filters on all list commands; `--severity` on constraint list
- [x] `intent constraint update <id>` command
- [x] Agent session persistence (`.intent/.agent-session.json`) — task carried from `prepare` to `review`
- [x] Constraint scoring in `prepareAgentContext`
- [x] `intent_list_constraints` and `intent_search` MCP tools
- [x] Filter params on all MCP list tools
- [x] `AgentReviewReport.task` populated from last prepare session
