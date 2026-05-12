# 📐 LoneWriter — Project Scope & Capabilities

> **Current Version:** v1.9-nexus  
> **Last Updated:** 2026-05-12  
> **Document Purpose:** Comprehensive definition of the current scope, boundaries, and capabilities of LoneWriter — including planned features not yet implemented.

---

## 1. Project Identity

LoneWriter is a **100% local, privacy-first** narrative writing application for solo fiction authors. It runs entirely in the browser as a React 19 SPA, installable as a PWA. All data stays client-side in IndexedDB. When AI is used, the user provides their own API key — LoneWriter never proxies, stores, or reads prompts on its own servers.

**Deployment targets:** Web browser (primary) · Installable PWA (desktop & mobile, offline-capable)

---

## 2. Design Boundaries (Intentional Exclusions)

| Excluded | Rationale |
|---|---|
| User accounts / authentication | Privacy-first; no server-side user data |
| LoneWriter-hosted AI inference | BYOK: user provides their own API key |
| Real-time collaboration | Single-author tool by design |
| Server-side data storage | All data lives in the browser's IndexedDB |
| Native desktop/mobile app | Browser-first PWA architecture |
| EPUB/PDF export | Under consideration — not planned |
| `.pdf` / `.docx` import parsing | Low-priority roadmap item |

---

## 3. Architecture Overview

### 3.1 Tech Stack

| Layer | Technology |
|---|---|
| UI | React 19 · Vite 7 |
| Database | Dexie.js v4 (IndexedDB) |
| Rich Text Editor | Tiptap 3 (ProseMirror) |
| Local AI / Embeddings | `@huggingface/transformers` — `all-MiniLM-L6-v2` |
| Knowledge Graph | `react-force-graph-2d` / `3d` · Three.js |
| Timeline | `vis-timeline` |
| Drag & Drop | `@dnd-kit/core` · `@dnd-kit/sortable` |
| i18n | `i18next` · `react-i18next` |
| Compression | `pako` (gzip) |
| Encryption | WebCrypto API (AES-GCM · PBKDF2 / SHA-256) |
| Cloud Sync | Google Drive API (GSI) |
| PWA | `vite-plugin-pwa` (Service Workers) |
| Export | `html-to-docx` · `file-saver` |
| Icons | `lucide-react` |
| Markdown | `marked` |
| Deployment | Vercel |

### 3.2 Repository Layout

```
LoneWriter/
├── app/                   # Main React SPA (Vite)
│   └── src/
│       ├── components/    # AIPanel, RichEditor, Sidebar, Settings, etc.
│       │   └── aipanel/   # GenerateTab, RewriteTab, DebateTab, OracleTab
│       ├── views/         # Editor, Compendium, Nexus, Resources, StorySettings
│       │   ├── editor/    # EditorSortables, useEditorDnd
│       │   └── compendium/# CompendiumCards, CompendiumPanel
│       ├── services/      # aiService, ragService, exportService, mpcService,
│       │                  # contextGatherer, compendiumSearch, entityDetector,
│       │                  # googleDriveService
│       │   └── providers/ # gemini, openai, claude, openrouter, local, fetchWithRetry
│       ├── db/            # Dexie database schema (database.js)
│       ├── context/       # NovelContext, AIContext, ModalContext
│       │                  # useAIConfig, useAIMpc, useAIUsage, useCloudSync, useMergeEngine
│       ├── hooks/         # useAppNavigation, useAppPreferences, useAppUI
│       ├── utils/         # renderMarkdown, version
│       └── i18n/          # Translation files (EN/ES), stopwords
├── docs/                  # VitePress documentation site
├── landing/               # Static marketing landing page (no build)
└── Scope.md               # This document
```

### 3.3 State Management

- **3 React Contexts**: `NovelContext` (novel/compendium CRUD), `AIContext` (AI state, Oracle, Debate, MPC, Generate), `ModalContext` (modals)
- `AIContext` delegates to 4 extracted hooks: `useAIConfig` (providers, API keys, models), `useAIMpc` (MPC proposals and state), `useAIUsage` (token tracking), `useCloudSync` (Google Drive)
- **3 App-level hooks** (`app/src/hooks/`): `useAppNavigation`, `useAppPreferences`, `useAppUI` — extracted from `App.jsx` for clarity
- **Cross-component events** via `window.dispatchEvent(new CustomEvent(...))`:

| Event | Direction | Purpose |
|---|---|---|
| `navigate-to-scene` | → NovelContext | Open a scene in the Editor |
| `navigate-to-compendium-item` | → CompendiumView | Open an entity's edit panel |
| `cloud-version-available` | → App.jsx | Prompt to restore a newer cloud backup |
| `restore-from-revision` | → App.jsx | Restore a specific Drive revision |
| `open-oracle-panel` | → AIPanel | Open and switch to Oracle tab |
| `rag-model-loading` / `rag-model-progress` / `rag-model-ready` / `rag-model-error` | → RagToast | Embedding model download progress |
| `toggle-stats` | → EditorView | Expand the stats panel |
| `ai-apply-generate` | → Editor (RichEditor) | Insert generated HTML at cursor position |
| `mpc-manual-scan` | → EditorView | Trigger a manual MPC analysis run |

### 3.4 Database Schema (Dexie v15 — 22 tables; v16 planned — 23 tables)

| Table | Purpose |
|---|---|
| `novels` | Novel metadata (title, author, status, word count, UI state) |
| `acts` | Acts within a novel |
| `chapters` | Chapters within acts |
| `scenes` | Scenes (content, POV, inGameDate, word count) |
| `characters` | Character sheets (traits, relations, associations) |
| `locations` | World locations |
| `objects` | Notable objects / artifacts |
| `lore` | World lore / rules / history |
| `resources` | Uploaded reference files |
| `dailyProgress` | Per-day word count tracking |
| `debateAgents` | Custom AI debate agent configs |
| `debateSessions` | Saved debate session histories |
| `oracleEntries` | Oracle continuity results per scene |
| `lastRewrite` | AI rewrite history per scene |
| `mpcIgnored` | Permanently dismissed MPC proposals |
| `aiUsage` | Token usage per provider/model/date |
| `vectors` | Local RAG embedding vectors |
| `aiProviderConfigs` | Persisted API key + model per provider |
| `customStopwords` | User-defined entity-detection filters |
| `editorPrefs` | Editor visual preferences |
| `nexusLinks` | Manual relationship links for Nexus graph |
| `generateHistory` | AI Generate tab history per scene (v15) |
| `novelSettings` | Per-novel prose settings (tense, language, POV) — **planned v16** |

---

## 4. Feature Scope

### 4.1 Narrative Structure Editor

**In scope:**
- Three-level hierarchy: **Acts → Chapters → Scenes**
- Rich-text scene editor (Tiptap): bold, italic, headings, lists
- Per-scene metadata: title, POV type + character, in-game date, status
  - **POV defaults to the novel-level setting** (from Story Settings §4.14) but can be overridden independently on any individual scene — the override only affects that scene
- Per-scene synopsis field with AI auto-generation (10-word "telegram" summary via `aiService.summarizeScene`)
- Drag-and-drop reordering (`@dnd-kit`): scenes within chapters, chapters across acts
- Collapsible, resizable narrative tree panel
- Fixed sticky editor toolbar
- Real-time word count and daily progress tracking with goals
- Continuous chapter numbering across acts
- Responsive mobile layout with drawer navigation (`< 768px`)
- Node expansion/collapse state persisted per novel
- Landscape orientation warning overlay

**Out of scope:**
- Comment/annotation system · Version control / tracked changes · Markdown import into tree

---

### 4.2 Compendium (World-Building Database)

**In scope:**
- Four entity categories: **Characters**, **Locations**, **Objects**, **Lore**
- Rich character sheets: role, occupation, age, description, traits, bidirectional relationships, associations
- Category re-assignment for existing entries
- Per-entity Oracle exclusion toggle (`ignoredForOracle`)
- "AI Context" badge per card
- AI auto-complete of entity fields from novel text
- AI entity merging (detect duplicates, fuse via AI) — supports both 2-entity and multi-entity merge
- Navigation from Nexus graph double-click

**Out of scope:**
- Custom entity categories · Image attachments · Relationship graph editing (handled by Nexus)

---

### 4.3 AI Assistant Panel

The AI panel has four tabs: **Generate**, **Rewrite**, **Debate**, and **Oracle**.

#### 4.3.1 Generate Tab ✅ `[IMPLEMENTED]`

The Generate tab produces **new** scene prose — distinct from Rewrite (which transforms existing text). It is a composition aid driven entirely by an explicit user prompt; it never writes autonomously.

**In scope:**

*Prompt & Intent*
- Mandatory **free-text prompt** — user describes what the AI should write; generation cannot start without a prompt
- Optional **tone/style hint** (e.g. "tense and atmospheric")
- **Word count target** — numeric input; sent as a hard directive in the prompt
- Text is inserted at the **current cursor position** in the editor via the `ai-apply-generate` custom event; any existing text after the cursor remains in place

*Automatic Context Injection*
- **POV character** — auto-populated from the scene's POV field
- **Previous text scope** — provided by `services/contextGatherer.js`:
  - `none` — no prior-text context
  - `prevWords` — last X words before cursor in the active scene (user specifies X)
  - `currentScene` — full text of the active scene
  - `prevScenes` — N scenes immediately before the active one (user specifies N)
  - `prevChapter` — all scenes in chapters before the active chapter
  - `entireNovel` — all written text; **if estimated tokens exceed ~75k (using `words × 1.3` heuristic), a warning is shown**
- **Knowledge Base (Resources)** — optional toggle to inject active reference files

*Output, Preview & Streaming*
- AI response is **streamed per-chunk** into a read-only preview panel within the Generate tab via `AIService.generateStream()` (async generator)
- On Accept, plain text is **converted to HTML** (`<p>`, `<br/>`) before insertion at the cursor position
- Preview is **read-only during streaming**
- **Stop button** — visible during streaming; aborts the stream via `AbortController` and keeps partial text in the preview
- **Accept Partial** button — visible alongside Stop during streaming; accepts the partial result immediately
- On completion:
  - **Accept** — converts to HTML and dispatches `ai-apply-generate`; clears the prompt form
  - **Reject / Discard** — clears the preview (no confirmation modal in current implementation)
  - **Regenerate** — re-runs the same prompt+context; if editing from history, overwrites that record

*History & Persistence (Per Scene)*
- Every accepted generation saved to the `generateHistory` IndexedDB table
- Record stores: `prompt`, `toneHint`, `wordCountTarget`, `contextScope`, `contextDescription`, `responseHtml`, `responseText`, `createdAt`
- History scoped to the **active scene** — only shows history for the scene being edited
- Collapsible history log in the Generate tab below the prompt controls
- **Load from history**: restores prompt + settings; clicking Regenerate **overwrites** the record (via `overwriteGeneration`)
- History entries can be individually deleted
- History included in `.lwrt` project export

*Provider & Reliability*
- All 5 providers: Gemini, OpenAI, Claude, OpenRouter, Local (LM Studio / Ollama)
- Streaming via `callGeminiStream`, `callOpenAIStream`, `callClaudeStream`, `callOpenRouterStream`, `callLocalStream` in provider modules

**Out of scope:**
- Multi-scene batch generation · Auto-write without user prompt · Inline ghost text / editor decoration · Content generation outside the active novel · Discard confirmation modal (Reject clears silently)

---

#### 4.3.2 Rewrite Tab

**In scope:**
- Rewrite selected text with configurable goals: **Style**, **Tone**, **Length**, **Clarity**, **Rhythm**, **Cohesion**, **Character** (POV-based rewrite), **Language** (Globe icon for translation/register change)
- Optional previous-paragraph context for stylistic continuity
- Optional Knowledge Base injection
- Rewrite history per scene in IndexedDB (`lastRewrite`)
- Confirmation modal before discarding
- HTML output · Exponential backoff retry (3 attempts)

**Out of scope:**
- Multi-paragraph batch rewriting · Streaming output (full response returned)

---

#### 4.3.3 Debate Tab

**In scope:**
- Multi-agent debate for critical scene feedback
- Custom AI agents with user-defined system prompts, configurable rounds
- Persistent sessions in IndexedDB, auto-named from scene metadata
- Multiple sessions per novel; session list with rename/delete; session switch persisted in `localStorage`
- Legacy `debate_history` localStorage migration on first load
- Agents receive: system prompt, scene content, POV, Compendium context, Knowledge Base, RAG context
- Role-locked agents (first-person enforcement directive + language directive)
- All 5 providers · Markdown rendering of responses

**Out of scope:**
- User as debate participant (author sends messages but is labeled separately) · Transcript export

---

#### 4.3.4 Oracle Tab (Continuity Linter)

**In scope:**
- Paragraph-by-paragraph coherence analysis against the Compendium
- Entity detection via `entityDetector.js`
- RAG-powered semantic context retrieval (local vectors)
- **Anaphora / Saliency Engine**: pronoun detection + character reference proposals (max 20 per analysis)
- Combined context: RAG + previous paragraphs + POV + Compendium
- Traffic-light status per paragraph
- Correction state persistence (`isCorrected`)
- Entity exclusion (`ignoredForOracle`) · Enriched tooltips · Custom stopwords

**Out of scope:**
- Cross-scene batch analysis · Grammar/spelling (Oracle is lore-only)

---

### 4.4 RAG Engine (Local Semantic Search)

**In scope:**
- Local embeddings: `all-MiniLM-L6-v2` via Transformers.js (WASM SIMD)
- Web Worker (`ragWorker.js`) for non-blocking embedding
- Vectors stored per paragraph in IndexedDB (`vectors`)
- Used by Oracle and Debate for past-manuscript context retrieval
- Auto-indexing of unvectorized scenes on `switchNovel`
- Toast notification during model loading

**Out of scope:**
- Larger embedding models (roadmap) · Vectorizing uploaded resource files

---

### 4.5 MPC — Compendium Proposal Monitor

**In scope:**
- **Opt-in** feature (disabled by default; toggled via `localStorage` key `ai_mpc_enabled`)
- Real-time entity detection as the user writes (debounced 2s, 15s AI cooldown between calls)
- Detects potential characters, locations, objects, lore
- Manual scan trigger via `mpc-manual-scan` custom event
- Non-intrusive purple proposal drawer
- One-click "Add to Compendium" or "Edit" (saves then opens panel)
- Permanent dismissal per entity name/type (`mpcIgnored`)
- Proposals persisted per novel in `localStorage` (`mpc_prop_{novelId}`)
- Configurable via Oracle Stopwords

**Out of scope:**
- Retroactive scanning of saved historical scenes · MCP reference auto-extraction (roadmap)

---

### 4.6 Nexus — Interactive Knowledge Graph

**In scope:**
- **3D/2D dual-mode** visualization (switchable)
- Nodes = all Compendium entities; edges = relationships + manual `nexusLinks`
- Animated particle energy flows · Permanent labels · Ambient halo glow
- 3D texture cache for performance
- Single-click: zoom+center · Double-click: navigate to Compendium
- **Chronological Timeline** (vis-timeline): day-granularity, click → Editor
- Free/Locked view toggle (persisted)
- Theme-adaptive UI across all 4 themes

**Out of scope:**
- Manual layout pinning · Graph export as image · Graph search/filter

---

### 4.7 Resources (Knowledge Base)

**In scope:**
- Upload **TXT, MD, CSV, JSON** reference files (stored in IndexedDB)
- Injected as context into AI Rewrite, Debate, and Generate prompts
- Oracle Stopwords management (system + custom)

**Out of scope:**
- PDF/DOCX parsing (roadmap) · Vectorization into RAG index

---

### 4.8 Export & Import

**In scope:**
- **`.lwrt` export**: gzip + base64 snapshot of all IndexedDB tables (including `generateHistory`)
- **Encrypted `.lwrt`**: AES-GCM 256-bit, PBKDF2 200k iterations, SHA-256
- **`.lwrt` import**: auto-detects encrypted / plain / legacy JSON; re-prompts on wrong password
- **Scene `.docx`** export (single scene)
- **Full novel `.docx`** manuscript export (title page, page breaks, page numbers)
- Device-only settings (`editorPrefs`, `customStopwords`) excluded from export

**Out of scope:**
- EPUB/PDF export · `.docx`/`.pdf` import · Selective per-novel export

---

### 4.9 Cloud Sync (Google Drive)

**In scope:**
- Optional Google Drive connection via GSI
- Auto-backup (30s debounce after changes) to user's own Drive
- Backup check on account link — restore prompt if found
- Drive native revision history · Compressed `.lwrt` format
- Race-condition protection (`isRestoring`, `cloudCheckInProgress`)

**Out of scope:**
- Multi-device real-time sync · Non-Google providers · Collaborative editing

---

### 4.10 AI Provider Integration

**In scope:**
- **5 providers**: Google Gemini, OpenAI, Anthropic Claude, OpenRouter, Local (LM Studio / Ollama)
- Per-provider config in IndexedDB (`aiProviderConfigs`)
- ⚡ Test Connection button
- Token usage tracking (`aiUsage`)
- Exponential backoff retry (3 attempts, up to 8s) — non-streaming calls only
- Streaming (async generator) for Generate tab only

**Out of scope:**
- Streaming responses on Rewrite/Debate/Oracle · Simultaneous multi-provider calls · Fine-tuning

---

### 4.11 Interface & Theming

**In scope:**
- **4 themes**: Classic Dark, Modern Light, Sepia Memoir, Nordic Night
- **4 fonts**: Inter, Playfair Display, JetBrains Mono, Special Elite
- Font size control (12–28px), persisted
- Animated mesh background (toggleable anti-fatigue)
- Glassmorphism on modals/panels
- Spring-easing animations on transitions
- Resizable AI panel and narrative tree
- PWA update modal
- Landscape warning overlay on mobile

**Out of scope:**
- Custom user themes · OS dark/light auto-detection

---

### 4.12 Internationalization (i18n)

**In scope:**
- **English** and **Spanish** — fully translated
- 7 namespaces: `common`, `app`, `editor`, `compendium`, `resources`, `ai`, `settings`
- Language selector in Settings > Interface · Persisted in `localStorage`

**Out of scope:**
- RTL languages · Community translation pipeline

---

### 4.13 Settings (4 tabs)

1. **Cloud & Backup**: Google Drive link/unlink, backup/restore, revision history
2. **Artificial Intelligence**: Provider, API key, model, base URL, Test Connection
3. **Interface**: Theme, font, font size, animated background
4. **General**: Language, app version, clear cache & reload, credits

---

### 4.14 Story Settings `[NOT YET IMPLEMENTED]`

A new top-level panel (alongside Editor, Compendium, Nexus, Resources) that holds **novel-level prose configuration**. These settings are stored per novel and injected into AI prompts at generation time. The exact prompt injection strategy is deferred to a later implementation phase — this scope covers the data model and UI only.

#### Prose Settings

| Setting | Type | Options / Format | Purpose |
|---|---|---|---|
| **Tense** | Toggle | `past` \| `present` | Narrative tense; passed to the AI as a prose directive |
| **Language** | Free text | e.g. `General English`, `British English`, `Español` | Used for spell-checking, hyphenation, and AI register |
| **POV Type** | Button group | `1st Person` \| `2nd Person` \| `3rd Person` \| `3rd Person (Limited)` \| `3rd Person (Omniscient)` | Novel-level default POV; each scene inherits this value but may override it independently (see §4.1) |
| **POV Character** | Optional text | Character name | Meaningful when POV Type is `1st Person` or `3rd Person (Limited)`; optional otherwise. Scene-level POV character field works the same way — inherits novel default, overridable per scene |

#### Data Model

- New Dexie table **`novelSettings`** (Dexie v16):
  ```
  novelSettings: 'novelId'
  ```
  Keyed by `novelId` (one record per novel). Fields: `novelId`, `tense` (`'past'` \| `'present'`, default `'past'`), `language` (string, default `''`), `povType` (`'1st'` \| `'2nd'` \| `'3rd'` \| `'3rd_limited'` \| `'3rd_omniscient'`, default `'3rd'`), `povCharacter` (string, default `''`), `updatedAt`.
- Settings are loaded into `NovelContext` alongside the active novel and exposed as `novelSettings` / `updateNovelSettings(novelId, patch)`.
- Excluded from `DEVICE_ONLY_TABLES` — included in `.lwrt` export/import.
- On `deleteNovel`, the corresponding `novelSettings` record must be deleted.

#### UI

- New view: `app/src/views/StorySettings.jsx` + `StorySettings.css`
- **First item in the sidebar navigation** (above Editor)
- Sections:
  - **PROSE** — Tense, Language, POV (Type + Character) as shown in design
  - Additional sections (Genre, Style Guide, etc.) reserved for future expansion
- Each field shows a brief description of how it affects AI output
- Settings auto-save on change (no explicit Save button)

**Out of scope (this iteration):**
- Prompt injection logic · Genre / style guide fields · Per-scene tense override · AI validation of settings consistency

> **Design decision (2026-05-12):** Story Settings is the **first sidebar item**. Scene-level POV **inherits** the novel-level POV Type and Character as defaults; each scene can override both independently without affecting the novel default or other scenes.

---

## 5. Platform & Deployment

| Item | Status |
|---|---|
| Web app | `lonewriter.vercel.app` |
| Landing page | `getlonewriter.vercel.app` |
| Documentation | VitePress (`/docs`) |
| PWA / Offline | ✅ Service Workers |
| Mobile responsive | ✅ Drawer nav, touch targets, `safe-area-inset` |
| License | MIT |

---

## 6. Known Limitations

| Limitation | Notes |
|---|---|
| No cross-device sync without Google Drive | Data is device-local by default |
| Full database export only | No per-novel selective export |
| `generateHistory` not deleted on `deleteNovel` | Minor gap — orphan records remain in DB |
| RAG limited to small model | `all-MiniLM-L6-v2`; larger models on roadmap |
| Oracle per-scene only | No project-wide batch analysis |
| MPC active on current scene only | Past scenes not retroactively scanned |
| MPC disabled by default | Must be enabled per device in the AI panel |
| No Nexus graph search/filter | Large graphs hard to navigate |
| Claude CORS | Requires `anthropic-dangerous-direct-browser-access` header |
| Generate discard is silent | No confirmation modal before clearing a generated result |

---

## 7. Roadmap Summary

### 🟢 High Priority
- **Story Settings panel** (§4.14) — Dexie v16 table, view, NovelContext integration
- Mobile PWA polish · Anaphora optimization · Enhanced RAG memory · Generate discard confirmation modal

### 🟡 Low Priority
- `.pdf`/`.docx` import · MCP reference integration · Smart Bootstrap (Markdown import) · Cascade-delete `generateHistory` on `deleteNovel`

### ⚫ Ideas Under Consideration
- Narrative Continuity Engine v2 · EPUB/PDF export · Collaborative peer review · Pacing analysis

---

*This document reflects LoneWriter at **v1.9-nexus** (reviewed 2026-05-12). Update with each major release.*
