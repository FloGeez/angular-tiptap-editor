import { Component, inject, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ToggleSwitchComponent, SectionHeaderComponent } from "./ui";
import { EditorConfigurationService } from "../services/editor-configuration.service";
import { AppI18nService } from "../services/app-i18n.service";

@Component({
  selector: "app-seamless-config",
  standalone: true,
  imports: [CommonModule, ToggleSwitchComponent, SectionHeaderComponent],
  template: `
    <section class="config-section">
      <app-section-header [title]="label()" icon="border_clear">
        <app-toggle-switch
          [checked]="isEnabled()"
          (checkedChange)="onToggle()"
        />
      </app-section-header>
    </section>
  `,
  styles: [
    `
      .config-section {
        border-bottom: 1px solid var(--app-border);
      }
    `,
  ],
})
export class SeamlessConfigComponent {
  private configService = inject(EditorConfigurationService);
  readonly appI18n = inject(AppI18nService);

  readonly isEnabled = computed(() => this.configService.editorState().seamless);

  readonly label = computed(() => {
    return this.appI18n.translations().config.seamless;
  });

  onToggle() {
    this.configService.toggleSeamless();
  }
}
