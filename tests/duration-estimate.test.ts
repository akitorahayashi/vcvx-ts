import { describe, expect, test } from 'bun:test';
import { type AudioQueryData, estimateSpeechDuration } from '../src';

describe('duration-estimate integration', () => {
  test('estimates speech duration without synthesis', async () => {
    const requests: Array<{ pathname: string }> = [];
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch(request) {
        const url = new URL(request.url);
        requests.push({ pathname: url.pathname });

        if (url.pathname === '/audio_query') {
          return Response.json({
            accent_phrases: [
              {
                accent: 1,
                is_interrogative: false,
                moras: [mora({ consonantLength: 0.1, vowelLength: 0.3 })],
                pause_mora: null,
              },
            ],
            intonationScale: 1,
            kana: 'テスト',
            outputSamplingRate: 24000,
            outputStereo: false,
            pitchScale: 0,
            postPhonemeLength: 0.1,
            prePhonemeLength: 0.1,
            speedScale: 1,
            volumeScale: 1,
          });
        }

        return new Response('unexpected request', { status: 500 });
      },
    });

    try {
      const estimate = await estimateSpeechDuration(
        server.url.toString(),
        'hello',
        {
          intonationScale: 1,
          pitchScale: 0,
          postPhonemeLength: 0,
          prePhonemeLength: 0,
          speakerId: 13,
          speedScale: 2,
          volumeScale: 1,
        },
      );

      expect(estimate.totalSeconds).toBeCloseTo(0.2);
      expect(estimate.speakerId).toBe(13);
      expect(requests).toEqual([{ pathname: '/audio_query' }]);
    } finally {
      server.stop();
    }
  });
});

function mora({
  consonantLength,
  vowelLength,
}: {
  consonantLength: number | null;
  vowelLength: number;
}): AudioQueryData['accent_phrases'][number]['moras'][number] {
  return {
    consonant: consonantLength === null ? null : 'k',
    consonant_length: consonantLength,
    pitch: 5,
    text: 'テ',
    vowel: 'e',
    vowel_length: vowelLength,
  };
}
