"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Languages } from "lucide-react"
import { translations, type Language, type TranslationKey } from "@/lib/translations"

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => {},
  t: (key) => translations.en[key],
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en")

  const t = (key: TranslationKey): string => translations[language][key]

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage()

  const toggle = () => setLanguage(language === "en" ? "sw" : "en")

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      className={className}
      aria-label={`Switch language to ${t("switchTo")}`}
      title={`Switch to ${t("switchTo")}`}
    >
      <Languages className="h-4 w-4 mr-1.5" aria-hidden="true" />
      {t("switchTo")}
    </Button>
  )
}
