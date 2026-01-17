import { Component, inject, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ToggleSwitchComponent, SectionHeaderComponent } from "./ui";
import { EditorConfigurationService } from "../services/editor-configuration.service";
import { AppI18nService } from "../services/app-i18n.service";

@Component({
  selector: "app-disabled-config",
  standalone: true,
  imports: [CommonModule, ToggleSwitchComponent, SectionHeaderComponent],
  template: `
    <section class="config-section">
      <app-section-header [title]="label()" icon="block">
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
export class DisabledConfigComponent {
  private configService = inject(EditorConfigurationService);
  readonly appI18n = inject(AppI18nService);

  readonly isEnabled = computed(() => this.configService.editorState().disabled);

  readonly label = computed(() => {
    return this.appI18n.currentLocale() === "fr" 
      ? "Mode désactivé (Disabled)" 
      : "Disabled Mode";
  });

  onToggle() {
    this.configService.toggleDisabled();
  }
}
