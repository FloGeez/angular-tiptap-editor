import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AppI18nService } from "../../services/app-i18n.service";
import { BinarySwitchComponent, SwitchOption } from "./binary-switch.component";

@Component({
  selector: "app-language-switch",
  standalone: true,
  imports: [CommonModule, BinarySwitchComponent],
  template: `
    <app-binary-switch
      [leftOption]="englishOption"
      [rightOption]="frenchOption"
      [isRight]="currentLocale() === 'fr'"
      [tooltip]="appI18n.ui().clickToChange"
      [width]="80"
      sliderGradient="primary"
      (clickToggle)="toggleLanguage()" />
  `,
})
export class LanguageSwitchComponent {
  readonly appI18n = inject(AppI18nService);

  readonly englishOption: SwitchOption = { emoji: "🇺🇸", label: "EN" };
  readonly frenchOption: SwitchOption = { emoji: "🇫🇷", label: "FR" };

  readonly currentLocale = this.appI18n.currentLocale;

  toggleLanguage() {
    const newLocale = this.currentLocale() === "en" ? "fr" : "en";
    this.appI18n.setLocale(newLocale);
  }
}
