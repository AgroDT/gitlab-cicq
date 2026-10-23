import type {GitLabCQIssue} from '../types.js';

import {runLocalTool} from './util.js';

async function runBiome(patterns: string | string[]): Promise<GitLabCQIssue[]> {
  const {stdout, stderr, exitCode} = await runLocalTool('biome', [
    'ci',
    '--reporter=gitlab',
    '--colors=off',
    '--',
    ...(Array.isArray(patterns) ? patterns : [patterns]),
  ]);

  let result: unknown;

  try {
    result = JSON.parse(stdout);
  } catch {
    throw new Error(`Biome did not return valid JSON: ${stderr.trim() || stdout.trim()}`);
  }

  if (!Array.isArray(result)) {
    throw new Error('Biome did not return a Code Quality findings array.');
  }

  if (exitCode && !result.length) {
    throw new Error(`Biome failed without reporting any diagnostics: ${stderr.trim()}`);
  }

  return result as GitLabCQIssue[];
}

export default runBiome;
