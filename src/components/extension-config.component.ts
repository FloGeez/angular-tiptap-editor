import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SectionHeaderComponent, StatusBadgeComponent } from './ui';
import { EditorConfigurationService } from '../services/editor-configuration.service';
import { AppI18nService } from '../services/app-i18n.service';

@Component({
  selector: 'app-extension-config',
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent, StatusBadgeComponent],
  template: `
    <div class="config-section" [class.is-disabled]="disabled()">
      <app-section-header
        icon="extension"
        [title]="appI18n.translations().config.extensions"
      >
        <app-status-badge 
          [label]="editorState().enableTaskExtension ? (appI18n.currentLocale() === 'fr' ? 'Actif' : 'Active') : (appI18n.currentLocale() === 'fr' ? 'Inactif' : 'Inactive')"
          [active]="editorState().enableTaskExtension"
        />
      </app-section-header>

      <div class="extension-grid">
        <!-- Task Extension Toggle -->
        <div class="extension-card" 
             [class.active]="editorState().enableTaskExtension"
             (click)="toggleTask()">
          <div class="card-icon">
            <span class="material-symbols-outlined">task_alt</span>
          </div>
          <div class="card-content">
            <div class="card-title">{{ appI18n.translations().items.task }}</div>
            <div class="card-desc">{{ appI18n.translations().items.taskDesc }}</div>
          </div>
          <div class="card-toggle">
            <div class="toggle-track">
              <div class="toggle-thumb"></div>
            </div>
          </div>
        </div>

        <!-- Action Button (Visible if state changed) -->
        @if (hasChanged()) {
          <div class="test-action">
            <button class="test-btn" (click)="reloadToTest()">
              <span class="material-symbols-outlined">refresh</span>
              <span>{{ getReloadText() }}</span>
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .config-section {
      border-bottom: 1px solid var(--app-border);
    }

    .config-section.is-disabled {
      opacity: 0.5;
      pointer-events: none;
      filter: grayscale(1);
    }

    .extension-grid {
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .extension-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.85rem;
      background: var(--app-bg);
      border: 1px solid var(--app-border);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .extension-card:hover {
      border-color: var(--primary-color);
    }

    .extension-card.active {
      background: var(--app-surface);
      border-color: var(--primary-color);
    }

    .card-icon {
      width: 36px;
      height: 36px;
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: 10px;
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
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 0.15rem;
    }

    .card-desc {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    /* Toggle Switch */
    .toggle-track {
      width: 32px;
      height: 18px;
      background: var(--app-border);
      border-radius: 10px;
      position: relative;
      transition: background 0.2s ease;
    }

    .toggle-thumb {
      width: 14px;
      height: 14px;
      background: white;
      border-radius: 50%;
      position: absolute;
      top: 2px;
      left: 2px;
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    .extension-card.active .toggle-track {
      background: var(--primary-color);
    }

    .extension-card.active .toggle-thumb {
      transform: translateX(14px);
    }
  `]
})
export class ExtensionConfigComponent {
  private configService = inject(EditorConfigurationService);
  readonly appI18n = inject(AppI18nService);
  readonly editorState = this.configService.editorState;

  disabled = input<boolean>(false);

  // Track initial state for "has changed" detection
  private initialTaskState = this.editorState().enableTaskExtension;

  toggleTask() {
    this.configService.toggleEnableTaskExtension();
  }

  hasChanged(): boolean {
    return this.editorState().enableTaskExtension !== this.initialTaskState;
  }

  reloadToTest() {
    const url = new URL(window.location.href);
    url.searchParams.set('tasks', String(this.editorState().enableTaskExtension));
    window.location.href = url.toString();
  }

  getReloadText(): string {
    return this.appI18n.currentLocale() === 'fr'
      ? 'Recharger pour activer/désactiver'
      : 'Reload to toggle extension';
  }
}
