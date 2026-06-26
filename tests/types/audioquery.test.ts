import { describe, expect, test } from 'bun:test';
import {
  parseAudioQuery,
  parseAudioQueryOverrides,
  RequestValidationError,
  ResponseValidationError,
} from '../../src';

describe('audioquery types', () => {
  test('parses a valid audio query response', () => {
    expect(
      parseAudioQuery(
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
          engine_extension: { kept: true },
          kana: 'テスト',
        },
        '/audio_query',
      ),
    ).toMatchObject({
      engine_extension: { kept: true },
      speedScale: 1,
      kana: 'テスト',
    });
  });

  test('rejects an invalid audio query response', () => {
    expect(() => parseAudioQuery({ speedScale: 1 }, '/audio_query')).toThrow(
      ResponseValidationError,
    );
  });

  test('parses valid audio query overrides', () => {
    expect(
      parseAudioQueryOverrides({
        speedScale: 1.2,
        volumeScale: 0.9,
      }),
    ).toEqual({
      speedScale: 1.2,
      volumeScale: 0.9,
    });
  });

  test('rejects invalid audio query overrides', () => {
    expect(() =>
      parseAudioQueryOverrides({
        speedScale: Number.NaN,
      }),
    ).toThrow(RequestValidationError);
  });
});
