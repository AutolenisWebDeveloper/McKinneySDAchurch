# Vendored Claude Code plugins

This directory contains **version-pinned, faithful copies** of two third-party Claude Code
plugins, committed into the repo so every clone can enable the same tooling without a separate
install step. They implement the "engineering execution" and "frontend/UX quality" layers
described in the capability hierarchy in the root `CLAUDE.md`.

| Plugin | Version | Upstream | License | Provides |
|---|---|---|---|---|
| `superpowers` | 6.2.0 | [obra/superpowers](https://github.com/obra/superpowers) | MIT (© Jesse Vincent) | 14 skills: TDD, systematic debugging, brainstorming, writing/executing plans, verification-before-completion, requesting/receiving code review, subagent & parallel-agent workflows, git worktrees, finishing a branch, writing skills. Ships a **SessionStart hook**. |
| `impeccable` | 4.0.4 | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | Apache-2.0 (© Paul Bakaus) | 1 skill / 23 commands (`/impeccable polish · audit · critique · shape · animate · layout · clarify · distill · harden · optimize · init · document · extract · live` …), 4 subagents. Ships **PostToolUse + Stop hooks** (Node ≥22). |

These are unmodified upstream snapshots except that VCS metadata (`.git`), local-state markers
(`.in_use`), nested CI (`.github`, `.pre-commit-config.yaml`), and non-Claude harness folders
(`.cursor-plugin`, `.codex-plugin`, etc.) were removed to keep the vendored copy lean and
Claude-focused. Upstream `LICENSE`/`NOTICE` files are preserved. To update, re-vendor from the
pinned upstream tag rather than hand-editing these trees.

## How to enable (per developer, one time)

These are registered as a **local marketplace** (`.claude-plugin/marketplace.json`). They are
**not force-enabled for everyone** — enabling activates third-party skills and (below) hooks, so
each developer opts in:

```
/plugin marketplace add ./.claude/plugins      # register this repo's local marketplace
/plugin install superpowers@mckinney-vendored
/plugin install impeccable@mckinney-vendored
```

(Or the non-interactive CLI: `claude plugin marketplace add ./.claude/plugins` then
`claude plugin install superpowers@mckinney-vendored` / `impeccable@mckinney-vendored`.)

Skills and commands activate on the next session start.

## ⚠️ Executable hooks — review before enabling

Both plugins register **hooks that run automatically**, which means enabling them lets
third-party code execute in every session:

- **superpowers** — a `SessionStart` hook (`hooks/run-hook.cmd session-start`) that injects
  skill-discovery context.
- **impeccable** — `PostToolUse` (on `Edit`/`Write`/`MultiEdit`) and `Stop` hooks that run
  `skills/impeccable/scripts/hook.mjs` (a "design deep pass"; requires Node ≥22). These fire
  only on UI-edit activity.

This is normal, documented behavior for these tools and the authors are reputable — but because
this platform handles member PII, treat enabling them as a **supply-chain decision**. Review the
hook scripts (`.claude/plugins/*/hooks/`, `.claude/plugins/impeccable/skills/impeccable/scripts/`)
and pin/update deliberately. Enable per developer via the commands above; do not wire the hooks
into a shared `settings.json` without team agreement.

## How these relate to the project Skills

Superpowers governs **how** engineering work is executed; Impeccable governs **frontend/UX
execution quality** (inside the McKinney design system and tokens — it must not change brand
tokens, portal architecture, RBAC, workflows, safeguarding, the AdventistGiving boundary, or
approved terminology). Neither overrides the McKinney SDA project Skills in `.claude/skills/`,
which define **what** architectural/security/safeguarding invariants must be preserved. See the
"Capability hierarchy & Skill composition" section of the root `CLAUDE.md`.
