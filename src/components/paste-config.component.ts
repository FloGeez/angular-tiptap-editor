import { Component, inject, computed, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SectionHeaderComponent, ToggleSwitchComponent } from "./ui";
import { EditorConfigurationService } from "../services/editor-configuration.service";
import { AppI18nService } from "../services/app-i18n.service";
import { AtePasteMode } from "angular-tiptap-editor";

@Component({
  selector: "app-paste-config",
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent, ToggleSwitchComponent],
  template: `
    <div class="config-section" [class.enabled]="isEnabled()" [class.is-disabled]="disabled()">
      <app-section-header icon="content_paste" [title]="appI18n.translations().config.paste">
        <app-toggle-switch
          [checked]="isEnabled()"
          (checkedChange)="onToggleEnabled()"
          [disabled]="disabled()" />
      </app-section-header>

      <div class="config-layout-grid" [class.collapsed]="!isEnabled()">
        <div class="config-connectivity-line"></div>
        <div class="config-content-area">
          <span class="control-title">{{ appI18n.translations().config.pasteMode }}</span>
          <div class="variant-grid">
            <button
              class="variant-card"
              [class.active]="editorState().pasteMode === 'clean'"
              (click)="updateMode('clean')"
              type="button">
              <span class="variant-label">{{ appI18n.translations().items.pasteClean }}</span>
            </button>

            <button
              class="variant-card"
              [class.active]="editorState().pasteMode === 'prompt'"
              (click)="updateMode('prompt')"
              type="button">
              <span class="variant-label">{{ appI18n.translations().items.pastePrompt }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
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

      .variant-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.5rem;
      }

      .variant-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 0.6rem 0.25rem;
        background: var(--app-bg);
        border: 1px solid var(--app-border);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        color: var(--text-secondary);
      }

      .variant-card:hover {
        border-color: var(--primary-color);
        background: var(--app-surface);
      }

      .variant-card.active {
        background: var(--primary-light);
        border-color: var(--primary-color);
        color: var(--primary-color);
      }

      .variant-label {
        font-size: 0.7rem;
        font-weight: 600;
        text-align: center;
      }
    `,
  ],
})
export class PasteConfigComponent {
  private configService = inject(EditorConfigurationService);
  readonly appI18n = inject(AppI18nService);
  readonly editorState = this.configService.editorState;

  disabled = input<boolean>(false);

  readonly isEnabled = computed(() => this.editorState().pasteMode !== "merge");

  onToggleEnabled() {
    if (this.isEnabled()) {
      this.configService.updatePasteMode("merge");
    } else {
      this.configService.updatePasteMode("prompt");
    }
  }

  updateMode(mode: AtePasteMode) {
    this.configService.updatePasteMode(mode);
  }
}
