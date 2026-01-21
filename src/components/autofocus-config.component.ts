import { Component, inject, computed, signal, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SectionHeaderComponent, DropdownSectionComponent, InfoBoxComponent, StatusBadgeComponent } from "./ui";
import { EditorConfigurationService } from "../services/editor-configuration.service";
import { AppI18nService } from "../services/app-i18n.service";

type AutofocusValue = boolean | "start" | "end" | "all";

interface AutofocusOption {
  value: AutofocusValue;
  labelKey: "autofocusOff" | "autofocusStart" | "autofocusEnd" | "autofocusAll";
  icon: string;
}

@Component({
  selector: "app-autofocus-config",
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent, DropdownSectionComponent, InfoBoxComponent, StatusBadgeComponent],
  template: `
    <section class="config-section" [class.is-disabled]="disabled()">
      <app-section-header [title]="appI18n.config().autofocus" icon="center_focus_strong">
        <app-status-badge
          [label]="isAutofocusEnabled() ? currentLabel() : appI18n.items().autofocusOff"
          [active]="isAutofocusEnabled()" />
      </app-section-header>

      <div class="config-layout-grid">
        <div class="config-connectivity-line"></div>
        <div class="config-content-area">
          <app-dropdown-section [title]="appI18n.config().autofocusSettings">
            <div class="options-container">
              @for (option of autofocusOptions; track option.value) {
                <button
                  class="option-btn"
                  [class.active]="isOptionActive(option.value)"
                  (click)="selectOption(option.value)"
                  [disabled]="disabled()">
                  <span class="material-symbols-outlined">{{ option.icon }}</span>
                  <span class="option-label">{{ getOptionLabel(option.labelKey) }}</span>
                  @if (isOptionActive(option.value)) {
                    <span class="material-symbols-outlined check-icon">check</span>
                  }
                </button>
              }
            </div>

            <app-info-box>{{ getInfoText() }}</app-info-box>

            @if (hasConfigChanged()) {
              <div class="test-action">
                <button class="test-btn" (click)="reloadToTest()">
                  <span class="material-symbols-outlined">refresh</span>
                  <span>{{ getTestButtonText() }}</span>
                </button>
              </div>
            }
          </app-dropdown-section>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .config-section.is-disabled {
        opacity: 0.5;
        pointer-events: none;
        filter: grayscale(1);
      }
      .options-container {
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .option-btn {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        padding: 0.5rem 1rem; /* Reduced padding from 0.75rem to 0.5rem */
        border: 1px solid var(--app-border);
        border-radius: 8px;
        background: var(--app-surface);
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.85rem;
        color: var(--text-primary);
      }

      .option-btn:hover {
        background: var(--app-surface-hover);
        border-color: var(--text-muted);
      }

      .option-btn.active {
        background: rgba(var(--primary-color-rgb), 0.1);
        border-color: var(--primary-color);
        color: var(--primary-color);
      }

      .option-btn .material-symbols-outlined {
        font-size: 18px;
        color: var(--text-secondary);
      }

      .option-btn.active .material-symbols-outlined {
        color: var(--primary-color);
      }

      .option-label {
        flex: 1;
        text-align: left;
      }

      .check-icon {
        font-size: 16px !important;
        color: var(--primary-color) !important;
      }

      /* Dark mode support - Now handled by global variables */
    `,
  ],
})
export class AutofocusConfigComponent {
  private configService = inject(EditorConfigurationService);
  readonly appI18n = inject(AppI18nService);

  disabled = input<boolean>(false);

  readonly editorState = this.configService.editorState;

  // Valeur initiale pour détecter les changements
  private initialAutofocus = signal<boolean | "start" | "end" | "all" | number>(false);

  // Options disponibles
  readonly autofocusOptions: AutofocusOption[] = [
    { value: false, labelKey: "autofocusOff", icon: "block" },
    { value: "start", labelKey: "autofocusStart", icon: "first_page" },
    { value: "end", labelKey: "autofocusEnd", icon: "last_page" },
    { value: "all", labelKey: "autofocusAll", icon: "select_all" },
  ];

  constructor() {
    // Récupérer le paramètre autofocus depuis l'URL si présent
    const urlParams = new URLSearchParams(window.location.search);
    const autofocusParam = urlParams.get("autofocus");

    if (autofocusParam) {
      let value: boolean | "start" | "end" | "all" | number = false;

      if (autofocusParam === "false") {
        value = false;
      } else if (autofocusParam === "true" || autofocusParam === "start") {
        value = "start";
      } else if (autofocusParam === "end") {
        value = "end";
      } else if (autofocusParam === "all") {
        value = "all";
      } else if (!isNaN(Number(autofocusParam))) {
        value = Number(autofocusParam);
      }

      // Appliquer la valeur depuis l'URL
      this.configService.updateEditorState({ autofocus: value });
      this.initialAutofocus.set(value);

      // Nettoyer l'URL après application
      const url = new URL(window.location.href);
      url.searchParams.delete("autofocus");
      window.history.replaceState({}, "", url.toString());
    } else {
      // Stocker la valeur initiale
      this.initialAutofocus.set(this.editorState().autofocus);
    }
  }

  readonly isAutofocusEnabled = computed(() => {
    const value = this.editorState().autofocus;
    return value !== false;
  });

  readonly currentLabel = computed(() => {
    const value = this.editorState().autofocus;
    const option = this.autofocusOptions.find(o => o.value === value);
    return option ? this.getOptionLabel(option.labelKey) : "";
  });

  isOptionActive(value: AutofocusValue): boolean {
    return this.editorState().autofocus === value;
  }

  selectOption(value: AutofocusValue) {
    this.configService.updateEditorState({
      autofocus: value,
    });
  }

  getOptionLabel(labelKey: "autofocusOff" | "autofocusStart" | "autofocusEnd" | "autofocusAll"): string {
    return this.appI18n.items()[labelKey];
  }

  getInfoText(): string {
    const value = this.editorState().autofocus;

    if (value === false) {
      return this.appI18n.currentLocale() === "fr"
        ? "L'éditeur ne sera pas focusé automatiquement au chargement"
        : "Editor won't be focused automatically on load";
    }
    if (value === "start") {
      return this.appI18n.currentLocale() === "fr"
        ? "Le curseur sera placé au début du document"
        : "Cursor will be placed at the start of the document";
    }
    if (value === "end") {
      return this.appI18n.currentLocale() === "fr"
        ? "Le curseur sera placé à la fin du document"
        : "Cursor will be placed at the end of the document";
    }
    if (value === "all") {
      return this.appI18n.currentLocale() === "fr"
        ? "Tout le contenu sera sélectionné au chargement"
        : "All content will be selected on load";
    }
    return "";
  }

  hasConfigChanged(): boolean {
    return this.editorState().autofocus !== this.initialAutofocus();
  }

  reloadToTest() {
    // Sauvegarder la config dans l'URL pour la restaurer après rechargement
    const autofocus = this.editorState().autofocus;
    const url = new URL(window.location.href);
    url.searchParams.set("autofocus", String(autofocus));
    window.location.href = url.toString();
  }

  getTestButtonText(): string {
    return this.appI18n.currentLocale() === "fr" ? "Recharger pour tester" : "Reload to test";
  }
}
