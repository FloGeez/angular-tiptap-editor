import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";

type ActionVariant = "default" | "danger" | "success";

@Component({
  selector: "app-action-button",
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      class="app-action-btn"
      [class.danger]="variant() === 'danger'"
      [class.success]="variant() === 'success'"
      [title]="tooltip()"
      (click)="buttonClick.emit()">
      <span class="material-symbols-outlined">{{ icon() }}</span>
      @if (label()) {
        <span>{{ label() }}</span>
      }
    </button>
  `,
  styles: [],
})
export class ActionButtonComponent {
  icon = input.required<string>();
  label = input<string>("");
  variant = input<ActionVariant>("default");
  tooltip = input<string>("");
  buttonClick = output<void>();
}
