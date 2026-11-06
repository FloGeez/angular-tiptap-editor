import { Component, inject, computed, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ToggleSwitchComponent, SectionHeaderComponent } from "./ui";
import { EditorConfigurationService } from "../services/editor-configuration.service";
import { AppI18nService } from "../services/app-i18n.service";

@Component({
  selector: "app-table-column-config",
  standalone: true,
  imports: [CommonModule, ToggleSwitchComponent, SectionHeaderComponent],
  template: `
    <section
      class="config-section"
      data-testid="table-column-config"
      [class.enabled]="isAnyEnabled()"
      [class.is-disabled]="disabled()">
      <app-section-header [title]="appI18n.config().tableColumns" icon="table_chart">
        <app-toggle-switch
          [checked]="isAnyEnabled()"
          (checkedChange)="toggleBoth()"
          [disabled]="disabled()" />
      </app-section-header>

      <div class="config-layout-grid" [class.collapsed]="!isAnyEnabled()">
        <div class="config-connectivity-line"></div>
        <div class="config-content-area">
          <div class="config-items-grid">
            <!-- Enable Table Sort -->
            <label class="config-item-row">
              <input
                type="checkbox"
                class="config-checkbox"
                [checked]="enableSort()"
                (change)="toggleSort()"
                [disabled]="disabled()" />
              <span class="config-checkmark"></span>
              <span class="config-item-label">
                <span class="material-symbols-outlined">swap_vert</span>
                <span>{{ appI18n.config().enableTableSort }}</span>
              </span>
            </label>

            <!-- Enable Table Filter -->
            <label class="config-item-row">
              <input
                type="checkbox"
                class="config-checkbox"
                [checked]="enableFilter()"
                (change)="toggleFilter()"
                [disabled]="disabled()" />
              <span class="config-checkmark"></span>
              <span class="config-item-label">
                <span class="material-symbols-outlined">filter_alt</span>
                <span>{{ appI18n.config().enableTableFilter }}</span>
              </span>
            </label>
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
    `,
  ],
})
export class TableColumnConfigComponent {
  private configService = inject(EditorConfigurationService);
  readonly appI18n = inject(AppI18nService);

  disabled = input<boolean>(false);

  readonly state = this.configService.editorState;
  readonly enableSort = computed(() => this.state().enableTableSort);
  readonly enableFilter = computed(() => this.state().enableTableFilter);
  readonly isAnyEnabled = computed(() => this.enableSort() || this.enableFilter());

  toggleBoth() {
    const next = !this.isAnyEnabled();
    this.configService.updateEditorState({
      enableTableSort: next,
      enableTableFilter: next,
    });
  }

  toggleSort() {
    this.configService.updateEditorState({
      enableTableSort: !this.enableSort(),
    });
  }

  toggleFilter() {
    this.configService.updateEditorState({
      enableTableFilter: !this.enableFilter(),
    });
  }
}
