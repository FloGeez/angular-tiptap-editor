import { Component, inject, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SectionHeaderComponent, ToggleSwitchComponent } from "./ui";
import { EditorConfigurationService } from "../services/editor-configuration.service";
import { AppI18nService } from "../services/app-i18n.service";
import { AteTocVariant } from "angular-tiptap-editor";

@Component({
  selector: "app-toc-config",
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent, ToggleSwitchComponent],
  template: `
    <div class="config-section" [class.enabled]="tocConfig().enabled" [class.is-disabled]="disabled()">
      <app-section-header
        icon="format_list_bulleted"
        [title]="appI18n.translations().config.tableOfContents">
        <app-toggle-switch
          [checked]="tocConfig().enabled"
          (checkedChange)="toggleEnabled()"
          [disabled]="disabled()" />
      </app-section-header>

      <div class="config-layout-grid" [class.collapsed]="!tocConfig().enabled">
        <div class="config-connectivity-line"></div>
        <div class="config-content-area">
          <div class="toc-controls">
            <!-- Toggle Floating vs Inline -->
            <label class="toggle-row">
              <span class="toggle-label">{{ appI18n.translations().config.tocFloating }}</span>
              <app-toggle-switch
                [checked]="tocConfig().floating"
                (checkedChange)="toggleFloating()" />
            </label>

            <!-- Toggle Hover Expansion (Notion style) -->
            <label class="toggle-row">
              <span class="toggle-label">{{ appI18n.translations().config.tocHoverExpand }}</span>
              <app-toggle-switch
                [checked]="tocConfig().hoverExpand"
                (checkedChange)="toggleHoverExpand()" />
            </label>

            <!-- Toggle Show Title -->
            <label class="toggle-row">
              <span class="toggle-label">{{ appI18n.translations().config.tocShowTitle }}</span>
              <app-toggle-switch
                [checked]="tocConfig().showTitle"
                (checkedChange)="toggleShowTitle()" />
            </label>

            @if (tocConfig().floating) {
              <!-- Floating Position -->
              <div class="control-group">
                <span class="control-title">{{ appI18n.translations().config.tocPosition }}</span>
                <div class="variant-grid">
                  <button
                    type="button"
                    class="variant-card"
                    [class.active]="tocConfig().position === 'left'"
                    (click)="updatePosition('left')">
                    <span class="variant-label">[Left]</span>
                  </button>
                  <button
                    type="button"
                    class="variant-card"
                    [class.active]="tocConfig().position === 'right'"
                    (click)="updatePosition('right')">
                    <span class="variant-label">[Right]</span>
                  </button>
                </div>
              </div>
            }

            <!-- Visual Variant -->
            <div class="control-group">
              <span class="control-title">{{ appI18n.translations().config.tocVariant }}</span>
              <div class="variant-grid three-cols">
                <button
                  type="button"
                  class="variant-card"
                  [class.active]="tocConfig().variant === 'card'"
                  (click)="updateVariant('card')">
                  <span class="variant-label">Card</span>
                </button>
                <button
                  type="button"
                  class="variant-card"
                  [class.active]="tocConfig().variant === 'transparent'"
                  (click)="updateVariant('transparent')">
                  <span class="variant-label">Clear</span>
                </button>
                <button
                  type="button"
                  class="variant-card"
                  [class.active]="tocConfig().variant === 'minimal'"
                  (click)="updateVariant('minimal')">
                  <span class="variant-label">Minimal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .config-section {
        border-bottom: 1px solid var(--app-border);
      }

      .config-section.is-disabled {
        opacity: 0.5;
        pointer-events: none;
        filter: grayscale(1);
      }

      .toc-controls {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        user-select: none;
      }

      .toggle-label {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--text-secondary);
      }

      .control-group {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        margin-top: 0.25rem;
      }

      .control-title {
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .variant-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.5rem;
      }

      .variant-grid.three-cols {
        grid-template-columns: repeat(3, 1fr);
      }

      .variant-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 0.5rem 0.25rem;
        background: var(--app-bg);
        border: 1px solid var(--app-border);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        color: var(--text-secondary);
      }

      .variant-card:hover {
        border-color: var(--primary-color);
        background: var(--app-surface);
      }

      .variant-card.active {
        background: var(--primary-light);
        border-color: var(--primary-color);
        color: var(--primary-color);
      }

      .variant-label {
        font-size: 0.65rem;
        font-weight: 600;
        text-align: center;
      }
    `,
  ],
})
export class TocConfigComponent {
  private configService = inject(EditorConfigurationService);
  readonly appI18n = inject(AppI18nService);
  readonly tocConfig = this.configService.tocConfig;

  disabled = input<boolean>(false);

  toggleEnabled() {
    this.configService.updateTocConfig({ enabled: !this.tocConfig().enabled });
  }

  toggleFloating() {
    this.configService.updateTocConfig({ floating: !this.tocConfig().floating });
  }

  toggleHoverExpand() {
    this.configService.updateTocConfig({ hoverExpand: !this.tocConfig().hoverExpand });
  }

  toggleShowTitle() {
    this.configService.updateTocConfig({ showTitle: !this.tocConfig().showTitle });
  }

  updatePosition(position: "right" | "left") {
    this.configService.updateTocConfig({ position });
  }

  updateVariant(variant: AteTocVariant) {
    this.configService.updateTocConfig({ variant });
  }
}
