import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import {defineConfig} from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    ignores: ['dist/**/*', 'node_modules/**/*'],
  },
  {
    files: ['**/*.{js,ts}'],
    plugins: {js, '@stylistic': stylistic},
    extends: [
      js.configs.recommended,
      importPlugin.flatConfigs.recommended, importPlugin.flatConfigs.typescript,
    ],
    languageOptions: {globals: globals.browser},
  },
  ...tseslint.configs.recommended,
  stylistic.configs.recommended,
  {
    rules: {
      '@stylistic/brace-style': ['error', '1tbs'],
      '@stylistic/object-curly-spacing': ['error', 'never'],
      '@stylistic/semi': ['error', 'always'],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
      }],
      'curly': ['error', 'all'],
      'import/no-unresolved': 'off',
      'import/order': ['error', {
        'alphabetize': {
          order: 'asc',
          caseInsensitive: true,
        },
        'newlines-between': 'always',
      }],
    },
  },
]);
