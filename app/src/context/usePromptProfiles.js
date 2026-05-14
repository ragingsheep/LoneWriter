import { useCallback, useEffect, useMemo, useState } from 'react'
import { db } from '../db/database'
import { getDefaultPromptProfile } from '../services/promptProfiles'

const normalizeGoal = (tab, goal) => goal || (tab === 'debate' ? 'global' : 'default')

export function usePromptProfiles({ activeNovel }) {
  const [promptProfiles, setPromptProfiles] = useState([])

  const loadPromptProfiles = useCallback(async () => {
    const rows = await db.promptProfiles.toArray()
    setPromptProfiles(rows)
  }, [])

  useEffect(() => {
    loadPromptProfiles()
  }, [loadPromptProfiles])

  const getPromptProfile = useCallback((tab, goal) => {
    const normalizedGoal = normalizeGoal(tab, goal)
    const novelId = activeNovel?.id ?? null
    const novelScoped = novelId
      ? promptProfiles.find(p => p.scope === 'novel' && p.novelId === novelId && p.tab === tab && p.goal === normalizedGoal)
      : null
    const globalScoped = promptProfiles.find(p => p.scope === 'global' && p.tab === tab && p.goal === normalizedGoal)
    return novelScoped || globalScoped || getDefaultPromptProfile(tab, normalizedGoal)
  }, [activeNovel?.id, promptProfiles])

  const savePromptProfile = useCallback(async (profile) => {
    const normalized = {
      ...profile,
      goal: normalizeGoal(profile.tab, profile.goal),
      novelId: profile.scope === 'novel' ? activeNovel?.id ?? null : null,
      isDefault: false,
      updatedAt: new Date().toISOString(),
    }
    if (normalized.id) {
      await db.promptProfiles.put(normalized)
    } else {
      const id = await db.promptProfiles.add(normalized)
      normalized.id = id
    }
    await loadPromptProfiles()
    return normalized
  }, [activeNovel?.id, loadPromptProfiles])

  const resetPromptProfile = useCallback(async (tab, goal, scope = 'global') => {
    const normalizedGoal = normalizeGoal(tab, goal)
    const novelId = scope === 'novel' ? activeNovel?.id ?? null : null
    const existing = promptProfiles.find(p => p.scope === scope && p.novelId === novelId && p.tab === tab && p.goal === normalizedGoal)
    if (existing?.id) await db.promptProfiles.delete(existing.id)
    await loadPromptProfiles()
  }, [activeNovel?.id, loadPromptProfiles, promptProfiles])

  return useMemo(() => ({
    promptProfiles,
    getPromptProfile,
    savePromptProfile,
    resetPromptProfile,
    loadPromptProfiles,
  }), [promptProfiles, getPromptProfile, savePromptProfile, resetPromptProfile, loadPromptProfiles])
}
