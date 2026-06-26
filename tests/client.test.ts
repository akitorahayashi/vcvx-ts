import { describe, expect, test } from 'bun:test';
import Client, {
  HttpError,
  RequestValidationError,
  synthesizeWav,
} from '../src';

describe('Client', () => {
  test('creates an audio query and applies query overrides during synthesis', async () => {
    const requests: Array<{
      body: string;
      method: string;
      pathname: string;
      search: string;
    }> = [];
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      async fetch(request) {
        const url = new URL(request.url);
        requests.push({
          body: await request.text(),
          method: request.method,
          pathname: url.pathname,
          search: url.search,
        });

        if (url.pathname === '/audio_query') {
          return Response.json({
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
          });
        }

        if (url.pathname === '/synthesis') {
          return new Response(new Uint8Array([0, 1, 2, 3]), {
            headers: { 'content-type': 'audio/wav' },
            status: 200,
          });
        }

        return new Response('unexpected request', { status: 500 });
      },
    });

    try {
      const client = new Client(server.url.toString());
      const wav = await client.synthesize('hello world', 13, {
        core_version: '0.15.6',
        enable_interrogative_upspeak: true,
        query: {
          speedScale: 1.2,
          volumeScale: 0.9,
        },
      });

      expect(new Uint8Array(wav)).toEqual(new Uint8Array([0, 1, 2, 3]));
      expect(requests).toHaveLength(2);
      expect(requests[0]).toMatchObject({
        body: '',
        method: 'POST',
        pathname: '/audio_query',
        search: '?text=hello+world&speaker=13&core_version=0.15.6',
      });
      expect(requests[1]).toMatchObject({
        method: 'POST',
        pathname: '/synthesis',
        search:
          '?speaker=13&enable_interrogative_upspeak=true&core_version=0.15.6',
      });
      const synthesisRequest = requests[1];
      expect(synthesisRequest).toBeDefined();
      if (synthesisRequest === undefined) {
        throw new Error('Missing synthesis request');
      }

      expect(JSON.parse(synthesisRequest.body)).toEqual({
        accent_phrases: [],
        speedScale: 1.2,
        pitchScale: 0,
        intonationScale: 1,
        volumeScale: 0.9,
        prePhonemeLength: 0.1,
        postPhonemeLength: 0.1,
        outputSamplingRate: 24000,
        outputStereo: false,
        kana: 'テスト',
      });
    } finally {
      server.stop();
    }
  });

  test('collects speaker ids from the speakers response', async () => {
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch(request) {
        const url = new URL(request.url);
        if (url.pathname === '/speakers') {
          return Response.json([
            {
              name: 'speaker-a',
              speaker_uuid: 'speaker-a',
              styles: [
                { id: 13, name: 'Normal', type: 'talk' },
                { id: 8, name: 'Calm', type: 'talk' },
              ],
              supported_features: {
                permitted_synthesis_morphing: 'SELF_ONLY',
              },
              version: '0.25.2',
            },
            {
              name: 'speaker-b',
              speaker_uuid: 'speaker-b',
              styles: [{ id: 21, name: 'Fast', type: 'talk' }],
              supported_features: {
                permitted_synthesis_morphing: 'NOTHING',
              },
              version: '0.25.2',
            },
          ]);
        }

        return new Response('unexpected request', { status: 500 });
      },
    });

    try {
      const client = new Client(server.url.toString());

      await expect(client.fetchSpeakerIds()).resolves.toEqual([8, 13, 21]);
      await expect(client.assertSpeakerExists(21)).resolves.toBeUndefined();
      await expect(client.assertSpeakerExists(900)).rejects.toThrow(
        'VOICEVOX speaker id 900 does not exist. Available ids: 8, 13, 21',
      );
    } finally {
      server.stop();
    }
  });

  test('surfaces HTTP failures from the public client API', async () => {
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch() {
        return new Response('missing speaker', { status: 404 });
      },
    });

    try {
      const client = new Client(server.url.toString());

      const error = await client
        .fetchSpeakers()
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(HttpError);
      expect(error).toMatchObject({
        body: 'missing speaker',
        method: 'GET',
        path: '/speakers',
        status: 404,
      });
    } finally {
      server.stop();
    }
  });

  test('rejects invalid query overrides before synthesis', async () => {
    let requests = 0;
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch(request) {
        requests += 1;
        const url = new URL(request.url);
        if (url.pathname === '/audio_query') {
          return Response.json({
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
          });
        }

        return new Response('unexpected request', { status: 500 });
      },
    });

    try {
      const client = new Client(server.url.toString());

      await expect(
        client.synthesize('hello', 13, {
          query: { speedScale: Number.NaN },
        }),
      ).rejects.toThrow(RequestValidationError);
      expect(requests).toBe(0);
    } finally {
      server.stop();
    }
  });

  test('synthesizes wav bytes from a voicevox profile', async () => {
    const requests: Array<{ body: string; pathname: string }> = [];
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      async fetch(request) {
        const url = new URL(request.url);
        requests.push({
          body: await request.text(),
          pathname: url.pathname,
        });

        if (url.pathname === '/audio_query') {
          return Response.json({
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
          });
        }

        if (url.pathname === '/synthesis') {
          return new Response(new Uint8Array([9, 8, 7]), {
            headers: { 'content-type': 'audio/wav' },
          });
        }

        return new Response('unexpected request', { status: 500 });
      },
    });

    try {
      const result = await synthesizeWav(server.url.toString(), 'hello', {
        speakerId: 13,
        speedScale: 0.92,
        pitchScale: 0,
        intonationScale: 1,
        volumeScale: 1,
        prePhonemeLength: 0.1,
        postPhonemeLength: 0.1,
      });

      expect(result).toEqual(new Uint8Array([9, 8, 7]));
      const synthesisRequest = requests.find(
        (request) => request.pathname === '/synthesis',
      );
      expect(synthesisRequest).toBeDefined();
      if (synthesisRequest === undefined) {
        throw new Error('Missing synthesis request');
      }
      expect(JSON.parse(synthesisRequest.body)).toMatchObject({
        speedScale: 0.92,
      });
    } finally {
      server.stop();
    }
  });
});
