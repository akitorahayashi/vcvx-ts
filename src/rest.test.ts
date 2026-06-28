import { describe, expect, test } from 'bun:test';
import { RestAPI, VoicevoxError } from './index';

describe('RestAPI unit', () => {
  test('requires an HTTP or HTTPS engine URL', () => {
    expect(() => new RestAPI('')).toThrow(VoicevoxError);
    expect(() => new RestAPI('file:///voicevox')).toThrow(
      'VOICEVOX engine URL must use HTTP or HTTPS',
    );
  });

  test('builds URLs from paths with or without a leading slash', async () => {
    const urls: string[] = [];
    const rest = new RestAPI('https://api.example.test', {
      fetch: async (input) => {
        urls.push(String(input));

        return Response.json({ ok: true });
      },
    });

    await expect(
      rest.request<{ ok: boolean }>('GET', 'json', {
        params: { speaker: 13 },
      }),
    ).resolves.toEqual({ ok: true });
    await expect(
      rest.request<{ ok: boolean }>('GET', '/json'),
    ).resolves.toEqual({ ok: true });

    expect(urls).toEqual([
      'https://api.example.test/json?speaker=13',
      'https://api.example.test/json',
    ]);
  });

  test('wraps fetch failures in a voicevox error', async () => {
    const rest = new RestAPI('https://api.example.test', {
      fetch: async () => {
        throw new TypeError('network down');
      },
    });

    await expect(rest.getSpeakers()).rejects.toThrow(VoicevoxError);
    await expect(rest.getSpeakers()).rejects.toThrow(
      'VOICEVOX connection or network failure',
    );
  });
});
