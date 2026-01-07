import { Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-section-header",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="section-header">
      <div class="section-title">
        <span class="material-symbols-outlined">{{ icon() }}</span>
        <span>{{ title() }}</span>
      </div>
      <div class="section-status">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [
    `
      .section-header {
        padding: 1rem 1.25rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--app-header-bg);
        position: sticky;
        top: 0;
        z-index: 5;
      }

      .section-title {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        font-weight: 600;
        color: var(--text-primary);
        font-size: 0.85rem;
      }

      .section-title .material-symbols-outlined {
        font-size: 18px;
        color: var(--primary-color);
        opacity: 0.8;
      }

      .section-status {
        display: flex;
        align-items: center;
      }

      /* Dark mode support - Now handled by global variables */
    `,
  ],
})
export class SectionHeaderComponent {
  title = input.required<string>();
  icon = input.required<string>();
}
