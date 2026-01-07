import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { EditorConfigurationService } from "../services/editor-configuration.service";
import { AppI18nService } from "../services/app-i18n.service";
import { LanguageSwitchComponent, ThemeSwitchComponent, ActionButtonComponent } from "./ui";

@Component({
  selector: "app-editor-actions",
  standalone: true,
  imports: [CommonModule, LanguageSwitchComponent, ThemeSwitchComponent, ActionButtonComponent],
  template: `
    <div class="editor-actions">
      <!-- Toggle Code/Éditeur -->
      <div class="app-segmented-control">
        <button
          class="app-segmented-btn"
          [class.active]="!editorState().showCodeMode"
          (click)="toggleCodeMode(false)"
          [title]="appI18n.tooltips().switchToEditor"
        >
          <span class="material-symbols-outlined">edit</span>
          <span>{{ appI18n.ui().editor }}</span>
        </button>
        <button
          class="app-segmented-btn"
          [class.active]="editorState().showCodeMode"
          (click)="toggleCodeMode(true)"
          [title]="appI18n.tooltips().switchToCode"
        >
          <span class="material-symbols-outlined">code</span>
          <span>{{ appI18n.ui().code }}</span>
        </button>
      </div>

      <div class="action-separator"></div>

      <app-action-button
        icon="delete"
        [label]="appI18n.ui().clear"
        variant="danger"
        [tooltip]="appI18n.tooltips().clearEditorContent"
        (onClick)="clearContent()"
      />

      <div class="action-separator"></div>

      <!-- Switch de thème -->
      <app-theme-switch></app-theme-switch>

      <!-- Switch de langue -->
      <app-language-switch></app-language-switch>
    </div>
  `,
  styles: [
    `
      /* Actions de l'éditeur - Toujours visibles */
      .editor-actions {
        position: absolute;
        top: 2rem;
        right: 2rem;
        left: 2rem;
        z-index: 50;
        display: flex;
        align-items: center;
        gap: 12px;
      }


      /* Séparateurs */
      .action-separator {
        width: 1px;
        height: 24px;
        background: var(--app-border);
        flex-shrink: 0;
      }

      @media (max-width: 480px) {
        .editor-actions {
          top: 0.75rem;
          right: 0.75rem;
          left: 0.75rem;
        }

        .mode-btn {
          font-size: 12px;
          padding: 0 8px;
          height: 28px;
        }

        .mode-btn .material-symbols-outlined {
          font-size: 14px;
        }
      }

      /* Dark mode support - Now handled by global variables */
    `,
  ],
})
export class EditorActionsComponent {
  private configService = inject(EditorConfigurationService);
  readonly appI18n = inject(AppI18nService);

  readonly editorState = this.configService.editorState;

  toggleCodeMode(showCode: boolean) {
    this.configService.updateEditorState({ showCodeMode: showCode });
  }

  clearContent() {
    this.configService.clearContent();
  }
}
