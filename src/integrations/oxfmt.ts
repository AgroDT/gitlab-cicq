import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import type {GitLabCQIssue} from '../types.js';

import {generateFingerprint, runLocalTool} from './util.js';

async function runOxfmt(patterns: string | string[]): Promise<GitLabCQIssue[]> {
  const {stdout, exitCode} = await runLocalTool('oxfmt', [
    '--list-different',
    '--',
    ...(Array.isArray(patterns) ? patterns : [patterns]),
  ]);

  const files = [...new Set(stdout.split(/\r?\n/).filter((file) => !!file.length))];

  if (!exitCode !== !files.length) {
    throw new Error('Oxfmt returned an unexpected file list or exit code.');
  }

  const issues: GitLabCQIssue[] = [];

  for (const file of files) {
    const absolutePath = path.resolve(file);
    const stat = await fs.stat(absolutePath);

    if (!stat.isFile()) {
      throw new Error(`Oxfmt returned an invalid file path: ${file}`);
    }

    const filePath = path.relative(process.cwd(), absolutePath).split(path.sep).join('/');
    const checkName = 'oxfmt/format';

    issues.push({
      check_name: checkName,
      description: 'File is not formatted according to Oxfmt configuration.',
      severity: 'minor',
      location: {path: filePath, lines: {begin: 1}},
      fingerprint: generateFingerprint(filePath, 1, 1, checkName),
    });
  }

  return issues;
}

export default runOxfmt;
