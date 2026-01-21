import { Component, input, output, ChangeDetectionStrategy } from "@angular/core";

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
  selector: "ate-button",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="ate-button"
      [class.is-active]="active()"
      [class.is-disabled]="disabled()"
      [class.text-button]="variant() === 'text'"
      [class.danger]="variant() === 'danger'"
      [class.small]="size() === 'small'"
      [class.medium]="size() === 'medium'"
      [class.large]="size() === 'large'"
      [class.has-custom-color]="!!color()"
      [class.has-custom-bg]="!!backgroundColor()"
      [disabled]="disabled()"
      [style.color]="color()"
      [style.background-color]="backgroundColor()"
      [attr.title]="title()"
      [attr.aria-label]="title()"
      (mousedown)="onMouseDown($event)"
      (click)="buttonClick.emit($event)"
      type="button">
      @if (icon()) {
        <span
          class="material-symbols-outlined"
          [class.icon-small]="iconSize() === 'small'"
          [class.icon-medium]="iconSize() === 'medium'"
          [class.icon-large]="iconSize() === 'large'"
          >{{ icon() }}</span
        >
      }
      <ng-content></ng-content>
    </button>
  `,
  styles: [
    `
      /* Styles de base pour les boutons Tiptap */
      .ate-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        border-radius: var(--ate-sub-border-radius, 8px);
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        color: var(--ate-toolbar-button-color, var(--ate-text-secondary));
        position: relative;
        overflow: hidden;
      }

      .ate-button::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--ate-primary);
        opacity: 0;
        transition: opacity 0.2s ease;
        border-radius: var(--ate-sub-border-radius, 8px);
      }

      .ate-button:hover:not(.has-custom-color) {
        color: var(--ate-toolbar-button-active-color, var(--ate-primary));
        background: var(--ate-toolbar-button-hover-background, transparent);
        transform: translateY(-1px);
      }

      /* If has custom color, we still want the hover background but not the color change */
      .ate-button.has-custom-color:hover:not(.has-custom-bg) {
        background: var(--ate-toolbar-button-hover-background, transparent);
        transform: translateY(-1px);
      }

      .ate-button.has-custom-bg:hover {
        transform: translateY(-1px);
        filter: brightness(0.9);
      }

      .ate-button:hover::before {
        opacity: 0.1;
      }

      .ate-button:active {
        transform: translateY(0);
      }

      .ate-button.is-active:not(.has-custom-color) {
        color: var(--ate-toolbar-button-active-color, var(--ate-primary));
        background: var(--ate-toolbar-button-active-background, var(--ate-primary-light));
      }

      /* If has custom color and active, prioritize the custom color */
      .ate-button.is-active.has-custom-color {
        background: var(--ate-toolbar-button-active-background, var(--ate-primary-light));
      }

      .ate-button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        pointer-events: none;
      }

      /* Icônes Material Symbols */
      .ate-button .material-symbols-outlined {
        font-size: 20px;
        position: relative;
        z-index: 1;
      }

      .ate-button .material-symbols-outlined.icon-small {
        font-size: 16px;
      }

      .ate-button .material-symbols-outlined.icon-medium {
        font-size: 20px;
      }

      .ate-button .material-symbols-outlined.icon-large {
        font-size: 24px;
      }

      /* Boutons avec texte */
      .ate-button.text-button {
        width: auto;
        padding: 0 12px;
        font-size: 14px;
        font-weight: 500;
        gap: 8px;
      }

      /* Boutons de couleur */
      .ate-button.color-button {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid transparent;
        transition: all 0.2s ease;
      }

      .ate-button.color-button:hover {
        border-color: var(--ate-border);
        transform: scale(1.1);
      }

      .ate-button.color-button.is-active {
        border-color: var(--ate-primary);
        box-shadow: 0 0 0 2px var(--ate-primary-light);
      }

      /* Boutons avec variantes */
      .ate-button.danger {
        color: var(--ate-error-color, #ef4444);
      }

      .ate-button.danger:hover {
        color: var(--ate-error-color, #ef4444);
        background: var(--ate-error-bg, rgba(239, 68, 68, 0.1));
      }

      .ate-button.danger::before {
        background: var(--ate-error-color, #ef4444);
      }

      /* Boutons de taille différente */
      .ate-button.small {
        width: 24px;
        height: 24px;
      }

      .ate-button.medium {
        width: 32px;
        height: 32px;
      }

      .ate-button.large {
        width: 40px;
        height: 40px;
      }

      /* Animation de pulsation pour les boutons actifs */
      @keyframes pulse {
        0%,
        100% {
          box-shadow: 0 0 0 0 var(--ate-primary-light-alpha);
        }
        50% {
          box-shadow: 0 0 0 4px transparent;
        }
      }

      .ate-button.is-active.pulse {
        animation: pulse 2s infinite;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .ate-button {
          width: 32px;
          height: 32px;
        }

        .ate-button .material-symbols-outlined {
          font-size: 18px;
        }

        .ate-button.text-button {
          padding: 0 8px;
          font-size: 13px;
        }
      }
    `,
  ],
})
export class TiptapButtonComponent {
  // Inputs
  icon = input<string>("");
  title = input.required<string>();
  active = input(false);
  disabled = input(false);
  color = input<string>();
  backgroundColor = input<string>();
  variant = input<"default" | "text" | "danger">("default");
  size = input<"small" | "medium" | "large">("medium");
  iconSize = input<"small" | "medium" | "large">("medium");

  // Outputs
  buttonClick = output<Event>();

  onMouseDown(event: MouseEvent) {
    event.preventDefault();
  }
}
