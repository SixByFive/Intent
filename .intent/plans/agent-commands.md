---
id: plan-agent-commands
title: Agent workflow commands
type: plan
status: draft
created: '2026-05-07T18:35:38.035Z'
updated: '2026-05-07T18:35:38.035Z'
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

The MCP `intent_context` tool gives agents raw context, but agents benefit from a higher-level workflow: "here is everything relevant to this task" (prepare) and "did what I just do align with the stated plans and constraints?" (review). These are distinct from `review-diff` which is human-facing.

## Rules

- Both commands must work via CLI and be exposed as MCP tools
- `agent prepare <task>` takes a task description, does semantic matching against plans/decisions, and returns a focused context bundle
- `agent review` compares the current diff against all active plans and flags potential violations
- Output must be structured enough for agents to parse (JSON flag or structured markdown)
- All logic in `core` — CLI and MCP are thin wrappers per DEC-0004

## Open questions

- How does `agent prepare` do semantic matching without an embeddings model? Options: keyword match, tag match, or call out to an LLM
- Should `agent review` produce a pass/fail signal or just a summary?
