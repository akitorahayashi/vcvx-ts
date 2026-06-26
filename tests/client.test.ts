import { describe, expect, test } from 'bun:test';
import { ExampleClient, type FetchLike } from '../src';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  });
}

describe('ExampleClient', () => {
  test('lists resources through the public client API', async () => {
    const fetcher: FetchLike = async (input) => {
      expect(String(input)).toBe('https://api.example.test/resources');

      return jsonResponse({
        resources: [{ id: 'resource-1', name: 'First resource' }],
      });
    };

    const client = new ExampleClient({
      baseUrl: 'https://api.example.test',
      fetch: fetcher,
    });

    await expect(client.listResources()).resolves.toEqual([
      { id: 'resource-1', name: 'First resource' },
    ]);
  });

  test('creates resources with a JSON request body', async () => {
    const fetcher: FetchLike = async (_input, init) => {
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ name: 'Created resource' }));

      return jsonResponse({ id: 'resource-2', name: 'Created resource' });
    };

    const client = new ExampleClient({
      baseUrl: 'https://api.example.test',
      fetch: fetcher,
    });

    await expect(
      client.createResource({ name: 'Created resource' }),
    ).resolves.toEqual({ id: 'resource-2', name: 'Created resource' });
  });
});
