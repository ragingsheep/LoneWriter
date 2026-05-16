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

### 3.4 Database Schema (Dexie v17 — 24 tables; v18 planned — 25 tables)

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
| `novelSettings` | Per-novel prose settings (tense, language, POV) — **v16** |
| `promptProfiles` | Custom AI prompt profiles with role-based message blocks — **v17** |
| `aiModelProfiles` | Provider/model-specific AI parameter presets and function bindings — **planned v18** |

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

#### 4.3.5 Custom AI Prompt Settings ✅ `[IMPLEMENTED]`

LoneWriter will allow authors to customize the prompts sent to each AI Assistant tab while keeping the default prompts available as safe fallbacks. Prompt customization is a power-user feature: it must expose enough control for advanced authors without making the default writing workflow harder for casual users.

The prompt model should follow standard AI message-role concepts, inspired by systems such as Novelcrafter's AI message roles:

| Role | Purpose |
|---|---|
| `system` | Defines the assistant's job, constraints, tone, safety boundaries, and output format. Some providers may not support native system messages; in that case LoneWriter may merge the system message into the first user message while preserving semantics. |
| `user` | Contains the author's request, selected text, scene context, Compendium context, Knowledge Base excerpts, and generated variable values. |
| `assistant` | Optional prefill text used to steer the model's opening response or expected format. This is not shown as generated output unless returned by the provider. |

**Per-tab settings:**

| Tab | Required customizable prompt setting | Notes |
|---|---|---|
| **Generate** | One editable prompt profile for prose generation | Must support role-separated messages for creative-writing instructions, context placement, user request, output-only constraints, and optional assistant prefill. |
| **Rewrite** | One editable prompt profile per rewrite goal, plus a shared fallback profile | Goals include Style, Language, Tone, Length, Clarity, Rhythm, Cohesion, and Character. Each goal may override the shared rewrite prompt. |
| **Debate** | One editable global debate prompt profile, plus editable participant/agent prompts | The global profile controls transcript framing, role discipline, context injection, and response format. Existing custom agent prompts remain separate but should use the same variable system. |
| **Oracle** | One editable continuity-check prompt profile | Must preserve Oracle's lore-only contract by default: continuity and Compendium conflicts only, not grammar, style, or taste critique. |

**Prompt profile structure:**

- Each profile consists of one or more ordered message blocks.
- Each block has `role`, `label`, `content`, `enabled`, and `order`.
- Supported roles are `system`, `user`, and `assistant`.
- A profile may define model parameters separately from message content where providers support them: `temperature`, `maxOutputTokens`, `topP`, `frequencyPenalty`, `presencePenalty`.
- Profiles have `scope`: `global`, `novel`, or `tab`. Novel-scoped profiles override global defaults only for the active novel.
- Profiles must include a reset action that restores the shipped LoneWriter default for that tab or rewrite goal.

**Variable interpolation:**

Prompt customization must support braced dot-path variables. Variables are inserted immediately before the provider request is sent. Missing values resolve to an empty string unless a required-variable validation rule marks them as blocking.

| Variable | Source | Example value |
|---|---|---|
| `{app.language}` | Current UI language | `en` |
| `{novel.title}` | Active novel | `The Glass Orchard` |
| `{novel.author}` | Active novel | `Sergio Sanchez` |
| `{novel.status}` | Active novel | `Draft` |
| `{novel.target_words}` | Active novel | `100000` |
| `{novel.tense}` | Story Settings | `past` |
| `{novel.language}` | Story Settings | `British English` |
| `{novel.pov_type}` | Story Settings | `3rd_limited` |
| `{novel.pov_character}` | Story Settings | `Elena Voss` |
| `{scene.title}` | Active scene | `The locked observatory` |
| `{scene.pov}` | Active scene | `Elena Voss` |
| `{scene.status}` | Active scene | `Draft` |
| `{scene.date}` | Active scene | `1894-10-03` |
| `{scene.synopsis}` | Active scene | `Elena finds the hidden letter.` |
| `{selection.text}` | Rewrite selection | Selected plain text |
| `{author.request}` | Generate prompt or Debate user input | User's typed instruction |
| `{rewrite.goal}` | Rewrite tab | `tone` |
| `{rewrite.instruction}` | Rewrite tab | User's custom rewrite instruction |
| `{context.previous}` | Context gatherer | Prior text selected by scope |
| `{context.compendium}` | AI context builder | Relevant Compendium entries |
| `{context.knowledge_base}` | Resources | Active reference files |
| `{context.rag}` | RAG service | Retrieved manuscript memories |
| `{oracle.paragraph}` | Oracle tab | Paragraph being checked |
| `{debate.transcript}` | Debate tab | Prior debate messages |
| `{debate.agent_name}` | Debate participant | `Editor` |
| `{debate.agent_prompt}` | Debate participant | Agent-specific system prompt |

**Variable requirements:**

- Story Settings variables use `novel.*` names, not implementation field names, so prompt text remains stable if internal state changes.
- Scene-level POV variables should resolve to the scene override when present, otherwise fall back to Story Settings defaults.
- Context variables should only contain data already available to the current tab and user-selected context options.
- Variables that may contain large text, such as `{context.knowledge_base}`, `{context.rag}`, and `{debate.transcript}`, must show estimated token impact before sending when feasible.
- Literal braces can be escaped as `{{` and `}}`.

**UI requirements:**

- Prompt customization lives inside the AI Assistant panel, not in the global Settings modal.
- The AI Assistant opens to **Generate** by default.
- Each AI Assistant tab has a small settings button in its tab header or top toolbar.
- Clicking the settings button opens an in-panel prompt settings menu/modal scoped to the active tab.
- Generate opens the Generate prompt profile editor.
- Rewrite opens the Rewrite prompt profile editor and allows choosing/editing the shared fallback or any rewrite goal profile.
- Debate opens the global Debate prompt profile editor; participant/agent prompt editing remains in the existing agent management flow.
- Oracle opens the Oracle prompt profile editor.
- Each prompt editor shows its effective prompt as ordered message blocks, not as one opaque textarea.
- Users can add, disable, delete, duplicate, and reorder message blocks.
- Users can insert variables from a searchable variable picker.
- A read-only preview shows the final interpolated prompt/messages for the active scene before saving or testing.
- The UI warns when a provider does not support a native message role and explains how LoneWriter will adapt it.
- Reset to default is available per block, per profile, and per tab.

**Provider behavior:**

- Providers with chat-role APIs receive message blocks as native role messages where possible.
- Providers without native system-message support receive a semantically equivalent merged prompt.
- Local providers should receive OpenAI-compatible message arrays when using an OpenAI-compatible endpoint, otherwise a flattened prompt.
- Assistant prefill is optional and must be omitted for providers that do not support it cleanly.

**Reliability and safety:**

- Invalid profiles must not block normal AI use; LoneWriter falls back to the shipped default prompt and shows a clear warning.
- Prompt edits are saved locally only and included in `.lwrt` export if they are novel-scoped.
- Global/device prompt edits are excluded from `.lwrt` export unless explicitly marked as novel-scoped.
- No API keys, provider credentials, or secrets may be inserted through variables.
- Defaults must remain privacy-first and must not send data outside the context selected by the user.

**Data model:**

- Dexie v17 table `promptProfiles`, keyed by `++id, [scope+novelId+tab+goal], scope, novelId, tab, goal, updatedAt`.
- Fields: `id`, `scope`, `novelId`, `tab`, `goal`, `name`, `messages`, `parameters`, `isDefault`, `updatedAt`.
- `messages` is an ordered array of `{ role, label, content, enabled, order }`.
- Global/device-only profiles are not exported by default. Novel-scoped profiles are exported with the novel.

**Out of scope (this iteration):**

- Prompt marketplace or sharing gallery · Cloud-hosted prompt library · Prompt A/B testing · Automatic prompt optimization · Fine-tuning · Server-side prompt storage

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
- Device-only settings (`editorPrefs`, `customStopwords`, global `promptProfiles`) excluded from export

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
- AI Model Profiles for provider+model-specific generation parameters (see §4.10.1)

**Out of scope:**
- Streaming responses on Rewrite/Debate/Oracle · Simultaneous multi-provider calls · Fine-tuning

---

#### 4.10.1 AI Model Profiles `[NOT YET IMPLEMENTED]`

LoneWriter will support reusable **AI Profiles** that bind an AI provider, model, and tuning parameters into a named preset. Profiles make model behavior explicit and repeatable across the AI Assistant while preserving the current BYOK/local-first architecture.

The feature is based on standard AI parameter concepts described in Novelcrafter's AI terminology and model tuning documentation: Temperature, Top P, Max Tokens, Frequency Penalty, Presence Penalty, and Repetition Penalty.

**Profile identity and scoping:**

- An AI Profile is unique by `provider + model + profile name`.
- Profiles are stored locally in IndexedDB.
- Profiles are device-level by default; they are not included in `.lwrt` exports unless explicitly marked as novel-scoped in a later iteration.
- Provider/model identity is strict: `Google Gemini > gemini-2.0-flash` and `OpenRouter > gemini-2.0-flash` are different profile namespaces and must not share parameter settings accidentally.
- Each provider+model pair may have multiple named profiles, e.g. `Balanced`, `Creative Drafting`, `Strict Oracle`, `Low Repetition`.
- One profile per provider+model can be marked as the default for that provider+model.

**Supported parameters:**

| Parameter | Type / Range | Purpose | Notes |
|---|---|---|---|
| `temperature` | decimal, provider-safe range, typically `0`–`2` | Controls randomness/creativity | Higher = more diverse; lower = more focused. UI should explain this. |
| `topP` | decimal `0`–`1` | Controls nucleus sampling / word-choice diversity | Lower narrows options; higher allows wider vocabulary. |
| `maxTokens` | integer | Limits generated output length | Mapped to provider-specific `max_tokens`, `maxOutputTokens`, etc. |
| `frequencyPenalty` | decimal, provider-safe range | Discourages repeated words/phrases | Only sent to providers that support it. |
| `presencePenalty` | decimal, provider-safe range | Encourages introducing new topics/details | Only sent to providers that support it. |
| `repetitionPenalty` | decimal, provider-safe range | General repetition control | Primarily for local/OpenRouter-compatible models that support it; omitted where unsupported. |

**Provider compatibility:**

- The UI must show unsupported parameters as disabled or ignored for the selected provider/model.
- Parameter payloads must be translated per provider:
  - OpenAI/OpenRouter-compatible APIs: `temperature`, `top_p`, `max_tokens`, `frequency_penalty`, `presence_penalty`, plus `repetition_penalty` only where accepted.
  - Gemini: `temperature`, `topP`, `maxOutputTokens`; omit unsupported penalties.
  - Anthropic: `temperature`, `top_p`, `max_tokens`; omit unsupported penalties.
  - Local OpenAI-compatible servers: send OpenAI-compatible keys and allow `repetition_penalty` when configured.
- Unsupported parameters should never break a request. They are omitted and surfaced in the profile UI as compatibility notes.

**Settings UI:**

- AI Profiles live in `Settings > Artificial Intelligence`, below provider/model/API key configuration and above usage monitoring.
- The UI starts from the currently selected Provider and Model and shows profiles for that exact provider/model pair.
- Users can create, rename, duplicate, delete, and reset profiles.
- Users can set the default profile for the current provider/model.
- Parameter controls should be a usable mix of sliders and precise numeric inputs.
- Each parameter shows a short description and safe range.
- The UI includes a compact compatibility summary for the active provider/model.
- A `Test with profile` action should use the selected provider/model/profile parameters and report success/failure without changing the user's saved AI Assistant bindings.

**AI Assistant function bindings:**

Each AI Assistant function can choose its own AI Profile. This lets authors use different model behavior for generation, rewriting, debate, and continuity checking.

| Function | Profile binding requirement |
|---|---|
| Generate | Select one AI Profile for prose drafting. Defaults to the provider/model default profile. |
| Rewrite | Select one shared Rewrite AI Profile, plus optional per-goal overrides for Style, Language, Tone, Length, Clarity, Rhythm, Cohesion, and Character. |
| Debate | Select one global Debate AI Profile. Optional future extension: per-agent AI Profile overrides. |
| Oracle | Select one Oracle AI Profile. Default should be low-temperature/focused. |

**Binding UI:**

- Each AI Assistant tab's prompt settings menu also shows the active AI Profile selector for that function.
- Changing a function's AI Profile affects future requests for that function only.
- The selector displays provider, model, and profile name, e.g. `Google Gemini · gemini-2.0-flash · Creative Drafting`.
- If the chosen provider/model is unavailable or missing credentials, the function should show the same provider/API key error flow used today.
- If a bound profile is deleted, the function falls back to the current provider/model default profile and shows a non-blocking warning.

**Prompt integration:**

- Prompt profiles (§4.3.5) control message content and variables.
- AI Profiles (§4.10.1) control provider/model and generation parameters.
- The two systems are independent but selected together before an AI request is sent.
- The final request pipeline is: select AI function → resolve prompt profile → interpolate variables → resolve AI Profile → map parameters to provider payload → send request.

**Data model:**

- Add a future Dexie table **`aiModelProfiles`** (Dexie v18):
  ```
  aiModelProfiles: '++id, [provider+model+name], provider, model, name, isDefault, updatedAt'
  ```
- Fields: `id`, `provider`, `model`, `name`, `parameters`, `isDefault`, `createdAt`, `updatedAt`.
- `parameters` stores `temperature`, `topP`, `maxTokens`, `frequencyPenalty`, `presencePenalty`, `repetitionPenalty` as nullable values so defaults can be inherited per provider.
- Add profile binding storage, either as fields on `aiModelProfiles` or a companion table such as `aiFunctionProfiles: 'functionKey'`.
- Binding keys: `generate`, `rewrite.shared`, `rewrite.style`, `rewrite.language`, `rewrite.tone`, `rewrite.length`, `rewrite.clarity`, `rewrite.rhythm`, `rewrite.cohesion`, `rewrite.character`, `debate.global`, `oracle`.

**Defaults:**

- Seed a provider/model default profile when a model is first configured.
- Recommended initial defaults:
  - Generate: moderate temperature, generous max tokens.
  - Rewrite: moderate/low temperature, medium max tokens.
  - Debate: moderate temperature, medium max tokens.
  - Oracle: low temperature, constrained max tokens.
- Defaults must remain conservative and provider-safe.

**Out of scope (this iteration):**

- Automatic parameter optimization · Prompt/model A/B testing · Per-scene AI Profile overrides · Fine-tuning · Cloud-shared profile library

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
2. **Artificial Intelligence**: Provider, API key, model, base URL, AI Model Profiles, Test Connection
3. **Interface**: Theme, font, font size, animated background
4. **General**: Language, app version, clear cache & reload, credits

---

### 4.14 Story Settings ✅ `[IMPLEMENTED]`

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
| RAG limited to small model | `all-MiniLM-L6-v2`; larger models on roadmap |
| Oracle per-scene only | No project-wide batch analysis |
| MPC active on current scene only | Past scenes not retroactively scanned |
| MPC disabled by default | Must be enabled per device in the AI panel |
| No Nexus graph search/filter | Large graphs hard to navigate |
| Claude CORS | Requires `anthropic-dangerous-direct-browser-access` header |

---

## 7. Roadmap Summary

### 🟢 High Priority
- AI Model Profiles (§4.10.1) · Mobile PWA polish · Anaphora optimization · Enhanced RAG memory

### 🟡 Low Priority
- `.pdf`/`.docx` import · MCP reference integration · Smart Bootstrap (Markdown import)

### ⚫ Ideas Under Consideration
- Narrative Continuity Engine v2 · EPUB/PDF export · Collaborative peer review · Pacing analysis

---

*This document reflects LoneWriter at **v1.9-nexus** (reviewed 2026-05-12). Update with each major release.*
