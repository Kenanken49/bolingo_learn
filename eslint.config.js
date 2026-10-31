// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      // Supabase Edge Functions run on Deno with URL imports; lint with `deno lint`.
      'functions/*',
      'supabase/functions/*',
      // Standalone design deck: plain browser JS, never bundled by Metro.
      'design/*',
    ],
  },
  {
    // Node tooling gates (`npm test`). Scripts declare their own Node globals
    // with a `/* global … */` comment, so only app-only rules need turning off.
    files: ['scripts/**/*.cjs'],
    rules: {
      'expo/no-dynamic-env-var': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
