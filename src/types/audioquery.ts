import { z } from 'zod';
import { RequestValidationError, ResponseValidationError } from '../errors';

const moraSchema = z
  .object({
    text: z.string(),
    consonant: z.string().nullable(),
    consonant_length: z.number().finite().nullable(),
    vowel: z.string(),
    vowel_length: z.number().finite(),
    pitch: z.number().finite(),
  })
  .passthrough();

export const accentPhraseSchema = z
  .object({
    moras: z.array(moraSchema),
    accent: z.number().int(),
    pause_mora: moraSchema.nullable(),
    is_interrogative: z.boolean(),
  })
  .passthrough();

export const audioQuerySchema = z
  .object({
    accent_phrases: z.array(accentPhraseSchema),
    speedScale: z.number().finite(),
    pitchScale: z.number().finite(),
    intonationScale: z.number().finite(),
    volumeScale: z.number().finite(),
    prePhonemeLength: z.number().finite(),
    postPhonemeLength: z.number().finite(),
    outputSamplingRate: z.number().int().positive(),
    outputStereo: z.boolean(),
    kana: z.string(),
  })
  .passthrough();

export const audioQueryOverridesSchema = audioQuerySchema
  .pick({
    speedScale: true,
    pitchScale: true,
    intonationScale: true,
    volumeScale: true,
    prePhonemeLength: true,
    postPhonemeLength: true,
    outputSamplingRate: true,
    outputStereo: true,
    kana: true,
  })
  .partial()
  .strict();

export type audioQuery = z.infer<typeof audioQuerySchema>;
export type accentPhrase = z.infer<typeof accentPhraseSchema>;
export type audioQueryOverrides = z.infer<typeof audioQueryOverridesSchema>;

export interface createAudioQueryOptions {
  text: string;
  speaker: number;
  core_version?: string;
}

export interface createAudioQueryFromPresetOptions {
  text: string;
  preset_id: number;
  core_version?: string;
}

export function parseAudioQuery(value: unknown, path: string): audioQuery {
  const result = audioQuerySchema.safeParse(value);
  if (!result.success) {
    throw new ResponseValidationError({
      message: z.prettifyError(result.error),
      path,
    });
  }

  return result.data;
}

export function parseAudioQueryOverrides(value: unknown): audioQueryOverrides {
  const result = audioQueryOverridesSchema.safeParse(value);
  if (!result.success) {
    throw new RequestValidationError(z.prettifyError(result.error));
  }

  return result.data;
}
