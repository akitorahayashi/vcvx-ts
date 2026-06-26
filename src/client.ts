import { audioQuery } from './audio_query';
import { VoicevoxError } from './errors';
import { Preset } from './preset';
import { RestAPI } from './rest';
import { Speaker } from './speaker';
import {
  type audioQueryOverrides,
  parseAudioQueryOverrides,
} from './types/audioquery';

// voicevox client
/**
 * @param engine_url - URL of voicevox engine
 *
 * @example
 * ```typescript
 * import Client from "voicevox-client";
 *
 * const client = new Client("http://127.0.0.1:50021");
 *
 * async function main() {
 *   const audioQuery = await client.createAudioQuery("こんにちは", 0);
 *   await audioQuery.synthesis(0);
 * };
 *
 * main();
 * ```
 */
export class Client {
  readonly rest: RestAPI;

  constructor(engine_url: string) {
    this.rest = new RestAPI(engine_url);
  }

  // Create audio query
  /**
   * @param text - Japanese text
   * @param speaker - Speaker ID
   * @param options - Options
   * @param options.core_version - Core version
   */
  async createAudioQuery(
    text: string,
    speaker: number,
    options?: {
      core_version?: string;
    },
  ): Promise<audioQuery> {
    options ??= {};
    const audioquery = await this.rest.createAudioQuery(text, speaker, options);
    return new audioQuery(this.rest, audioquery);
  }

  // Create audio query from preset
  /**
   * @param text - Japanese text
   * @param preset_id - Preset ID
   * @param options - Options
   * @param options.core_version - Core version
   */
  async createAudioQueryFromPreset(
    text: string,
    preset_id: number,
    options?: {
      core_version?: string;
    },
  ): Promise<audioQuery> {
    options ??= {};
    const audioquery = await this.rest.createAudioQueryFromPreset(
      text,
      preset_id,
      options,
    );
    return new audioQuery(this.rest, audioquery);
  }

  // Fetch presets
  /**
   * @returns Presets
   */
  async fetchPresets(): Promise<Preset[]> {
    const presets = await this.rest.getPresets();
    return presets.map((x) => new Preset(x));
  }

  // Add preset
  /**
   * @param preset - Preset
   * @returns Preset ID
   */
  async addPreset(preset: Preset): Promise<number> {
    return await this.rest.addPreset({ ...preset });
  }

  // Update preset
  /**
   * @param preset - Preset
   * @returns Preset ID
   */
  async updatePreset(preset: Preset): Promise<number> {
    return await this.rest.updatePreset({ ...preset });
  }

  // Delete preset
  /**
   * @param id - Preset ID
   */
  async deletePreset(id: number): Promise<void> {
    return await this.rest.deletePreset(id);
  }

  // Fetch speakers
  /**
   * @returns Speakers
   */
  async fetchSpeakers(): Promise<Speaker[]> {
    const speakers = await this.rest.getSpeakers();
    return speakers.map((x) => new Speaker(x));
  }

  async fetchSpeakerIds(): Promise<number[]> {
    const speakers = await this.fetchSpeakers();
    const ids = new Set<number>();
    for (const speaker of speakers) {
      for (const style of speaker.styles) {
        ids.add(style.id);
      }
    }

    return [...ids].sort((a, b) => a - b);
  }

  async assertSpeakerExists(speaker: number): Promise<void> {
    const available = await this.fetchSpeakerIds();
    if (available.includes(speaker)) {
      return;
    }

    throw new VoicevoxError(
      `VOICEVOX speaker id ${speaker} does not exist. Available ids: ${available.join(', ')}`,
    );
  }

  async synthesize(
    text: string,
    speaker: number,
    options?: {
      core_version?: string;
      enable_interrogative_upspeak?: boolean;
      query?: audioQueryOverrides;
    },
  ): Promise<ArrayBuffer> {
    const overrides =
      options?.query === undefined
        ? undefined
        : parseAudioQueryOverrides(options.query);
    const query = await this.createAudioQuery(text, speaker, options);
    if (overrides !== undefined) {
      Object.assign(query, overrides);
    }

    return await query.synthesis(speaker, {
      core_version: options?.core_version,
      interrogative_upspeak: options?.enable_interrogative_upspeak,
    });
  }
}
