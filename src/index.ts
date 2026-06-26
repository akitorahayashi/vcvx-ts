import { Client } from './client';

export { audioQuery } from './audio_query';
export { Client } from './client';
export {
  HttpError,
  RequestValidationError,
  ResponseParseError,
  ResponseValidationError,
  VoicevoxError,
} from './errors';
export { Preset } from './preset';
export { type FetchLike, RestAPI } from './rest';
export { Speaker } from './speaker';
export { synthesizeWav } from './synthesis';
export type {
  accentPhrase as AccentPhrase,
  audioQuery as AudioQueryData,
  audioQueryOverrides as AudioQueryOverrides,
  createAudioQueryFromPresetOptions as CreateAudioQueryFromPresetOptions,
  createAudioQueryOptions as CreateAudioQueryOptions,
} from './types/audioquery';
export type { Preset as PresetData } from './types/preset';
export type {
  Speaker as SpeakerData,
  Styles as SpeakerStyle,
  SupportedFeatures as SpeakerSupportedFeatures,
} from './types/speaker';
export type { synthesisParams as SynthesisOptions } from './types/synthesis';
export {
  parseVoicevoxProfile,
  type VoicevoxProfile,
  voicevoxProfileSchema,
} from './voicevox-profile';

export default Client;
