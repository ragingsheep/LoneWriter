# AGENTS.md

## Project overview

LoneWriter is a privacy-first writing application — React 19 SPA with Vite 7, IndexedDB persistence, optional AI providers, PWA. All data stays client-side.

## Monorepo / commands

This is a **pseudo-monorepo** (no npm workspaces). Root delegates to `app/` via `--prefix`:

```bash
npm run dev          # vite dev server (app/)
npm run build        # vite build (app/)
npm run preview      # vite preview (app/)
npm run install:app  # npm install in app/

# Docs site (separate package)
npm --prefix docs install
npm --prefix docs run dev
```

- `npm run lint` from root **will fail** — `app/package.json` has no `lint` script.
- No test framework, no ESLint, no Prettier. There is nothing to run for lint/format/typecheck.
- `landing/` is pure static HTML/CSS/JS — no build step, no npm dependencies.

## JavaScript only — no TypeScript

The entire codebase is **JS/JSX**. Do not create `.ts`/`.tsx` files or try to run `tsc`.

## Entrypoints

- `app/index.html` → `app/src/main.jsx` → `App.jsx`
- Three React Contexts wrap the app: `NovelContext`, `AIContext`, `ModalContext`
- No router — views switch via conditional rendering in `App.jsx`

## Database (Dexie/IndexedDB)

- Single Dexie instance exported from `app/src/db/database.js`
- **14 schema versions** with inline migrations — when changing schema, bump `DB_VERSION` and add a new `.stores()` version (look at existing pattern in `database.js`)
- All services and contexts import `db` directly — no ORM, no repository layer

## State management

- Three React Contexts only: `NovelContext`, `AIContext`, `ModalContext`. No Redux, Zustand, etc.
- Cross-component communication uses `window.dispatchEvent(new CustomEvent(...))` with named events:
  - `cloud-version-available`, `navigate-to-scene`, `navigate-to-compendium-item`, `open-oracle-panel`
  - `rag-model-loading`, `rag-model-progress`, `rag-model-ready`, `rag-model-error`, `toggle-stats`
  - `restore-from-revision`

## Styling

- CSS custom properties (design tokens) in `app/src/index.css` — always use these variables, not hardcoded colors
- **4 themes**: `dark` (default), `light`, `sepia`, `nordic` — theme is a class on `<body>`
- Each component/view has a co-located `.css` file
- CSS class naming is BEM-like: `app-topbar__left`, `sidebar--collapsed`

## i18n

- i18next with 7 namespaces: `common`, `app`, `editor`, `compendium`, `resources`, `ai`, `settings`
- 2 languages: `en`, `es`
- `index.html` declares `lang="es"` but localStorage default is `'en'` — be aware of this discrepancy
- Translation JSON files in `app/src/i18n/locales/{en,es}/`

## Vite plugins (app/)

- `@vitejs/plugin-react` — React Fast Refresh
- `vite-plugin-node-polyfills` — required for packages expecting Node APIs in browser (buffer, stream, crypto, zlib, fs, etc.)
- `vite-plugin-pwa` — `registerType: 'prompt'`, max 30MB for WASM files (Transformers.js models)
- `__APP_VERSION__` is injected via Vite `define` from `package.json` version

## Key service modules (app/src/services/)

| File | Purpose |
|------|---------|
| `aiService.js` | AI provider routing (google, openai, anthropic, openrouter, local) |
| `ragService.js` | RAG indexing/retrieval, triggers Web Worker |
| `ragWorker.js` | Web Worker running Transformers.js (`Xenova/all-MiniLM-L6-v2`) |
| `exportService.js` | `.lwrt` export/import (GZIP + optional AES-GCM encryption), `.docx` export |
| `googleDriveService.js` | Google Drive backup sync |
| `mpcService.js` | Multi-Provider-Chain proposal detection |
| `compendiumSearch.js` | Compendium text search |
| `entityDetector.js` | Entity detection for Oracle |

## Export format

`.lwrt` files use binary format: `LWRT_V1` header + base64(gzip(JSON)), or `LWRT_V1_ENC` for password-protected (AES-256-GCM + PBKDF2). Handled entirely in `exportService.js`.

## AI providers

- Provider configs stored in Dexie `aiProviderConfigs` table (not env vars)
- API keys are user-provided, stored in browser localStorage per provider
- 5 providers: `google`, `openai`, `anthropic`, `openrouter`, `local`

## Deployment

Three independent Vercel deployments from one repo, each from its own subdirectory:

| Directory | Purpose | Build |
|-----------|---------|-------|
| `app/` | Main SPA | `vite build` |
| `docs/` | VitePress docs | `vitepress build` → `.vitepress/dist` |
| `landing/` | Static landing | None |

## LocalStorage keys

Prefixed with `lw_` (e.g., `lw_theme`, `lw_editor_font`). See `App.jsx` for the full set.
