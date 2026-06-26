# Contributing

## Scope

This repository owns:

- `src/` — the VOICEVOX client, REST boundary, query model, wrappers, and
  payload types
- `tests/` — public client and HTTP behavior tests
- `.github/workflows/` — CI automation

## Workflow

1. Run `bun run fix`.
2. Run `bun run check`.
3. Run `bun test`.

## Runtime

The Bun version is fixed by the `packageManager` field in `package.json`. The
default local engine target is VOICEVOX Engine `0.25.2` through `bun run serve`.
