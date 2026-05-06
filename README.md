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
- [GitHub Action](#github-action)
- [MCP server](#mcp-server)
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
npm install -g @intent/cli
```

Or with pnpm:

```bash
pnpm add -g @intent/cli
```

> **Requirements:** Node 18+, must be run inside a git repository.

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

### `intent decision list`

List all decisions.

```bash
intent decision list
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

      - uses: FalconChipp/intent/.github/actions/intent-pr@main
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

Intent ships an MCP server so AI agents (Claude, Cursor, Copilot, etc.) can query your intent context directly during a task.

### Configuration

Add to your Claude Code or Cursor MCP config:

```json
{
  "mcpServers": {
    "intent": {
      "command": "npx",
      "args": ["@intent/mcp"]
    }
  }
}
```

### Available tools

| Tool | Description |
|---|---|
| `intent_context` | Get all plans, decisions, and systems. Optionally filter by system. |
| `intent_review_diff` | Get intent context relevant to the current git diff. |
| `intent_list_plans` | List all plans. |
| `intent_list_decisions` | List all architectural decisions. |
| `intent_rebuild_links` | Rebuild the links index. |

### Example agent workflow

```
User: Implement the vendor listing limit

Agent calls: intent_context → sees plan-subscriptions is active
Agent calls: intent_review_diff → sees DEC-0001 applies to auth changes
Agent now knows: free users → 5 listings, vendor users → unlimited
Agent implements accordingly, without asking the user to re-explain the plan
```

---

## Monorepo structure

```
packages/
  schemas/   — Zod schemas and TypeScript types for the .intent/ format
  core/      — All .intent/ file I/O, parsing, and git integration
  cli/       — Commander-based CLI (thin layer — no business logic)
  mcp/       — MCP server exposing Intent tools to AI agents
```

**Dependency rule:** `schemas → core → cli/mcp`. Core never imports CLI; schemas never import core.

### Building from source

```bash
git clone https://github.com/FalconChipp/intent
cd intent
pnpm install
pnpm build

# Link the CLI globally
cd packages/cli
pnpm link --global
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

Issues and PRs welcome at [github.com/FalconChipp/intent](https://github.com/FalconChipp/intent).

When contributing, keep the dependency rule in mind: `schemas → core → cli/mcp`. All business logic belongs in `core`, not in `cli` command handlers.
