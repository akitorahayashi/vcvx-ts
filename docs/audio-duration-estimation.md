# Audio Duration Estimation

## Scope

This document describes how VOICEVOX `audio_query` output can be used to
estimate speech duration before synthesizing WAV audio.

The current measurements target:

- VOICEVOX Engine 0.25.2
- Talk synthesis through `/audio_query` and `/synthesis`
- Speaker style ID 2 for the primary measurement set
- `speedScale: 1.15`
- `pitchScale: 0`
- `intonationScale: 1`
- `prePhonemeLength: 0`
- `postPhonemeLength: 0`

The findings apply directly to this profile. Speaker, style, speed, pause
controls, boundary silence, output codec, and downstream duration parsers can
change observed duration.

## Query Duration

`/audio_query` returns accent phrases containing moras and optional pause moras.
The query output is the best pre-synthesis source for speech timing because the
engine has already parsed text, punctuation, pronunciation, accent phrases, and
speaker-specific timing.

For one query, a useful estimate is:

```text
(sum of consonant lengths + vowel lengths + pause-mora lengths) / speedScale
```

Only non-null lengths are included. `prePhonemeLength` and `postPhonemeLength`
are boundary silence controls and are handled separately from mora and
pause-mora timing.

Synthesized WAV duration remains authoritative when exact timing is required.
In measured 0.25.2 cases, the query calculation is close to WAV duration but
can differ by roughly 10 to 15 milliseconds on short sentences due to synthesis
and sample-grid behavior.

## Measured Results

A VOICEVOX Engine 0.25.2 smoke check against synthesized WAV output produced:

| Case | Query estimate | WAV duration | Difference |
| --- | ---: | ---: | ---: |
| `犬が走り、猫が止まります。` | 1.912 s | 1.899 s | -0.013 s |
| `犬が走り` + `猫が止まります。` | 1.579 s | 1.568 s | -0.011 s |
| `できるのでしょうか` | 0.920 s | 0.907 s | -0.013 s |
| `できるのでしょうか。` | 0.920 s | 0.907 s | -0.013 s |
| Project-like long sentence | 4.588 s | 4.587 s | -0.001 s |

Across a production corpus that synthesized each narration block independently,
93 blocks produced:

| Measurement | Result |
| --- | ---: |
| VOICEVOX audio-query estimate | 109.877 s |
| ffprobe MP3 total | 110.421 s |
| Remotion MP3 total | 115.824 s |
| Mean Remotion overhead per block | 58.1 ms |
| Characters per ffprobe second | 7.66 |
| Characters per rendered second | 7.30 |
| Moras per ffprobe second | 9.23 |
| Moras per rendered second | 8.80 |

The audio-query estimate differed from the ffprobe MP3 total by approximately
0.49% for this corpus. Downstream encoded formats and media parsers can add
per-file overhead that is outside VOICEVOX itself.

## Punctuation

Punctuation duration is contextual. It should not be modeled as a fixed number
of seconds per punctuation character.

Preliminary paired measurements with all voice settings held constant showed:

| Change | Observed duration change |
| --- | ---: |
| Add `、` inside a sentence | +0.437 s |
| Add `。` between sentences | +0.320 s |
| Change an internal `。` to `。。` | 0.000 s |
| Add Japanese quotation marks around a phrase | +0.608 s |
| Add Japanese parentheses around a phrase | +0.800 s |
| Add ASCII parentheses around a phrase | +0.800 s |
| Change `カ` to `カー` | +0.107 s |

The following terminal forms all produced 0.906667 seconds in the measured
profile:

- `できるのでしょうか`
- `できるのでしょうか。`
- `できるのでしょうか。。`

A terminal period therefore does not necessarily create a pause. An internal
period can create a VOICEVOX pause mora, while the same character at the end of
a block can have no duration effect.

Repeated punctuation is not additive. `ー` is not a pause marker; it changes
pronunciation and mora count.

## Segmentation

Block boundaries change timing independently of punctuation. For the sentence
`犬が走り、猫が止まります。`:

| Form | Duration |
| --- | ---: |
| One block with the internal comma | 1.899 s |
| Two blocks split at the comma | 1.568 s |

Splitting removed the internal comma pause in this example, making the speech
0.331 seconds shorter before any encoded-file overhead is considered.

Accurate estimates require the final block structure:

- More independently encoded blocks can increase downstream codec and parser
  overhead.
- Moving punctuation to a block boundary can remove an in-text pause.
- Different segmentation can cause VOICEVOX to produce different accent
  phrases and phoneme lengths.

## Estimation Strategy

Character density is useful for early script budgeting, but it is not the
authoritative timing calculation.

| Stage | Estimator |
| --- | --- |
| Initial script drafting | Approximate non-punctuation characters per second |
| Completed narration blocks | VOICEVOX audio-query phoneme and pause durations |
| Pre-synthesis media estimate | Audio-query estimate plus measured per-block output overhead |
| Exact synthesized audio | WAV sample duration |

An application-level estimator should record:

- Engine and core version
- Speaker and style ID
- Synthesis profile values
- Source text
- Final block count and block boundaries
- Character and mora counts
- Accent phrase count
- Phoneme and pause-mora duration
- WAV sample duration when synthesized
- Encoded media duration when an output codec is involved

The query model should predict WAV duration from speaker-specific phoneme and
pause lengths, speed, effective boundary silence, and pause controls. Render or
playback estimates should add application-specific codec and parser overhead
outside the VOICEVOX client.

## Current Invariants

- Character count alone is not a stable timing source.
- Punctuation duration depends on position and VOICEVOX parsing.
- Block boundaries can remove pauses and change pronunciation analysis.
- Final block structure is required for accurate prediction.
- VOICEVOX `audio_query` output is the authoritative pre-synthesis timing
  source.
- Synthesized WAV sample duration is the authoritative post-synthesis VOICEVOX
  duration.
