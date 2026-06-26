import { describe, expect, test } from 'bun:test';
import { parseVoicevoxProfile, RequestValidationError } from '../src';

describe('parseVoicevoxProfile', () => {
  test('parses a valid voicevox profile', () => {
    expect(
      parseVoicevoxProfile({
        speakerId: 13,
        speedScale: 0.92,
        pitchScale: 0,
        intonationScale: 1,
        volumeScale: 1,
        prePhonemeLength: 0.1,
        postPhonemeLength: 0.1,
      }),
    ).toEqual({
      speakerId: 13,
      speedScale: 0.92,
      pitchScale: 0,
      intonationScale: 1,
      volumeScale: 1,
      prePhonemeLength: 0.1,
      postPhonemeLength: 0.1,
    });
  });

  test('rejects an invalid voicevox profile', () => {
    expect(() =>
      parseVoicevoxProfile({
        speakerId: -1,
        speedScale: 0.92,
        pitchScale: 0,
        intonationScale: 1,
        volumeScale: 1,
        prePhonemeLength: 0.1,
        postPhonemeLength: 0.1,
      }),
    ).toThrow(RequestValidationError);
  });
});
