import { Component, inject, computed, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ToggleSwitchComponent, SectionHeaderComponent, InfoBoxComponent } from "./ui";
import { EditorConfigurationService } from "../services/editor-configuration.service";
import { AppI18nService } from "../services/app-i18n.service";

@Component({
  selector: "app-footer-config",
  standalone: true,
  imports: [CommonModule, ToggleSwitchComponent, SectionHeaderComponent, InfoBoxComponent],
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
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.5rem 0.75rem;
        margin: 0.5rem 0;
        background: var(--app-bg);
        border: 1px solid var(--app-border);
        border-radius: 8px;
      }

      .limit-label-area {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.75rem;
        color: var(--text-secondary);
      }

      .limit-label-area .material-symbols-outlined {
        font-size: 16px;
        color: var(--primary-color);
      }

      .footer-limit-container input {
        width: 70px;
        padding: 0.25rem 0.5rem;
        border: 1px solid var(--app-border);
        border-radius: 6px;
        background: var(--app-surface);
        color: var(--text-primary);
        font-size: 0.8rem;
        text-align: right;
      }
    `,
  ],
})
export class FooterConfigComponent {
  private configService = inject(EditorConfigurationService);
  readonly appI18n = inject(AppI18nService);

  disabled = input<boolean>(false);

  readonly state = this.configService.editorState;

  readonly showWord = computed(() => this.state().showWordCount);
  readonly showChar = computed(() => this.state().showCharacterCount);
  readonly maxChars = computed(() => this.state().maxCharacters);

  readonly wordLabel = computed(() => this.appI18n.items().wordCount);
  readonly charLabel = computed(() => this.appI18n.items().characterCount);
  readonly limitLabel = computed(() => this.appI18n.items().maxCharacters);

  readonly activeCount = computed(() => {
    let count = 0;
    if (this.showWord()) {
      count++;
    }
    if (this.showChar()) {
      count++;
    }
    return count;
  });

  readonly infoText = computed(() => {
    return this.appI18n.currentLocale() === "fr"
      ? "Le compteur s'affiche automatiquement en bas de l'éditeur lorsque le footer est actif."
      : "The counter is automatically displayed at the bottom of the editor when footer is enabled.";
  });

  toggleFooter() {
    this.configService.toggleFooter();
  }

  toggleWord() {
    this.configService.updateEditorState({
      showWordCount: !this.showWord(),
    });
  }

  toggleChar() {
    this.configService.updateEditorState({
      showCharacterCount: !this.showChar(),
    });
  }

  updateMaxChars(val: string) {
    const num = parseInt(val, 10);
    this.configService.updateEditorState({
      maxCharacters: isNaN(num) || num <= 0 ? undefined : num,
    });
  }
}
