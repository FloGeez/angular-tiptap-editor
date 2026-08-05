import type { AppTranslations } from "./app-translations.model";
import { ENGLISH_APP_TRANSLATIONS } from "./en.translations";
import { FRENCH_APP_TRANSLATIONS } from "./fr.translations";
import { GERMAN_APP_TRANSLATIONS } from "./de.translations";

export type { AppTranslations, CodeGeneration } from "./app-translations.model";

export const APP_TRANSLATIONS = {
  en: ENGLISH_APP_TRANSLATIONS,
  fr: FRENCH_APP_TRANSLATIONS,
  de: GERMAN_APP_TRANSLATIONS,
} satisfies Record<string, AppTranslations>;

export type AppLocale = keyof typeof APP_TRANSLATIONS;
