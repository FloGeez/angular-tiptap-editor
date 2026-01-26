import { Component, input, output, computed } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-height-slider",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="height-slider-card" [class.disabled]="disabled()">
      <div class="slider-header">
        <span class="material-symbols-outlined">{{ icon() }}</span>
        <span class="slider-label">{{ label() }}</span>
        @if (disabled()) {
          <span class="disabled-badge">N/A</span>
        } @else {
          <span class="app-count active">{{ value() }}px</span>
        }
      </div>

      <div class="app-slider-track">
        <input
          type="range"
          [min]="min()"
          [max]="max()"
          [value]="value()"
          [step]="step()"
          [disabled]="disabled()"
          class="app-slider-input"
          (input)="onSliderChange($event)"
          (change)="onSliderChange($event)" />
        <div class="app-slider-fill" [style.width.%]="disabled() ? 0 : fillPercentage()"></div>
        <div
          class="app-slider-thumb-visual"
          [style.left.%]="disabled() ? 0 : fillPercentage()"></div>
      </div>

      <div class="slider-footer">
        <label class="app-toggle" [class.disabled]="disabled()">
          <input
            type="checkbox"
            [checked]="isEnabled()"
            [disabled]="disabled()"
            (change)="toggleEnabled()" />
          <span></span>
        </label>
      </div>
    </div>
  `,
  styles: [
    `
      .height-slider-card {
        background: var(--app-surface);
        border-radius: 12px;
        padding: 1rem;
        border: 1px solid var(--app-border);
        transition: all 0.3s ease;
      }

      .height-slider-card:hover:not(.disabled) {
        border-color: var(--primary-color);
        box-shadow: 0 4px 12px rgba(var(--primary-color-rgb), 0.05);
      }

      .height-slider-card.disabled {
        opacity: 0.5;
        pointer-events: none;
      }

      .disabled-badge {
        font-size: 10px;
        font-weight: 700;
        color: var(--warning-text);
        background: var(--warning-bg);
        padding: 2px 8px;
        border-radius: 4px;
        text-transform: uppercase;
      }

      .slider-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 1.25rem;
      }

      .slider-header .material-symbols-outlined {
        font-size: 1.125rem;
        color: var(--primary-color);
      }

      .slider-label {
        flex: 1;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .slider-footer {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        margin-top: 0.5rem;
      }
    `,
  ],
})
export class HeightSliderComponent {
  // Inputs
  label = input.required<string>();
  icon = input.required<string>();
  value = input.required<number>();
  min = input<number>(100);
  max = input<number>(800);
  step = input<number>(10);
  isEnabled = input.required<boolean>();
  disabled = input<boolean>(false);

  // Outputs
  valueChange = output<number>();
  enabledChange = output<boolean>();

  // Computed
  fillPercentage = computed(() => {
    return ((this.value() - this.min()) / (this.max() - this.min())) * 100;
  });

  onSliderChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const newValue = parseInt(target.value, 10);
    this.valueChange.emit(newValue);
  }

  toggleEnabled() {
    this.enabledChange.emit(!this.isEnabled());
  }
}
