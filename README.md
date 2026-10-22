# GitLab CICQ

**GitLab CICQ** is a command-line tool that runs **ESLint**, **TypeScript**,
**Oxlint**, and **Oxfmt** checks and generates a single [GitLab Code Quality](https://docs.gitlab.com/ci/testing/code_quality/)
report in JSON format. It integrates easily into GitLab CI/CD pipelines for
automated code quality reporting.

## Features

- Run ESLint checks with optional file patterns.
- Run TypeScript type checks on specified directories.
- Run Oxlint checks with optional file and directory paths.
- Run Oxfmt formatting without modifying files.
- Generate a single GitLab-compatible Code Quality report.
- Configurable output path for reports.
- Optional `--exit-0` mode to return a successful exit code when checks find issues.

## Requirements

- **Node.js** >= 24
- Optional: ESLint 9.38+ or 10 with flat config (if using `--eslint`)
- Optional: TypeScript 5.9.3+, 6, or 7 (if using `--typescript`)
- Optional: Oxlint 1.89+ within version 1.x (if using `--oxlint`)
- Optional: Oxfmt 0.74.x (if using `--oxfmt`)

TypeScript checks run the compiler installed in the checked project without
emitting files or changing its incremental build cache. Each project directory
is checked using its nearest `tsconfig.json`, searching parent directories if
needed. If no configuration is found, the tool prints a warning and skips the
TypeScript check for that directory.

## Installation

Install as a dev dependency:

```sh
npm install -D @agrodt/gitlab-cicq
```

Install ESLint and/or TypeScript in your project for the corresponding checks.
For example, to use both:

```sh
npm install -D eslint typescript
```

ESLint checks also require a flat configuration file such as `eslint.config.js`.

To use the Oxc integrations, install their tools in your project:

```sh
npm install -D oxlint oxfmt
```

Each integration only requires its own tool. You can select any combination of
checks.

## Usage

### Options

Run the CLI with the --help option to see available commands:

```
$ npx gitlab-cicq --help

Usage: gitlab-cicq [options]

Run ESLint, TypeScript, Oxlint, and Oxfmt checks and output GitLab Code Quality report

Options:
  -V, --version               output the version number
  -e, --eslint [patterns...]  run ESLint (defaults to all files when no patterns are given)
  -t, --typescript [dirs...]  run TypeScript checks (defaults to current directory when no dirs are given)
  -l, --oxlint [paths...]     run Oxlint (defaults to current directory when no paths are given)
  -f, --oxfmt [paths...]      run Oxfmt (defaults to current directory when no paths are given)
  -o, --output <path>         report path (default: "codequality.json")
  --exit-0                    always exit with 0 (default: false)
  -h, --help                  display help for command
```

The `--exit-0` option returns exit code 0 when checks complete and report issues.
It does not suppress failures such as missing dependencies, ESLint configuration
errors, TypeScript compiler crashes, invalid Oxlint or Oxfmt configurations,
Oxfmt parsing errors, or an unwritable report path.

### Example

Run ESLint on the `src` directory and TypeScript checks in the current
directory:

```sh
npx gitlab-cicq --eslint src --typescript --output codequality.json
```

## Integration in CI/CD

With the tool, ESLint, and TypeScript installed as project dependencies, add the
generated codequality.json report to your GitLab pipeline:

```yaml
code_quality:
  image: node:24
  stage: test
  script:
    - npm install
    - npx gitlab-cicq --eslint --typescript
  artifacts:
    reports:
      codequality: codequality.json
```
