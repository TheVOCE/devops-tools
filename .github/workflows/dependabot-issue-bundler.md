---
description: Find all open Dependabot PRs and create bundle issues for each runtime + manifest file.

on: weekly on monday

permissions:
  contents: read
  issues: read
  pull-requests: read

tools:
  github:

safe-outputs:
  create-issue:
    title-prefix: '[dependabot-bundler] '
    max: 10
  update-issue:
    max: 10

source: githubnext/agentics/workflows/dependabot-issue-bundler.md@97143ac59cb3a13ef2a77581f929f06719c7402a
---

# Dependabot Issue Bundler

Your goal is to create or maintain a coherent set of "bundle issues" that bundle together different dependabot updates by runtime + manifest file.

You should do this by finding all open Dependabot PRs, grouping them by runtime + manifest file, search for all existing bundle issues, and then for each group either creating a new bundle issue or updating an existing bundle issue. Each bundle issue should contain a list of the relevant dependabot PRs with links to them, and any relevant information about the updates.

The bundle issues should have a title that starts with "[dependabot-bundler]". The body of the issue should contain a list of the relevant dependabot PRs with links to them, and any relevant information about the updates.
