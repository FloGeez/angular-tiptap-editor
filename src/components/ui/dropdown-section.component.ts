import { Component, input, output, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-dropdown-section",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dropdown-section" [class.open]="isOpenValue()">
      <div
        class="dropdown-trigger"
        (click)="toggle()"
        (keydown.enter)="toggle()"
        (keydown.space)="toggle()"
        tabindex="0"
        role="button">
        <div class="trigger-left">
          @if (icon()) {
            <span class="material-symbols-outlined section-icon">{{ icon() }}</span>
          }
          <span class="section-title">{{ title() }}</span>
        </div>
        <span class="material-symbols-outlined chevron" [class.rotated]="isOpenValue()">
          keyboard_arrow_down
        </span>
      </div>

      <div class="dropdown-content" [class.open]="isOpenValue()">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [
    `
      .dropdown-section {
        position: relative;
        z-index: 10;
        border: 1px solid var(--app-border);
        border-radius: 12px;
        overflow: hidden;
        background: var(--app-surface);
        margin-bottom: 0.75rem;
      }

      .dropdown-section:last-child {
        margin-bottom: 0;
      }

      .dropdown-trigger {
        padding: 0.75rem 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        background: var(--app-header-bg);
        transition: background 0.2s ease;
        user-select: none;
      }

      .trigger-left {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .section-icon {
        font-size: 18px;
        color: var(--primary-color);
        opacity: 0.9;
      }

      .section-title {
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--text-primary);
      }

      .dropdown-trigger:hover {
        background: var(--app-surface-hover);
      }

      .chevron {
        font-size: 20px !important;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        color: var(--text-muted);
      }

      .chevron.rotated {
        transform: rotate(180deg);
        color: var(--primary-color);
      }

      .dropdown-content {
        max-height: 0;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        background: var(--app-surface);
        border-top: 1px solid var(--app-border);
        opacity: 0;
      }

      .dropdown-content.open {
        max-height: 2000px;
        opacity: 1;
      }
    `,
  ],
})
export class DropdownSectionComponent {
  title = input.required<string>();
  icon = input<string>("");
  defaultOpen = input<boolean>(false);
  externalControl = input<boolean | null>(null);

  openChange = output<boolean>();

  private internalOpen = signal(false);

  isOpenValue = computed(() => {
    const external = this.externalControl();
    return external !== null ? external : this.internalOpen();
  });

  constructor() {
    setTimeout(() => this.internalOpen.set(this.defaultOpen()), 0);
  }

  toggle() {
    const newValue = !this.isOpenValue();
    this.internalOpen.set(newValue);
    this.openChange.emit(newValue);
  }

  open() {
    this.internalOpen.set(true);
    this.openChange.emit(true);
  }

  close() {
    this.internalOpen.set(false);
    this.openChange.emit(false);
  }
}
