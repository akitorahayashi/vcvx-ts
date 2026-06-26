import { describe, expect, test } from 'bun:test';
import {
  ClientConfigurationError,
  type FetchLike,
  HttpError,
  HttpTransport,
  ResponseParseError,
} from '../src';

describe('HttpTransport', () => {
  test('builds URLs with query parameters', async () => {
    const fetcher: FetchLike = async (input) => {
      expect(String(input)).toBe(
        'https://api.example.test/resources?active=true&limit=10',
      );

      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'content-type': 'application/json' },
      });
    };

    const transport = new HttpTransport({
      baseUrl: 'https://api.example.test',
      fetch: fetcher,
    });

    await expect(
      transport.request<{ ok: boolean }>({
        method: 'GET',
        path: '/resources',
        query: { active: true, limit: 10 },
      }),
    ).resolves.toEqual({ ok: true });
  });

  test('throws explicit errors for HTTP failures', async () => {
    const transport = new HttpTransport({
      baseUrl: 'https://api.example.test',
      fetch: async () => new Response('missing', { status: 404 }),
    });

    const error = await transport
      .request({ method: 'GET', path: '/missing' })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ body: 'missing', status: 404 });
  });

  test('throws explicit errors for non-json responses', async () => {
    const transport = new HttpTransport({
      baseUrl: 'https://api.example.test',
      fetch: async () =>
        new Response('plain text', {
          headers: { 'content-type': 'text/plain' },
        }),
    });

    await expect(
      transport.request({ method: 'GET', path: '/plain' }),
    ).rejects.toThrow(ResponseParseError);
  });

  test('requires a base URL', () => {
    expect(() => new HttpTransport({ baseUrl: '' })).toThrow(
      ClientConfigurationError,
    );
  });
});
