---
id: plan-npm-publish
title: Publish to npm
type: plan
status: draft
created: '2026-05-07T18:35:37.803Z'
updated: '2026-05-07T18:35:37.803Z'
decisions: []
constraints: []
tags:
  - publish
  - npm
---

## Goal

Publish `@intent/cli`, `@intent/core`, `@intent/schemas`, and `@intent/mcp` to npm under the `@intent` scope so users can install with `npm install -g @intent/cli`.

## Reason

Until the packages are on npm, the GitHub Action composite and all MCP config snippets in the README don't work. Publish is the prerequisite for real adoption.

## Rules

- All four packages must be published together and versioned in lockstep
- `@intent/schemas` and `@intent/core` are published as libraries (not just CLI deps)
- The CLI binary (`intent`) must be verified working via `npx @intent/cli` before tagging
- Use `changesets` or manual version bumps — decide before first publish

## Checklist

- [ ] Add `publishConfig: { access: "public" }` to each package.json
- [ ] Add `files` field to each package.json (include `dist/` only, exclude `src/`)
- [ ] Verify shebang on `packages/cli/dist/cli.js` after build
- [ ] Add `.npmignore` or rely on `files` field
- [ ] Create npm org `@intent` or confirm scope availability
- [ ] Dry-run with `pnpm publish --dry-run` from each package
- [ ] Tag `v0.1.0` and publish
- [ ] Update README install instructions from source to npm
