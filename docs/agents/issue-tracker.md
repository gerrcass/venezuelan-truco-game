# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations. The repo is `gerrcass/venezuelan-truco-game`.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body-file <file>`. Use a heredoc or a file for multi-line bodies.
- **Read an issue**: `gh issue view <number> --json number,title,body,labels,comments`.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Make an issue a sub-issue of a parent**: `gh issue create --parent <parent> ...`, or `gh issue edit <parent> --add-sub-issue <child>` afterwards (`gh` 2.94+).
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v`; `gh` does this automatically when run inside a clone.

## Blocking edges

Use GitHub's **native issue dependencies** as the canonical representation. Add an edge with:

```sh
gh api --method POST repos/gerrcass/venezuelan-truco-game/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>
```

`<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/gerrcass/venezuelan-truco-game/issues/<n> --jq .id`), not the `#number`. If dependencies are unavailable, put `Blocked by: #<n>, #<n>` at the top of the child body.

A ticket is unblocked when every blocker is closed. Work the frontier: any ticket whose blockers are all done.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## When a skill says "publish to the issue tracker"

Create a GitHub issue. Apply `ready-for-agent` to specs and tickets.

## When a skill says "fetch the relevant ticket"

Read it as in **Read an issue** above.

## Closing work

When a ticket is complete, comment with what shipped and the commit/PR that proves it, then close it. Do not close a ticket just because a PR is open. A spec issue closes when the integration PR merges.
