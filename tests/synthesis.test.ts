import { describe, expect, test } from 'bun:test';
import { synthesizeWav } from '../src';

describe('synthesizeWav', () => {
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
