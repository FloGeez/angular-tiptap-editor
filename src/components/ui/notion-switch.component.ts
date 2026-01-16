import { Component, inject, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { EditorConfigurationService } from "../../services/editor-configuration.service";
import { AppI18nService } from "../../services/app-i18n.service";
import { BinarySwitchComponent, SwitchOption } from "./binary-switch.component";

@Component({
  selector: "app-notion-switch",
  standalone: true,
  imports: [CommonModule, BinarySwitchComponent],
  template: `
    <app-binary-switch
      [leftOption]="classicOption"
      [rightOption]="notionOption"
      [isRight]="isNotionMode()"
      [tooltip]="tooltip()"
      [width]="98"
      sliderGradient="custom"
      leftGradient="var(--primary-gradient)"
      rightGradient="linear-gradient(135deg, #1f2937 0%, #111827 100%)"
      (toggle)="toggleNotion()"
    />
  `,
})
export class NotionSwitchComponent {
  private configService = inject(EditorConfigurationService);
  readonly appI18n = inject(AppI18nService);

  readonly classicOption: SwitchOption = { icon: "branding_watermark", label: "Classic" };
  readonly notionOption: SwitchOption = { icon: "subject", label: "Notion" };

  readonly isNotionMode = computed(() => this.configService.editorState().notionMode);

  readonly tooltip = computed(() => {
    const locale = this.appI18n.currentLocale();
    return locale === "fr" ? "Mode Notion (Minimal)" : "Notion Mode (Minimal)";
  });

  toggleNotion() {
    this.configService.toggleNotionMode();
  }
}
