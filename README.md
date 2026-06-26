# vcvx-ts

A Bun and TypeScript client for the VOICEVOX engine API.

The repository targets VOICEVOX Engine `0.25.2` first. The initial public
boundary covers the endpoints that `avs` already relies on:

- `/speakers`
- `/audio_query`
- `/synthesis`

Runtime validation is applied only at the VOICEVOX API boundary. Application
formats such as `scene_narration/v1`, caption constraints, output paths, and
CLI option combinations remain owned by callers such as `avs`.

## Setup

```sh
bun install
```

## Engine

```sh
bun run serve
```

The `serve` script starts the local Docker image
`voicevox/voicevox_engine:cpu-ubuntu22.04-0.25.2` on `http://127.0.0.1:50021`.

## Usage

```ts
import { synthesizeWav } from 'vcvx-ts';

const wav = await synthesizeWav('http://127.0.0.1:50021', 'こんにちは', {
  speakerId: 13,
  speedScale: 1.1,
  pitchScale: 0,
  intonationScale: 1,
  volumeScale: 0.9,
  prePhonemeLength: 0.1,
  postPhonemeLength: 0.1,
});

await Bun.write('voice.wav', wav);
```

```ts
import Client from 'vcvx-ts';

const client = new Client('http://127.0.0.1:50021');
await client.assertSpeakerExists(13);

const wav = await client.synthesize('こんにちは', 13, {
  query: {
    speedScale: 1.1,
    volumeScale: 0.9,
  },
});

await Bun.write('voice.wav', new Uint8Array(wav));
```

The package exports its public API from `src/index.ts`. Bun projects can consume
the repository directly from a GitHub URL dependency.

## Public API

- `Client` creates audio queries, synthesizes WAV audio, loads speakers and
  presets, and validates speaker ids.
- `RestAPI` owns HTTP requests, query serialization, response parsing, and HTTP
  error handling.
- `synthesizeWav` supports the `avs` style `engineUrl`, `text`, `profile`
  boundary and returns WAV bytes.
- `audioQuery` represents a mutable VOICEVOX audio query and can synthesize WAV
  audio through the engine.
- `parseVoicevoxProfile` validates speaker id and synthesis profile values.
- `Speaker` and `Preset` wrap the corresponding engine payloads.
- `VoicevoxError`, `HttpError`, `ResponseParseError`,
  `ResponseValidationError`, and `RequestValidationError` surface client and
  protocol failures explicitly.

## Development

```sh
bun run fix
bun run check
bun test
```
