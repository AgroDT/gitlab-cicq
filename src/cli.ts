#!/usr/bin/env node
import * as fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

import {program} from 'commander';

import type {GitLabCQIssue} from './types.js';

interface OptionValues {
  eslint?: true | string[];
  typescript?: true | string[];
  oxlint?: true | string[];
  oxfmt?: true | string[];
  biome?: true | string[];
  output: string;
  exit0: boolean;
}

type IntegrationFunc<Args> = (args?: Args) => Promise<GitLabCQIssue[]>;

const {version} = await fs
  .readFile(fileURLToPath(import.meta.resolve('../package.json')), {encoding: 'utf-8'})
  .then((buf) => JSON.parse(buf));

const {eslint, output, typescript, oxlint, oxfmt, biome, exit0} = program
  .name('gitlab-cicq')
  .description(
    'Run ESLint, TypeScript, Oxlint, Oxfmt, and Biome checks and output GitLab Code Quality report',
  )
  .version(version)
  .option(
    '-e, --eslint [patterns...]',
    'run ESLint (defaults to all files when no patterns are given)',
  )
  .option(
    '-t, --typescript [dirs...]',
    'run TypeScript checks (defaults to current directory when no dirs are given)',
  )
  .option(
    '-l, --oxlint [paths...]',
    'run Oxlint (defaults to current directory when no paths are given)',
  )
  .option(
    '-f, --oxfmt [paths...]',
    'run Oxfmt (defaults to current directory when no paths are given)',
  )
  .option(
    '-b, --biome [paths...]',
    'run Biome (defaults to current directory when no paths are given)',
  )
  .option('-o, --output <path>', 'report path', 'codequality.json')
  .option('--exit-0', 'always exit with 0', false)
  .parse()
  .opts<OptionValues>();

if (!eslint && !typescript && !oxlint && !oxfmt && !biome) {
  program.error('Specify at least one of --eslint, --typescript, --oxlint, --oxfmt, or --biome');
}

const integrationMock: IntegrationFunc<never> = async () => [];

async function loadIntegration<Args, I = IntegrationFunc<Args>>(
  enabled: boolean,
  loader: () => Promise<{default: I}>,
): Promise<I> {
  if (enabled) {
    try {
      const {default: runIntegration} = await loader();
      return runIntegration;
    } catch (err: unknown) {
      program.error(String(err));
    }
  }

  return integrationMock as I;
}

const [runESLint, runTsCheck, runOxlint, runOxfmt, runBiome] = await Promise.all([
  loadIntegration(!!eslint, () => import('./integrations/eslint.js')),
  loadIntegration(!!typescript, () => import('./integrations/typescript.js')),
  loadIntegration(!!oxlint, () => import('./integrations/oxlint.js')),
  loadIntegration(!!oxfmt, () => import('./integrations/oxfmt.js')),
  loadIntegration(!!biome, () => import('./integrations/biome.js')),
]);

const issues = (
  await Promise.all([
    runESLint(Array.isArray(eslint) ? eslint : '.'),
    ...(Array.isArray(typescript) ? typescript : ['.']).map(runTsCheck),
    runOxlint(Array.isArray(oxlint) ? oxlint : '.'),
    runOxfmt(Array.isArray(oxfmt) ? oxfmt : '.'),
    runBiome(Array.isArray(biome) ? biome : '.'),
  ])
).flat();

await fs.writeFile(output, JSON.stringify(issues), {encoding: 'utf8'});

process.exit(Number(!exit0 && !!issues.length));
