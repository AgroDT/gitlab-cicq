import * as path from 'node:path';
import {Worker, parentPort, workerData} from 'node:worker_threads';

import * as ts from 'typescript';

import type {GitLabCQIssue} from '../types.js';

import {generateFingerprint} from './util.js';

function runTsCheck(projectDir: string): Promise<GitLabCQIssue[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(import.meta.filename, {
      workerData: {projectDir},
    });

    worker.once('message', (message: GitLabCQIssue[] | {error: unknown}) => {
      if (Array.isArray(message)) {
        resolve(message);
      } else {
        reject(new Error(String(message.error)));
      }
    });
    worker.once('error', reject);
    worker.once('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker exited with code ${code}`));
      }
    });
  });
}

function runTsCheckWorker(projectDir: string): GitLabCQIssue[] {
  const tsconfig = ts.findConfigFile(projectDir, ts.sys.fileExists);
  if (!tsconfig) {
    console.warn('tsconfig.json was not found in', projectDir);
    return [];
  }

  const {config} = ts.readConfigFile(tsconfig!, ts.sys.readFile);
  const {fileNames, options} = ts.parseJsonConfigFileContent(config, ts.sys, projectDir);
  const program = ts.createProgram(fileNames, options);
  const diagnostics = ts.getPreEmitDiagnostics(program);

  const issues: GitLabCQIssue[] = [];

  for (const {file, start = 0, code, messageText, category} of diagnostics) {
    if (file) {
      const filePath = path.normalize(`${projectDir}/${file.fileName}`);
      const {line, character} = ts.getLineAndCharacterOfPosition(file, start);
      const fingerprint = generateFingerprint(filePath, line, character, code);

      issues.push({
        check_name: `TS${code}`,
        description: ts.flattenDiagnosticMessageText(messageText, '\n'),
        severity: category === ts.DiagnosticCategory.Error ? 'critical' : 'minor',
        location: {
          path: filePath,
          lines: {begin: line},
        },
        fingerprint,
      });
    }
  }

  return issues;
}

if (parentPort) {
  try {
    const issues = runTsCheckWorker(workerData.projectDir);
    parentPort.postMessage(issues);
  } catch (error) {
    parentPort.postMessage({
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export default runTsCheck;
