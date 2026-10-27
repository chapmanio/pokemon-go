# Matt Pocock skills review

Reviewed `mattpocock/skills` at commit [`59db609`](https://github.com/mattpocock/skills/tree/59db609eb1e18aaf59b63284d0e52255aff0c63c), checked out on 2026-10-27. The project directory currently contains planning documents only; it is not a Git worktree and has no configured issue tracker.

## Recommendation

Adopt a small, staged subset of the skills as practices rather than installing the whole workflow:

1. **Now, during discovery:** use `grill-with-docs` with `domain-modeling` for unresolved decisions about the stack, source adapters, normalized models, freshness semantics, and the first slice. Use `codebase-design` selectively when those decisions establish interfaces and test seams.
2. **After the discovery gate:** use `to-tickets` only if the project wants dependency-aware tickets, then use `implement` with `tdd` for one bounded raids slice.
3. **At completion:** use `code-review` as an independent standards/spec review, while retaining this project’s separate product review and human approval step. Use `retro` after a real implementation session to improve checks and agent guidance.

This preserves the project’s existing lightweight coordinator loop and adds discipline where it is currently missing, without introducing a tracker, task graph, or multi-worktree process before the project has code to coordinate. The project’s own discovery gate requires the stack, representative source fixtures, normalized models, reliability rules, and first-slice acceptance criteria before implementation; the first slice is raids. [`docs/development-process.md`](development-process.md#current-stage-discovery)

## Fit by workflow stage

| Stage | Useful skill(s) | Fit for this project |
|---|---|---|
| Pre-build planning | [`grill-with-docs`](https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/grill-with-docs/SKILL.md#L1-L7), [`domain-modeling`](https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/domain-modeling/SKILL.md#L6-L8), [`codebase-design`](https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/codebase-design/SKILL.md#L6-L8) | **Useful now, narrowly.** The first two sharpen terminology and record only meaningful domain decisions; that matches the need to define Pokémon, move, raid, event, source, freshness, and estimate concepts. `codebase-design` is useful once adapters and normalized-model interfaces are being chosen: it emphasizes a small interface, a clean seam, and testing through that interface. The project already has product and reliability documents, so these should refine gaps rather than duplicate settled decisions. |
| Lightweight coordinator workflow | [`to-tickets`](https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/to-tickets/SKILL.md#L7-L11) | **Useful later, optional.** Its tracer-bullet vertical slices and explicit blocking edges fit the project’s bounded-slice and one-owner rules, and its local-file mode could work if the project chooses a local tracker. It should wait until the raids acceptance criteria and implementation order are stable. |
| Implementation | [`implement`](https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/implement/SKILL.md#L7-L16) | **Useful later.** It closely matches the existing process: call TDD at agreed seams, run checks regularly and fully at the end, then review before committing. It assumes a spec or tickets, so it is not actionable during the current documentation-only stage. |
| Testing | [`tdd`](https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/tdd/SKILL.md#L6-L24) | **Useful when code starts.** Its behavior-through-public-interface rule fits the project’s ingestion, validation, caching, and UI requirements. Its requirement to agree seams before tests and to work red → green in vertical slices gives the project a concrete testing discipline for source fixtures, stale/invalid data, and the raids path. [`docs/reliability.md`](reliability.md#validation) |
| Review | [`code-review`](https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/code-review/SKILL.md#L6-L23) | **Useful later.** Its separate Standards and Spec axes complement the project’s independent product review. It requires a fixed Git comparison point, a non-empty diff, and a spec source, none of which exist yet. It should supplement, not replace, the project’s check against `docs/product.md` and `docs/features.md`. |
| Feedback and improvement | [`retro`](https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/retro/SKILL.md#L7-L25), [`research`](https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/research/SKILL.md#L1-L12) | **Useful in specific moments.** `research` fits bounded data-source questions because the project must fetch sample payloads and inspect freshness signals, and the skill requires primary sources plus cited Markdown findings. `retro` belongs after an implementation session, when there are actual checks, navigation problems, or review misses to improve. |

## Useful, but not at this stage

- `setup-matt-pocock-skills` is a sensible prerequisite if the project later adopts the full engineering set: it configures the issue tracker, triage labels, and domain-doc layout. It is not appropriate to run now because there is no Git remote or tracker, and the user requested a report rather than repository setup. [`setup-matt-pocock-skills`](https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/setup-matt-pocock-skills/SKILL.md#L7-L15)
- `to-spec` is useful once a concrete feature conversation exists and a tracker has been selected; its required output is a published tracker spec with implementation and testing decisions. It is premature while the project is still agreeing foundational discovery decisions. [`to-spec`](https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/to-spec/SKILL.md#L7-L19)
- `prototype` could answer a specific UI or state-model question, but the project has not chosen a stack or reached UI design. Use it only when a concrete uncertainty cannot be resolved cheaply in prose. [`prototype`](https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/prototype/SKILL.md#L6-L17)

## Unnecessary at this stage

Defer `implement-spec`: it is designed for an entire spec on an integration branch with parallel implementer worktrees and task-graph frontier management, which is substantially heavier than this project’s stated one-agent-at-a-time coordinator loop. [`implement-spec`](https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/implement-spec/SKILL.md#L7-L18)

Also unnecessary now are `triage` (no issue tracker or labels), `wayfinder` (the project is not yet a multi-session decision map), `improve-codebase-architecture` (there is no implementation to scan), `diagnosing-bugs` (no reported bug), `pr` (no Git branch or pull request), and `retro` until a session has occurred. The repository’s current scope is discovery, with raids as the first vertical slice, so these would add process overhead without closing a present gap. [`docs/development-process.md`](development-process.md#current-stage-discovery)

The remaining productivity, writing, exercise, migration, and repository-guardrail skills are not relevant to the requested pre-build-to-feedback path unless a separate need arises.

## Bottom line

Use `grill-with-docs`/`domain-modeling` and selective `codebase-design` to finish discovery; then `to-tickets` (optional), `implement` + `tdd`, `code-review`, and finally `retro`. Keep the project’s existing coordinator, reliability, product-review, and human-approval rules as the governing workflow. Do not introduce `setup-matt-pocock-skills` or the heavier tracker/integration-branch machinery until the project has a Git-backed implementation and a deliberate decision to adopt them.
