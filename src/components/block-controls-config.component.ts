import { Component, inject, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SectionHeaderComponent } from "./ui";
import { EditorConfigurationService } from "../services/editor-configuration.service";
import { AppI18nService } from "../services/app-i18n.service";
import { AteBlockControlsMode } from "angular-tiptap-editor";

@Component({
  selector: "app-block-controls-config",
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent],
  template: `
    <div class="config-section" [class.is-disabled]="disabled()">
      <app-section-header
        icon="drag_indicator"
        [title]="appI18n.translations().config.blockControls">
      </app-section-header>

      <div class="variant-grid">
        <button
          class="variant-card"
          [class.active]="editorState().blockControls === 'none'"
          (click)="updateMode('none')"
          type="button">
          <span class="variant-label">{{ appI18n.translations().items.blockControlsNone }}</span>
        </button>

        <button
          class="variant-card"
          [class.active]="editorState().blockControls === 'inside'"
          (click)="updateMode('inside')"
          type="button">
          <span class="variant-label">{{ appI18n.translations().items.blockControlsInside }}</span>
        </button>

        <button
          class="variant-card"
          [class.active]="editorState().blockControls === 'outside'"
          (click)="updateMode('outside')"
          type="button">
          <span class="variant-label">{{ appI18n.translations().items.blockControlsOutside }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .config-section {
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--app-border);
      }

      .config-section.is-disabled {
        opacity: 0.5;
        pointer-events: none;
        filter: grayscale(1);
      }

      .variant-grid {
        padding: 0 1.25rem;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.5rem;
      }

      .variant-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 0.65rem 0.25rem;
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
        font-size: 0.65rem;
        font-weight: 600;
        text-align: center;
      }
    `,
  ],
})
export class BlockControlsConfigComponent {
  private configService = inject(EditorConfigurationService);
  readonly appI18n = inject(AppI18nService);
  readonly editorState = this.configService.editorState;

  disabled = input<boolean>(false);

  updateMode(mode: AteBlockControlsMode) {
    this.configService.updateBlockControls(mode);
  }
}
