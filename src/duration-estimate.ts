import { Client } from './client';
import { VoicevoxError } from './errors';
import type { audioQuery as AudioQueryData } from './types/audioquery';
import { parseVoicevoxProfile, type VoicevoxProfile } from './voicevox-profile';

type Mora = AudioQueryData['accent_phrases'][number]['moras'][number];

export interface AudioQueryDurationEstimate {
  accentPhraseCount: number;
  moraCount: number;
  pauseMoraCount: number;
  rawPhonemeSeconds: number;
  rawPauseSeconds: number;
  scaledPhonemeSeconds: number;
  scaledPauseSeconds: number;
  boundarySeconds: number;
  totalSeconds: number;
}

export interface SpeechDurationEstimate extends AudioQueryDurationEstimate {
  speakerId: number;
  text: string;
}

export function estimateAudioQueryDuration(
  query: AudioQueryData,
): AudioQueryDurationEstimate {
  if (query.speedScale <= 0) {
    throw new VoicevoxError('Audio query speedScale must be positive');
  }

  let rawPhonemeSeconds = 0;
  let rawPauseSeconds = 0;
  let moraCount = 0;
  let pauseMoraCount = 0;

  for (const accentPhrase of query.accent_phrases) {
    moraCount += accentPhrase.moras.length;
    for (const mora of accentPhrase.moras) {
      rawPhonemeSeconds += moraSeconds(mora);
    }
    if (accentPhrase.pause_mora !== null) {
      pauseMoraCount += 1;
      rawPauseSeconds += moraSeconds(accentPhrase.pause_mora);
    }
  }

  const scaledPhonemeSeconds = rawPhonemeSeconds / query.speedScale;
  const scaledPauseSeconds = rawPauseSeconds / query.speedScale;
  const boundarySeconds = query.prePhonemeLength + query.postPhonemeLength;

  return {
    accentPhraseCount: query.accent_phrases.length,
    boundarySeconds,
    moraCount,
    pauseMoraCount,
    rawPauseSeconds,
    rawPhonemeSeconds,
    scaledPauseSeconds,
    scaledPhonemeSeconds,
    totalSeconds: scaledPhonemeSeconds + scaledPauseSeconds + boundarySeconds,
  };
}

export async function estimateSpeechDuration(
  engineUrl: string,
  text: string,
  profile: VoicevoxProfile,
): Promise<SpeechDurationEstimate> {
  const parsed = parseVoicevoxProfile(profile);
  const client = new Client(engineUrl);
  const query = await client.rest.createAudioQuery(text, parsed.speakerId, {});

  query.speedScale = parsed.speedScale;
  query.pitchScale = parsed.pitchScale;
  query.intonationScale = parsed.intonationScale;
  query.volumeScale = parsed.volumeScale;
  query.prePhonemeLength = parsed.prePhonemeLength;
  query.postPhonemeLength = parsed.postPhonemeLength;

  return {
    ...estimateAudioQueryDuration(query),
    speakerId: parsed.speakerId,
    text,
  };
}

function moraSeconds(mora: Mora): number {
  return (mora.consonant_length ?? 0) + mora.vowel_length;
}
