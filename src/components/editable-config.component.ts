import { Component, inject, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ToggleSwitchComponent, SectionHeaderComponent } from "./ui";
import { EditorConfigurationService } from "../services/editor-configuration.service";
import { AppI18nService } from "../services/app-i18n.service";

@Component({
  selector: "app-editable-config",
  standalone: true,
  imports: [CommonModule, ToggleSwitchComponent, SectionHeaderComponent],
  template: `
    <section class="config-section" [class.enabled]="isEnabled()">
      <app-section-header [title]="label()" icon="edit_note">
        <app-toggle-switch [checked]="isEnabled()" (checkedChange)="onToggle()" />
      </app-section-header>

      <div class="config-layout-grid">
        <div class="config-connectivity-line"></div>
        <div class="config-content-area">
          <div class="toggle-row">
            <span class="toggle-label">{{ toggleLabel() }}</span>
            <app-toggle-switch [checked]="showToggle()" (checkedChange)="onToggleShow()" />
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .config-section {
        border-bottom: 1px solid var(--app-border);
      }

      .toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.4rem 0.5rem;
        background: var(--app-bg);
        border: 1px solid var(--app-border);
        border-radius: 8px;
        cursor: pointer;
        user-select: none;
      }

      .toggle-label {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--text-secondary);
      }
    `,
  ],
})
export class EditableConfigComponent {
  private configService = inject(EditorConfigurationService);
  readonly appI18n = inject(AppI18nService);

  readonly isEnabled = computed(() => this.configService.editorState().editable);
  readonly showToggle = computed(() => this.configService.editorState().showEditToggle);

  readonly label = computed(() => this.appI18n.config().editable);
  readonly toggleLabel = computed(() => this.appI18n.config().showEditToggle);

  onToggle() {
    this.configService.updateEditorState({
      editable: !this.isEnabled(),
    });
  }

  onToggleShow() {
    this.configService.toggleEditToggle();
  }
}
