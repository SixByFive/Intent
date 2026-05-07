# Intent — Claude Code Context

## What this project is

Intent is a Git-native reasoning layer for software projects. It lives inside the repo as `.intent/` and tracks the *why* behind code: plans, architectural decisions, constraints, and system context. It's designed to be read by both humans and AI agents.

The core idea: Git already tracks *what* changed. Intent tracks *why* it changed.

## Monorepo structure

```
packages/
  schemas/   — Zod schemas and TypeScript types for the .intent/ format (no deps on other packages)
  core/      — All .intent/ file I/O, parsing, and git integration (depends on schemas)
  cli/       — Commander-based CLI (depends on core, thin layer — no business logic here)
  mcp/       — MCP server exposing Intent tools to AI agents (depends on core)
apps/
  web/       — Hosted dashboard (future)
```

**Dependency rule**: schemas → core → cli/mcp. Never import cli into core. Never import core into schemas.

## Tech stack

- TypeScript (strict, NodeNext modules)
- pnpm workspaces + Turborepo
- Zod for all schema validation
- Vitest for tests
- Commander for CLI
- simple-git for git integration
- gray-matter for frontmatter parsing

## The .intent/ format

Every `.intent/` file uses **hybrid frontmatter markdown**: structured YAML frontmatter + free-form markdown body. The YAML is the contract; the body is the reasoning.

Example plan file (`.intent/plans/subscriptions.md`):
```markdown
---
id: plan-subscriptions
title: Marketplace subscription tiers
type: plan
status: active
created: 2024-01-01T00:00:00Z
updated: 2024-01-01T00:00:00Z
system: marketplace
decisions: [DEC-0001]
constraints: []
tags: [monetisation, marketplace]
---

## Goal
Add subscription tiers to the marketplace.

## Reason
Need monetisation while keeping core collecting accessible.

## Rules
- Free users: 5 listings
- Vendor users: unlimited listings
```

The only pure-JSON file is `.intent/intent.json` (project config).
Auto-generated indexes live in `.intent/links/` — never edit these manually.

## Key design decisions

**Format**: Hybrid frontmatter markdown. YAML frontmatter is parsed and validated with Zod. Markdown body is free-form reasoning. This keeps files human-readable and AI-parseable without a custom format.

**Git-native**: `.intent/` is committed alongside code. No external database. No SaaS required. Works offline. Versions with the codebase.

**Thin CLI**: The CLI (`packages/cli`) is a thin command layer. All logic lives in `packages/core`. Commands call core functions and format output. No business logic in CLI command handlers.

**Derived indexes**: `.intent/links/` files are always generated, never manually written. Commands like `intent link` regenerate them. This means the format stays human-editable while agents can use fast structured lookups.

## Core workflow

```bash
# developer changes code
intent review-diff        # see what intent context is relevant to the diff
git add .
git commit -m "Add vendor listing limits"  # one commit: code + reasoning
```

## CLI commands to implement

**Setup**: `intent init`, `intent init --existing`
**Create**: `intent plan create <name>`, `intent decision add`, `intent system create <name>`
**Read**: `intent context`, `intent context <system>`
**Git-aware**: `intent review-diff`, `intent explain`, `intent validate`, `intent status`, `intent link`
**Agent**: `intent agent prepare <task>`, `intent agent review`
**Export**: `intent export claude`, `intent export cursor`, `intent export copilot`

## What we're building first

1. Monorepo setup and package structure (current)
2. `packages/schemas` — complete Zod schemas for all .intent/ file types
3. `packages/core` — file I/O, frontmatter parsing, git integration
4. `packages/cli` — `intent init` and `intent review-diff` (highest value commands first)
5. GitHub Action for PR summaries
6. MCP server

## Coding conventions

- All files use `.ts` extension, compiled to `.js` with ESM output
- Always use `import ... from '...'` with `.js` extensions (NodeNext resolution)
- Zod schemas are the source of truth — TypeScript types are always inferred from them
- Functions in `core` return `Result<T, IntentError>` pattern — no thrown errors in library code
- Tests live alongside source as `*.test.ts` files
- Prefer explicit over clever — this codebase will be read by AI agents

## What Intent is NOT

- Not a documentation app
- Not a project management tool
- Not a SaaS dashboard
- Not a replacement for commit messages or PRs

## The pitch

Intent is a Git-native context layer for modern software development. It tracks plans, architectural decisions, constraints, and implementation reasoning alongside the codebase — helping humans and AI agents understand not just what changed, but why it changed.

<!-- intent-context:start -->

## Intent Context

### Agent Instructions

This project uses [Intent](https://github.com/SixByFive/intent) to track the *why* behind code.
When `.intent/` is present, follow these rules:

1. **Before starting a task** — call `intent agent prepare "<task>"` or the `intent_agent_prepare` MCP tool to load relevant plans and decisions.
2. **After making changes** — call `intent agent review` or `intent_agent_review` to verify alignment and catch broken references.
3. **If you made an architectural decision** not covered by an existing record, create one: `intent decision add` or let `intent agent review` scaffold it interactively.
4. **If a plan's work is complete**, update its `status` to `archived` in the frontmatter.
5. **Commit `.intent/` files** alongside the code changes they describe.

### Active Plans

**plan-agent-commands** — Agent workflow commands `[active]`

> ## Goal
> Implement `intent agent prepare <task>` and `intent agent review` — commands designed for AI agent workflows that need to load context before starting a task and verify intent alignment after completing it.
> ## Reason

**plan-initial-build** — Initial monorepo build `[archived]`

> ## Goal
> Ship a working monorepo with all four packages (schemas, core, cli, mcp), a full test suite, GitHub Actions CI, export commands, and MCP integrations for Claude, Cursor, Codex, and ChatGPT.
> ## Reason

**plan-npm-publish** — Publish to npm `[active]`

> ## Goal
> Publish `@intent/cli`, `@intent/core`, `@intent/schemas`, and `@intent/mcp` to npm under the `@intent` scope so users can install with `npm install -g @intent/cli`.
> ## Reason

### Architectural Decisions

**DEC-0001** — Hybrid frontmatter markdown as the .intent/ file format `[active]`

> ## Context
> We needed a file format for `.intent/` files that is machine-readable for validation and querying, but also human-readable and editable without tooling. Options considered: pure JSON, pure YAML, custom DSL, hybrid frontmatter markdown.

**DEC-0002** — Git-native storage — no external database or sync service `[active]`

> ## Context
> Context tools often require a backend, a sync service, or a SaaS account. This creates friction (onboarding, cost, network dependency) and means context is decoupled from the code that triggered it.

**DEC-0003** — Result<T, E> error pattern — no thrown errors in library code `[active]`

> ## Context
> Library code that throws errors forces callers to wrap everything in try/catch and makes the error surface invisible in function signatures. This is especially problematic for a library intended to be used by AI agents and CLI tools.

**DEC-0004** — Thin CLI layer — all business logic in core `[active]`

> ## Context
> CLI commands can easily accumulate logic over time, making it hard to test and reuse that logic from other consumers (e.g. the MCP server). We wanted the MCP server and CLI to share the same behaviour without code duplication.

**DEC-0005** — Zod schemas as the source of truth for all .intent/ types `[active]`

> ## Context
> We needed runtime validation of `.intent/` files (since they are hand-edited markdown) and TypeScript types for all file structures. Maintaining both separately causes drift.

### Systems

**sys-cli** — CLI Package

> ## Overview
> `packages/cli` is a thin Commander-based CLI. Every command resolves the git root, calls a `core` function, and formats the output. No business logic lives here.

**sys-core** — Core Package

> ## Overview
> `packages/core` is the heart of Intent. All business logic lives here — file I/O, frontmatter parsing, git integration, context loading, diff review, links index, and export formatting. CLI and MCP are thin consumers of core.

**sys-mcp** — MCP Server

> ## Overview
> `packages/mcp` exposes Intent's core operations as MCP tools over stdio. Compatible with Claude Code, Cursor, OpenAI Codex CLI, and ChatGPT desktop. Any MCP-compatible client can use it without modification.

<!-- intent-context:end -->
