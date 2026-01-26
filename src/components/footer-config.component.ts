import { Component, inject, computed, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  ToggleSwitchComponent,
  SectionHeaderComponent,
  DropdownSectionComponent,
  StatusCountComponent,
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
    StatusCountComponent,
    InfoBoxComponent,
  ],
  template: `
    <section class="config-section" [class.is-disabled]="disabled()">
      <app-section-header [title]="appI18n.config().footer" icon="bottom_panel_open">
        <app-status-count [count]="activeCount()" />
      </app-section-header>

      <div class="config-layout-grid">
        <div class="config-connectivity-line"></div>
        <div class="config-content-area">
          <app-dropdown-section
            [title]="appI18n.config().footerSettings + ' (' + activeCount() + ')'">
            <div class="footer-options">
              <!-- Global Footer Toggle -->
              <div class="footer-option-item main-toggle">
                <div class="option-info">
                  <span class="material-symbols-outlined">visibility</span>
                  <span>{{ appI18n.translations().config.showFooter }}</span>
                </div>
                <app-toggle-switch
                  [checked]="state().showFooter"
                  (checkedChange)="toggleFooter()"
                  [disabled]="disabled()" />
              </div>

              @if (state().showFooter) {
                <div class="footer-divider"></div>
              }

              @if (state().showFooter) {
                <!-- Word Count Toggle -->
                <div class="footer-option-item">
                  <div class="option-info">
                    <span class="material-symbols-outlined">description</span>
                    <span>{{ wordLabel() }}</span>
                  </div>
                  <app-toggle-switch
                    [checked]="showWord()"
                    (checkedChange)="toggleWord()"
                    [disabled]="disabled()" />
                </div>

                <!-- Character Count Toggle -->
                <div class="footer-option-item">
                  <div class="option-info">
                    <span class="material-symbols-outlined">pin</span>
                    <span>{{ charLabel() }}</span>
                  </div>
                  <app-toggle-switch
                    [checked]="showChar()"
                    (checkedChange)="toggleChar()"
                    [disabled]="disabled()" />
                </div>

                <!-- Max Characters (Only if char count enabled) -->
                @if (showChar()) {
                  <div class="footer-limit-item">
                    <div class="option-info">
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
              }
            </div>

            <app-info-box>{{ infoText() }}</app-info-box>
          </app-dropdown-section>
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

      .footer-options {
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .footer-option-item,
      .footer-limit-item {
        background: var(--app-surface);
        border-radius: 12px;
        padding: 0.875rem 1rem;
        border: 1px solid var(--app-border);
        display: flex;
        align-items: center;
        justify-content: space-between;
        transition: all 0.2s ease;
      }

      .footer-option-item:hover,
      .footer-limit-item:hover {
        border-color: var(--primary-color);
        background: var(--app-surface-hover);
      }

      .option-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .option-info .material-symbols-outlined {
        color: var(--primary-color);
        font-size: 1.125rem;
      }

      .footer-limit-item input {
        width: 70px;
        padding: 6px 10px;
        border-radius: 8px;
        border: 1px solid var(--app-border);
        background: var(--app-surface);
        color: var(--primary-color);
        font-weight: 600;
        text-align: center;
        font-size: 0.85rem;
        outline: none;
        transition: all 0.2s ease;
      }

      .footer-limit-item input:focus {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px var(--primary-light-alpha);
      }

      .footer-divider {
        height: 1px;
        background: linear-gradient(to right, transparent, var(--app-border), transparent);
        margin: 0.25rem 1rem;
        opacity: 0.6;
      }

      .main-toggle {
        border-color: var(--primary-color-light-alpha);
        background: var(--app-primary-lighter);
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
