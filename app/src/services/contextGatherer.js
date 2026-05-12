/**
 * contextGatherer.js — Context gathering utility for AI Generate tab.
 * Walks the acts[].chapters[].scenes[] tree to collect ordered text
 * for different scope options.
 *
 * @module services/contextGatherer
 */

const ESTIMATED_MAX_TOKENS = 75000
const TOKEN_RATIO = 1.3

export const SCOPE_OPTIONS = {
  NONE: 'none',
  PREV_WORDS: 'prevWords',
  CURRENT_SCENE: 'currentScene',
  PREV_SCENES: 'prevScenes',
  PREV_CHAPTER: 'prevChapter',
  ENTIRE_NOVEL: 'entireNovel',
}

export function estimateTokens(text) {
  if (!text) return 0
  const wordCount = text.split(/\s+/).filter(Boolean).length
  return Math.round(wordCount * TOKEN_RATIO)
}

function flattenScenesInOrder(acts) {
  const scenes = []
  for (const act of acts) {
    const chapters = act.chapters || []
    for (const chapter of chapters) {
      const chapterScenes = chapter.scenes || []
      for (let i = 0; i < chapterScenes.length; i++) {
        scenes.push({
          ...chapterScenes[i],
          _chapterId: chapter.id,
          _actId: act.id,
          _chapterIndex: i,
        })
      }
    }
  }
  return scenes
}

function getPlainText(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Gathers context text based on the selected scope.
 *
 * @param {Array} acts - Ordered acts array from NovelContext
 * @param {Object} activeScene - Currently selected scene
 * @param {string} scopeOption - One of SCOPE_OPTIONS values
 * @param {Object} params - Extra parameters (wordCount, sceneCount)
 * @returns {{ text: string, estimatedTokens: number, warning: boolean, warningMessage: string|null }}
 */
export function gatherContext(acts, activeScene, scopeOption, params = {}) {
  if (!acts || !activeScene || scopeOption === SCOPE_OPTIONS.NONE) {
    return { text: '', estimatedTokens: 0, warning: false, warningMessage: null }
  }

  const allScenes = flattenScenesInOrder(acts)
  const activeIndex = allScenes.findIndex(s => s.id === activeScene.id)

  let gatheredText = ''

  switch (scopeOption) {
    case SCOPE_OPTIONS.PREV_WORDS: {
      const wordCount = params.wordCount || 500
      const fullText = getPlainText(activeScene.content || '')
      const words = fullText.split(/\s+/).filter(Boolean)
      const startIdx = Math.max(0, words.length - wordCount)
      gatheredText = words.slice(startIdx).join(' ')
      break
    }

    case SCOPE_OPTIONS.CURRENT_SCENE: {
      gatheredText = getPlainText(activeScene.content || '')
      break
    }

    case SCOPE_OPTIONS.PREV_SCENES: {
      const sceneCount = params.sceneCount || 1
      if (activeIndex < 0) break
      const startIdx = Math.max(0, activeIndex - sceneCount)
      const prevScenes = allScenes.slice(startIdx, activeIndex)
      gatheredText = prevScenes
        .map(s => getPlainText(s.content || ''))
        .filter(Boolean)
        .join('\n\n')
      break
    }

    case SCOPE_OPTIONS.PREV_CHAPTER: {
      if (activeIndex < 0) break
      const currentChapterId = activeScene._chapterId
      if (!currentChapterId) break
      const prevChapterScenes = allScenes.filter(s => s._chapterId !== currentChapterId && allScenes.indexOf(s) < activeIndex)
      gatheredText = prevChapterScenes
        .map(s => getPlainText(s.content || ''))
        .filter(Boolean)
        .join('\n\n')
      break
    }

    case SCOPE_OPTIONS.ENTIRE_NOVEL: {
      gatheredText = allScenes
        .map(s => getPlainText(s.content || ''))
        .filter(Boolean)
        .join('\n\n')
      break
    }
  }

  const estimatedTokens = estimateTokens(gatheredText)
  const warning = estimatedTokens > ESTIMATED_MAX_TOKENS
  const warningMessage = warning
    ? `The selected context is approximately ${estimatedTokens.toLocaleString()} tokens (${Math.round(estimatedTokens / 1000)}K), which may exceed the model\'s context window. Consider narrowing the scope.`
    : null

  return { text: gatheredText, estimatedTokens, warning, warningMessage }
}
