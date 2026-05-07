---
id: plan-npm-publish
title: Publish to npm
type: plan
status: active
created: '2026-05-07T18:35:37.803Z'
updated: '2026-05-07T19:30:00.000Z'
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

- [x] Add `publishConfig: { access: "public" }` to each package.json
- [x] Add `files` field to cli/mcp package.json; `.npmignore` for schemas/core (excludes test files, turbo cache, tsconfig)
- [x] Add MIT `LICENSE` file
- [x] Add `repository`, `license`, `keywords` fields to all package.json files
- [x] Verify shebang on `packages/cli/dist/cli.js` after build — confirmed present
- [x] Dry-run with `pnpm publish --dry-run` for all four packages — all pass, tarballs clean
- [ ] Create npm org `@intent` or confirm scope availability
- [ ] Tag `v0.1.0` and publish
- [ ] Update README install instructions from source to npm (currently pointing at npm already)
