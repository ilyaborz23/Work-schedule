import { useEffect, useState, type ReactNode } from 'react'
import { I18nContext, dictionaries, type Lang } from '../i18n'

const LANG_KEY = 'lang'

const savedLang = (): Lang => {
  try {
    return localStorage.getItem(LANG_KEY) === 'he' ? 'he' : 'en'
  } catch {
    return 'en'
  }
}

// Holds the current language; Hebrew also flips the page to right-to-left
function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(savedLang)

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'
    document.title = dictionaries[lang].appName
    try {
      localStorage.setItem(LANG_KEY, lang)
    } catch {
      // private mode: the choice just isn't remembered
    }
  }, [lang])

  return <I18nContext value={{ lang, t: dictionaries[lang], setLang }}>{children}</I18nContext>
}

export default LangProvider
