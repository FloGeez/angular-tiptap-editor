import { Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";

type InfoVariant = "info" | "warning" | "success";

@Component({
  selector: "app-info-box",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="app-alert" [class]="variant()">
      <span class="material-symbols-outlined app-alert-icon">{{ iconName() }}</span>
      <p class="app-alert-content">
        <ng-content></ng-content>
      </p>
    </div>
  `,
  styles: [],
})
export class InfoBoxComponent {
  variant = input<InfoVariant>("info");
  icon = input<string>("");

  iconName() {
    if (this.icon()) return this.icon();
    switch (this.variant()) {
      case "warning":
        return "warning";
      case "success":
        return "check_circle";
      default:
        return "info";
    }
  }
}
