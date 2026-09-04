/// <reference types="vite/client" />

// Fed by vite.config.ts's `define: { APP_VERSION: ... }` (reads
// package.json's version directly at build time — this just declares its
// type for TS). Replaces any hardcoded version string in the UI, e.g.
// specs/menu.md AC-MN-09's version footer.
declare const APP_VERSION: string
