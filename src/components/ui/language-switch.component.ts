import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AppI18nService } from "../../services/app-i18n.service";
import type { SupportedLocale } from "angular-tiptap-editor";

@Component({
  selector: "app-language-switch",
  standalone: true,
  imports: [CommonModule],
  template: `
    <select
        class="language-select"
        [value]="currentLocale()"
        [attr.aria-label]="appI18n.ui().language"
        (change)="onLanguageChange($event)">
      <option value="en">English</option>
      <option value="de">Deutsch</option>
      <option value="fr">Français</option>
    </select>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }

      .language-select {
        height: 36px;
        min-width: 120px;
        padding: 0 2rem 0 0.75rem;

        border: 1px solid var(--app-border);
        border-radius: 8px;

        background: var(--app-surface);
        color: var(--text-primary);

        font: inherit;
        font-size: 0.875rem;
        font-weight: 500;

        cursor: pointer;
        outline: none;

        transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease,
            background-color 0.15s ease;
      }

      .language-select:hover {
        border-color: var(--primary-color);
        background: var(--app-surface-hover);
      }

      .language-select:focus {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb), 0.16);
      }

      .language-select option {
        color: #111827;
        background: #ffffff;
      }

      :host-context(.dark) .language-select option {
        color: #f8fafc;
        background: #0f172a;
      }
    `,
  ],
})
export class LanguageSwitchComponent {
  readonly appI18n = inject(AppI18nService);
  readonly currentLocale = this.appI18n.currentLocale;

  onLanguageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.appI18n.setLocale(select.value as SupportedLocale);
  }
}