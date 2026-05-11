# 📐 LoneWriter — Project Scope & Capabilities

> **Current Version:** v1.9-nexus  
> **Last Updated:** 2026-05-11  
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
│       ├── views/         # Editor, Compendium, Nexus, Resources
│       ├── services/      # aiService, ragService, exportService, mpcService, etc.
│       ├── db/            # Dexie database schema (database.js)
│       ├── context/       # NovelContext, AIContext, ModalContext
│       ├── utils/         # renderMarkdown, version
│       └── i18n/          # Translation files (EN/ES), stopwords
├── docs/                  # VitePress documentation site
├── landing/               # Static marketing landing page (no build)
└── Scope.md               # This document
```

### 3.3 State Management

- **3 React Contexts**: `NovelContext` (novel/compendium CRUD), `AIContext` (AI state, Oracle, Debate, MPC), `ModalContext` (modals)
- **Cross-component events** via `window.dispatchEvent(new CustomEvent(...))`: `navigate-to-scene`, `navigate-to-compendium-item`, `cloud-version-available`, `open-oracle-panel`, `rag-model-*`, `toggle-stats`, `restore-from-revision`

### 3.4 Database Schema (Dexie v14 — 21 tables)

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

---

## 4. Feature Scope

### 4.1 Narrative Structure Editor

**In scope:**
- Three-level hierarchy: **Acts → Chapters → Scenes**
- Rich-text scene editor (Tiptap): bold, italic, headings, lists
- Per-scene metadata: title, POV character, in-game date, status
- Drag-and-drop reordering (`@dnd-kit`)
- Collapsible, resizable narrative tree panel
- Fixed sticky editor toolbar
- Real-time word count and daily progress tracking with goals
- Continuous chapter numbering across acts
- Responsive mobile layout with drawer navigation (`< 768px`)
- Node expansion/collapse state persisted per novel

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
- AI entity merging (detect duplicates, fuse via AI)
- Navigation from Nexus graph double-click

**Out of scope:**
- Custom entity categories · Image attachments · Relationship graph editing (handled by Nexus)

---

### 4.3 AI Assistant Panel

The AI panel has four tabs: **Generate** *(not yet implemented)*, **Rewrite**, **Debate**, and **Oracle**.

#### 4.3.1 Generate Tab `[NOT YET IMPLEMENTED]`

The Generate tab produces **new** scene prose — distinct from Rewrite (which transforms existing text). It is a composition aid driven entirely by an explicit user prompt; it never writes autonomously.

**In scope:**

*Prompt & Intent*
- Mandatory **free-text prompt** — user describes what the AI should write (e.g. "Mara discovers the letter hidden behind the portrait"); generation cannot start without a prompt
- Optional **tone/style hint** (e.g. "tense and atmospheric")
- **Word count target** — numeric input; sent as a hard directive in the prompt
- Text is inserted at the **current cursor position** in the editor; any existing text after the cursor remains in place
- Cursor position is tracked at the **`Editor.jsx` view level** and passed to the Generate tab (not managed in AIContext)

*Automatic Context Injection*
- **Compendium context** — relevant entities detected in the active scene are auto-included (same mechanism as Oracle/Rewrite)
- **POV character** — auto-populated from the scene's POV field
- **Previous text scope** — a new **context-gathering utility** (`services/contextGatherer.js`) provides the following user-selectable options:
  - `Previous X words (current scene)` — user specifies a word count (e.g. 500); pulls the last X words before the cursor in the active scene
  - `Current scene (full)` — entire text of the active scene
  - `Previous N scenes` — user specifies N; the N scenes immediately before the active one in narrative order
  - `Previous chapter` — complete text of the chapter preceding the active chapter
  - `Entire novel` — all written text; **if estimated tokens exceed ~75k (using a `words × 1.3` heuristic), a warning is shown** with the estimated size so the user can decide to proceed or narrow the scope
- **Knowledge Base (Resources)** — optional toggle to inject uploaded reference files

*Output, Preview & Streaming*
- AI response is **streamed per-word as plain text** into a preview panel within the Generate tab (side panel, not inline); the author watches the output build word-by-word in real time
- On Accept, plain text is **converted to HTML** (`<p>`, `<strong>`, `<em>`) before insertion — consistent with the rest of the app. This avoids parsing partial HTML during the stream.
- Preview is **read-only during streaming**; Accept/Reject/Regenerate buttons disabled until complete
- **Stop button** — visible during streaming; aborts the stream mid-generation and **keeps whatever text has been received so far** in the preview, allowing the author to Accept the partial result
- On completion (or Stop):
  - **Accept** — converts to HTML and inserts at the cursor position in the Tiptap editor
  - **Reject / Discard** — clears preview, editor unchanged
  - **Regenerate** — re-runs the same prompt+context; replaces current preview

*History & Persistence (Per Scene)*
- Every generation saved to a new **`generateHistory`** IndexedDB table (`novelId + sceneId + createdAt`)
- Record stores: prompt, tone hint, word count target, context scope, AI response HTML, timestamp
- History scoped to the **active scene** — only shows history for the scene being edited
- Scrollable history log in the Generate tab below prompt controls
- **Editing from history**: loads prompt + settings back; on Regenerate, the record is **overwritten** (no separate copy)
- History included in `.lwrt` project export

*Provider & Reliability*
- All 5 providers: Gemini, OpenAI, Claude, OpenRouter, Local (LM Studio / Ollama)
- Exponential backoff retry on non-streaming errors (3-attempt policy)
- Clear loading/streaming state with disabled UI during generation

**Out of scope:**
- Multi-scene batch generation · Auto-write without user prompt · Inline ghost text / editor decoration · Content generation outside the active novel

---

#### 4.3.2 Rewrite Tab

**In scope:**
- Rewrite selected text with configurable goals: **Style**, **Tone**, **Length**, **Pacing**, **POV**, **Language** (Globe icon for translation/register change)
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
- Agents receive: system prompt, scene content, POV, Compendium context, Knowledge Base, RAG context
- Role-locked agents (first-person enforcement directive)
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
- Toast notification during model loading

**Out of scope:**
- Larger embedding models (roadmap) · Vectorizing uploaded resource files

---

### 4.5 MPC — Compendium Proposal Monitor

**In scope:**
- Real-time entity detection as the user writes (debounced, 15s cooldown)
- Detects potential characters, locations, objects, lore
- Non-intrusive purple proposal drawer
- One-click "Add to Compendium" or "Edit" (saves then opens panel)
- Permanent dismissal per entity name/type (`mpcIgnored`)
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
- **`.lwrt` export**: gzip + base64 snapshot of all IndexedDB tables
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
- Exponential backoff retry (3 attempts, up to 8s)

**Out of scope:**
- Streaming responses (except Generate tab) · Simultaneous multi-provider calls · Fine-tuning

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
| RAG limited to small model | `all-MiniLM-L6-v2`; larger models on roadmap |
| Oracle per-scene only | No project-wide batch analysis |
| MPC active on current scene only | Past scenes not retroactively scanned |
| No Nexus graph search/filter | Large graphs hard to navigate |
| Claude CORS | Requires `anthropic-dangerous-direct-browser-access` header |

---

## 7. Roadmap Summary

### 🟢 High Priority
- Mobile PWA polish · Anaphora optimization · Enhanced RAG memory

### 🟡 Low Priority
- `.pdf`/`.docx` import · MCP reference integration · Smart Bootstrap (Markdown import)

### ⚫ Ideas Under Consideration
- Narrative Continuity Engine v2 · EPUB/PDF export · Collaborative peer review · Pacing analysis

---

## 8. Generate Tab — Resolved Design Decisions

The following decisions have been finalized and should guide implementation:

| # | Question | Decision |
|---|---|---|
| 1 | **Streaming format** | Stream **plain text per-word** into the preview panel. Convert to HTML on Accept. New `_callXxxStream()` methods needed in `aiService.js` per provider. |
| 2 | **Context gathering** | New standalone utility **`services/contextGatherer.js`** — not a method on NovelContext. Walks the `acts[].chapters[].scenes[]` tree to collect ordered text. User selects from: `Previous X words (current scene)`, `Current scene (full)`, `Previous N scenes`, `Previous chapter`, `Entire novel`. |
| 3 | **Cursor position tracking** | Managed at the **`Editor.jsx` view level** and passed down to the Generate tab. Not stored in AIContext. |
| 4 | **Cancel mid-stream** | **Yes** — a "Stop" button is visible during streaming. Aborts the stream via `AbortController` and **keeps partial text** in the preview so the user can still Accept it. |
| 5 | **Token estimation** | Simple **`words × 1.3`** heuristic. No external tokenizer dependency. Warning shown when estimate exceeds ~75k tokens. |

### Implementation Checklist

- [ ] **Database**: Add `generateHistory` table as Dexie **v15**:
  ```
  generateHistory: '++id, [novelId+sceneId], novelId, sceneId, createdAt'
  ```
- [ ] **Service**: Create `services/contextGatherer.js` with `gatherContext(acts, activeScene, scopeOption, params)` function
- [ ] **Service**: Add `_callXxxStream()` methods to `aiService.js` for each provider (Gemini, OpenAI, Claude, OpenRouter, Local) returning a `ReadableStream` or async iterator
- [ ] **Context**: Add Generate state to `AIContext.jsx` — `generateHistory[]`, `saveGeneration()`, `loadGenerationHistory()`, `deleteGeneration()` mutators
- [ ] **View**: Track cursor position in `Editor.jsx` (via Tiptap `editor.state.selection`) and pass to AI panel
- [ ] **Component**: Add Generate tab to `AIPanel.jsx` — prompt field, tone hint, word count input, scope selector, preview panel, Accept/Reject/Regenerate/Stop buttons, history log
- [ ] **i18n**: Add keys to `ai` namespace (EN/ES): tab name, prompt placeholders, scope labels, warning messages, history UI strings
- [ ] **Export**: Include `generateHistory` table in `.lwrt` export/import flow

---

*This document reflects LoneWriter at **v1.9-nexus** (2026-05-03). Update with each major release.*
