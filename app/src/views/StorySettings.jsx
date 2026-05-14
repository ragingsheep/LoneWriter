import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Settings, BookText, Languages, Eye, User, Check } from 'lucide-react'
import { useNovel } from '../context/NovelContext'
import { Tooltip } from '../components/Tooltip'
import './StorySettings.css'

const POV_OPTIONS = [
  { value: '1st',            key: 'pov_1st' },
  { value: '2nd',            key: 'pov_2nd' },
  { value: '3rd',            key: 'pov_3rd' },
  { value: '3rd_limited',    key: 'pov_3rd_limited' },
  { value: '3rd_omniscient', key: 'pov_3rd_omniscient' },
]

export default function StorySettingsView() {
  const { t } = useTranslation('editor')
  const { activeNovel, novelSettings, updateNovelSettings } = useNovel()

  const [tense, setTense] = useState('past')
  const [language, setLanguage] = useState('')
  const [povType, setPovType] = useState('3rd')
  const [povCharacter, setPovCharacter] = useState('')
  const [saved, setSaved] = useState(false)
  const saveTimerRef = useRef(null)

  useEffect(() => {
    if (novelSettings) {
      setTense(novelSettings.tense || 'past')
      setLanguage(novelSettings.language || '')
      setPovType(novelSettings.povType || '3rd')
      setPovCharacter(novelSettings.povCharacter || '')
    } else {
      setTense('past')
      setLanguage('')
      setPovType('3rd')
      setPovCharacter('')
    }
  }, [novelSettings])

  const debouncedSave = (field, value) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaved(true)
    saveTimerRef.current = setTimeout(() => {
      setSaved(false)
    }, 2000)
    if (!activeNovel) return
    updateNovelSettings(activeNovel.id, { [field]: value })
  }

  const handleTenseChange = (val) => {
    setTense(val)
    debouncedSave('tense', val)
  }

  const handleLanguageChange = (val) => {
    setLanguage(val)
    debouncedSave('language', val)
  }

  const handlePovTypeChange = (val) => {
    setPovType(val)
    debouncedSave('povType', val)
  }

  const handlePovCharacterChange = (val) => {
    setPovCharacter(val)
    debouncedSave('povCharacter', val)
  }

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  if (!activeNovel) {
    return (
      <div className="story-settings">
        <div className="story-settings__empty">
          <BookText size={40} />
          <p>{t('story.no_novel')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="story-settings">
      <div className="story-settings__header">
        <div className="story-settings__header-left">
          <Settings size={18} className="story-settings__header-icon" />
          <div>
            <h1 className="story-settings__title">{t('story.title')}</h1>
            <p className="story-settings__subtitle">{activeNovel.title}</p>
          </div>
        </div>
        {saved && (
          <span className="story-settings__saved">
            <Check size={12} />
            {t('story.saved')}
          </span>
        )}
      </div>

      <div className="story-settings__content">
        {/* PROSE section */}
        <div className="story-settings__section">
          <h2 className="story-settings__section-title">{t('story.prose')}</h2>

          {/* Tense */}
          <div className="story-settings__field">
            <div className="story-settings__field-label">
              <BookText size={14} />
              <span>{t('story.tense')}</span>
            </div>
            <p className="story-settings__field-desc">{t('story.tense_desc')}</p>
            <div className="story-settings__toggle-group">
              <button
                className={`story-settings__toggle ${tense === 'past' ? 'story-settings__toggle--active' : ''}`}
                onClick={() => handleTenseChange('past')}
              >
                {t('story.tense_past')}
              </button>
              <button
                className={`story-settings__toggle ${tense === 'present' ? 'story-settings__toggle--active' : ''}`}
                onClick={() => handleTenseChange('present')}
              >
                {t('story.tense_present')}
              </button>
            </div>
          </div>

          {/* Language */}
          <div className="story-settings__field">
            <div className="story-settings__field-label">
              <Languages size={14} />
              <span>{t('story.language')}</span>
            </div>
            <p className="story-settings__field-desc">{t('story.language_desc')}</p>
            <input
              type="text"
              className="story-settings__input"
              placeholder={t('story.language_placeholder')}
              value={language}
              onChange={e => handleLanguageChange(e.target.value)}
            />
          </div>

          {/* POV Type */}
          <div className="story-settings__field">
            <div className="story-settings__field-label">
              <Eye size={14} />
              <span>{t('story.pov_type')}</span>
            </div>
            <p className="story-settings__field-desc">{t('story.pov_type_desc')}</p>
            <div className="story-settings__button-group">
              {POV_OPTIONS.map(({ value, key }) => (
                <button
                  key={value}
                  className={`story-settings__pov-btn ${povType === value ? 'story-settings__pov-btn--active' : ''}`}
                  onClick={() => handlePovTypeChange(value)}
                >
                  {t(`story.${key}`)}
                </button>
              ))}
            </div>
          </div>

          {/* POV Character */}
          <div className="story-settings__field">
            <div className="story-settings__field-label">
              <User size={14} />
              <span>{t('story.pov_character')}</span>
            </div>
            <p className="story-settings__field-desc">{t('story.pov_character_desc')}</p>
            <input
              type="text"
              className="story-settings__input"
              placeholder={t('story.pov_character_placeholder')}
              value={povCharacter}
              onChange={e => handlePovCharacterChange(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
