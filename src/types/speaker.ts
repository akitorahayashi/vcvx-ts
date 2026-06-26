import { z } from 'zod';
import { ResponseValidationError } from '../errors';

export const styleTypeSchema = z.enum([
  'talk',
  'singing_teacher',
  'frame_decode',
  'sing',
]);

export const speakerStyleSchema = z
  .object({
    id: z.number().int().nonnegative(),
    name: z.string(),
    type: styleTypeSchema.or(z.string()),
  })
  .passthrough();

export const speakerSupportedFeaturesSchema = z
  .object({
    permitted_synthesis_morphing: z.enum(['ALL', 'SELF_ONLY', 'NOTHING']),
  })
  .passthrough();

export const speakerSchema = z
  .object({
    name: z.string(),
    speaker_uuid: z.string(),
    styles: z.array(speakerStyleSchema),
    version: z.string(),
    supported_features: speakerSupportedFeaturesSchema,
  })
  .passthrough();

export const speakersSchema = z.array(speakerSchema);

export type StyleType = z.infer<typeof styleTypeSchema>;
export type Styles = z.infer<typeof speakerStyleSchema>;
export type SupportedFeatures = z.infer<typeof speakerSupportedFeaturesSchema>;
export type Speaker = z.infer<typeof speakerSchema>;

export function parseSpeakers(value: unknown, path: string): Speaker[] {
  const result = speakersSchema.safeParse(value);
  if (!result.success) {
    throw new ResponseValidationError({
      message: z.prettifyError(result.error),
      path,
    });
  }

  return result.data;
}
