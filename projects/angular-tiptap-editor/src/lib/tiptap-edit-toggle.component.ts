import { Component, input, output, ChangeDetectionStrategy, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TiptapButtonComponent } from "./tiptap-button.component";
import { TiptapTranslations } from "./services/i18n.service";

/**
 * Edit Toggle Component
 * Allows switching between editable and readonly modes
 */
@Component({
  selector: "tiptap-edit-toggle",
  standalone: true,
  imports: [CommonModule, TiptapButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ate-edit-toggle-container" [class.is-editable]="editable()">
      <tiptap-button
        [icon]="editable() ? 'visibility' : 'edit'"
        [title]="editable() ? translations().editor.viewMode : translations().editor.toggleEdit"
        (onClick)="toggle.emit($event)"
        size="medium"
        iconSize="small"
        backgroundColor="var(--ate-primary-lighter)"
      />
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
export class TiptapEditToggleComponent {
  editable = input.required<boolean>();
  translations = input.required<TiptapTranslations>();
  toggle = output<Event>();
}
