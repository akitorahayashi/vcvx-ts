import { HttpError, ResponseParseError, VoicevoxError } from './errors';
import type {
  audioQuery,
  createAudioQueryFromPresetOptions,
  createAudioQueryOptions,
} from './types/audioquery';
import { parseAudioQuery } from './types/audioquery';
import type { DeletePresetOptions, Preset } from './types/preset';
import type { Speaker } from './types/speaker';
import { parseSpeakers } from './types/speaker';
import type { synthesisParams } from './types/synthesis';

export type FetchLike = (
  input: Request | URL | string,
  init?: RequestInit,
) => Promise<Response>;

export class RestAPI {
  readonly engine_url: string;
  readonly fetch: FetchLike;
  readonly timeout_ms: number;

  constructor(
    engine_url: string,
    options?: { fetch?: FetchLike; timeout_ms?: number },
  ) {
    const input = engine_url.trim();
    if (input.length === 0) {
      throw new VoicevoxError('VOICEVOX engine URL must not be empty');
    }

    let url: URL;
    try {
      url = new URL(input);
    } catch (error: unknown) {
      throw new VoicevoxError('VOICEVOX engine URL must be a valid URL', {
        cause: error,
      });
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new VoicevoxError('VOICEVOX engine URL must use HTTP or HTTPS');
    }

    this.engine_url = url.toString().replace(/\/+$/u, '');
    this.fetch = options?.fetch ?? fetch;
    this.timeout_ms = options?.timeout_ms ?? 30_000;
  }

  async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      params?: object;
    },
  ): Promise<T> {
    const url = new URL(`${this.engine_url}${path}`);
    if (options?.params !== undefined) {
      for (const [key, value] of Object.entries(
        options.params as Record<string, unknown>,
      )) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const fetch_options: RequestInit = {
      method: method,
      signal: AbortSignal.timeout(this.timeout_ms),
    };

    if (options?.body !== undefined) {
      fetch_options.headers = { 'Content-Type': 'application/json' };
      fetch_options.body = JSON.stringify(options.body);
    }

    const response = await this.fetch(url, fetch_options);
    if (!response.ok) {
      throw new HttpError({
        body: await response.text(),
        method,
        path,
        status: response.status,
      });
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const content_type = response.headers.get('content-type');
    if (content_type?.includes('application/json')) {
      try {
        return (await response.json()) as T;
      } catch (error: unknown) {
        throw new ResponseParseError({
          cause: error,
          contentType: content_type,
          method,
          path,
        });
      }
    }

    return (await response.arrayBuffer()) as T;
  }

  async createAudioQuery(
    text: string,
    speaker: number,
    options: {
      core_version?: string;
    },
  ): Promise<audioQuery> {
    const params: createAudioQueryOptions = {
      text: text,
      speaker: speaker,
    };
    if (options.core_version) {
      params.core_version = options.core_version;
    }
    return parseAudioQuery(
      await this.request<unknown>('POST', '/audio_query', {
        params: params,
      }),
      '/audio_query',
    );
  }

  async createAudioQueryFromPreset(
    text: string,
    preset_id: number,
    options: {
      core_version?: string;
    },
  ): Promise<audioQuery> {
    const params: createAudioQueryFromPresetOptions = {
      text: text,
      preset_id: preset_id,
    };
    if (options.core_version) {
      params.core_version = options.core_version;
    }
    return parseAudioQuery(
      await this.request<unknown>('POST', '/audio_query_from_preset', {
        params: params,
      }),
      '/audio_query_from_preset',
    );
  }

  async synthesis(
    audioQuery: audioQuery,
    params: synthesisParams,
  ): Promise<ArrayBuffer> {
    return await this.request<ArrayBuffer>('POST', '/synthesis', {
      body: audioQuery,
      params: params,
    });
  }

  async getPresets(): Promise<Preset[]> {
    return await this.request<Preset[]>('GET', '/presets');
  }

  async addPreset(preset: Preset): Promise<number> {
    return await this.request<number>('POST', '/add_preset', {
      body: preset,
    });
  }

  async updatePreset(preset: Preset): Promise<number> {
    return await this.request<number>('POST', '/update_preset', {
      body: preset,
    });
  }

  async deletePreset(id: number): Promise<void> {
    const params: DeletePresetOptions = {
      id: id,
    };
    await this.request<void>('POST', '/delete_preset', {
      params: params,
    });
  }

  async getSpeakers(): Promise<Speaker[]> {
    return parseSpeakers(
      await this.request<unknown>('GET', '/speakers'),
      '/speakers',
    );
  }
}
