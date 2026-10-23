import {spawn} from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import * as path from 'node:path';

export function generateFingerprint(
  path: string,
  line: number,
  column: number,
  error: string | number,
): string {
  return crypto.hash('sha256', `${path}:${line}:${column}:${error}`, 'base64');
}

export async function runLocalTool(
  tool: 'oxlint' | 'oxfmt' | 'biome',
  args: string[],
): Promise<{stdout: string; stderr: string; exitCode: 0 | 1}> {
  const cwd = process.cwd();
  const require = createRequire(path.join(cwd, 'package.json'));
  const packageName = tool === 'biome' ? '@biomejs/biome' : tool;
  let packagePath: string;

  try {
    packagePath = require.resolve(`${packageName}/package.json`);
  } catch {
    throw new Error(
      `${packageName} is not installed in the project. Install ${packageName} to use --${tool}.`,
    );
  }

  const {bin} = JSON.parse(await fs.readFile(packagePath, 'utf8')) as {
    bin?: string | Record<string, string>;
  };
  const entry = typeof bin === 'string' ? bin : bin?.[tool];

  if (!entry) {
    throw new Error(`The ${tool} package at ${packagePath} does not provide an executable.`);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.resolve(path.dirname(packagePath), entry), ...args],
      {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
      },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.once('error', (error) => reject(new Error(`Failed to start ${tool}: ${error.message}`)));
    child.once('close', (code, signal) => {
      if (signal || (code !== 0 && code !== 1) || (tool !== 'biome' && stderr.trim())) {
        reject(new Error(`${tool} failed (${signal ?? code}): ${stderr.trim() || stdout.trim()}`));
      } else {
        resolve({stdout, stderr, exitCode: code});
      }
    });
  });
}
