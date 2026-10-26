import { Injectable, computed, inject, signal } from "@angular/core";
import { AteTranslations, SupportedLocale } from "../i18n/ateTranslationsModel";
import { AteI18nService } from "./ate-i18n.service";

/**
 * Translations seen by one editor instance. The editor provides its own copy and binds its
 * `locale` input to it; without a locale (or outside an editor) it follows the global
 * `AteI18nService` locale. Internal: not part of the public API.
 */
@Injectable({ providedIn: "root" })
export class AteEditorI18n {
  private readonly global = inject(AteI18nService);
  private readonly localeSource = signal<() => SupportedLocale | undefined>(() => undefined);

  readonly translations = computed<AteTranslations>(() => {
    const locale = this.localeSource()();
    return (locale && this.global.getTranslations(locale)) || this.global.translations();
  });

  readonly toolbar = computed(() => this.translations().toolbar);
  readonly bubbleMenu = computed(() => this.translations().bubbleMenu);
  readonly slashCommands = computed(() => this.translations().slashCommands);
  readonly table = computed(() => this.translations().table);
  readonly imageUpload = computed(() => this.translations().imageUpload);
  readonly editor = computed(() => this.translations().editor);
  readonly common = computed(() => this.translations().common);
  readonly export = computed(() => this.translations().export);

  bindLocale(source: () => SupportedLocale | undefined): void {
    this.localeSource.set(source);
  }
}
