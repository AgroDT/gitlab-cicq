import {spawn} from 'node:child_process';
import * as fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import * as path from 'node:path';

import type {GitLabCQIssue} from '../types.js';

import {generateFingerprint} from './util.js';

async function runTsCheck(projectDir: string): Promise<GitLabCQIssue[]> {
  const projectPath = path.resolve(projectDir);
  const configPath = await findConfig(projectPath);

  if (!configPath) {
    console.warn('tsconfig.json was not found in', projectDir);
    return [];
  }

  const require = createRequire(path.join(projectPath, 'package.json'));
  let packagePath: string;

  try {
    packagePath = require.resolve('typescript/package.json');
  } catch {
    throw new Error(
      `TypeScript is not installed for ${projectDir}. Install typescript to use --typescript.`,
    );
  }

  const {bin} = JSON.parse(await fs.readFile(packagePath, 'utf8')) as {
    bin?: string | {tsc?: string};
  };
  const entry = typeof bin === 'string' ? bin : bin?.tsc;
  if (!entry) {
    throw new Error(`The TypeScript package at ${packagePath} does not provide a tsc executable.`);
  }

  const cacheDir = await fs.mkdtemp(path.join(tmpdir(), 'gitlab-cicq-ts-'));
  try {
    const output = await runCompiler(
      path.resolve(path.dirname(packagePath), entry),
      [
        '--project',
        configPath,
        '--noEmit',
        '--pretty',
        'false',
        '--locale',
        'en',
        '--incremental',
        '--tsBuildInfoFile',
        path.join(cacheDir, 'tsconfig.tsbuildinfo'),
      ],
      projectPath,
    );
    return parseDiagnostics(output, projectPath, configPath);
  } finally {
    await fs.rm(cacheDir, {recursive: true, force: true});
  }
}

async function findConfig(projectPath: string): Promise<string | undefined> {
  const stat = await fs.stat(projectPath);

  if (!stat.isDirectory()) {
    throw new Error(`TypeScript project path is not a directory: ${projectPath}`);
  }

  let directory = projectPath;

  while (true) {
    const candidate = path.join(directory, 'tsconfig.json');

    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) {
        return candidate;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    const parent = path.dirname(directory);

    if (parent === directory) {
      return;
    }

    directory = parent;
  }
}

function runCompiler(entry: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [entry, ...args], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (signal || code === null || code > 2 || stderr.trim() || (code !== 0 && !stdout.trim())) {
        reject(
          new Error(
            `TypeScript compiler failed (${signal ?? code}): ${stderr.trim() || stdout.trim()}`,
          ),
        );
      } else {
        resolve(stdout);
      }
    });
  });
}

function parseDiagnostics(
  output: string,
  projectPath: string,
  configPath: string,
): GitLabCQIssue[] {
  const issues: GitLabCQIssue[] = [];

  for (const line of output.trimEnd().split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }

    const located = /^(.*)\((\d+),(\d+)\): (error|warning) TS(\d+): (.*)$/.exec(line);
    const global = /^(error|warning) TS(\d+): (.*)$/.exec(line);

    if (!located && !global) {
      const previous = issues.at(-1);

      if (previous && /^\s/.test(line)) {
        previous.description += `\n${line}`;
        continue;
      }

      throw new Error(`Unrecognized TypeScript compiler output: ${line}`);
    }

    const begin = located ? Math.max(1, Number(located[2])) : 1;
    const category = located ? located[4]! : global![1]!;
    const code = located ? located[5]! : global![2]!;
    const filePath = path
      .relative(process.cwd(), path.resolve(projectPath, located ? located[1]! : configPath))
      .split(path.sep)
      .join('/');
    issues.push({
      check_name: `TS${code}`,
      description: located ? located[6]! : global![3]!,
      severity: category === 'error' ? 'critical' : 'minor',
      location: {path: filePath, lines: {begin}},
      fingerprint: generateFingerprint(
        filePath,
        begin,
        located ? Math.max(1, Number(located[3])) : 1,
        Number(code),
      ),
    });
  }
  return issues;
}

export default runTsCheck;
