# GitLab CICQ

**GitLab CICQ** is a command-line tool that runs **ESLint** and **TypeScript**
checks and generates a single [GitLab Code Quality](https://docs.gitlab.com/ci/testing/code_quality/)
report in JSON format. It integrates easily into GitLab CI/CD pipelines for
automated code quality reporting.

## Features

- Run ESLint checks with optional file patterns.
- Run TypeScript type checks on specified directories.
- Generate a single GitLab-compatible Code Quality report.
- Configurable output path for reports.
- Optional `--exit-0` mode to prevent failing CI pipelines.

## Requirements

- **Node.js** >= 22
- Optional: ESLint and TypeScript (if using `--eslint` or `--typescript`)

## Installation

Install as a dev dependency:

```sh
npm install -D gitlab-cicq
```

Or run without adding to the project:

```sh
npx gitlab-cicq [options]
```

## Usage

### Options

Run the CLI with the --help option to see available commands:

```
$ gitlab-cicq --help

Usage: gitlab-cicq [options]

Run ESLint and TypeScript checks and output GitLab Code Quality report

Options:
  -V, --version               output the version number
  -e, --eslint [patterns...]  run ESLint (defaults to all files when no patterns are given)
  -t, --typescript [dirs...]  run TypeScript checks (defaults to current directory when no dirs are given)
  -o, --output <path>         report path (default: "codequality.json")
  --exit-0                    always exit with 0 (default: false)
  -h, --help                  display help for command
```

### Example

Run ESLint on the `src` directory and TypeScript checks in the current
directory:

```sh
gitlab-cicq --eslint src --typescript --output reports/codequality.json
```

## Integration in CI/CD

Add the generated codequality.json report to your GitLab pipeline:

```yaml
code_quality:
  stage: test
  script:
    - gitlab-cicq --eslint --typescript
  artifacts:
    reports:
      codequality: codequality.json
```
