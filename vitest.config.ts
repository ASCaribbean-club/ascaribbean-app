import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const alias = {
  '@domain': path.resolve(dirname, 'src/domain'),
  '@data': path.resolve(dirname, 'src/data'),
  '@presentation': path.resolve(dirname, 'src/presentation'),
}

// Deux projets, comme le prescrit ARCHITECTURE.md section 8 : le domaine et
// les mappers tournent en `node` sans dépendance ; les ViewModels tournent
// en `jsdom` puisqu'ils utilisent des hooks React.
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'domain-data',
          environment: 'node',
          include: ['src/domain/**/*.test.ts', 'src/data/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: 'presentation',
          environment: 'jsdom',
          include: ['src/presentation/**/*.test.{ts,tsx}'],
          setupFiles: ['src/presentation/test-setup.ts'],
          // @testing-library/jest-dom extends the global `expect` on import —
          // needs `globals: true` in this project only, domain/data stay explicit.
          globals: true,
        },
      },
    ],
  },
})
