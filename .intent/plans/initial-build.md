---
id: plan-initial-build
title: Initial monorepo build
type: plan
status: active
created: '2026-05-07T18:35:37.570Z'
updated: '2026-05-07T18:35:37.570Z'
decisions:
  - DEC-0001
  - DEC-0002
  - DEC-0003
  - DEC-0004
  - DEC-0005
constraints: []
tags:
  - monorepo
  - core
  - cli
  - mcp
---

## Goal

Ship a working monorepo with all four packages (schemas, core, cli, mcp), a full test suite, GitHub Actions CI, export commands, and MCP integrations for Claude, Cursor, Codex, and ChatGPT.

## Reason

This is the foundation everything else builds on. Until the core format, CLI, and MCP server exist and are tested, nothing else can ship.

## Rules

- schemas → core → cli/mcp dependency order must be preserved; never invert
- All business logic lives in `core`; CLI and MCP are thin consumers
- All `core` functions return `Result<T, IntentError>` — no thrown errors
- Zod schemas are the source of truth; TypeScript types are always inferred
- Tests live alongside source as `*.test.ts` files

## Status

Substantially complete. Remaining items before closing:
- `intent validate` command
- `intent status` command
- `intent agent prepare` / `intent agent review` commands
- npm publish prep (`publishConfig`, `files` fields, shebang verification)
