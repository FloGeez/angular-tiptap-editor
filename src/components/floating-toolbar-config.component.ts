import { Component, inject, computed, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ToggleSwitchComponent } from "./ui";
import { EditorConfigurationService } from "../services/editor-configuration.service";
import { AppI18nService } from "../services/app-i18n.service";

@Component({
  selector: "app-floating-toolbar-config",
  standalone: true,
  imports: [CommonModule, ToggleSwitchComponent],
  template: `
    <div class="floating-option-row" [class.is-disabled]="disabled()">
      <div class="option-label-area">
        <span class="material-symbols-outlined">layers</span>
        <span class="option-label-text">{{ label() }}</span>
      </div>
      <app-toggle-switch
        [checked]="isEnabled()"
        (checkedChange)="onToggle()"
        [disabled]="disabled()" />
    </div>
  `,
  styles: [
    `
      .floating-option-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.6rem 0.75rem;
        margin-top: 0.5rem;
        background: var(--app-bg);
        border: 1px solid var(--app-border);
        border-radius: 8px;
        transition: all 0.2s ease;
      }

      .floating-option-row:hover {
        background: var(--app-surface);
        border-color: var(--primary-color);
      }

      .floating-option-row.is-disabled {
        opacity: 0.5;
        pointer-events: none;
      }

      .option-label-area {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--text-secondary);
        font-size: 0.75rem;
        font-weight: 500;
      }

      .option-label-area .material-symbols-outlined {
        font-size: 1.1rem;
        color: var(--primary-color);
      }
    `,
  ],
})
export class FloatingToolbarConfigComponent {
  private configService = inject(EditorConfigurationService);
  readonly appI18n = inject(AppI18nService);

  disabled = input<boolean>(false);

  readonly isEnabled = computed(() => this.configService.editorState().floatingToolbar);

  readonly label = computed(() => {
    return this.appI18n.translations().config.floatingToolbar;
  });

  onToggle() {
    this.configService.toggleFloatingToolbar();
  }
}
