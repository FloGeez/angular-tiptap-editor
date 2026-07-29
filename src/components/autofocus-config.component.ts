import { Component, inject, computed, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  SectionHeaderComponent,
  InfoBoxComponent,
  ToggleSwitchComponent,
} from "./ui";
import { EditorConfigurationService } from "../services/editor-configuration.service";
import { AppI18nService } from "../services/app-i18n.service";

type AutofocusValue = "start" | "end" | "all";

interface AutofocusOption {
  value: AutofocusValue;
  labelKey: "autofocusStart" | "autofocusEnd" | "autofocusAll";
  icon: string;
}

@Component({
  selector: "app-autofocus-config",
  standalone: true,
  imports: [
    CommonModule,
    SectionHeaderComponent,
    InfoBoxComponent,
    ToggleSwitchComponent,
  ],
  template: `
    <section class="config-section" [class.enabled]="isAutofocusEnabled()" [class.is-disabled]="disabled()">
      <app-section-header [title]="appI18n.config().autofocus" icon="center_focus_strong">
        <app-toggle-switch
          [checked]="isAutofocusEnabled()"
          (checkedChange)="onToggleEnabled()"
          [disabled]="disabled()" />
      </app-section-header>

      <div class="config-layout-grid" [class.collapsed]="!isAutofocusEnabled()">
        <div class="config-connectivity-line"></div>
        <div class="config-content-area">
          <span class="control-title">{{ appI18n.config().autofocusSettings }}</span>
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
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .config-section {
        border-bottom: 1px solid var(--app-border);
      }

      .config-section.is-disabled {
        opacity: 0.5;
        pointer-events: none;
        filter: grayscale(1);
      }

      .control-title {
        display: block;
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.5rem;
      }

      .options-container {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
      }

      .option-btn {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--app-border);
        border-radius: 8px;
        background: var(--app-bg);
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.85rem;
        color: var(--text-primary);
      }

      .option-btn:hover {
        background: var(--app-surface);
        border-color: var(--primary-color);
      }

      .option-btn.active {
        background: var(--primary-light);
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
    `,
  ],
})
export class AutofocusConfigComponent {
  private configService = inject(EditorConfigurationService);
  readonly appI18n = inject(AppI18nService);

  disabled = input<boolean>(false);
  readonly editorState = this.configService.editorState;

  readonly autofocusOptions: AutofocusOption[] = [
    { value: "start", labelKey: "autofocusStart", icon: "first_page" },
    { value: "end", labelKey: "autofocusEnd", icon: "last_page" },
    { value: "all", labelKey: "autofocusAll", icon: "select_all" },
  ];

  readonly isAutofocusEnabled = computed(() => {
    return this.editorState().autofocus !== false;
  });

  onToggleEnabled() {
    if (this.isAutofocusEnabled()) {
      this.configService.updateEditorState({ autofocus: false });
    } else {
      this.configService.updateEditorState({ autofocus: "end" });
    }
  }

  isOptionActive(value: AutofocusValue): boolean {
    return this.editorState().autofocus === value;
  }

  selectOption(value: AutofocusValue) {
    this.configService.updateEditorState({
      autofocus: value,
    });
  }

  getOptionLabel(labelKey: "autofocusStart" | "autofocusEnd" | "autofocusAll"): string {
    return this.appI18n.items()[labelKey];
  }

  getInfoText(): string {
    const value = this.editorState().autofocus;

    if (value === false) {
      return this.appI18n.currentLocale() === "fr"
        ? "L'éditeur ne sera pas focusé automatiquement au chargement (Prise en compte après rafraîchissement)"
        : "Editor won't be focused automatically on load (Takes effect after refresh)";
    }
    if (value === "start") {
      return this.appI18n.currentLocale() === "fr"
        ? "Le curseur sera placé au début du document (Prise en compte au chargement)"
        : "Cursor will be placed at the start of the document (Takes effect on load)";
    }
    if (value === "end") {
      return this.appI18n.currentLocale() === "fr"
        ? "Le curseur sera placé à la fin du document (Prise en compte au chargement)"
        : "Cursor will be placed at the end of the document (Takes effect on load)";
    }
    if (value === "all") {
      return this.appI18n.currentLocale() === "fr"
        ? "Tout le contenu sera sélectionné au chargement (Prise en compte au chargement)"
        : "All content will be selected on load (Takes effect on load)";
    }
    return "";
  }
}
