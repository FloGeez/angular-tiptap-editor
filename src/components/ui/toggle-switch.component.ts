import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-toggle-switch",
  standalone: true,
  imports: [CommonModule],
  template: `
    <label class="app-toggle">
      <input
        type="checkbox"
        [checked]="checked()"
        (change)="onChange()"
      />
      <span></span>
    </label>
  `,
  styles: [],
})
export class ToggleSwitchComponent {
  checked = input<boolean>(false);
  checkedChange = output<boolean>();

  onChange() {
    this.checkedChange.emit(!this.checked());
  }
}
