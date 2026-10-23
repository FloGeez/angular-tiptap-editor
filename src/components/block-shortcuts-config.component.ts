import { Component, inject, computed, input } from "@angular/core";
import { SectionHeaderComponent, ToggleSwitchComponent } from "./ui";
import { EditorConfigurationService } from "../services/editor-configuration.service";
import { AppI18nService } from "../services/app-i18n.service";

@Component({
  selector: "app-block-shortcuts-config",
  standalone: true,
  imports: [SectionHeaderComponent, ToggleSwitchComponent],
  template: `
    <div
      class="config-section"
      data-testid="block-shortcuts-config"
      [class.enabled]="isEnabled()"
      [class.is-disabled]="disabled()">
      <app-section-header icon="keyboard" [title]="appI18n.translations().config.blockShortcuts">
        <app-toggle-switch
          [checked]="isEnabled()"
          (checkedChange)="onToggle()"
          [disabled]="disabled()" />
      </app-section-header>
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
    `,
  ],
})
export class BlockShortcutsConfigComponent {
  private configService = inject(EditorConfigurationService);
  readonly appI18n = inject(AppI18nService);

  disabled = input<boolean>(false);

  readonly isEnabled = computed(() => this.configService.editorState().enableBlockShortcuts);

  onToggle() {
    this.configService.updateEditorState({ enableBlockShortcuts: !this.isEnabled() });
  }
}
