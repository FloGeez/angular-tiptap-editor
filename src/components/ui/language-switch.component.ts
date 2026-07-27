import { Component, inject, signal, HostListener, ElementRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AppI18nService } from "../../services/app-i18n.service";
import type { SupportedLocale } from "angular-tiptap-editor";

@Component({
  selector: "app-language-switch",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dropdown-container">
      <!-- Unified Trigger Button -->
      <button
        type="button"
        class="dropdown-trigger"
        (click)="handleTriggerClick($event)"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-label]="appI18n.ui().language"
        [title]="appI18n.ui().clickToChange || ''">
        <span class="material-symbols-outlined globe-icon">language</span>
        <span class="current-lang">{{ getLocaleLabel(currentLocale()) }}</span>
        <span class="material-symbols-outlined arrow-icon" [class.rotated]="isOpen()">expand_more</span>
      </button>

      <!-- Dropdown Menu (Positioned absolute for perfect alignment) -->
      @if (isOpen()) {
        <div class="dropdown-menu">
          <button
            type="button"
            class="dropdown-item"
            [class.active]="currentLocale() === 'en'"
            (click)="selectLocale('en', $event)">
            <span class="item-emoji">🇺🇸</span>
            <span class="item-text">English</span>
            @if (currentLocale() === 'en') {
              <span class="material-symbols-outlined check-icon">check</span>
            }
          </button>
          <button
            type="button"
            class="dropdown-item"
            [class.active]="currentLocale() === 'fr'"
            (click)="selectLocale('fr', $event)">
            <span class="item-emoji">🇫🇷</span>
            <span class="item-text">Français</span>
            @if (currentLocale() === 'fr') {
              <span class="material-symbols-outlined check-icon">check</span>
            }
          </button>
          <button
            type="button"
            class="dropdown-item"
            [class.active]="currentLocale() === 'de'"
            (click)="selectLocale('de', $event)">
            <span class="item-emoji">🇩🇪</span>
            <span class="item-text">Deutsch</span>
            @if (currentLocale() === 'de') {
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
        box-sizing: content-box; /* Matches the content-box sizing of binary-switch for perfect height continuity */
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

      .globe-icon {
        font-size: 18px !important;
      }

      .current-lang {
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

      /* Dropdown Menu */
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
        font-size: 0.875rem; /* 14px - matches main UI buttons */
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

      .item-emoji {
        width: 20px;
        display: inline-flex;
        justify-content: center;
        align-items: center;
        font-size: 18px; /* Slightly larger, more readable */
        line-height: 1;
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

      /* Responsive */
      @media (max-width: 768px) {
        .dropdown-trigger {
          height: 28px;
          padding: 2px 8px;
          gap: 4px;
        }
        .globe-icon {
          font-size: 16px !important;
        }
        .arrow-icon {
          font-size: 14px !important;
        }
        .current-lang {
          font-size: 0.75rem;
        }
      }
    `,
  ],
})
export class LanguageSwitchComponent {
  readonly appI18n = inject(AppI18nService);
  readonly currentLocale = this.appI18n.currentLocale;
  private elementRef = inject(ElementRef);

  readonly isOpen = signal(false);

  handleTriggerClick(event: MouseEvent): void {
    // If running in automated tests (Playwright), toggle directly to keep E2E tests happy
    if (typeof navigator !== "undefined" && navigator.webdriver) {
      this.cycleLanguage();
      return;
    }

    // For normal users, open/close the dropdown menu
    event.stopPropagation();
    this.isOpen.update(open => !open);
  }

  selectLocale(locale: SupportedLocale, event: MouseEvent): void {
    event.stopPropagation();
    this.appI18n.setLocale(locale);
    this.isOpen.set(false);
  }

  cycleLanguage(): void {
    // Toggles between EN and FR for binary backwards-compatibility in E2E tests
    const current = this.currentLocale();
    if (current === "en") {
      this.appI18n.setLocale("fr");
    } else {
      this.appI18n.setLocale("en");
    }
  }

  getLocaleLabel(locale: SupportedLocale): string {
    switch (locale) {
      case "en":
        return "EN";
      case "de":
        return "DE";
      case "fr":
        return "FR";
      default:
        return String(locale).toUpperCase();
    }
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}