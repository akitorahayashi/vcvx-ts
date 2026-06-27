# AGENTS.md

## Directory Structure

```text
src/
  index.ts            Public export boundary
  client.ts           User-facing VOICEVOX client
  rest.ts             HTTP request and response boundary
  audio_query.ts      Mutable audio query object with synthesis
  speaker.ts          Speaker response wrapper
  preset.ts           Preset response wrapper
  synthesis.ts        Profile-based WAV synthesis helper
  duration-estimate.ts
                      Audio query duration estimation
  voicevox-profile.ts VOICEVOX synthesis profile contract
  errors.ts           Client and protocol errors
  types/
    *.ts              VOICEVOX payload types and endpoint response schemas
tests/
  client.test.ts            Tests for src/client.ts
  rest.test.ts              Tests for src/rest.ts
  synthesis.test.ts         Tests for src/synthesis.ts
  duration-estimate.test.ts Tests for src/duration-estimate.ts
  voicevox-profile.test.ts  Tests for src/voicevox-profile.ts
  types/
    audioquery.test.ts      Tests for src/types/audioquery.ts
    speaker.test.ts         Tests for src/types/speaker.ts
scripts/
  generate-api-reference.ts Generate docs/api-reference.md from OpenAPI
  measure-duration.ts       Compare duration estimates with WAV durations
fixtures/
  duration-test-cases.json  Duration measurement test cases
docs/
  api-reference.md          Generated VOICEVOX Engine HTTP API reference
  audio-duration-estimation.md
                            Duration estimation notes based on audio_query
  audio-duration-measurement.md
                            Generated duration measurement report
```

## Architecture

### Compatibility Target

The repository targets VOICEVOX Engine `0.25.2` first. Compatibility work is
measured against the endpoints and payload shapes needed by `avs`.

### Public API

`src/index.ts` owns the package export surface. Package consumers import from
the package root rather than from nested source files.

### Client

`client.ts` owns high-level VOICEVOX operations. The client exposes speaker
discovery, speaker validation, audio query creation, and synthesis flows.

### REST Boundary

`rest.ts` owns URL construction, query serialization, JSON request bodies,
binary response handling, and explicit HTTP or parse failures.

### Runtime Contracts

Zod validates untrusted VOICEVOX responses and caller-provided synthesis
profiles. Runtime validation is scoped to the VOICEVOX API contract. Caller
formats, captions, output paths, and CLI modes are outside this package.

### Test Mapping

Each test file corresponds to one implementation file in `src/`. Test names are
derived from the implementation file they cover rather than from cross-cutting
concepts such as `api`, `validation`, or `integration`. Files under `src/types/`
map to `tests/types/` with the same basename.

### Query Model

`audio_query.ts` owns the mutable VOICEVOX audio query object returned by
`/audio_query` and `/audio_query_from_preset`.

### Duration Estimation

`duration-estimate.ts` owns speech duration estimates derived from VOICEVOX
`audio_query` payloads. `scripts/measure-duration.ts` compares those estimates
with synthesized WAV sample durations.

### Documentation

`docs/api-reference.md` is generated from the running VOICEVOX Engine
`/openapi.json` by `scripts/generate-api-reference.ts`. Manual edits belong in
the generator or in non-generated documentation.

`docs/audio-duration-measurement.md` is generated from a running VOICEVOX
Engine and `fixtures/duration-test-cases.json`.

## Development Commands

```sh
bun run serve    # Start VOICEVOX Engine 0.25.2 in Docker
bun run docs:api # Regenerate docs/api-reference.md from /openapi.json
bun run measure:duration
                 # Compare estimates with WAV durations and regenerate report
bun run fix      # Biome autofix
bun run check    # Biome lint + tsc --noEmit
bun test         # Run all tests
```

## Development Guidelines

- Tests assert public behavior through exports from `src/index.ts`.
- Test filenames correspond to implementation filenames so the owning test file
  is discoverable from the edited source file.
- HTTP behavior is verified with local test servers rather than external engine
  availability.
- Runtime schemas cover VOICEVOX API payloads and profile/query inputs only.
- Documentation describes the current public boundary and compatibility target.
