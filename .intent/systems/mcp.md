---
id: sys-mcp
title: MCP Server
type: system
created: '2026-05-06T14:18:26.187Z'
updated: '2026-05-06T14:18:26.187Z'
plans:
  - plan-initial-build
decisions:
  - DEC-0002
tags:
  - mcp
  - agents
---

## Overview

`packages/mcp` exposes Intent's core operations as MCP tools over stdio. Compatible with Claude Code, Cursor, OpenAI Codex CLI, and ChatGPT desktop. Any MCP-compatible client can use it without modification.

## Boundaries

- Imports from `core` only
- No business logic — all tool handlers delegate to core functions
- Transport: stdio (StdioServerTransport)

## Key Decisions

- Standard MCP SDK (`@modelcontextprotocol/sdk`) — no custom protocol
- Tool naming convention: `intent_<verb>` (e.g. `intent_context`, `intent_review_diff`)
- `intent_export` with `target: "markdown"` returns the block as text instead of writing a file, allowing agents to read context inline
