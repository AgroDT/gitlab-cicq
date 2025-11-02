import * as path from 'node:path';

import {loadESLint} from 'eslint';

import type {GitLabCQIssue} from '../types.js';

import {generateFingerprint} from './util.js';

async function runESLint(patterns: string | string[]): Promise<GitLabCQIssue[]> {
  const cwd = process.cwd();

  const ESLint = await loadESLint({useFlatConfig: true});
  const eslint = new ESLint({cwd, fix: false});
  const results = await eslint.lintFiles(patterns);

  const issues: GitLabCQIssue[] = [];

  for (const result of results) {
    const filePath = path.relative(cwd, result.filePath);

    for (const message of result.messages) {
      const {
        column,
        fatal,
        line,
        message: messageText,
        ruleId,
        severity,
      } = message;
      issues.push({
        description: messageText,
        check_name: ruleId ?? '',
        fingerprint: generateFingerprint(filePath, line, column, ruleId ?? messageText),
        location: {
          path: filePath,
          lines: {begin: line},
        },
        severity: fatal ? 'critical' : severity === 2 ? 'major' : 'minor',
      });
    }
  }

  return issues;
}

export default runESLint;
