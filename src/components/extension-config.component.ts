import { Component, inject, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SectionHeaderComponent, StatusBadgeComponent, ToggleSwitchComponent } from "./ui";
import { EditorConfigurationService } from "../services/editor-configuration.service";
import { AppI18nService } from "../services/app-i18n.service";

@Component({
  selector: "app-extension-config",
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent, StatusBadgeComponent, ToggleSwitchComponent],
  template: `
    <div class="config-section" [class.is-disabled]="disabled()">
      <app-section-header icon="extension" [title]="appI18n.translations().config.extensions">
        <app-status-badge
          [label]="
            editorState().enableTaskExtension
              ? appI18n.currentLocale() === 'fr'
                ? 'Actif'
                : 'Active'
              : appI18n.currentLocale() === 'fr'
                ? 'Inactif'
                : 'Inactive'
          "
          [active]="editorState().enableTaskExtension" />
      </app-section-header>

      <div class="extension-grid">
        <!-- Task Extension Card with Universal Toggle -->
        <div
          class="extension-card"
          [class.active]="editorState().enableTaskExtension"
          tabindex="0"
          (click)="toggleTask()"
          (keydown.enter)="toggleTask()"
          (keydown.space)="$event.preventDefault(); toggleTask()">
          <div class="card-icon">
            <span class="material-symbols-outlined">task_alt</span>
          </div>
          <div class="card-content">
            <div class="card-title">{{ appI18n.translations().items.task }}</div>
            <div class="card-desc">{{ appI18n.translations().items.taskDesc }}</div>
          </div>
          <div class="card-toggle">
            <app-toggle-switch
              [checked]="editorState().enableTaskExtension"
              (checkedChange)="toggleTask()"
              [disabled]="disabled()" />
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

      .extension-grid {
        padding: 0.75rem 1.25rem 1rem 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .extension-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem;
        background: var(--app-bg);
        border: 1px solid var(--app-border);
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .extension-card:hover {
        border-color: var(--primary-color);
        background: var(--app-surface);
      }

      .extension-card.active {
        background: var(--app-surface);
        border-color: var(--primary-color);
      }

      .card-icon {
        width: 34px;
        height: 34px;
        background: var(--app-bg);
        border: 1px solid var(--app-border);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary);
        transition: all 0.2s;
      }

      .extension-card.active .card-icon {
        background: var(--primary-light);
        color: var(--primary-color);
        border-color: var(--primary-light);
      }

      .card-content {
        flex: 1;
      }

      .card-title {
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.15rem;
      }

      .card-desc {
        font-size: 0.7rem;
        color: var(--text-muted);
      }

      .card-toggle {
        display: flex;
        align-items: center;
      }
    `,
  ],
})
export class ExtensionConfigComponent {
  private configService = inject(EditorConfigurationService);
  readonly appI18n = inject(AppI18nService);
  readonly editorState = this.configService.editorState;

  disabled = input<boolean>(false);

  toggleTask() {
    this.configService.toggleEnableTaskExtension();
  }
}
