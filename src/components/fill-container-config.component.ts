import { Component, inject, computed, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ToggleSwitchComponent, SectionHeaderComponent } from "./ui";
import { EditorConfigurationService } from "../services/editor-configuration.service";
import { AppI18nService } from "../services/app-i18n.service";

@Component({
  selector: "app-fill-container-config",
  standalone: true,
  imports: [CommonModule, ToggleSwitchComponent, SectionHeaderComponent],
  template: `
    <section class="config-section" [class.is-disabled]="disabled()">
      <app-section-header [title]="label()" icon="fullscreen">
        <app-toggle-switch
          [checked]="isEnabled()"
          (checkedChange)="onToggle()"
          [disabled]="disabled()" />
      </app-section-header>
    </section>
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
export class FillContainerConfigComponent {
  private configService = inject(EditorConfigurationService);
  readonly appI18n = inject(AppI18nService);

  disabled = input<boolean>(false);

  readonly isEnabled = computed(() => this.configService.editorState().fillContainer);

  readonly label = computed(() => {
    return this.appI18n.currentLocale() === "fr" ? "Remplir le conteneur" : "Fill Container";
  });

  onToggle() {
    this.configService.toggleFillContainer();
  }
}
