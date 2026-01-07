import { Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-status-badge",
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="app-badge" [class.active]="active()">
      {{ label() }}
    </span>
  `,
  styles: [],
})
export class StatusBadgeComponent {
  label = input.required<string>();
  active = input<boolean>(false);
}
