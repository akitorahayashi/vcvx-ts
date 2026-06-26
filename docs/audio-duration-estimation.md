# Audio Duration Estimation

## Scope

This document describes how vcvx-ts estimates VOICEVOX speech duration before
audio synthesis and how the estimate is recalibrated against a running
VOICEVOX Engine.

The estimation boundary is VOICEVOX talk synthesis through `/audio_query`.
MP3 encoding, Remotion duration parsing, timeline assembly, and application
block scheduling are outside vcvx-ts and remain owned by downstream projects.

## Estimation Model

`/audio_query` returns accent phrases containing moras and optional pause moras.
This payload is the authoritative pre-synthesis timing source because the
engine has already parsed text, punctuation, pronunciation, accent phrases, and
speaker-specific timing.

vcvx-ts exposes two estimation functions:

- `estimateAudioQueryDuration(query)` calculates timing from an existing
  `audio_query` payload.
- `estimateSpeechDuration(engineUrl, text, profile)` calls `/audio_query`,
  applies the supplied synthesis profile, and estimates duration without
  calling `/synthesis`.

For each query, vcvx-ts calculates:

```text
scaled phoneme seconds = sum(mora consonant and vowel lengths) / speedScale
scaled pause seconds = sum(pause-mora consonant and vowel lengths) / speedScale
boundary seconds = prePhonemeLength + postPhonemeLength
total seconds = scaled phoneme seconds + scaled pause seconds + boundary seconds
```

`speedScale` must be positive. Nonpositive speed values are invalid for
duration estimation.

## Measurement Workflow

`scripts/measure-duration.ts` measures the estimation model against a running
VOICEVOX Engine using `fixtures/duration-test-cases.json`.

The measurement command runs both `/audio_query` and `/synthesis` for the same
test cases:

```sh
bun run measure:duration
```

The generated files are `.tmp/audio-duration-measurement.json` and
`docs/audio-duration-measurement.md`. They record:

- Engine version and core versions
- Speaker style and synthesis profile
- Speed-scale matrix
- Duration test case results
- vcvx-ts estimate seconds
- Synthesized WAV seconds
- Estimate-to-WAV error

The test cases include punctuation minimal pairs, segmentation cases, digits,
counters, small kana, long vowels, and production-like narration text.

## Version Changes

VOICEVOX Engine upgrades are evaluated by rerunning `bun run measure:duration`
against the upgraded engine. The regenerated report shows whether vcvx-ts
duration estimates still match synthesized WAV duration.

The query layer is the estimator used before synthesis. WAV sample duration is
the authoritative VOICEVOX post-synthesis duration. Differences between query
and WAV timing are calibration evidence, not handwritten constants.

Downstream media layers are measured separately by applications that own those
layers. A project that encodes MP3 or parses media duration adds its own codec
and parser correction after the vcvx-ts query estimate.

## Current Invariants

- Character count alone is not a stable timing source.
- Punctuation duration depends on position and VOICEVOX parsing.
- Block boundaries can remove pauses and change pronunciation analysis.
- Final block structure is required for accurate prediction.
- VOICEVOX `audio_query` output is the authoritative pre-synthesis timing
  source.
- Synthesized WAV sample duration is the authoritative post-synthesis VOICEVOX
  duration.
