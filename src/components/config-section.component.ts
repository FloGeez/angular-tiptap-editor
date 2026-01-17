import { Component, inject, input, output } from "@angular/core";
import { ToggleSwitchComponent, SectionHeaderComponent, DropdownSectionComponent } from "./ui";
import { ConfigItem } from "../types/editor-config.types";
import { AppI18nService } from "../services/app-i18n.service";

@Component({
  selector: "app-config-section",
  standalone: true,
  imports: [ToggleSwitchComponent, SectionHeaderComponent, DropdownSectionComponent],
  template: `
    <section class="config-section" [class.enabled]="isEnabled()" [class.is-disabled]="disabled()">
      <app-section-header [title]="title()" [icon]="icon()">
        <app-toggle-switch
          [checked]="isEnabled()"
          (checkedChange)="toggleEnabled.emit()"
          [disabled]="disabled()"
        />
      </app-section-header>
 
      <div class="config-layout-grid" [class.collapsed]="!isEnabled()">
        <div class="config-connectivity-line"></div>
        <div class="config-content-area">
          <app-dropdown-section 
            [title]="appI18n.config().selectOptions + ' (' + activeCount() + ')'"
            [defaultOpen]="isDropdownOpen()"
          >
            <div class="config-items-grid">
              @for (item of items(); track item.key) {
              <label class="config-item-row">
                <input
                  type="checkbox"
                  class="config-checkbox"
                  [checked]="isItemActive(item.key)"
                  (change)="toggleItem.emit(item.key)"
                  [disabled]="disabled()"
                />
                <span class="config-checkmark"></span>
                <span class="config-item-label">
                  <span class="material-symbols-outlined">{{ item.icon }}</span>
                  <span>{{ item.label }}</span>
                </span>
              </label>
              }
            </div>
          </app-dropdown-section>
          
          <div class="extra-content">
            <ng-content />
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .config-section.is-disabled {
        opacity: 0.5;
        pointer-events: none;
        filter: grayscale(1);
      }

      .extra-content {
        margin-top: 0.5rem;
      }
    `,
  ],
})
export class ConfigSectionComponent {
  readonly appI18n = inject(AppI18nService);
 
  // Signal inputs
  title = input.required<string>();
  icon = input.required<string>();
  items = input.required<ConfigItem[]>();
  isEnabled = input.required<boolean>();
  activeCount = input.required<number>();
  isDropdownOpen = input.required<boolean>();
  itemCheckFunction = input.required<(key: string) => boolean>();
  disabled = input<boolean>(false);

  // Signal outputs
  toggleEnabled = output<void>();
  toggleDropdown = output<void>();
  toggleItem = output<string>();

  isItemActive(key: string): boolean {
    return this.itemCheckFunction()(key);
  }
}
