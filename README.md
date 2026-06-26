# vcvx-ts

A Bun and TypeScript client for the VOICEVOX engine API.

The repository targets VOICEVOX Engine `0.25.2` first. The initial public
boundary covers the endpoints that `avs` already relies on:

- `/speakers`
- `/audio_query`
- `/synthesis`

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
- `audioQuery` represents a mutable VOICEVOX audio query and can synthesize WAV
  audio through the engine.
- `Speaker` and `Preset` wrap the corresponding engine payloads.
- `VoicevoxError`, `HttpError`, and `ResponseParseError` surface client and
  protocol failures explicitly.

## Development

```sh
bun run fix
bun run check
bun test
```
