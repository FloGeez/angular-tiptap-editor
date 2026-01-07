import { Component, input, output } from "@angular/core";

export interface TiptapButtonConfig {
  icon: string;
  title: string;
  active?: boolean;
  disabled?: boolean;
  variant?: "default" | "text" | "danger";
  size?: "small" | "medium" | "large";
  iconSize?: "small" | "medium" | "large";
}

@Component({
  selector: "tiptap-button",
  standalone: true,
  template: `
    <button
      class="tiptap-button"
      [class.is-active]="active()"
      [class.is-disabled]="disabled()"
      [class.text-button]="variant() === 'text'"
      [class.danger]="variant() === 'danger'"
      [class.small]="size() === 'small'"
      [class.medium]="size() === 'medium'"
      [class.large]="size() === 'large'"
      [disabled]="disabled()"
      [style.color]="color()"
      [attr.title]="title()"
      (mousedown)="onMouseDown($event)"
      (click)="onClick.emit($event)"
      type="button"
    >
      <span
        class="material-symbols-outlined"
        [class.icon-small]="iconSize() === 'small'"
        [class.icon-medium]="iconSize() === 'medium'"
        [class.icon-large]="iconSize() === 'large'"
        >{{ icon() }}</span
      >
      <ng-content></ng-content>
    </button>
  `,
  styles: [
    `
      /* Styles de base pour les boutons Tiptap */
      .tiptap-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        color: #64748b;
        position: relative;
        overflow: hidden;
      }

      .tiptap-button::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        opacity: 0;
        transition: opacity 0.2s ease;
        border-radius: 8px;
      }

      .tiptap-button:hover {
        color: #6366f1;
        transform: translateY(-1px);
      }

      .tiptap-button:hover::before {
        opacity: 0.1;
      }

      .tiptap-button:active {
        transform: translateY(0);
      }

      .tiptap-button.is-active {
        color: #6366f1;
        background: rgba(99, 102, 241, 0.1);
      }

      .tiptap-button.is-active::before {
        opacity: 0.15;
      }

      .tiptap-button.is-active:hover {
        background: rgba(99, 102, 241, 0.15);
      }

      .tiptap-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
      }

      .tiptap-button:disabled:hover {
        transform: none;
        color: #64748b;
      }

      .tiptap-button:disabled::before {
        opacity: 0;
      }

      /* Icônes Material Symbols */
      .tiptap-button .material-symbols-outlined {
        font-size: 20px;
        position: relative;
        z-index: 1;
      }

      .tiptap-button .material-symbols-outlined.icon-small {
        font-size: 16px;
      }

      .tiptap-button .material-symbols-outlined.icon-medium {
        font-size: 20px;
      }

      .tiptap-button .material-symbols-outlined.icon-large {
        font-size: 24px;
      }

      /* Boutons avec texte */
      .tiptap-button.text-button {
        width: auto;
        padding: 0 12px;
        font-size: 14px;
        font-weight: 500;
      }

      /* Boutons de couleur */
      .tiptap-button.color-button {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid transparent;
        transition: all 0.2s ease;
      }

      .tiptap-button.color-button:hover {
        border-color: #e2e8f0;
        transform: scale(1.1);
      }

      .tiptap-button.color-button.is-active {
        border-color: #6366f1;
        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
      }

      /* Boutons avec variantes */
      .tiptap-button.primary {
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: white;
      }

      .tiptap-button.primary:hover {
        background: linear-gradient(135deg, #5b21b6, #7c3aed);
        color: white;
      }

      .tiptap-button.secondary {
        background: #f1f5f9;
        color: #64748b;
      }

      .tiptap-button.secondary:hover {
        background: #e2e8f0;
        color: #475569;
      }

      .tiptap-button.danger {
        color: #ef4444;
      }

      .tiptap-button.danger:hover {
        color: #dc2626;
        background: rgba(239, 68, 68, 0.1);
      }

      .tiptap-button.danger::before {
        background: linear-gradient(135deg, #ef4444, #dc2626);
      }

      /* Boutons de taille différente */
      .tiptap-button.small {
        width: 24px;
        height: 24px;
      }

      .tiptap-button.medium {
        width: 32px;
        height: 32px;
      }

      .tiptap-button.large {
        width: 40px;
        height: 40px;
      }

      /* Boutons avec badge */
      .tiptap-button.has-badge {
        position: relative;
      }

      .tiptap-button .badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #ef4444;
        color: white;
        font-size: 10px;
        padding: 2px 4px;
        border-radius: 8px;
        min-width: 16px;
        text-align: center;
        line-height: 1;
      }

      /* Boutons avec tooltip */
      .tiptap-button.has-tooltip {
        position: relative;
      }

      .tiptap-button .tooltip {
        position: absolute;
        bottom: -30px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        opacity: 0;
        visibility: hidden;
        transition: all 0.2s ease;
        z-index: 1000;
      }

      .tiptap-button:hover .tooltip {
        opacity: 1;
        visibility: visible;
      }

      /* Animation de pulsation pour les boutons actifs */
      @keyframes pulse {
        0%,
        100% {
          box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4);
        }
        50% {
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0);
        }
      }

      .tiptap-button.is-active.pulse {
        animation: pulse 2s infinite;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .tiptap-button {
          width: 32px;
          height: 32px;
        }

        .tiptap-button .material-symbols-outlined {
          font-size: 18px;
        }

        .tiptap-button.text-button {
          padding: 0 8px;
          font-size: 13px;
        }
      }
    `,
  ],
})
export class TiptapButtonComponent {
  // Inputs
  icon = input.required<string>();
  title = input.required<string>();
  active = input(false);
  disabled = input(false);
  color = input<string>();
  variant = input<"default" | "text" | "danger">("default");
  size = input<"small" | "medium" | "large">("medium");
  iconSize = input<"small" | "medium" | "large">("medium");

  // Outputs
  onClick = output<Event>();

  onMouseDown(event: MouseEvent) {
    event.preventDefault();
  }
}
