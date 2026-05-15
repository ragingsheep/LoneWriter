import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Settings, X } from 'lucide-react'
import { useAI } from '../../context/AIContext'
import { useNovel } from '../../context/NovelContext'
import {
  PROMPT_TABS,
  PROMPT_VARIABLES,
  buildBasePromptVariables,
  flattenPromptMessages,
  getDefaultPromptProfile,
  renderPromptMessages,
} from '../../services/promptProfiles'
import './PromptSettingsMenu.css'

const GOALS_BY_TAB = {
  generate: ['default'],
  rewrite: ['shared', 'style', 'language', 'tone', 'length', 'clarity', 'rhythm', 'cohesion', 'character'],
  debate: ['global'],
  oracle: ['default'],
}

export default function PromptSettingsMenu({ tab, className = '' }) {
  const { t } = useTranslation('settings')
  const { promptProfiles, getPromptProfile, savePromptProfile, resetPromptProfile } = useAI()
  const { activeNovel, activeScene, novelSettings } = useNovel()
  const goals = GOALS_BY_TAB[tab] || ['default']

  const [open, setOpen] = useState(false)
  const [goal, setGoal] = useState(goals[0])
  const [scope, setScope] = useState('global')
  const [draft, setDraft] = useState(null)
  const [selectedVariable, setSelectedVariable] = useState('novel.tense')
  const [activeBlock, setActiveBlock] = useState(0)
  const [saved, setSaved] = useState(false)

  const loadDraft = (nextGoal = goal, nextScope = scope) => {
    const novelId = nextScope === 'novel' ? activeNovel?.id ?? null : null
    const scoped = promptProfiles.find(p => p.scope === nextScope && p.novelId === novelId && p.tab === tab && p.goal === nextGoal)
    const base = scoped || getDefaultPromptProfile(tab, nextGoal)
    setDraft({
      ...base,
      scope: nextScope,
      novelId,
      tab,
      goal: nextGoal,
      messages: (base.messages || []).map((m, index) => ({ ...m, order: index })),
    })
    setActiveBlock(0)
  }

  const openEditor = () => {
    loadDraft(goal, scope)
    setOpen(true)
  }

  const updateMessage = (index, patch) => {
    setDraft(prev => ({
      ...prev,
      messages: prev.messages.map((msg, i) => i === index ? { ...msg, ...patch } : msg),
    }))
  }

  const addMessage = () => {
    setDraft(prev => ({
      ...prev,
      messages: [...prev.messages, { role: 'user', label: t('prompts.new_block'), content: '', enabled: true, order: prev.messages.length }],
    }))
  }

  const deleteMessage = (index) => {
    setDraft(prev => ({
      ...prev,
      messages: prev.messages.filter((_, i) => i !== index).map((m, i) => ({ ...m, order: i })),
    }))
    setActiveBlock(0)
  }

  const duplicateMessage = (index) => {
    setDraft(prev => {
      const copy = { ...prev.messages[index], label: `${prev.messages[index].label || t('prompts.new_block')} copy` }
      const next = [...prev.messages]
      next.splice(index + 1, 0, copy)
      return { ...prev, messages: next.map((m, i) => ({ ...m, order: i })) }
    })
    setActiveBlock(index + 1)
  }

  const moveMessage = (index, direction) => {
    setDraft(prev => {
      const next = [...prev.messages]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...prev, messages: next.map((m, i) => ({ ...m, order: i })) }
    })
    setActiveBlock(Math.max(0, activeBlock + direction))
  }

  const insertVariable = () => {
    if (!draft?.messages?.[activeBlock]) return
    const token = `{${selectedVariable}}`
    const current = draft.messages[activeBlock].content || ''
    updateMessage(activeBlock, { content: `${current}${current ? ' ' : ''}${token}` })
  }

  const saveDraft = async () => {
    await savePromptProfile({ ...draft, tab, goal })
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  const resetDraft = async () => {
    await resetPromptProfile(tab, goal, scope)
    const fresh = getDefaultPromptProfile(tab, goal)
    setDraft({ ...fresh, scope, novelId: scope === 'novel' ? activeNovel?.id ?? null : null, tab, goal })
  }

  const previewPrompt = draft
    ? flattenPromptMessages(renderPromptMessages(draft, {
      ...buildBasePromptVariables({ activeNovel, novelSettings, activeScene }),
      'selection.text': t('prompts.preview_selection'),
      'author.request': t('prompts.preview_request'),
      'rewrite.goal': goal,
      'rewrite.instruction': t('prompts.preview_instruction'),
      'context.previous': t('prompts.preview_context'),
      'context.compendium': t('prompts.preview_compendium'),
      'context.knowledge_base': t('prompts.preview_knowledge'),
      'context.rag': t('prompts.preview_rag'),
      'oracle.paragraph': t('prompts.preview_paragraph'),
      'debate.transcript': t('prompts.preview_transcript'),
      'debate.agent_name': 'Editor',
      'debate.agent_prompt': t('prompts.preview_agent_prompt'),
      'debate.round_instruction': t('prompts.preview_round'),
      'generate.word_count': '500',
      'generate.tone': t('prompts.preview_tone'),
    }))
    : ''

  const tabProfiles = PROMPT_TABS.filter(item => item.tab === tab && goals.includes(item.goal))
  const selectedMeta = tabProfiles.find(item => item.goal === goal)

  const overlay = open && draft ? createPortal(
    <div className="prompt-settings-overlay" onClick={() => setOpen(false)}>
      <div className="prompt-settings-panel" onClick={e => e.stopPropagation()}>
        <div className="prompt-settings-panel__header">
          <div>
            <h2>{t('prompts.title')}</h2>
            <p>{selectedMeta ? t(`prompts.profile_names.${selectedMeta.key}`) : tab}</p>
          </div>
          <button className="prompt-settings-close" onClick={() => setOpen(false)}>
            <X size={16} />
          </button>
        </div>

        <div className="prompt-settings-panel__body">
          <p className="prompt-settings-hint">{t('prompts.hint')}</p>
          <div className="prompt-settings-toolbar">
            <label>
              <span>{t('prompts.profile')}</span>
              <select value={goal} onChange={e => { setGoal(e.target.value); loadDraft(e.target.value, scope) }}>
                {tabProfiles.map(item => <option key={item.goal} value={item.goal}>{t(`prompts.profile_names.${item.key}`)}</option>)}
              </select>
            </label>
            <label>
              <span>{t('prompts.scope')}</span>
              <select value={scope} onChange={e => { setScope(e.target.value); loadDraft(goal, e.target.value) }}>
                <option value="global">{t('prompts.scope_global')}</option>
                <option value="novel" disabled={!activeNovel}>{t('prompts.scope_novel')}</option>
              </select>
            </label>
          </div>

          <div className="prompt-variable-row">
            <select value={selectedVariable} onChange={e => setSelectedVariable(e.target.value)}>
              {PROMPT_VARIABLES.map(([key]) => <option key={key} value={key}>{`{${key}}`}</option>)}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={insertVariable}>{t('prompts.insert_variable')}</button>
          </div>

          <div className="prompt-message-list">
            {draft.messages.map((msg, index) => (
              <div key={index} className={`prompt-message-card ${activeBlock === index ? 'prompt-message-card--active' : ''}`} onClick={() => setActiveBlock(index)}>
                <div className="prompt-message-card__header">
                  <select value={msg.role} onChange={e => updateMessage(index, { role: e.target.value })}>
                    <option value="system">system</option>
                    <option value="user">user</option>
                    <option value="assistant">assistant</option>
                  </select>
                  <input value={msg.label || ''} onChange={e => updateMessage(index, { label: e.target.value })} />
                  <label>
                    <input type="checkbox" checked={msg.enabled !== false} onChange={e => updateMessage(index, { enabled: e.target.checked })} />
                    {t('prompts.enabled')}
                  </label>
                </div>
                <textarea rows={5} value={msg.content || ''} onChange={e => updateMessage(index, { content: e.target.value })} />
                <div className="prompt-message-card__actions">
                  <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); moveMessage(index, -1) }} disabled={index === 0}>{t('prompts.up')}</button>
                  <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); moveMessage(index, 1) }} disabled={index === draft.messages.length - 1}>{t('prompts.down')}</button>
                  <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); duplicateMessage(index) }}>{t('prompts.duplicate')}</button>
                  <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); deleteMessage(index) }} disabled={draft.messages.length <= 1}>{t('prompts.delete')}</button>
                </div>
              </div>
            ))}
          </div>

          <details className="prompt-preview">
            <summary>{t('prompts.preview')}</summary>
            <pre>{previewPrompt}</pre>
          </details>
        </div>

        <div className="prompt-settings-panel__footer">
          <button className="btn btn-ghost btn-sm" onClick={addMessage}>{t('prompts.add_block')}</button>
          <button className="btn btn-ghost btn-sm" onClick={resetDraft}>{t('prompts.reset')}</button>
          <button className="btn btn-primary btn-sm" onClick={saveDraft}>{saved ? t('prompts.saved') : t('prompts.save')}</button>
        </div>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <>
      <button className={`prompt-settings-trigger ${className}`} onClick={openEditor} aria-label={t('prompts.title')}>
        <Settings size={13} />
      </button>
      {overlay}
    </>
  )
}
