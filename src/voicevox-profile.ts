import { z } from 'zod';
import { RequestValidationError } from './errors';

export const voicevoxProfileSchema = z
  .object({
    speakerId: z.number().int().nonnegative(),
    speedScale: z.number().finite(),
    pitchScale: z.number().finite(),
    intonationScale: z.number().finite(),
    volumeScale: z.number().finite(),
    prePhonemeLength: z.number().finite(),
    postPhonemeLength: z.number().finite(),
  })
  .strict();

export type VoicevoxProfile = z.infer<typeof voicevoxProfileSchema>;

export function parseVoicevoxProfile(profile: unknown): VoicevoxProfile {
  const result = voicevoxProfileSchema.safeParse(profile);
  if (!result.success) {
    throw new RequestValidationError(z.prettifyError(result.error));
  }

  return result.data;
}
