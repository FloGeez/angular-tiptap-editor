import { Component, inject, signal, computed, HostListener, ElementRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { EditorConfigurationService } from "../../services/editor-configuration.service";
import { AppI18nService } from "../../services/app-i18n.service";
import { IconSetKey } from "../../config/icon-sets.config";

@Component({
  selector: "app-icon-set-switch",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dropdown-container">
      <button
        type="button"
        class="dropdown-trigger"
        data-testid="icon-set-trigger"
        (click)="handleTriggerClick($event)"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-label]="appI18n.theme().iconSet"
        [title]="appI18n.theme().iconSet">
        <span class="material-symbols-outlined trigger-icon">interests</span>
        <span class="current-set">{{ activeSetShortName() }}</span>
        <span class="material-symbols-outlined arrow-icon" [class.rotated]="isOpen()"
          >expand_more</span
        >
      </button>

      @if (isOpen()) {
        <div class="dropdown-menu">
          <button
            type="button"
            class="dropdown-item"
            [class.active]="activeIconSet() === 'material'"
            (click)="selectIconSet('material', $event)">
            <span class="item-text">Material Symbols</span>
            @if (activeIconSet() === "material") {
              <span class="material-symbols-outlined check-icon">check</span>
            }
          </button>
          <button
            type="button"
            class="dropdown-item"
            [class.active]="activeIconSet() === 'ate'"
            (click)="selectIconSet('ate', $event)">
            <span class="item-text">/ATE Stroke</span>
            @if (activeIconSet() === "ate") {
              <span class="material-symbols-outlined check-icon">check</span>
            }
          </button>
          <button
            type="button"
            class="dropdown-item"
            [class.active]="activeIconSet() === 'lucide'"
            (click)="selectIconSet('lucide', $event)">
            <span class="item-text">Lucide</span>
            @if (activeIconSet() === "lucide") {
              <span class="material-symbols-outlined check-icon">check</span>
            }
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }

      .dropdown-container {
        position: relative;
        display: inline-block;
      }

      .dropdown-trigger {
        display: inline-flex;
        align-items: center;
        background: var(--switch-bg);
        border: 1px solid var(--app-border);
        border-radius: 8px;
        height: 32px;
        padding: 2px 10px;
        box-sizing: content-box;
        gap: 6px;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
        color: var(--text-secondary);
        cursor: pointer;
        outline: none;
        transition:
          border-color 0.2s ease,
          background-color 0.2s ease,
          color 0.2s ease;
      }

      .dropdown-trigger:hover {
        background: var(--app-surface-hover);
        border-color: var(--primary-color);
        color: var(--text-primary);
      }

      .dropdown-trigger:focus-visible {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb), 0.16);
      }

      .trigger-icon {
        font-size: 18px !important;
      }

      .current-set {
        font-size: 0.8rem;
        font-weight: 600;
        letter-spacing: 0.5px;
      }

      .arrow-icon {
        font-size: 16px !important;
        transition: transform 0.2s ease;
      }

      .arrow-icon.rotated {
        transform: rotate(180deg);
      }

      .dropdown-menu {
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        min-width: 160px;
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: 8px;
        padding: 6px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 4px;
        animation: slideDown 0.15s ease-out;
      }

      .dropdown-item {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 8px 12px;
        border: none;
        background: transparent;
        color: var(--text-secondary);
        font-size: 0.875rem;
        font-weight: 500;
        border-radius: 6px;
        cursor: pointer;
        text-align: left;
        transition:
          background-color 0.15s ease,
          color 0.15s ease;
      }

      .dropdown-item:hover {
        background: var(--app-surface-hover);
        color: var(--text-primary);
      }

      .dropdown-item.active {
        background: rgba(var(--primary-color-rgb), 0.08);
        color: var(--primary-color);
        font-weight: 600;
      }

      .item-text {
        flex: 1;
      }

      .check-icon {
        font-size: 16px !important;
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 768px) {
        .dropdown-trigger {
          height: 28px;
          padding: 2px 8px;
          gap: 4px;
        }
        .trigger-icon {
          font-size: 16px !important;
        }
        .arrow-icon {
          font-size: 14px !important;
        }
        .current-set {
          font-size: 0.75rem;
        }
      }
    `,
  ],
})
export class IconSetSwitchComponent {
  private configService = inject(EditorConfigurationService);
  readonly appI18n = inject(AppI18nService);
  private elementRef = inject(ElementRef);

  readonly isOpen = signal(false);

  readonly activeIconSet = computed(() => this.configService.editorState().iconSet);

  readonly activeSetShortName = computed(() => {
    switch (this.activeIconSet()) {
      case "ate":
        return "/ATE";
      case "lucide":
        return "Lucide";
      default:
        return "Material";
    }
  });

  handleTriggerClick(event: MouseEvent): void {
    event.stopPropagation();
    this.isOpen.update(open => !open);
  }

  selectIconSet(setKey: IconSetKey, event: MouseEvent): void {
    event.stopPropagation();
    this.configService.setIconSet(setKey);
    this.isOpen.set(false);
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  @HostListener("document:keydown.escape")
  onEscape(): void {
    this.isOpen.set(false);
  }
}
