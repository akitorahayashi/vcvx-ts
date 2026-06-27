import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import {
  type AudioQueryData,
  type AudioQueryDurationEstimate,
  Client,
  estimateAudioQueryDuration,
  type Speaker,
  type VoicevoxProfile,
} from '../src';

const defaultEngineUrl = 'http://127.0.0.1:50021';
const defaultTestCasesPath = 'fixtures/duration-test-cases.json';
const defaultJsonPath = '.tmp/audio-duration-measurement.json';
const defaultMarkdownPath = 'docs/audio-duration-measurement.md';

const testCasesSchema = z.object({
  version: z.number().int().positive(),
  description: z.string(),
  speakerId: z.number().int().nonnegative(),
  profile: z.object({
    baselineSpeedScale: z.number().positive(),
    speedScales: z.array(z.number().positive()).min(1),
    pitchScale: z.number().finite(),
    intonationScale: z.number().finite(),
    volumeScale: z.number().finite(),
    prePhonemeLength: z.number().finite().nonnegative(),
    postPhonemeLength: z.number().finite().nonnegative(),
  }),
  cases: z
    .array(
      z.object({
        id: z.string().min(1),
        description: z.string(),
        blocks: z.array(z.string().min(1)).min(1),
      }),
    )
    .min(1),
});

type DurationTestCases = z.infer<typeof testCasesSchema>;

interface Options {
  engineUrl: string;
  jsonPath: string;
  markdownPath: string;
  testCasesPath: string;
}

interface MeasurementResult {
  testCases: {
    description: string;
    version: number;
  };
  engine: {
    url: string;
    version: string;
    coreVersions: string[];
  };
  profile: VoicevoxProfile & {
    baselineSpeedScale: number;
    speedScales: number[];
  };
  speaker: {
    id: number;
    name: string;
    styleName: string;
  };
  rows: MeasurementRow[];
}

interface MeasurementRow {
  caseDescription: string;
  caseId: string;
  blockCount: number;
  text: string;
  characterCount: number;
  characterCountWithoutPunctuation: number;
  speedScale: number;
  estimate: AudioQueryDurationEstimate;
  wav?: {
    channelCount: number;
    durationSeconds: number;
    queryToWavSeconds: number;
    sampleRate: number;
  };
}

interface WavInfo {
  bitsPerSample: number;
  channelCount: number;
  durationSeconds: number;
  sampleRate: number;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const testCases = await readTestCases(options.testCasesPath);
  const result = await measureDuration(testCases, options);

  await mkdir(path.dirname(options.jsonPath), { recursive: true });
  await Bun.write(options.jsonPath, `${JSON.stringify(result, null, 2)}\n`);

  await mkdir(path.dirname(options.markdownPath), { recursive: true });
  await Bun.write(options.markdownPath, renderMarkdown(result, options));
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    engineUrl: Bun.env.VOICEVOX_ENGINE_URL ?? defaultEngineUrl,
    jsonPath: defaultJsonPath,
    markdownPath: defaultMarkdownPath,
    testCasesPath: defaultTestCasesPath,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];
    if (arg === '--engine-url' && next !== undefined) {
      options.engineUrl = next;
      index += 1;
      continue;
    }
    if (arg === '--test-cases' && next !== undefined) {
      options.testCasesPath = next;
      index += 1;
      continue;
    }
    if (arg === '--out-json' && next !== undefined) {
      options.jsonPath = next;
      index += 1;
      continue;
    }
    if (arg === '--out-md' && next !== undefined) {
      options.markdownPath = next;
      index += 1;
      continue;
    }
    throw new Error(`Unknown or incomplete argument: ${arg}`);
  }

  return options;
}

async function readTestCases(
  testCasesPath: string,
): Promise<DurationTestCases> {
  const value = await Bun.file(testCasesPath).json();
  const result = testCasesSchema.safeParse(value);
  if (!result.success) {
    throw new Error(z.prettifyError(result.error));
  }

  return result.data;
}

async function measureDuration(
  testCases: DurationTestCases,
  options: Options,
): Promise<MeasurementResult> {
  const baseUrl = normalizeBaseUrl(options.engineUrl);
  const client = new Client(baseUrl.toString());
  const [engineVersion, coreVersions, speakers] = await Promise.all([
    fetchJson<string>(baseUrl, '/version'),
    fetchJson<string[]>(baseUrl, '/core_versions').catch(() => []),
    client.fetchSpeakers(),
  ]);
  const speaker = findSpeakerStyle(speakers, testCases.speakerId);

  const rows: MeasurementRow[] = [];
  for (const durationCase of testCases.cases) {
    const baseQueries = await Promise.all(
      durationCase.blocks.map((block) =>
        client.rest.createAudioQuery(block, testCases.speakerId, {}),
      ),
    );

    for (const speedScale of testCases.profile.speedScales) {
      const profile: VoicevoxProfile = {
        intonationScale: testCases.profile.intonationScale,
        pitchScale: testCases.profile.pitchScale,
        postPhonemeLength: testCases.profile.postPhonemeLength,
        prePhonemeLength: testCases.profile.prePhonemeLength,
        speakerId: testCases.speakerId,
        speedScale,
        volumeScale: testCases.profile.volumeScale,
      };
      const queries = baseQueries.map((query) => applyProfile(query, profile));
      const estimate = sumEstimates(queries.map(estimateAudioQueryDuration));
      const wav = await synthesizeBlocks(
        client,
        queries,
        testCases.speakerId,
        estimate,
      );

      rows.push({
        blockCount: durationCase.blocks.length,
        caseDescription: durationCase.description,
        caseId: durationCase.id,
        characterCount: countCharacters(durationCase.blocks.join('')),
        characterCountWithoutPunctuation: countCharactersWithoutPunctuation(
          durationCase.blocks.join(''),
        ),
        estimate,
        speedScale,
        text: durationCase.blocks.join('\n'),
        wav,
      });
    }
  }

  return {
    testCases: {
      description: testCases.description,
      version: testCases.version,
    },
    engine: {
      coreVersions,
      url: baseUrl.toString().replace(/\/+$/u, ''),
      version: engineVersion,
    },
    profile: {
      baselineSpeedScale: testCases.profile.baselineSpeedScale,
      intonationScale: testCases.profile.intonationScale,
      pitchScale: testCases.profile.pitchScale,
      postPhonemeLength: testCases.profile.postPhonemeLength,
      prePhonemeLength: testCases.profile.prePhonemeLength,
      speakerId: testCases.speakerId,
      speedScale: testCases.profile.baselineSpeedScale,
      speedScales: testCases.profile.speedScales,
      volumeScale: testCases.profile.volumeScale,
    },
    rows,
    speaker,
  };
}

function applyProfile(
  query: AudioQueryData,
  profile: VoicevoxProfile,
): AudioQueryData {
  return {
    ...query,
    intonationScale: profile.intonationScale,
    pitchScale: profile.pitchScale,
    postPhonemeLength: profile.postPhonemeLength,
    prePhonemeLength: profile.prePhonemeLength,
    speedScale: profile.speedScale,
    volumeScale: profile.volumeScale,
  };
}

function sumEstimates(
  estimates: AudioQueryDurationEstimate[],
): AudioQueryDurationEstimate {
  return estimates.reduce<AudioQueryDurationEstimate>(
    (sum, estimate) => ({
      accentPhraseCount: sum.accentPhraseCount + estimate.accentPhraseCount,
      boundarySeconds: sum.boundarySeconds + estimate.boundarySeconds,
      moraCount: sum.moraCount + estimate.moraCount,
      pauseMoraCount: sum.pauseMoraCount + estimate.pauseMoraCount,
      rawPauseSeconds: sum.rawPauseSeconds + estimate.rawPauseSeconds,
      rawPhonemeSeconds: sum.rawPhonemeSeconds + estimate.rawPhonemeSeconds,
      scaledPauseSeconds: sum.scaledPauseSeconds + estimate.scaledPauseSeconds,
      scaledPhonemeSeconds:
        sum.scaledPhonemeSeconds + estimate.scaledPhonemeSeconds,
      totalSeconds: sum.totalSeconds + estimate.totalSeconds,
    }),
    {
      accentPhraseCount: 0,
      boundarySeconds: 0,
      moraCount: 0,
      pauseMoraCount: 0,
      rawPauseSeconds: 0,
      rawPhonemeSeconds: 0,
      scaledPauseSeconds: 0,
      scaledPhonemeSeconds: 0,
      totalSeconds: 0,
    },
  );
}

async function synthesizeBlocks(
  client: Client,
  queries: AudioQueryData[],
  speakerId: number,
  estimate: AudioQueryDurationEstimate,
): Promise<MeasurementRow['wav']> {
  let durationSeconds = 0;
  let sampleRate = 0;
  let channelCount = 0;

  for (const query of queries) {
    const wav = await client.rest.synthesis(query, { speaker: speakerId });
    const info = parseWav(wav);
    durationSeconds += info.durationSeconds;
    sampleRate = info.sampleRate;
    channelCount = info.channelCount;
  }

  return {
    channelCount,
    durationSeconds,
    queryToWavSeconds: durationSeconds - estimate.totalSeconds,
    sampleRate,
  };
}

async function fetchJson<T>(baseUrl: URL, pathname: string): Promise<T> {
  const url = new URL(pathname, baseUrl);
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to connect to VOICEVOX Engine at ${baseUrl.origin}. Start the engine with "bun run serve" or pass --engine-url.\nDetails: ${details}`,
    );
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch ${pathname}: ${response.status}`);
  }

  return (await response.json()) as T;
}

function normalizeBaseUrl(value: string): URL {
  const input = /^https?:\/\//iu.test(value) ? value : `http://${value}`;
  const url = new URL(input);
  url.pathname = url.pathname.replace(/\/+$/u, '');
  return url;
}

function findSpeakerStyle(
  speakers: Speaker[],
  styleId: number,
): MeasurementResult['speaker'] {
  for (const speaker of speakers) {
    for (const style of speaker.styles) {
      if (style.id === styleId) {
        return {
          id: styleId,
          name: speaker.name,
          styleName: style.name,
        };
      }
    }
  }

  return {
    id: styleId,
    name: 'unknown',
    styleName: 'unknown',
  };
}

function parseWav(buffer: ArrayBuffer): WavInfo {
  const view = new DataView(buffer);
  if (view.byteLength < 12 || chunkId(view, 0) !== 'RIFF') {
    throw new Error('WAV response must start with a RIFF header');
  }
  if (chunkId(view, 8) !== 'WAVE') {
    throw new Error('WAV response must use the WAVE format');
  }

  let sampleRate = 0;
  let channelCount = 0;
  let bitsPerSample = 0;
  let blockAlign = 0;
  let dataBytes = 0;
  let offset = 12;
  while (offset + 8 <= view.byteLength) {
    const id = chunkId(view, offset);
    const size = view.getUint32(offset + 4, true);
    const dataOffset = offset + 8;
    if (dataOffset + size > view.byteLength) {
      throw new Error(`WAV chunk ${id} exceeds response length`);
    }

    if (id === 'fmt ') {
      if (size < 16) {
        throw new Error('Invalid WAV: fmt chunk size must be at least 16 bytes');
      }
      channelCount = view.getUint16(dataOffset + 2, true);
      sampleRate = view.getUint32(dataOffset + 4, true);
      blockAlign = view.getUint16(dataOffset + 12, true);
      bitsPerSample = view.getUint16(dataOffset + 14, true);
    }
    if (id === 'data') {
      dataBytes = size;
    }

    offset = dataOffset + size + (size % 2);
  }

  if (sampleRate <= 0 || blockAlign <= 0 || dataBytes <= 0) {
    throw new Error('WAV response must contain fmt and data chunks');
  }

  return {
    bitsPerSample,
    channelCount,
    durationSeconds: dataBytes / blockAlign / sampleRate,
    sampleRate,
  };
}

function chunkId(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}

function countCharacters(value: string): number {
  return [...value].length;
}

function countCharactersWithoutPunctuation(value: string): number {
  return [...value.replace(/[、。？！!?…「」『』（）()・\s]/gu, '')].length;
}

function renderMarkdown(result: MeasurementResult, options: Options): string {
  const baselineRows = result.rows.filter(
    (row) => row.speedScale === result.profile.baselineSpeedScale,
  );
  const lines: string[] = [
    '# VOICEVOX Audio Duration Measurement',
    '',
    '<!-- This file is generated by `bun run measure:duration`. Do not edit it by hand. -->',
    '',
    `Engine: VOICEVOX ${result.engine.version}`,
    `Engine URL: ${result.engine.url}`,
    `Core versions: ${result.engine.coreVersions.join(', ') || 'unknown'}`,
    `Speaker style: ${result.speaker.id} (${result.speaker.name} / ${result.speaker.styleName})`,
    `Test cases version: ${result.testCases.version}`,
    `JSON artifact: ${options.jsonPath}`,
    '',
    '## Profile',
    '',
    '| Field | Value |',
    '| --- | ---: |',
    `| baselineSpeedScale | ${formatNumber(result.profile.baselineSpeedScale)} |`,
    `| speedScales | ${result.profile.speedScales.map(formatNumber).join(', ')} |`,
    `| pitchScale | ${formatNumber(result.profile.pitchScale)} |`,
    `| intonationScale | ${formatNumber(result.profile.intonationScale)} |`,
    `| volumeScale | ${formatNumber(result.profile.volumeScale)} |`,
    `| prePhonemeLength | ${formatSeconds(result.profile.prePhonemeLength)} |`,
    `| postPhonemeLength | ${formatSeconds(result.profile.postPhonemeLength)} |`,
    '',
    '## Speed Matrix',
    '',
    '| speedScale | Query seconds | WAV seconds | Query-to-WAV |',
    '| ---: | ---: | ---: | ---: |',
  ];

  for (const speedScale of result.profile.speedScales) {
    const rows = result.rows.filter((row) => row.speedScale === speedScale);
    const querySeconds = sum(rows.map((row) => row.estimate.totalSeconds));
    const wavSeconds = sum(rows.map((row) => row.wav?.durationSeconds ?? 0));
    lines.push(
      `| ${formatNumber(speedScale)} | ${formatSeconds(querySeconds)} | ${formatSeconds(wavSeconds)} | ${formatSignedSeconds(wavSeconds - querySeconds)} |`,
    );
  }

  lines.push(
    '',
    `## Baseline Cases at speedScale ${formatNumber(result.profile.baselineSpeedScale)}`,
    '',
    '| Case | Blocks | Characters | Moras | Pause moras | Query seconds | WAV seconds | Query-to-WAV |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  );

  for (const row of baselineRows) {
    lines.push(
      `| ${row.caseId} | ${row.blockCount} | ${row.characterCountWithoutPunctuation}/${row.characterCount} | ${row.estimate.moraCount} | ${row.estimate.pauseMoraCount} | ${formatSeconds(row.estimate.totalSeconds)} | ${row.wav === undefined ? '' : formatSeconds(row.wav.durationSeconds)} | ${row.wav === undefined ? '' : formatSignedSeconds(row.wav.queryToWavSeconds)} |`,
    );
  }

  lines.push(
    '',
    '## Notes',
    '',
    '- Query seconds are computed from VOICEVOX accent phrase moras, pause moras, speedScale, and boundary silence.',
    '- WAV seconds are measured from synthesized RIFF/WAVE sample data.',
    '- MP3 encoding and render-parser overhead are outside vcvx-ts and remain application-specific layers.',
    '',
  );

  return lines.join('\n');
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}

function formatSeconds(value: number): string {
  return `${value.toFixed(3)} s`;
}

function formatSignedSeconds(value: number): string {
  return `${value >= 0 ? '+' : ''}${formatSeconds(value)}`;
}

function reportError(error: unknown): never {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

await main().catch(reportError);
