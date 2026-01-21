import { Component, input, output, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AteButtonComponent } from "../ui/ate-button.component";
import { AteTranslations } from "../../services/ate-i18n.service";

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
  translations = input.required<AteTranslations>();
  editToggle = output<Event>();
}
