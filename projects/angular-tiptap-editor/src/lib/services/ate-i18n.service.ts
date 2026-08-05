import { Injectable, signal, computed } from "@angular/core";
import { ENGLISH_TRANSLATIONS } from "../i18n/en_ateTranslations";
import { FRENCH_TRANSLATIONS } from "../i18n/fr_ateTranslations";
import { GERMAN_TRANSLATIONS } from "../i18n/de_ateTranslations";
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
  });

  // Public signals
  readonly currentLocale = this._currentLocale.asReadonly();
  /** All loaded translations (useful for dynamic key access) */
  readonly allTranslations = this._translations.asReadonly();

  readonly translations = computed(
    () => this._translations()[this._currentLocale()] ?? this._translations().en
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

  private detectBrowserLanguage(): void {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith("fr")) {
      this._currentLocale.set("fr");
    } else {
      this._currentLocale.set("en");
    }
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
