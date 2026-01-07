import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";

type ButtonVariant = 'default' | 'secondary' | 'danger';

@Component({
  selector: "app-panel-button",
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      class="panel-btn"
      [class.secondary]="variant() === 'secondary'"
      [class.danger]="variant() === 'danger'"
      [title]="tooltip()"
      (click)="onClick.emit()"
    >
      <span class="material-symbols-outlined">{{ icon() }}</span>
    </button>
  `,
  styles: [
    `
      .panel-btn {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        color: var(--primary-color);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .panel-btn .material-symbols-outlined {
        font-size: 18px;
      }

      .panel-btn.secondary {
        color: var(--text-secondary);
      }

      .panel-btn.danger {
        color: var(--error-color);
      }

      .panel-btn:hover {
        background: var(--app-surface-hover);
      }

      /* Dark mode support - Now handled by global variables */
    `,
  ],
})
export class PanelButtonComponent {
  icon = input.required<string>();
  variant = input<ButtonVariant>('default');
  tooltip = input<string>('');
  onClick = output<void>();
}
