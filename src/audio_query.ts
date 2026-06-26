import type { RestAPI } from './rest';
import type {
  accentPhrase,
  audioQuery as audioQueryT,
} from './types/audioquery';
import type { synthesisParams } from './types/synthesis';

// audio query
export class audioQuery {
  private rest: RestAPI;
  private readonly queryFields: Omit<audioQueryT, 'accent_phrases'>;
  public speedScale: number;
  public pitchScale: number;
  public accentPhrases: accentPhrase[];
  public intonationScale: number;
  public volumeScale: number;
  public prePhonemeLength: number;
  public postPhonemeLength: number;
  public outputSamplingRate: number;
  public outputStereo: boolean;
  public kana: string;

  constructor(rest: RestAPI, audioQuery: audioQueryT) {
    const { accent_phrases, ...queryFields } = audioQuery;
    this.rest = rest;
    this.queryFields = queryFields;
    this.accentPhrases = accent_phrases;
    this.speedScale = audioQuery.speedScale;
    this.pitchScale = audioQuery.pitchScale;
    this.intonationScale = audioQuery.intonationScale;
    this.volumeScale = audioQuery.volumeScale;
    this.prePhonemeLength = audioQuery.prePhonemeLength;
    this.postPhonemeLength = audioQuery.postPhonemeLength;
    this.outputSamplingRate = audioQuery.outputSamplingRate;
    this.outputStereo = audioQuery.outputStereo;
    this.kana = audioQuery.kana;
  }

  // Synthesis
  /**
   *
   * @param speaker Speaker ID
   * @param options options
   * @param options.interrogative_upspeak Enable upspeak
   * @param options.core_version Core version
   * @returns voice data
   */
  async synthesis(
    speaker: number,
    options?: {
      interrogative_upspeak?: boolean;
      core_version?: string;
    },
  ): Promise<ArrayBuffer> {
    options ??= {};
    const params: synthesisParams = {
      speaker: speaker,
    };
    if (options.interrogative_upspeak) {
      params.enable_interrogative_upspeak = options.interrogative_upspeak;
    }
    if (options.core_version) {
      params.core_version = options.core_version;
    }
    const query: audioQueryT = {
      ...this.queryFields,
      accent_phrases: this.accentPhrases,
      intonationScale: this.intonationScale,
      kana: this.kana,
      outputSamplingRate: this.outputSamplingRate,
      outputStereo: this.outputStereo,
      pitchScale: this.pitchScale,
      postPhonemeLength: this.postPhonemeLength,
      prePhonemeLength: this.prePhonemeLength,
      speedScale: this.speedScale,
      volumeScale: this.volumeScale,
    };

    return await this.rest.synthesis(query, params);
  }
}
