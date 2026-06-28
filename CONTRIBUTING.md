# Contributing

## Scope

This repository owns:

- `src/` — client, REST boundary, query model, profile contract, wrappers, payload types, runtime API validation, and colocated unit tests
- `tests/` — integration tests
- `.github/workflows/` — CI automation

## Testing Policy

- Unit tests live next to source files under `src/` and test pure transformations.
- Integration tests live under `tests/` and test filesystem, CLI, subprocess, or network behavior.

## Workflow

1. Run `bun run fix`.
2. Run `bun run check`.
3. Run `bun test`.

## Runtime

The Bun version is fixed by the `packageManager` field in `package.json`. The
default local engine target is VOICEVOX Engine `0.25.2` through `bun run serve`.
