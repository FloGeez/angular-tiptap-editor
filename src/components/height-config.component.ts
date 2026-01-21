import { Component, inject, computed, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  HeightSliderComponent,
  SectionHeaderComponent,
  DropdownSectionComponent,
  InfoBoxComponent,
  StatusCountComponent,
} from "./ui";
import { EditorConfigurationService } from "../services/editor-configuration.service";
import { AppI18nService } from "../services/app-i18n.service";

@Component({
  selector: "app-height-config",
  standalone: true,
  imports: [
    CommonModule,
    HeightSliderComponent,
    SectionHeaderComponent,
    DropdownSectionComponent,
    InfoBoxComponent,
    StatusCountComponent,
  ],
  template: `
    <section class="config-section" [class.is-disabled]="disabled()">
      <app-section-header [title]="appI18n.config().height" icon="height">
        <app-status-count [count]="activeCount()" />
      </app-section-header>

      <div class="config-layout-grid">
        <div class="config-connectivity-line"></div>
        <div class="config-content-area">
          <app-dropdown-section [title]="appI18n.config().heightSettings + ' (' + activeCount() + ')'">
            @if (isFillContainerActive()) {
              <app-info-box variant="warning">{{ fillContainerInfo() }}</app-info-box>
            }

            <div class="sliders-container">
              <!-- Slider pour hauteur fixe -->
              <app-height-slider
                [label]="appI18n.items().fixedHeight"
                icon="height"
                [value]="fixedHeightValue()"
                [min]="150"
                [max]="600"
                [step]="10"
                [isEnabled]="isFixedHeightEnabled()"
                [disabled]="isFillContainerActive() || disabled()"
                (valueChange)="onFixedHeightChange($event)"
                (enabledChange)="onFixedHeightToggle($event)" />

              <!-- Slider pour hauteur maximale -->
              <app-height-slider
                [label]="appI18n.items().maxHeight"
                icon="vertical_align_top"
                [value]="maxHeightValue()"
                [min]="200"
                [max]="800"
                [step]="10"
                [isEnabled]="isMaxHeightEnabled()"
                [disabled]="disabled()"
                (valueChange)="onMaxHeightChange($event)"
                (enabledChange)="onMaxHeightToggle($event)" />
            </div>

            <app-info-box>{{ appI18n.messages().heightConfigInfo }}</app-info-box>
          </app-dropdown-section>
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

      .sliders-container {
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      /* Dark mode support - Now handled by global variables */
    `,
  ],
})
export class HeightConfigComponent {
  private configService = inject(EditorConfigurationService);
  readonly appI18n = inject(AppI18nService);

  disabled = input<boolean>(false);

  readonly editorState = this.configService.editorState;

  // Détection de fillContainer
  readonly isFillContainerActive = computed(() => this.editorState().fillContainer);

  readonly fillContainerInfo = computed(() => {
    return this.appI18n.currentLocale() === "fr"
      ? 'La hauteur fixe est ignorée avec "Remplir le conteneur". La hauteur max reste fonctionnelle.'
      : 'Fixed height is ignored with "Fill Container". Max height still works.';
  });

  readonly activeCount = computed(() => {
    const state = this.editorState();
    let count = 0;
    if (state.height !== undefined) count++;
    if (state.maxHeight !== undefined) count++;
    return count;
  });

  // Computed values pour les sliders
  readonly fixedHeightValue = computed(() => {
    return this.editorState().height || 300;
  });

  readonly maxHeightValue = computed(() => {
    return this.editorState().maxHeight || 400;
  });

  readonly isFixedHeightEnabled = computed(() => {
    return this.editorState().height !== undefined;
  });

  readonly isMaxHeightEnabled = computed(() => {
    return this.editorState().maxHeight !== undefined;
  });

  // Event handlers
  onFixedHeightChange(value: number) {
    this.configService.updateEditorState({
      height: value,
    });
  }

  onFixedHeightToggle(enabled: boolean) {
    this.configService.updateEditorState({
      height: enabled ? this.fixedHeightValue() : undefined,
    });
  }

  onMaxHeightChange(value: number) {
    this.configService.updateEditorState({
      maxHeight: value,
    });
  }

  onMaxHeightToggle(enabled: boolean) {
    this.configService.updateEditorState({
      maxHeight: enabled ? this.maxHeightValue() : undefined,
    });
  }
}
