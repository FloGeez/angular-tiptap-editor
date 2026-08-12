import { Component, input, output, inject, computed, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AteButtonComponent } from "../ui/ate-button.component";
import { AteI18nService } from "../../services/ate-i18n.service";
import { SupportedLocale } from "../../i18n/ateTranslationsModel";

/**
 * Edit Toggle Component
 * Allows switching between editable and readonly modes
 */
@Component({
  selector: "ate-edit-toggle",
  standalone: true,
  imports: [CommonModule, AteButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ate-edit-toggle-container" [class.is-editable]="editable()">
      <ate-button
        [icon]="editable() ? 'visibility' : 'edit'"
        [title]="editable() ? translations().editor.viewMode : translations().editor.toggleEdit"
        (buttonClick)="editToggle.emit($event)"
        size="medium"
        iconSize="small"
        backgroundColor="var(--ate-primary-lighter)" />
    </div>
  `,
  styles: [
    `
      .ate-edit-toggle-container {
        position: absolute;
        margin-top: 16px;
        right: 16px;
        z-index: 50;
      }
    `,
  ],
})
export class AteEditToggleComponent {
  editable = input.required<boolean>();
  /** Overrides the global i18n locale for this component only. */
  locale = input<SupportedLocale | undefined>(undefined);
  editToggle = output<Event>();

  private readonly i18n = inject(AteI18nService);

  protected readonly translations = computed(() => {
    const localeOverride = this.locale();
    if (localeOverride) {
      const allTranslations = this.i18n.allTranslations();
      return allTranslations[localeOverride] || this.i18n.translations();
    }
    return this.i18n.translations();
  });
}
