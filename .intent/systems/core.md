---
id: sys-core
title: Core Package
type: system
created: '2026-05-06T14:18:25.757Z'
updated: '2026-05-06T14:18:25.757Z'
plans:
  - plan-initial-build
  - plan-agent-commands
decisions:
  - DEC-0001
  - DEC-0002
  - DEC-0003
  - DEC-0004
  - DEC-0005
tags:
  - core
---

## Overview

`packages/core` is the heart of Intent. All business logic lives here — file I/O, frontmatter parsing, git integration, context loading, diff review, links index, and export formatting. CLI and MCP are thin consumers of core.

## Boundaries

- Owns all `.intent/` file read/write operations
- Owns the `Result<T, E>` error model — no thrown errors in library code
- Never imports from `cli` or `mcp`
- Depends only on `schemas`, plus `gray-matter`, `simple-git`, and Node built-ins

## Key Decisions

- All functions return `Result<T, IntentError>` — callers handle errors explicitly
- Zod schemas from `@intent/schemas` are the source of truth; TypeScript types are inferred
- Frontmatter parsed with `gray-matter`; body is free-form markdown
- Git operations via `simple-git`
