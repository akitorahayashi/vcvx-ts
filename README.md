# bun-client

A Bun and TypeScript API client template.

## Setup

```sh
bun install
```

## Usage

```ts
import { ExampleClient } from 'bun-client';

const client = new ExampleClient({
  baseUrl: 'https://api.example.test',
});

const resources = await client.listResources();
console.log(resources);
```

## Development

```sh
bun run fix
bun run check
bun test
```

The package exports its public API from `src/index.ts`. Bun projects can consume the repository directly from a GitHub URL dependency.

## Structure

- `src/client.ts` exposes the user-facing client class.
- `src/transport.ts` owns fetch, URL construction, JSON parsing, and HTTP errors.
- `src/types/` contains typed API request and response models.
- `src/errors.ts` contains client-specific error classes.
