import { Component, inject, computed, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ToggleSwitchComponent, SectionHeaderComponent } from "./ui";
import { EditorConfigurationService } from "../services/editor-configuration.service";
import { AppI18nService } from "../services/app-i18n.service";

@Component({
  selector: "app-floating-toolbar-config",
  standalone: true,
  imports: [CommonModule, ToggleSwitchComponent, SectionHeaderComponent],
  template: `
    <div class="extension-option" [class.is-disabled]="disabled()">
      <app-section-header [title]="label()" icon="layers" class="nested-header">
        <app-toggle-switch
          [checked]="isEnabled()"
          (checkedChange)="onToggle()"
          [disabled]="disabled()"
        />
      </app-section-header>
    </div>
  `,
  styles: [
    `
      .extension-option {
        padding: 0;
        margin-top: 0.25rem;
      }
 
      .extension-option.is-disabled {
        opacity: 0.5;
        pointer-events: none;
      }

      :host ::ng-deep .nested-header .section-header {
        padding: 0.5rem 0.75rem;
        border-radius: 8px;
        transition: all 0.2s ease;
      }

      :host ::ng-deep .nested-header .section-header:hover {
        background: rgba(var(--primary-color-rgb), 0.05);
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
