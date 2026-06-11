import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import nl from "./locales/nl.json";
import en from "./locales/en.json";

export const SUPPORTED_LANGS = ["nl", "en"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export const LANG_STORAGE_KEY = "dindr.lang";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      nl: { translation: nl },
      en: { translation: en },
    },
    fallbackLng: "nl",
    supportedLngs: SUPPORTED_LANGS as unknown as string[],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANG_STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

// Keep <html lang> in sync
const setHtmlLang = (lng: string) => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng.startsWith("en") ? "en" : "nl";
  }
};
setHtmlLang(i18n.language || "nl");
i18n.on("languageChanged", setHtmlLang);

export const setLanguage = (lang: SupportedLang) => {
  i18n.changeLanguage(lang);
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
};

export default i18n;
