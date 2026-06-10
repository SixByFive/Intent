---
id: plan-agent-commands
title: Agent workflow commands
type: plan
status: archived
created: '2026-05-07T18:35:38.035Z'
updated: '2026-05-07T19:00:00.000Z'
decisions:
  - DEC-0003
  - DEC-0004
constraints: []
tags:
  - cli
  - agents
  - mcp
---

## Goal

Implement `intent agent prepare <task>` and `intent agent review` — commands designed for AI agent workflows that need to load context before starting a task and verify intent alignment after completing it.

## Reason

The MCP `intent_context` tool gives agents raw context, but agents benefit from a higher-level workflow: "here is everything relevant to this task" (prepare) and "did what I just did align with the stated plans and constraints?" (review). These are distinct from `review-diff` which is human-facing.

## Rules

- Both commands must work via CLI and be exposed as MCP tools
- `agent prepare [task]` takes an optional task description, keyword-scores plans/decisions/systems, pulls in cross-referenced items transitively, and falls back to full context when nothing matches or no task is given
- `agent review` runs diff coverage + validation, renders a structured checklist, and in manual mode prompts to scaffold missing decision records interactively
- `--hook` flag on both commands produces JSON stdout and is safe for non-interactive use (Claude Code hooks, CI)
- All logic in `core` — CLI and MCP are thin wrappers per DEC-0004

## Status

**Complete.** Shipped in the same session as validate/status.

- ✅ `prepareAgentContext(root, task)` — keyword scoring with transitive cross-ref resolution
- ✅ `reviewAgent(root, staged, base)` — checklist + `suggestDecision` signal
- ✅ CLI: `intent agent prepare [task] [--hook]`
- ✅ CLI: `intent agent review [--base <ref>] [--unstaged] [--hook]`
- ✅ Interactive decision scaffolding in manual review mode (readline Q&A → draft DEC-XXXX.md)
- ✅ MCP: `intent_agent_prepare` and `intent_agent_review` tools

## Design decisions made

**Semantic matching without embeddings:** keyword tokenisation with scored fields (title ×3, tags ×2, body up to 5pts). Fast, zero dependencies, good enough for structured `.intent/` content where titles are intentionally descriptive. Embeddings can be layered on later if needed.

**`agent review` signal:** produces both a structured checklist (machine-readable) and a pass/fail exit code (1 on validation errors). `suggestDecision` boolean flags unlinked changes without blocking.
