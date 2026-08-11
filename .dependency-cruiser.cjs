/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domain-no-data',
      severity: 'error',
      comment:
        "domain/ ne doit jamais importer data/ — il doit rester portable et testable sans Supabase.",
      from: { path: '^src/domain' },
      to: { path: '^src/data' },
    },
    {
      name: 'domain-no-presentation',
      severity: 'error',
      comment:
        "domain/ ne doit jamais importer presentation/ — il doit rester portable sans React.",
      from: { path: '^src/domain' },
      to: { path: '^src/presentation' },
    },
    {
      name: 'data-no-presentation',
      severity: 'error',
      comment:
        "data/ ne doit jamais importer presentation/ — l'implémentation ne connaît pas la vue.",
      from: { path: '^src/data' },
      to: { path: '^src/presentation' },
    },
    {
      name: 'presentation-no-direct-data',
      severity: 'error',
      comment:
        "presentation/ n'importe jamais data/ directement — l'injection passe par presentation/di/container.ts.",
      from: { path: '^src/presentation', pathNot: '^src/presentation/di/container\\.ts$' },
      to: { path: '^src/data' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.app.json' },
  },
}
