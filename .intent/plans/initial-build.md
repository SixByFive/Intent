---
id: plan-initial-build
title: Initial monorepo build
type: plan
status: archived
created: '2026-05-07T18:35:37.570Z'
updated: '2026-05-07T19:21:06.260Z'
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

**Complete — archived.**

All items shipped:

- ✅ Four-package monorepo (schemas, core, cli, mcp)
- ✅ Hybrid frontmatter markdown format with Zod schemas
- ✅ `Result<T, IntentError>` pattern throughout core
- ✅ Plans, decisions, systems, constraints CRUD
- ✅ Links index and `intent review-diff`
- ✅ `intent export` to CLAUDE.md / .cursor/rules / copilot-instructions.md (idempotent)
- ✅ MCP server with 11 tools
- ✅ GitHub Actions CI (pnpm build + test)
- ✅ GitHub composite action for PR intent comments
- ✅ Full test suite (52 tests passing)
- ✅ `intent validate` — referential integrity checks
- ✅ `intent status` — health overview
- ✅ `intent agent prepare` / `intent agent review` — agent workflow helpers
- ✅ Repo bootstrapped with its own `.intent/` files

Remaining work tracked in separate plans: `plan-npm-publish`.
