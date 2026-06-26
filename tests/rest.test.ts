import { describe, expect, test } from 'bun:test';
import { HttpError, ResponseParseError, RestAPI } from '../src';

describe('RestAPI', () => {
  test('parses application/json responses with charset parameters', async () => {
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch() {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'content-type': 'application/json; charset=utf-8' },
        });
      },
    });

    try {
      const rest = new RestAPI(server.url.toString());

      await expect(
        rest.request<{ ok: boolean }>('GET', '/json'),
      ).resolves.toEqual({ ok: true });
    } finally {
      server.stop();
    }
  });

  test('returns binary responses for synthesis', async () => {
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch() {
        return new Response(new Uint8Array([4, 5, 6]), {
          headers: { 'content-type': 'audio/wav' },
        });
      },
    });

    try {
      const rest = new RestAPI(server.url.toString());
      const result = await rest.synthesis(
        {
          accent_phrases: [],
          speedScale: 1,
          pitchScale: 0,
          intonationScale: 1,
          volumeScale: 1,
          prePhonemeLength: 0.1,
          postPhonemeLength: 0.1,
          outputSamplingRate: 24000,
          outputStereo: false,
          kana: 'テスト',
        },
        { speaker: 13 },
      );

      expect(new Uint8Array(result)).toEqual(new Uint8Array([4, 5, 6]));
    } finally {
      server.stop();
    }
  });

  test('throws explicit errors for HTTP failures', async () => {
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch() {
        return new Response('invalid request', { status: 400 });
      },
    });

    try {
      const rest = new RestAPI(server.url.toString());
      const error = await rest.getPresets().catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(HttpError);
      expect(error).toMatchObject({
        body: 'invalid request',
        method: 'GET',
        path: '/presets',
        status: 400,
      });
    } finally {
      server.stop();
    }
  });

  test('throws explicit errors for invalid JSON payloads', async () => {
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch() {
        return new Response('{invalid json', {
          headers: { 'content-type': 'application/json' },
        });
      },
    });

    try {
      const rest = new RestAPI(server.url.toString());

      await expect(rest.getSpeakers()).rejects.toThrow(ResponseParseError);
    } finally {
      server.stop();
    }
  });
});
