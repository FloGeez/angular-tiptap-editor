import { Component, inject, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { EditorConfigurationService } from "../../services/editor-configuration.service";
import { AppI18nService } from "../../services/app-i18n.service";
import { BinarySwitchComponent, SwitchOption } from "./binary-switch.component";

@Component({
  selector: "app-theme-switch",
  standalone: true,
  imports: [CommonModule, BinarySwitchComponent],
  template: `
    <app-binary-switch
      [leftOption]="lightOption"
      [rightOption]="darkOption"
      [isRight]="isDarkMode()"
      [tooltip]="tooltip()"
      [width]="68"
      sliderGradient="custom"
      leftGradient="var(--warning-gradient)"
      rightGradient="var(--primary-gradient)"
      (toggle)="toggleTheme()"
    />
  `,
})
export class ThemeSwitchComponent {
  private configService = inject(EditorConfigurationService);
  readonly appI18n = inject(AppI18nService);

  readonly lightOption: SwitchOption = { icon: "light_mode" };
  readonly darkOption: SwitchOption = { icon: "dark_mode" };

  readonly isDarkMode = computed(() => this.configService.editorState().darkMode);

  readonly tooltip = computed(() => {
    const locale = this.appI18n.currentLocale();
    return locale === "fr" ? "Changer le thème" : "Change theme";
  });

  toggleTheme() {
    this.configService.toggleDarkMode();
  }
}
