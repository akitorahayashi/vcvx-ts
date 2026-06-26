import { Client } from './client';
import { parseVoicevoxProfile, type VoicevoxProfile } from './voicevox-profile';

export async function synthesizeWav(
  engineUrl: string,
  text: string,
  profile: VoicevoxProfile,
): Promise<Uint8Array> {
  const parsed = parseVoicevoxProfile(profile);
  const client = new Client(engineUrl);
  const wav = await client.synthesize(text, parsed.speakerId, {
    query: {
      intonationScale: parsed.intonationScale,
      pitchScale: parsed.pitchScale,
      postPhonemeLength: parsed.postPhonemeLength,
      prePhonemeLength: parsed.prePhonemeLength,
      speedScale: parsed.speedScale,
      volumeScale: parsed.volumeScale,
    },
  });

  return new Uint8Array(wav);
}
