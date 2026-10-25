import { Languages } from 'lucide-react'
import { useI18n } from '../i18n'

// Shows the other language's name: "עברית" in English mode, "English" in Hebrew mode
function LangToggle({ className = '' }: { className?: string }) {
  const { lang, t, setLang } = useI18n()
  return (
    <button
      type="button"
      className={`btn px-3 ${className}`}
      aria-label={t.switchLang}
      onClick={() => setLang(lang === 'en' ? 'he' : 'en')}
    >
      <Languages className="size-4" aria-hidden />
      {t.langButton}
    </button>
  )
}

export default LangToggle
