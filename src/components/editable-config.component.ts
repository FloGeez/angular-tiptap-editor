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
    <section class="config-section">
      <app-section-header [title]="label()" icon="edit_note">
        <app-toggle-switch
          [checked]="isEnabled()"
          (checkedChange)="onToggle()"
        />
      </app-section-header>
      <div class="divider"></div>
      <!-- Edit toggle button option -->
      <app-section-header [title]="toggleLabel()" icon="ads_click">
        <app-toggle-switch
          [checked]="showToggle()"
          (checkedChange)="onToggleShow()"
        />
      </app-section-header>
    </section>
  `,
  styles: [
    `
      .divider {
        border-bottom: 1px solid var(--app-border);
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
      editable: !this.isEnabled()
    });
  }

  onToggleShow() {
    this.configService.toggleEditToggle();
  }
}
