import { describe, expect, test } from 'bun:test';
import { parseSpeakers, ResponseValidationError } from '../index';

describe('speaker types', () => {
  test('parses valid speakers', () => {
    expect(
      parseSpeakers(
        [
          {
            name: 'speaker-a',
            speaker_uuid: 'speaker-a',
            styles: [{ id: 13, name: 'Normal', type: 'talk' }],
            supported_features: {
              permitted_synthesis_morphing: 'SELF_ONLY',
            },
            version: '0.25.2',
          },
        ],
        '/speakers',
      ),
    ).toHaveLength(1);
  });

  test('rejects invalid speakers', () => {
    expect(() => parseSpeakers({ speakers: [] }, '/speakers')).toThrow(
      ResponseValidationError,
    );
  });
});
