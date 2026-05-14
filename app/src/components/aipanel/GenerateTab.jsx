import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n/i18n'
import {
  Sparkles, PenLine, Mic, Hash, BookOpen, FileText,
  Check, X, RefreshCw, Square, Loader2, Trash2,
  History, ChevronDown, AlertTriangle
} from 'lucide-react'
import { useAI } from '../../context/AIContext'
import { useNovel } from '../../context/NovelContext'
import { useModal } from '../../context/ModalContext'
import { AIService } from '../../services/aiService'
import { gatherContext, SCOPE_OPTIONS, estimateTokens } from '../../services/contextGatherer'
import { Tooltip } from '../Tooltip'

const SCOPE_LABELS = {
  [SCOPE_OPTIONS.NONE]: { key: 'scope_none' },
  [SCOPE_OPTIONS.PREV_WORDS]: { key: 'scope_prev_words' },
  [SCOPE_OPTIONS.CURRENT_SCENE]: { key: 'scope_current_scene' },
  [SCOPE_OPTIONS.PREV_SCENES]: { key: 'scope_prev_scenes' },
  [SCOPE_OPTIONS.PREV_CHAPTER]: { key: 'scope_prev_chapter' },
  [SCOPE_OPTIONS.ENTIRE_NOVEL]: { key: 'scope_entire_novel' },
}

function plainTextToHtml(text) {
  if (!text) return ''
  return text
    .split(/\n\n+/)
    .filter(Boolean)
    .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('')
}

export function GenerateTab({ activeScene }) {
  const { t } = useTranslation('ai')
  const {
    provider, apiKey, localBaseUrl, currentModel,
    generateHistory, saveGeneration, overwriteGeneration, deleteGeneration,
    loadGenerateHistory, logAIUsage
  } = useAI()
  const { acts, activeNovel, characters, resources } = useNovel()
  const { openModal } = useModal()

  const [prompt, setPrompt] = useState('')
  const [toneHint, setToneHint] = useState('')
  const [wordCountTarget, setWordCountTarget] = useState('')
  const [scopeOption, setScopeOption] = useState(SCOPE_OPTIONS.CURRENT_SCENE)
  const [scopeParam, setScopeParam] = useState(500)
  const [includeKnowledgeBase, setIncludeKnowledgeBase] = useState(false)

  const [isGenerating, setIsGenerating] = useState(false)
  const [previewText, setPreviewText] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState(null)
  const [contextWarning, setContextWarning] = useState(null)

  const [editingFromHistory, setEditingFromHistory] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  const abortRef = useRef(null)
  const previewRef = useRef(null)

  const isSpanish = i18n.language === 'es'
  const isScopeParamNeeded = scopeOption === SCOPE_OPTIONS.PREV_WORDS || scopeOption === SCOPE_OPTIONS.PREV_SCENES

  const buildPrompt = useCallback(() => {
    if (!prompt.trim()) return null

    let fullPrompt = isSpanish
      ? 'Eres un asistente de escritura creativa. Vas a escribir prosa narrativa original.'
      : 'You are a creative writing assistant. You will write original narrative prose.'

    fullPrompt += '\n\n'

    const ctx = gatherContext(acts, activeScene, scopeOption, {
      wordCount: scopeParam,
      sceneCount: scopeParam,
    })

    if (ctx.warning) {
      setContextWarning(ctx.warningMessage)
    } else {
      setContextWarning(null)
    }

    if (ctx.text) {
      fullPrompt += isSpanish
        ? `[CONTEXTO DE REFERENCIA]:\n${ctx.text}\n\n`
        : `[REFERENCE CONTEXT]:\n${ctx.text}\n\n`
    }

    if (activeScene?.pov) {
      fullPrompt += isSpanish
        ? `[PUNTO DE VISTA]: La escena está escrita desde el POV de ${activeScene.pov}.\n\n`
        : `[POINT OF VIEW]: The scene is written from the POV of ${activeScene.pov}.\n\n`
    }

    if (toneHint.trim()) {
      fullPrompt += isSpanish
        ? `[TONO/ESTILO SOLICITADO]: ${toneHint}\n\n`
        : `[REQUESTED TONE/STYLE]: ${toneHint}\n\n`
    }

    if (includeKnowledgeBase && resources?.length) {
      const activeRes = resources.filter(r => r.activeForAI && r.content)
      if (activeRes.length > 0) {
        const kb = activeRes.map(r => `[${r.name}]\n${r.content}`).join('\n\n')
        fullPrompt += isSpanish
          ? `[BASE DE CONOCIMIENTO]:\n${kb}\n\n`
          : `[KNOWLEDGE BASE]:\n${kb}\n\n`
      }
    }

    if (wordCountTarget && parseInt(wordCountTarget) > 0) {
      fullPrompt += isSpanish
        ? `[OBJETIVO DE PALABRAS]: Escribe APROXIMADAMENTE ${wordCountTarget} palabras.\n\n`
        : `[WORD COUNT TARGET]: Write APPROXIMATELY ${wordCountTarget} words.\n\n`
    }

    fullPrompt += isSpanish
      ? `[SOLICITUD DEL AUTOR]:\n${prompt}\n\n`
      : `[AUTHOR\'S REQUEST]:\n${prompt}\n\n`

    fullPrompt += isSpanish
      ? 'IMPORTANTE: Escribe ÚNICAMENTE el texto narrativo en prosa (sin introducciones, sin explicaciones, sin comentarios meta). No uses markdown. Usa saltos de línea normales para separar párrafos.'
      : 'IMPORTANT: Write ONLY the narrative prose text (no introductions, no explanations, no meta commentary). Do not use markdown. Use regular line breaks to separate paragraphs.'

    return fullPrompt
  }, [prompt, toneHint, wordCountTarget, scopeOption, scopeParam, includeKnowledgeBase, activeScene, acts, resources, isSpanish])

  const handleGenerate = async () => {
    const fullPrompt = buildPrompt()
    if (!fullPrompt) return

    setIsGenerating(true)
    setIsComplete(false)
    setPreviewText('')
    setError(null)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      let streamedText = ''
      const generator = AIService.generateStream(fullPrompt, {
        provider,
        apiKey,
        model: currentModel,
        localBaseUrl,
      }, controller.signal)

      for await (const chunk of generator) {
        streamedText += chunk
        setPreviewText(streamedText)
        if (previewRef.current) {
          previewRef.current.scrollTop = previewRef.current.scrollHeight
        }
      }

      setIsComplete(true)
    } catch (err) {
      if (err.name === 'AbortError') {
        setIsComplete(true)
      } else {
        setError(err.message || (isSpanish ? 'Error desconocido' : 'Unknown error'))
        setIsComplete(true)
      }
    } finally {
      setIsGenerating(false)
      abortRef.current = null
    }
  }

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort()
    }
  }

  const commitGeneration = (text) => {
    if (!text) return
    const html = plainTextToHtml(text)
    window.dispatchEvent(new CustomEvent('ai-apply-generate', { detail: html }))
    setPreviewText('')
    setIsComplete(false)

    saveGeneration({
      prompt,
      toneHint,
      wordCountTarget: parseInt(wordCountTarget) || 0,
      contextScope: scopeOption,
      contextDescription: SCOPE_LABELS[scopeOption]?.key || 'none',
      responseHtml: html,
      responseText: text,
    })
    setPrompt('')
    setToneHint('')
    setWordCountTarget('')
    setEditingFromHistory(null)
  }

  const handleAccept = () => commitGeneration(previewText)
  const handleAcceptPartial = () => commitGeneration(previewText)

  const handleReject = () => {
    openModal('confirm', {
      title: t('generate.discard_title'),
      message: t('generate.discard_message'),
      isDanger: true,
      confirmLabel: t('generate.discard_confirm'),
      onConfirm: () => {
        setPreviewText('')
        setIsComplete(false)
        setEditingFromHistory(null)
      },
    })
  }

  const handleRegenerate = async () => {
    if (editingFromHistory) {
      const fullPrompt = buildPrompt()
      if (!fullPrompt) return

      setIsGenerating(true)
      setIsComplete(false)
      setPreviewText('')
      setError(null)

      const controller = new AbortController()
      abortRef.current = controller

      try {
        let streamedText = ''
        const generator = AIService.generateStream(fullPrompt, {
          provider,
          apiKey,
          model: currentModel,
          localBaseUrl,
        }, controller.signal)

        for await (const chunk of generator) {
          streamedText += chunk
          setPreviewText(streamedText)
          if (previewRef.current) {
            previewRef.current.scrollTop = previewRef.current.scrollHeight
          }
        }

        const html = plainTextToHtml(streamedText)
        overwriteGeneration(editingFromHistory, {
          prompt,
          toneHint,
          wordCountTarget: parseInt(wordCountTarget) || 0,
          contextScope: scopeOption,
          contextDescription: SCOPE_LABELS[scopeOption]?.key || 'none',
          responseHtml: html,
          responseText: streamedText,
        })
        setIsComplete(true)
      } catch (err) {
        if (err.name === 'AbortError') {
          setIsComplete(true)
        } else {
          setError(err.message || (isSpanish ? 'Error desconocido' : 'Unknown error'))
          setIsComplete(true)
        }
      } finally {
        setIsGenerating(false)
        abortRef.current = null
      }
    } else {
      handleGenerate()
    }
  }

  const handleLoadFromHistory = (entry) => {
    setPrompt(entry.prompt || '')
    setToneHint(entry.toneHint || '')
    setWordCountTarget(entry.wordCountTarget ? String(entry.wordCountTarget) : '')
    setScopeOption(entry.contextScope || SCOPE_OPTIONS.CURRENT_SCENE)
    setEditingFromHistory(entry.id)
    setPreviewText('')
    setIsComplete(false)
    setShowHistory(false)
  }

  const handleDeleteHistory = async (id) => {
    await deleteGeneration(id)
  }

  useEffect(() => {
    loadGenerateHistory()
  }, [activeScene?.id])

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = null
    }
  }, [])

  const canGenerate = prompt.trim().length > 0 && !isGenerating

  return (
    <div className="generate-tab">
      {/* Prompt */}
      <div className="generate-section">
        <div className="generate-section__label">
          <PenLine size={12} />
          {t('generate.prompt_label')}
          <span className="generate-section__required">*</span>
        </div>
        <textarea
          className="generate-prompt__textarea"
          placeholder={t('generate.prompt_placeholder')}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={4}
          disabled={isGenerating}
        />
      </div>

      {/* Tone & Word Count */}
      <div className="generate-row">
        <div className="generate-section generate-section--half">
          <div className="generate-section__label">
            <Mic size={12} />
            {t('generate.tone_hint')}
          </div>
          <input
            type="text"
            className="generate-input"
            placeholder={t('generate.tone_hint_placeholder')}
            value={toneHint}
            onChange={e => setToneHint(e.target.value)}
            disabled={isGenerating}
          />
        </div>
        <div className="generate-section generate-section--half">
          <div className="generate-section__label">
            <Hash size={12} />
            {t('generate.word_count')}
          </div>
          <input
            type="number"
            className="generate-input"
            placeholder="500"
            min="0"
            value={wordCountTarget}
            onChange={e => setWordCountTarget(e.target.value)}
            disabled={isGenerating}
          />
        </div>
      </div>

      {/* Scope */}
      <div className="generate-section">
        <div className="generate-section__label">
          <BookOpen size={12} />
          {t('generate.context_scope')}
        </div>
        <select
          className="generate-select"
          value={scopeOption}
          onChange={e => setScopeOption(e.target.value)}
          disabled={isGenerating}
        >
          {Object.entries(SCOPE_LABELS).map(([value, { key }]) => (
            <option key={value} value={value}>{t(`generate.${key}`)}</option>
          ))}
        </select>

        {isScopeParamNeeded && (
          <div className="generate-scope-param">
            <label className="generate-scope-param__label">
              {scopeOption === SCOPE_OPTIONS.PREV_WORDS
                ? t('generate.scope_words_param')
                : t('generate.scope_scenes_param')}
            </label>
            <input
              type="number"
              className="generate-input generate-input--small"
              min="1"
              max="100"
              value={scopeParam}
              onChange={e => setScopeParam(parseInt(e.target.value) || 1)}
              disabled={isGenerating}
            />
          </div>
        )}

        {/* Knowledge Base toggle */}
        <div className="generate-context-toggle">
          <label className="context-toggle-label">
            <input
              type="checkbox"
              checked={includeKnowledgeBase}
              onChange={e => setIncludeKnowledgeBase(e.target.checked)}
              disabled={isGenerating}
            />
            <span>{t('generate.include_knowledge_base')}</span>
          </label>
        </div>
      </div>

      {/* Context warning */}
      {contextWarning && (
        <div className="generate-warning">
          <AlertTriangle size={14} />
          <span>{contextWarning}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="generate-warning generate-warning--error">
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Generate / Stop buttons */}
      <div className="generate-actions">
        {isGenerating ? (
          <button
            className="btn btn-danger generate-actions__stop"
            onClick={handleStop}
          >
            <Square size={13} />
            {t('generate.stop')}
          </button>
        ) : (
          <button
            className="btn btn-primary generate-actions__main"
            onClick={handleGenerate}
            disabled={!canGenerate}
          >
            {editingFromHistory ? <RefreshCw size={13} /> : <Sparkles size={13} />}
            {editingFromHistory ? t('generate.regenerate') : t('generate.generate')}
          </button>
        )}
      </div>

      {/* Preview panel */}
      {previewText && (
        <div className="generate-result">
          <div className="generate-result__header">
            <div className="generate-result__label">
              <Sparkles size={12} />
              {t('generate.preview')}
            </div>
            {isGenerating && (
              <span className="generate-result__status">
                <Loader2 size={12} className="spin" />
                {t('generate.generating')}
              </span>
            )}
          </div>
          <div className="generate-result__text" ref={previewRef}>
            {previewText}
          </div>

          <div className="generate-result__footer">
            <button
              className="btn btn-ghost"
              onClick={handleReject}
            >
              <Trash2 size={12} />
              {t('generate.reject')}
            </button>

            {isGenerating && previewText && (
              <button
                className="btn btn-primary"
                onClick={handleAcceptPartial}
              >
                <Check size={13} />
                {t('generate.accept_partial')}
              </button>
            )}

            {isComplete && (
              <>
                <button
                  className="btn btn-primary"
                  onClick={handleAccept}
                >
                  <Check size={13} />
                  {t('generate.accept')}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={handleRegenerate}
                >
                  <RefreshCw size={13} />
                  {t('generate.regenerate')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* History section */}
      <div className="generate-history">
        <button
          className="generate-history__toggle"
          onClick={() => {
            setShowHistory(!showHistory)
            if (!showHistory) loadGenerateHistory()
          }}
        >
          <History size={13} />
          <span>{t('generate.history')}</span>
          <span className="generate-history__count">({generateHistory.length})</span>
          <ChevronDown size={12} style={{ transform: showHistory ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }} />
        </button>

        {showHistory && (
          <div className="generate-history__list">
            {generateHistory.length === 0 && (
              <div className="generate-history__empty">
                {t('generate.no_history')}
              </div>
            )}
            {generateHistory.map(entry => (
              <div key={entry.id} className="generate-history__item">
                <div className="generate-history__item-prompt" onClick={() => handleLoadFromHistory(entry)}>
                  <PenLine size={10} />
                  <span>{(entry.prompt || '').substring(0, 80)}{(entry.prompt || '').length > 80 ? '...' : ''}</span>
                </div>
                <div className="generate-history__item-meta">
                  <span>{entry.wordCountTarget ? `${entry.wordCountTarget}w` : ''}</span>
                  <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                </div>
                <Tooltip content={isSpanish ? 'Eliminar' : 'Delete'}>
                  <button
                    className="generate-history__item-delete"
                    onClick={() => handleDeleteHistory(entry.id)}
                  >
                    <Trash2 size={11} />
                  </button>
                </Tooltip>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
