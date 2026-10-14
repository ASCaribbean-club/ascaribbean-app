// Après `vite build` : envoie les source maps à PostHog (stack traces lisibles),
// PUIS supprime tous les .map de dist/ — ils ne doivent jamais être servis
// publiquement. Appelé par `npm run build:release` (commande de build Netlify).
//
// Secrets lus dans l'environnement du build (jamais en VITE_, jamais dans le
// bundle) : POSTHOG_CLI_API_KEY (clé API personnelle), POSTHOG_CLI_PROJECT_ID,
// POSTHOG_CLI_HOST (https://eu.posthog.com). Sans clé (build local, deploy
// preview sans secret) : pas d'envoi, mais les .map sont supprimés quand même.
import { spawnSync } from 'node:child_process'
import { readdirSync, rmSync } from 'node:fs'
import path from 'node:path'

const distDir = path.resolve('dist')

function findMaps(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return findMaps(full)
    return entry.name.endsWith('.map') ? [full] : []
  })
}

const hasCredentials = Boolean(process.env.POSTHOG_CLI_API_KEY && process.env.POSTHOG_CLI_PROJECT_ID)
let failed = false

if (hasCredentials) {
  const result = spawnSync(
    'npx',
    ['posthog-cli', '--host', process.env.POSTHOG_CLI_HOST ?? 'https://eu.posthog.com', 'sourcemap', 'process', '--directory', distDir],
    { stdio: 'inherit' },
  )
  failed = result.status !== 0
} else {
  console.warn('[sourcemaps] POSTHOG_CLI_API_KEY / POSTHOG_CLI_PROJECT_ID absents : pas d\'envoi à PostHog.')
}

// Toujours supprimer, même si l'envoi a échoué : une fuite publique est pire
// qu'une stack trace illisible.
const maps = findMaps(distDir)
for (const file of maps) rmSync(file)
console.log(`[sourcemaps] ${maps.length} fichier(s) .map supprimé(s) de dist/.`)

if (failed) {
  console.error('[sourcemaps] L\'envoi à PostHog a échoué.')
  process.exit(1)
}
