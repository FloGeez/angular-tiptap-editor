import { Component, input, output, computed } from "@angular/core";
import { CommonModule } from "@angular/common";

export interface SwitchOption {
  icon?: string;
  label?: string;
  emoji?: string;
}

export type SliderGradient = 'primary' | 'warning' | 'success' | 'custom';

@Component({
  selector: "app-binary-switch",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="binary-switch-container">
      <div
        class="binary-switch"
        [class.active-right]="isRight()"
        [style.width.px]="width()"
        (click)="toggle.emit()"
        [title]="tooltip()"
      >
        <div class="switch-options">
          <div
            class="switch-option"
            [class.active]="!isRight()"
          >
            @if (leftOption().emoji) {
              <span class="option-emoji">{{ leftOption().emoji }}</span>
            }
            @if (leftOption().icon) {
              <span class="material-symbols-outlined">{{ leftOption().icon }}</span>
            }
            @if (leftOption().label) {
              <span class="option-label">{{ leftOption().label }}</span>
            }
          </div>
          <div
            class="switch-option"
            [class.active]="isRight()"
          >
            @if (rightOption().emoji) {
              <span class="option-emoji">{{ rightOption().emoji }}</span>
            }
            @if (rightOption().icon) {
              <span class="material-symbols-outlined">{{ rightOption().icon }}</span>
            }
            @if (rightOption().label) {
              <span class="option-label">{{ rightOption().label }}</span>
            }
          </div>
        </div>
        <div
          class="switch-slider"
          [class.slide-right]="isRight()"
          [class.gradient-primary]="sliderGradient() === 'primary'"
          [class.gradient-warning]="sliderGradient() === 'warning'"
          [class.gradient-success]="sliderGradient() === 'success'"
          [class.gradient-dynamic]="sliderGradient() === 'custom'"
          [style.--left-gradient]="leftGradient()"
          [style.--right-gradient]="rightGradient()"
        ></div>
      </div>
    </div>
  `,
  styles: [
    `
      .binary-switch-container {
        display: flex;
        align-items: center;
      }

      .binary-switch {
        position: relative;
        display: flex;
        background: var(--switch-bg);
        border-radius: 8px;
        padding: 2px;
        height: 32px;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
        cursor: pointer;
        border: 1px solid var(--app-border);
      }

      .binary-switch:hover {
        background: var(--app-surface-hover);
      }

      .switch-options {
        display: flex;
        width: 100%;
        z-index: 2;
        position: relative;
      }

      .switch-option {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1px;
        transition: all 0.3s ease;
        border-radius: 6px;
        position: relative;
        color: var(--text-secondary);
        pointer-events: none;
      }

      .switch-option.active {
        color: white;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      }

      .switch-option .material-symbols-outlined {
        font-size: 18px;
      }

      .option-emoji {
        font-size: 12px;
        line-height: 1;
      }

      .option-label {
        font-size: 0.6rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .switch-slider {
        position: absolute;
        top: 2px;
        left: 2px;
        width: calc(50% - 2px);
        height: calc(100% - 4px);
        border-radius: 6px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 1;
      }

      /* Gradient variants */
      .switch-slider.gradient-primary {
        background: var(--primary-gradient);
        box-shadow: 0 1px 4px rgba(99, 102, 241, 0.3);
      }

      .switch-slider.gradient-warning {
        background: var(--warning-gradient);
        box-shadow: 0 1px 4px rgba(245, 158, 11, 0.3);
      }

      .switch-slider.gradient-success {
        background: var(--success-gradient);
        box-shadow: 0 1px 4px rgba(16, 185, 129, 0.3);
      }

      /* Dynamic gradient for theme switch (changes on slide) */
      .switch-slider.gradient-dynamic {
        background: var(--left-gradient, var(--warning-gradient));
        box-shadow: 0 1px 4px rgba(245, 158, 11, 0.3);
      }

      .switch-slider.gradient-dynamic.slide-right {
        background: var(--right-gradient, var(--primary-gradient));
        box-shadow: 0 1px 4px rgba(var(--primary-color-rgb), 0.3);
      }

      .switch-slider.slide-right {
        transform: translateX(100%);
      }

      /* Responsive */
      @media (max-width: 768px) {
        .binary-switch {
          height: 28px;
        }

        .switch-option .material-symbols-outlined {
          font-size: 16px;
        }

        .option-emoji {
          font-size: 10px;
        }

        .option-label {
          font-size: 0.55rem;
        }
      }

      @media (max-width: 480px) {
        .binary-switch {
          height: 26px;
        }

        .switch-option .material-symbols-outlined {
          font-size: 14px;
        }

        .option-emoji {
          font-size: 9px;
        }

        .option-label {
          font-size: 0.5rem;
        }
      }

      /* Dark mode support - Now handled by global variables */
    `,
  ],
})
export class BinarySwitchComponent {
  // Inputs
  leftOption = input.required<SwitchOption>();
  rightOption = input.required<SwitchOption>();
  isRight = input.required<boolean>();
  tooltip = input<string>("");
  width = input<number>(68);
  sliderGradient = input<SliderGradient>("primary");
  leftGradient = input<string>("var(--warning-gradient)");
  rightGradient = input<string>("var(--primary-gradient)");

  // Output
  toggle = output<void>();
}
