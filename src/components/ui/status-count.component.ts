import { Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-status-count",
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="app-count">{{ count() }}</span>
  `,
  styles: [],
})
export class StatusCountComponent {
  count = input.required<number>();
}
