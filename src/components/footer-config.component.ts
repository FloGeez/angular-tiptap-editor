import { Component, inject, computed, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  ToggleSwitchComponent,
  SectionHeaderComponent,
  DropdownSectionComponent,
  InfoBoxComponent,
} from "./ui";
import { EditorConfigurationService } from "../services/editor-configuration.service";
import { AppI18nService } from "../services/app-i18n.service";

@Component({
  selector: "app-footer-config",
  standalone: true,
  imports: [
    CommonModule,
    ToggleSwitchComponent,
    SectionHeaderComponent,
    DropdownSectionComponent,
    InfoBoxComponent,
  ],
  template: `
    <section
      class="config-section"
      [class.enabled]="state().showFooter"
      [class.is-disabled]="disabled()">
      <app-section-header [title]="appI18n.config().footer" icon="bottom_panel_open">
        <app-toggle-switch
          [checked]="state().showFooter"
          (checkedChange)="toggleFooter()"
          [disabled]="disabled()" />
      </app-section-header>

      <div class="config-layout-grid" [class.collapsed]="!state().showFooter">
        <div class="config-connectivity-line"></div>
        <div class="config-content-area">
          <app-dropdown-section
            [title]="appI18n.config().selectOptions + ' (' + activeCount() + ')'">
            <div class="config-items-grid">
              <!-- Word Count -->
              <label class="config-item-row">
                <input
                  type="checkbox"
                  class="config-checkbox"
                  [checked]="showWord()"
                  (change)="toggleWord()"
                  [disabled]="disabled()" />
                <span class="config-checkmark"></span>
                <span class="config-item-label">
                  <span class="material-symbols-outlined">description</span>
                  <span>{{ wordLabel() }}</span>
                </span>
              </label>

              <!-- Character Count -->
              <label class="config-item-row">
                <input
                  type="checkbox"
                  class="config-checkbox"
                  [checked]="showChar()"
                  (change)="toggleChar()"
                  [disabled]="disabled()" />
                <span class="config-checkmark"></span>
                <span class="config-item-label">
                  <span class="material-symbols-outlined">pin</span>
                  <span>{{ charLabel() }}</span>
                </span>
              </label>
            </div>

            <!-- Max Characters (Only if char count enabled) -->
            @if (showChar()) {
              <div class="footer-limit-container">
                <div class="limit-label-area">
                  <span class="material-symbols-outlined">data_usage</span>
                  <span>{{ limitLabel() }}</span>
                </div>
                <input
                  type="number"
                  [value]="maxChars() || ''"
                  (input)="updateMaxChars($any($event.target).value)"
                  placeholder="∞"
                  min="0"
                  [disabled]="disabled()" />
              </div>
            }

            <app-info-box>{{ infoText() }}</app-info-box>
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

      .footer-limit-container {
        margin: 0.5rem 0.5rem 0.75rem 0.5rem;
        padding: 0.75rem 1rem;
        background: rgba(var(--primary-color-rgb), 0.05);
        border: 1px dashed var(--app-border);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        animation: slideIn 0.3s ease-out;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-5px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .limit-label-area {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--text-secondary);
      }

      .limit-label-area .material-symbols-outlined {
        font-size: 18px;
        color: var(--primary-color);
      }

      .footer-limit-container input {
        width: 70px;
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid var(--app-border);
        background: var(--app-surface);
        color: var(--primary-color);
        font-weight: 600;
        text-align: center;
        font-size: 0.85rem;
        outline: none;
        transition: all 0.2s ease;
      }

      .footer-limit-container input:focus {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px var(--primary-light-alpha);
      }
    `,
  ],
})
export class FooterConfigComponent {
  private configService = inject(EditorConfigurationService);
  readonly appI18n = inject(AppI18nService);

  disabled = input<boolean>(false);

  readonly state = computed(() => this.configService.editorState());
  readonly showChar = computed(() => this.state().showCharacterCount);
  readonly showWord = computed(() => this.state().showWordCount);
  readonly maxChars = computed(() => this.state().maxCharacters);

  readonly activeCount = computed(() => {
    let count = 0;
    if (this.showChar()) {
      count++;
    }
    if (this.showWord()) {
      count++;
    }
    return count;
  });

  readonly wordLabel = computed(() => {
    return this.appI18n.currentLocale() === "fr" ? "Nombre de mots" : "Word Count";
  });

  readonly charLabel = computed(() => {
    return this.appI18n.currentLocale() === "fr" ? "Nombre de caractères" : "Character Count";
  });

  readonly limitLabel = computed(() => {
    return this.appI18n.currentLocale() === "fr" ? "Limite max" : "Max Limit";
  });

  readonly infoText = computed(() => {
    return this.appI18n.currentLocale() === "fr"
      ? "Les compteurs s'affichent en bas de l'éditeur pour un suivi en temps réel."
      : "Counters appear at the bottom of the editor for real-time tracking.";
  });

  toggleFooter() {
    this.configService.toggleFooter();
  }

  toggleChar() {
    this.configService.updateEditorState({
      showCharacterCount: !this.showChar(),
    });
  }

  toggleWord() {
    this.configService.updateEditorState({
      showWordCount: !this.showWord(),
    });
  }

  updateMaxChars(val: string) {
    const num = val === "" ? undefined : parseInt(val, 10);
    this.configService.updateEditorState({
      maxCharacters: isNaN(num as number) ? undefined : num,
    });
  }
}
