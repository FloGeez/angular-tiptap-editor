import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { EditorConfigurationService } from "../services/editor-configuration.service";
import { AppI18nService } from "../services/app-i18n.service";
import { LanguageSwitchComponent, ThemeSwitchComponent, ActionButtonComponent, NotionSwitchComponent } from "./ui";

@Component({
  selector: "app-editor-actions",
  standalone: true,
  imports: [CommonModule, LanguageSwitchComponent, ThemeSwitchComponent, ActionButtonComponent, NotionSwitchComponent],
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

      <!-- Switch de thème -->
      <app-theme-switch></app-theme-switch>

      <!-- Switch de langue -->
      <app-language-switch></app-language-switch>

      <!-- Switch Notion -->
      <app-notion-switch></app-notion-switch>

      <div class="action-separator"></div>

      <app-action-button
        icon="delete"
        [label]="appI18n.ui().clear"
        variant="danger"
        [tooltip]="appI18n.tooltips().clearEditorContent"
        (onClick)="clearContent()"
      />
    </div>
  `,
  styles: [
    `
      /* Actions de l'éditeur - Toujours visibles */
      .editor-actions {
        position: absolute;
        top: 1.5rem;
        right: 2rem;
        left: 2rem;
        z-index: 50;
        display: flex;
        align-items: center;
        gap: 12px;
        overflow-x: auto;
        overflow-y: hidden;
        padding-bottom: 6px;
        -webkit-overflow-scrolling: touch;
        
        /* Discreet Scrollbar */
        scrollbar-width: thin;
        scrollbar-color: var(--app-border) transparent;

        &::-webkit-scrollbar {
          height: 4px;
        }
        &::-webkit-scrollbar-track {
          background: transparent;
        }
        &::-webkit-scrollbar-thumb {
          background: var(--app-border);
          border-radius: 10px;
        }

        /* Dynamic Scroll Shadows (Pure CSS) */
        background: 
          /* Shadow covers (match app background) */
          linear-gradient(to right, var(--app-bg) 30%, rgba(255,255,255,0)) 0 0,
          linear-gradient(to left, var(--app-bg) 30%, rgba(255,255,255,0)) 100% 0,
          /* Actual Shadows */
          radial-gradient(farthest-side at 0 50%, rgba(0,0,0,0.08), rgba(0,0,0,0)),
          radial-gradient(farthest-side at 100% 50%, rgba(0,0,0,0.08), rgba(0,0,0,0)) 100% 0;
        background-repeat: no-repeat;
        background-size: 60px 100%, 60px 100%, 15px 100%, 15px 100%;
        background-attachment: local, local, scroll, scroll;
      }

      .editor-actions > * {
        flex-shrink: 0;
      }


      /* Séparateurs */
      .action-separator {
        width: 1px;
        height: 24px;
        background: var(--app-border);
        flex-shrink: 0;
      }

      @media (max-width: 768px) {
        .editor-actions {
          left: 1rem;
          right: 1rem;
        }
      }

      @media (max-width: 480px) {
        .app-segmented-btn {
          font-size: 12px;
          padding: 0 8px;
          height: 28px;
        }

        .app-segmented-btn .material-symbols-outlined {
          font-size: 14px;
        }
      }
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
