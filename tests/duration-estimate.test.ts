import { describe, expect, test } from 'bun:test';
import {
  type AudioQueryData,
  estimateAudioQueryDuration,
  estimateSpeechDuration,
  VoicevoxError,
} from '../src';

describe('duration-estimate', () => {
  test('estimates duration from phoneme, pause, speed, and boundary values', () => {
    const estimate = estimateAudioQueryDuration({
      accent_phrases: [
        {
          accent: 1,
          is_interrogative: false,
          moras: [
            mora({ consonantLength: 0.04, vowelLength: 0.12 }),
            mora({ consonantLength: null, vowelLength: 0.18 }),
          ],
          pause_mora: mora({ consonantLength: null, vowelLength: 0.3 }),
        },
      ],
      intonationScale: 1,
      kana: 'テスト',
      outputSamplingRate: 24000,
      outputStereo: false,
      pitchScale: 0,
      postPhonemeLength: 0.2,
      prePhonemeLength: 0.1,
      speedScale: 2,
      volumeScale: 1,
    });

    expect(estimate.accentPhraseCount).toBe(1);
    expect(estimate.moraCount).toBe(2);
    expect(estimate.pauseMoraCount).toBe(1);
    expect(estimate.rawPhonemeSeconds).toBeCloseTo(0.34);
    expect(estimate.rawPauseSeconds).toBeCloseTo(0.3);
    expect(estimate.scaledPhonemeSeconds).toBeCloseTo(0.17);
    expect(estimate.scaledPauseSeconds).toBeCloseTo(0.15);
    expect(estimate.boundarySeconds).toBeCloseTo(0.3);
    expect(estimate.totalSeconds).toBeCloseTo(0.62);
  });

  test('rejects nonpositive speed scale', () => {
    expect(() =>
      estimateAudioQueryDuration({
        accent_phrases: [],
        intonationScale: 1,
        kana: 'テスト',
        outputSamplingRate: 24000,
        outputStereo: false,
        pitchScale: 0,
        postPhonemeLength: 0,
        prePhonemeLength: 0,
        speedScale: 0,
        volumeScale: 1,
      }),
    ).toThrow(VoicevoxError);
  });

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
