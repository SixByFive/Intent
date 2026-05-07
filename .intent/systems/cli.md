---
id: sys-cli
title: CLI Package
type: system
created: '2026-05-06T14:18:25.969Z'
updated: '2026-05-06T14:18:25.969Z'
plans:
  - plan-initial-build
decisions:
  - DEC-0004
tags:
  - cli
---

## Overview

`packages/cli` is a thin Commander-based CLI. Every command resolves the git root, calls a `core` function, and formats the output. No business logic lives here.

## Boundaries

- Imports from `core` and `schemas` only
- Command handlers must not contain logic — delegate to core
- Output formatting (chalk, printSuccess, etc.) is the only CLI-specific concern

## Key Decisions

- Commander for argument parsing
- All output through `src/output.ts` helpers (printSuccess, printError, etc.)
- `process.exit(1)` + `return` after every error to satisfy TypeScript narrowing
