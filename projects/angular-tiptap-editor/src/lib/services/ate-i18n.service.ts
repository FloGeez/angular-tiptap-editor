import { Injectable, signal, computed } from "@angular/core";
import { ENGLISH_TRANSLATIONS } from "../i18n/en_ateTranslations";
import { FRENCH_TRANSLATIONS } from "../i18n/fr_ateTranslations";
import { GERMAN_TRANSLATIONS } from "../i18n/de_ateTranslations";
import { PORTUGUESE_TRANSLATIONS } from "../i18n/pt_ateTranslations";
import { SPANISH_TRANSLATIONS } from "../i18n/es_ateTranslations";
import { AteTranslations, SupportedLocale } from "../i18n/ateTranslationsModel";

@Injectable({
  providedIn: "root",
})
export class AteI18nService {
  private _currentLocale = signal<SupportedLocale>("en");
  private _translations = signal<Record<SupportedLocale, AteTranslations>>({
    en: ENGLISH_TRANSLATIONS,
    fr: FRENCH_TRANSLATIONS,
    de: GERMAN_TRANSLATIONS,
    pt: PORTUGUESE_TRANSLATIONS,
    es: SPANISH_TRANSLATIONS,
  });

  // Public signals
  readonly currentLocale = this._currentLocale.asReadonly();
  /** All loaded translations (useful for dynamic key access) */
  readonly allTranslations = this._translations.asReadonly();

  readonly translations = computed(
    () => this.getTranslations(this._currentLocale()) ?? this._translations().en
  );

  // Fast translation methods
  readonly t = computed(() => this.translations());
  readonly toolbar = computed(() => this.translations().toolbar);
  readonly bubbleMenu = computed(() => this.translations().bubbleMenu);
  readonly slashCommands = computed(() => this.translations().slashCommands);
  readonly table = computed(() => this.translations().table);
  readonly imageUpload = computed(() => this.translations().imageUpload);
  readonly editor = computed(() => this.translations().editor);
  readonly common = computed(() => this.translations().common);
  readonly export = computed(() => this.translations().export);

  constructor() {
    // Automatically detect browser language
    this.detectBrowserLanguage();
  }

  setLocale(locale: SupportedLocale): void {
    this._currentLocale.set(locale);
  }

  autoDetectLocale(): void {
    this.detectBrowserLanguage();
  }

  getSupportedLocales(): SupportedLocale[] {
    return Object.keys(this._translations()) as SupportedLocale[];
  }

  addTranslations(locale: string, translations: AteTranslations | Partial<AteTranslations>): void {
    this._translations.update(current => {
      const existing = current[locale] || ENGLISH_TRANSLATIONS;
      return {
        ...current,
        [locale]: {
          ...existing,
          ...translations,
        },
      };
    });
  }

  getTranslations(locale: SupportedLocale): AteTranslations | undefined {
    const resolved = this.resolveLocale(locale);
    return resolved ? this._translations()[resolved] : undefined;
  }

  private resolveLocale(locale: string): string | undefined {
    const all = this._translations();
    if (all[locale]) {
      return locale;
    }
    const language = locale.toLowerCase().split(/[-_]/)[0];
    return all[language] ? language : undefined;
  }

  private detectBrowserLanguage(): void {
    this._currentLocale.set(this.resolveLocale(navigator.language) ?? "en");
  }

  // Utility methods for components
  getToolbarTitle(key: keyof AteTranslations["toolbar"]): string {
    return this.translations().toolbar[key];
  }

  getBubbleMenuTitle(key: keyof AteTranslations["bubbleMenu"]): string {
    return this.translations().bubbleMenu[key];
  }

  getSlashCommand(key: keyof AteTranslations["slashCommands"]) {
    return this.translations().slashCommands[key];
  }
}
