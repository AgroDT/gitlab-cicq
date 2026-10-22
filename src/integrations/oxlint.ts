import type {GitLabCQIssue} from '../types.js';

import {runLocalTool} from './util.js';

async function runOxlint(patterns: string | string[]): Promise<GitLabCQIssue[]> {
  const {stdout, exitCode} = await runLocalTool('oxlint', [
    '--format=gitlab',
    '--',
    ...(Array.isArray(patterns) ? patterns : [patterns]),
  ]);

  let result: unknown;

  try {
    result = JSON.parse(stdout);
  } catch {
    throw new Error(`Oxlint did not return valid JSON: ${stdout.trim()}`);
  }

  if (!Array.isArray(result)) {
    throw new Error('Oxlint did not return a Code Quality findings array.');
  }

  if (exitCode && !result.length) {
    throw new Error('Oxlint failed without reporting any diagnostics.');
  }

  return result as GitLabCQIssue[];
}

export default runOxlint;
