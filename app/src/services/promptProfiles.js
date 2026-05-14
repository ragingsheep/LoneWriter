import i18n from '../i18n/i18n'

export const PROMPT_TABS = [
  { tab: 'generate', goal: 'default', key: 'generate' },
  { tab: 'rewrite', goal: 'shared', key: 'rewrite_shared' },
  { tab: 'rewrite', goal: 'style', key: 'rewrite_style' },
  { tab: 'rewrite', goal: 'language', key: 'rewrite_language' },
  { tab: 'rewrite', goal: 'tone', key: 'rewrite_tone' },
  { tab: 'rewrite', goal: 'length', key: 'rewrite_length' },
  { tab: 'rewrite', goal: 'clarity', key: 'rewrite_clarity' },
  { tab: 'rewrite', goal: 'rhythm', key: 'rewrite_rhythm' },
  { tab: 'rewrite', goal: 'cohesion', key: 'rewrite_cohesion' },
  { tab: 'rewrite', goal: 'character', key: 'rewrite_character' },
  { tab: 'debate', goal: 'global', key: 'debate' },
  { tab: 'oracle', goal: 'default', key: 'oracle' },
]

export const PROMPT_VARIABLES = [
  ['app.language', 'app.language'],
  ['novel.title', 'novel.title'],
  ['novel.author', 'novel.author'],
  ['novel.status', 'novel.status'],
  ['novel.target_words', 'novel.target_words'],
  ['novel.tense', 'novel.tense'],
  ['novel.language', 'novel.language'],
  ['novel.pov_type', 'novel.pov_type'],
  ['novel.pov_character', 'novel.pov_character'],
  ['scene.title', 'scene.title'],
  ['scene.pov', 'scene.pov'],
  ['scene.status', 'scene.status'],
  ['scene.date', 'scene.date'],
  ['scene.synopsis', 'scene.synopsis'],
  ['selection.text', 'selection.text'],
  ['author.request', 'author.request'],
  ['rewrite.goal', 'rewrite.goal'],
  ['rewrite.instruction', 'rewrite.instruction'],
  ['context.previous', 'context.previous'],
  ['context.compendium', 'context.compendium'],
  ['context.knowledge_base', 'context.knowledge_base'],
  ['context.rag', 'context.rag'],
  ['oracle.paragraph', 'oracle.paragraph'],
  ['debate.transcript', 'debate.transcript'],
  ['debate.agent_name', 'debate.agent_name'],
  ['debate.agent_prompt', 'debate.agent_prompt'],
  ['debate.round_instruction', 'debate.round_instruction'],
]

const message = (role, label, content, order) => ({ role, label, content, enabled: true, order })

const defaultRewriteGoalPrompt = (goal) => i18n.t(`ai:rewrite_prompts.${goal}`, { defaultValue: '' })

export function getDefaultPromptProfile(tab, goal = 'default') {
  const now = new Date().toISOString()
  const base = {
    scope: 'global',
    novelId: null,
    tab,
    goal,
    name: i18n.t(`settings:prompts.profile_names.${tab}_${goal}`, { defaultValue: `${tab} ${goal}` }),
    parameters: { temperature: '', maxOutputTokens: '', topP: '', frequencyPenalty: '', presencePenalty: '' },
    isDefault: true,
    updatedAt: now,
  }

  if (tab === 'generate') {
    return {
      ...base,
      messages: [
        message('system', 'Creative brief', 'You are a creative writing assistant. Write original narrative prose for {novel.title}. Follow the novel defaults: tense={novel.tense}, language={novel.language}, POV={novel.pov_type}, POV character={novel.pov_character}.', 0),
        message('user', 'Context and request', '[REFERENCE CONTEXT]\n{context.previous}\n\n[SCENE]\nTitle: {scene.title}\nPOV: {scene.pov}\n\n[KNOWLEDGE BASE]\n{context.knowledge_base}\n\n[AUTHOR REQUEST]\n{author.request}', 1),
        message('user', 'Output rules', 'Write approximately {generate.word_count} words when a target is provided. Use the requested tone/style when present: {generate.tone}. Return only narrative prose. Do not use Markdown or meta commentary.', 2),
      ],
    }
  }

  if (tab === 'rewrite') {
    const goalPrompt = goal === 'shared' ? '' : defaultRewriteGoalPrompt(goal)
    return {
      ...base,
      messages: [
        message('system', 'Rewrite role', 'You are a literary rewriting assistant for {novel.title}. Preserve meaning and continuity. Follow novel defaults: tense={novel.tense}, language={novel.language}, POV={novel.pov_type}. Respond only with valid HTML paragraphs and inline tags. Do not use Markdown.', 0),
        message('user', 'Rewrite instruction', `${goalPrompt || 'Rewrite the selected text according to the requested goal.'}\n\n[REWRITE GOAL]\n{rewrite.goal}\n\n[USER INSTRUCTION]\n{rewrite.instruction}\n\n[PREVIOUS CONTEXT]\n{context.previous}\n\n[KNOWLEDGE BASE]\n{context.knowledge_base}\n\n[SELECTED TEXT]\n{selection.text}`, 1),
      ],
    }
  }

  if (tab === 'debate') {
    return {
      ...base,
      messages: [
        message('system', 'Debate role', '{debate.agent_prompt}\n\nYou are UNIQUE and EXCLUSIVELY {debate.agent_name}. Never leave your role. Speak in first person. Use the application language ({app.language}).', 0),
        message('user', 'Scene and context', '[CURRENT SCENE]\n{scene.title}\nPOV: {scene.pov}\n{scene.content}\n\n[COMPENDIUM CONTEXT]\n{context.compendium}\n\n[KNOWLEDGE BASE]\n{context.knowledge_base}\n\n[RAG CONTEXT]\n{context.rag}', 1),
        message('user', 'Turn instruction', '[AUTHOR / DEBATE TRANSCRIPT]\n{debate.transcript}\n\n[YOUR TURN]\nNow respond as {debate.agent_name}. {debate.round_instruction}', 2),
      ],
    }
  }

  return {
    ...base,
    messages: [
      message('system', 'Oracle role', i18n.t('ai:oracle_prompt'), 0),
      message('user', 'Continuity check', '[COMPENDIUM - ABSOLUTE SOURCE OF TRUTH]\n{context.compendium}\n\n[PREVIOUS MANUSCRIPT CONTEXT]\n{context.rag}\n\n[TEXT TO ANALYZE]\n{oracle.paragraph}\n\n[RESPONSE]\nCheck lore continuity only. Do not critique grammar, style, or taste.', 1),
    ],
  }
}

export function interpolatePrompt(content, variables = {}) {
  if (!content) return ''
  return content
    .replace(/\{\{/g, '\u0000OPEN_BRACE\u0000')
    .replace(/\}\}/g, '\u0000CLOSE_BRACE\u0000')
    .replace(/\{([a-zA-Z0-9_.]+)\}/g, (_, key) => String(variables[key] ?? ''))
    .replace(/\u0000OPEN_BRACE\u0000/g, '{')
    .replace(/\u0000CLOSE_BRACE\u0000/g, '}')
}

export function renderPromptMessages(profile, variables = {}) {
  const messages = (profile?.messages || [])
    .filter(m => m.enabled !== false)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(m => ({ role: m.role || 'user', content: interpolatePrompt(m.content || '', variables).trim() }))
    .filter(m => m.content)

  return messages.length > 0 ? messages : [{ role: 'user', content: '' }]
}

export function flattenPromptMessages(messages) {
  return messages
    .map(m => `[${String(m.role || 'user').toUpperCase()}]\n${m.content}`)
    .join('\n\n')
}

export function buildBasePromptVariables({ activeNovel, novelSettings, activeScene } = {}) {
  const scenePov = activeScene?.pov || novelSettings?.povCharacter || ''
  return {
    'app.language': i18n.language || 'en',
    'novel.title': activeNovel?.title || '',
    'novel.author': activeNovel?.author || '',
    'novel.status': activeNovel?.status || '',
    'novel.target_words': activeNovel?.targetWords || '',
    'novel.tense': novelSettings?.tense || 'past',
    'novel.language': novelSettings?.language || '',
    'novel.pov_type': novelSettings?.povType || '3rd',
    'novel.pov_character': novelSettings?.povCharacter || '',
    'scene.title': activeScene?.title || '',
    'scene.pov': scenePov,
    'scene.status': activeScene?.status || '',
    'scene.date': activeScene?.inGameDate || '',
    'scene.synopsis': activeScene?.synopsis || '',
    'scene.content': activeScene?.content ? activeScene.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '',
  }
}
