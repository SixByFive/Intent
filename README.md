# Intent

**Git-native reasoning layer for software projects.**

Intent lives inside your repo as `.intent/` and tracks the *why* behind code: plans, architectural decisions, constraints, and system context. It's designed to be read by both humans and AI agents.

Git already tracks *what* changed. Intent tracks *why* it changed.

---

## Contents

- [Why Intent](#why-intent)
- [Installation](#installation)
- [Quick start](#quick-start)
- [The .intent/ format](#the-intent-format)
- [CLI reference](#cli-reference)
- [Export commands](#intent-export-target)
- [GitHub Action](#github-action)
- [MCP server](#mcp-server)
- [Agent workflow](#agent-workflow)
- [Monorepo structure](#monorepo-structure)
- [Contributing](#contributing)

---

## Why Intent

Modern codebases have a knowledge problem. Commit messages record *what* changed. PRs explain *why* at that moment. But over time, the reasoning behind architectural choices, constraints, and active plans disappears into history.

AI agents have the same problem — they can read your code but they can't read your mind. They don't know that the auth middleware is being rewritten for compliance reasons, or that the listing limit exists because of a vendor contract, or that you're mid-way through a multi-sprint migration.

Intent solves this by making reasoning a first-class artifact, committed alongside code:

```
git add src/auth/middleware.ts .intent/plans/auth-rewrite.md
git commit -m "Refactor auth middleware for session token compliance"
```

---

## Installation

```bash
npm install -g @dev-sixbyfive/intent
```

This installs both the `intent` CLI and the `intent-mcp` MCP server in one go.

Or with pnpm:

```bash
pnpm add -g @dev-sixbyfive/intent
```

> **Requirements:** Node 18+, must be run inside a git repository.

### Install individual packages

If you only need one piece:

```bash
npm install -g @dev-sixbyfive/intent-cli   # CLI only
npm install -g @dev-sixbyfive/intent-mcp   # MCP server only
```

Use `@dev-sixbyfive/intent-core` or `@dev-sixbyfive/intent-schemas` if you're building tooling on top of the `.intent/` format.

---

## Quick start

```bash
# 1. Initialize Intent in your repo
cd your-project
intent init

# 2. Document a plan
intent plan create auth-rewrite --title "Auth middleware rewrite" --system auth

# 3. Record an architectural decision
intent decision add --title "Use short-lived JWTs over session tokens" --system auth

# 4. Before you commit, see what intent context applies to your diff
git add src/auth/
intent review-diff
```

---

## The .intent/ format

Every `.intent/` file uses **hybrid frontmatter markdown**: structured YAML frontmatter + free-form markdown body. The YAML is machine-readable; the body is human reasoning.

```
.intent/
  intent.json          ← project config (the only pure JSON file)
  plans/               ← active and historical plans
  decisions/           ← architectural decision records (ADRs)
  systems/             ← system/domain definitions
  constraints/         ← hard and soft constraints
  links/               ← auto-generated index (never edit manually)
    index.json
```

### Plan file

```markdown
---
id: plan-auth-rewrite
title: Auth middleware rewrite
type: plan
status: active
created: 2024-01-15T09:00:00Z
updated: 2024-01-15T09:00:00Z
system: auth
decisions: [DEC-0001]
constraints: []
tags: [security, compliance]
---

## Goal

Replace the legacy session token middleware with short-lived JWTs.

## Reason

Legal flagged the current session token storage as non-compliant with
the new data residency requirements. Must be resolved before Q2 audit.

## Rules

- Tokens must expire in 15 minutes
- Refresh tokens stored in httpOnly cookies only
- No token data written to application logs
```

### Decision file

```markdown
---
id: DEC-0001
title: Use short-lived JWTs over session tokens
type: decision
status: active
created: 2024-01-15T09:00:00Z
updated: 2024-01-15T09:00:00Z
system: auth
plans: [plan-auth-rewrite]
tags: [security]
---

## Context

We need to replace the current session token approach. Options were:
opaque session tokens (existing), short-lived JWTs, or a third-party
auth provider.

## Decision

Short-lived JWTs (15 min) with httpOnly refresh tokens.

## Consequences

- Stateless auth — no session store required
- Must implement token refresh flow on the client
- All services need to validate JWTs independently
```

### Statuses

| Type | Statuses |
|---|---|
| Plan | `draft`, `active`, `archived`, `superseded` |
| Decision | `draft`, `active`, `archived`, `superseded` |
| System | *(no status — systems are always active)* |
| Constraint | `hard`, `soft` (severity, not status) |

---

## CLI reference

### `intent init`

Initialize Intent in the current git repository.

```bash
intent init
intent init --project "my-app"   # explicit project name
intent init --force               # reinitialize existing .intent/
```

Creates `.intent/` with the directory structure and a `intent.json` config file.

---

### `intent plan create <name>`

Create a new plan file.

```bash
intent plan create subscriptions
intent plan create subscriptions --title "Marketplace subscription tiers"
intent plan create subscriptions --system marketplace --status active
```

Opens a Markdown file at `.intent/plans/<name>.md` with a structured template.

### `intent plan update <name>`

Update a plan's status or title without editing the file manually.

```bash
intent plan update auth-rewrite --status archived
intent plan update auth-rewrite --title "Auth middleware rewrite (phase 2)"
intent plan update auth-rewrite --status active --title "New title"
```

### `intent plan list`

List all plans.

```bash
intent plan list
```

---

### `intent decision add`

Record a new architectural decision. IDs are auto-incremented (`DEC-0001`, `DEC-0002`, …).

```bash
intent decision add
intent decision add --title "Use Postgres for the event store"
intent decision add --title "Use Postgres for the event store" --system events
```

### `intent decision update <id>`

Update a decision's status or title.

```bash
intent decision update DEC-0001 --status superseded
intent decision update DEC-0001 --title "Use short-lived JWTs (revised)"
```

### `intent decision list`

List all decisions.

```bash
intent decision list
```

---

### `intent constraint add`

Record a hard or soft constraint. IDs are auto-incremented (`CON-0001`, `CON-0002`, …).

```bash
intent constraint add --title "No external databases in the core package" --severity hard
intent constraint add --title "Prefer open source dependencies" --severity soft --system core
```

### `intent constraint list`

List all constraints.

```bash
intent constraint list
```

---

### `intent system create <name>`

Create a system/domain definition.

```bash
intent system create marketplace
intent system create marketplace --title "Marketplace Domain"
```

### `intent system list`

List all systems.

```bash
intent system list
```

---

### `intent context [system]`

Show all intent context for the project, optionally filtered to a system.

```bash
intent context               # all plans, decisions, systems
intent context marketplace   # filtered to the marketplace system
```

---

### `intent review-diff`

Show intent context relevant to the current git diff. Run this before committing to see which plans and decisions apply to your changes.

```bash
intent review-diff             # staged changes only (default)
intent review-diff --all       # staged + unstaged
intent review-diff --base origin/main   # diff against a branch (CI mode)
```

This is the highest-value command. It cross-references changed files against the links index and surfaces only the context that's relevant to what you're about to commit.

---

### `intent link`

Rebuild the `.intent/links/index.json` index. Run after adding or editing `.intent/` files to keep `review-diff` results accurate.

```bash
intent link
```

The links index is auto-generated and excluded from git (via `.intent/.gitignore`). It's rebuilt on demand.

---

### `intent validate`

Validate all `.intent/` files and check referential integrity across plans, decisions, and systems.

```bash
intent validate               # check everything
intent validate --errors-only # suppress warnings, show errors only
```

Reports broken cross-references (plan references a decision that doesn't exist, etc.) as errors, and draft plans as warnings. Exits 0 if valid, 1 if there are errors.

---

### `intent status`

Show a health overview of the `.intent/` directory.

```bash
intent status
```

Displays:
- Plan/decision/system counts
- Active and draft plans with their system assignments
- Links index freshness
- Validation summary (errors and warnings, with a pointer to `intent validate` for details)

---

### `intent export <target>`

Export intent context as a formatted markdown block into the config file that your editor or AI tool reads automatically.

```bash
intent export claude    # → CLAUDE.md
intent export cursor    # → .cursor/rules
intent export copilot   # → .github/copilot-instructions.md
```

All three support an optional `--system` filter:

```bash
intent export claude --system marketplace
```

The exported block is wrapped in `<!-- intent-context:start -->` / `<!-- intent-context:end -->` markers so re-running the command updates it in place without touching the rest of the file.

**When to run it:** after `intent init`, and again whenever you add or update `.intent/` files. You can wire it into a git hook or CI step to keep it current automatically.

---

## GitHub Action

Add automatic intent context comments to pull requests.

### Setup

Copy this workflow into your repo at `.github/workflows/intent-pr.yml`:

```yaml
name: Intent PR Context

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  intent:
    name: Post intent context
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: SixByFive/intent/.github/actions/intent-pr@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          base-ref: origin/${{ github.base_ref }}
```

### What it does

When a PR is opened or updated, the action:

1. Runs `intent review-diff --base origin/<base-branch>` against the PR diff
2. Posts a comment listing all relevant plans, decisions, and systems
3. Updates the existing comment on subsequent pushes (no duplicate comments)

If no related intent context is found, no comment is posted.

### Action inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `github-token` | Yes | — | GitHub token for posting comments (`secrets.GITHUB_TOKEN` works) |
| `base-ref` | No | `origin/main` | Git ref to diff against |

### Testing locally

Test the CLI part directly:

```bash
git fetch origin
intent review-diff --base origin/main
```

To run the full action locally with Docker:

```bash
# Install act: https://github.com/nektos/act
act pull_request --secret GITHUB_TOKEN=your_pat
```

---

## MCP server

Intent ships an MCP server so AI agents can query your intent context directly during a task. The server speaks standard MCP over stdio and works with any MCP-compatible client.

### Claude Code

Add to `.claude/settings.json` in your project, or to `~/.claude/settings.json` globally:

```json
{
  "mcpServers": {
    "intent": {
      "command": "npx",
      "args": ["@dev-sixbyfive/intent-mcp"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "intent": {
      "command": "npx",
      "args": ["@dev-sixbyfive/intent-mcp"]
    }
  }
}
```

### OpenAI Codex CLI

Add to `~/.codex/config.yaml`:

```yaml
mcpServers:
  intent:
    command: npx
    args:
      - "@dev-sixbyfive/intent-mcp"
```

### ChatGPT desktop

Add to your ChatGPT desktop MCP config (`~/Library/Application Support/ChatGPT/mcp.json` on Mac, `%APPDATA%\ChatGPT\mcp.json` on Windows):

```json
{
  "mcpServers": {
    "intent": {
      "command": "npx",
      "args": ["@dev-sixbyfive/intent-mcp"]
    }
  }
}
```

> **Note:** ChatGPT desktop MCP support requires the ChatGPT desktop app with MCP enabled. See [OpenAI's MCP guide](https://platform.openai.com/docs/guides/tools/model-context-protocol) for setup steps.

### Available tools

| Tool | Description |
|---|---|
| `intent_context` | Get all plans, decisions, and systems. Optionally filter by system. |
| `intent_review_diff` | Get intent context relevant to the current git diff. Supports `--base` for CI. |
| `intent_list_plans` | List all plans. |
| `intent_list_decisions` | List all architectural decisions. |
| `intent_list_systems` | List all system definitions. |
| `intent_rebuild_links` | Rebuild the links index. |
| `intent_validate` | Validate all `.intent/` files and check referential integrity. |
| `intent_status` | Health overview: counts, active/draft plans, links index state, validation summary. |
| `intent_agent_prepare` | Keyword-score plans/decisions/systems against a task; return focused context bundle. |
| `intent_agent_review` | Review diff coverage and validation; returns checklist and `suggestDecision` signal. |
| `intent_export` | Export context as markdown, or write to `claude`/`cursor`/`copilot` target files. |

### Example agent workflow

```
User: Implement the vendor listing limit

Agent calls: intent_agent_prepare "implement vendor listing limit"
  → scores plans/decisions by relevance
  → returns plan-subscriptions, DEC-0007 (listing constraints), sys-marketplace

Agent implements accordingly, without asking the user to re-explain the plan

Agent calls: intent_agent_review (after making changes)
  → checklist: changes covered by plan-subscriptions ✓
  → validation: all files valid ✓
  → suggestDecision: false (changes were linked)
```

### Tools without MCP support

For tools that don't support MCP (web interfaces, older IDE extensions), use `intent export` to generate a static context file instead. See the [CLI reference](#intent-export-target) above.

---

## Agent workflow

Intent has two commands built specifically for AI agent workflows — loading focused context before a task, and reviewing alignment after.

### `intent agent prepare [task]`

Get intent context relevant to a task. Keyword-scores all plans, decisions, and systems against the task description, pulls in cross-referenced items transitively, and falls back to full context when nothing matches or no task is given.

```bash
intent agent prepare "add OAuth login with GitHub"
intent agent prepare "refactor the payment module"
intent agent prepare          # no task → full context
intent agent prepare "..." --hook   # JSON output for hook injection
```

The `--hook` flag emits JSON on stdout — useful for Claude Code hooks that need to inject context into a system prompt before the agent starts working.

### `intent agent review`

Review the current diff against intent and validate all files. Produces a structured checklist and flags whether unlinked changes suggest a new decision record is needed.

```bash
intent agent review                       # staged changes
intent agent review --base origin/main    # diff against a branch
intent agent review --unstaged            # unstaged changes
intent agent review --hook                # JSON output + exit code for CI/hooks
```

In interactive (non-hook) mode, if changed files have no linked intent entries, you're prompted:

```
Did you make architectural decisions not captured above? [y/N]
```

Answering `y` walks through a short Q&A (title, context, decision, consequences) and writes a draft `DEC-XXXX.md` file ready for you to refine.

### Wiring into Claude Code hooks

Add to `.claude/settings.json` to automatically inject relevant context before every tool call:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "intent agent prepare --hook"
          }
        ]
      }
    ]
  }
}
```

---

## Monorepo structure

```
packages/
  intent/    — Meta-package: installs CLI + MCP server in one go (@dev-sixbyfive/intent)
  schemas/   — Zod schemas and TypeScript types for the .intent/ format
  core/      — All .intent/ file I/O, parsing, and git integration
  cli/       — Commander-based CLI (thin layer — no business logic)
  mcp/       — MCP server exposing Intent tools to AI agents
```

**Dependency rule:** `schemas → core → cli/mcp`. Core never imports CLI; schemas never import core.

### Building from source

```bash
git clone https://github.com/SixByFive/intent
cd intent
pnpm install
pnpm build

# Link the CLI globally
cd packages/cli && pnpm link --global
cd ../mcp && pnpm link --global
```

### Development

```bash
pnpm dev   # watch mode across all packages
```

---

## What Intent is not

- Not a documentation app — `.intent/` is not a wiki
- Not a project management tool — it doesn't replace Linear, Jira, or GitHub Issues
- Not a SaaS dashboard — no account, no sync, no external dependency
- Not a replacement for commit messages or PRs — it complements them

---

## Contributing

Issues and PRs welcome at [github.com/SixByFive/intent](https://github.com/SixByFive/intent).

When contributing, keep the dependency rule in mind: `schemas → core → cli/mcp`. All business logic belongs in `core`, not in `cli` command handlers.
