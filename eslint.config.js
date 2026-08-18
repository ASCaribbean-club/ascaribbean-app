import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Scaffolded domain/data method stubs (empty bodies, `throw new
      // Error('not implemented')`) keep their full, documented parameter
      // list even before the implementation uses it — a leading underscore
      // marks that as intentional rather than a bug.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Context providers colocate their Provider component with the hook (or,
    // for DependenciesContext, the Context object itself — read via
    // di/hooks/use-<domain>-dependencies.ts) that reads the context
    // (ARCHITECTURE.md 13.4) — an accepted exception to the "one component
    // per file" fast-refresh rule.
    files: ['src/presentation/app/providers/*.tsx'],
    rules: {
      'react-refresh/only-export-components': [
        'error',
        { allowExportNames: ['useAuthContext', 'DependenciesContext'] },
      ],
    },
  },
])
