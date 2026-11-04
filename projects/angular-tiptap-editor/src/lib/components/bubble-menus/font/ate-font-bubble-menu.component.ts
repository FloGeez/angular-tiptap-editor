import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { Instance as TippyInstance } from "tippy.js";
import { AteFontEditMode, AteFontService } from "../../../services/ate-font.service";
import { AteButtonComponent } from "../../ui/ate-button.component";
import { AteBaseSubBubbleMenu } from "../base/ate-base-sub-bubble-menu";
import {
  clampFontSizePx,
  currentFontSizePx,
  findFontFamily,
  fontFamilyLabel,
  fontSizeToPx,
  formatFontSize,
} from "../../../utils/ate-font.utils";

interface AteFontPreset {
  /** CSS value applied to the text, null for the editor's default (removes the font or size) */
  value: string | null;
  label: string;
}

/** Horizontal distance, in pixels, that scrubs the size by one pixel when dragging the unit */
const SCRUB_STEP_DISTANCE = 6;

/** Columns of the preset grids, used for the arrow keys */
const GRID_COLUMNS: Record<AteFontEditMode, number> = { family: 3, size: 10 };

/**
 * Dropdown of the font family and font size menus, designed like the color picker.
 * - Family: a grid of fonts, each name drawn in its font, starting with the editor's default.
 * - Size: a row of sizes starting with the default, then a field to type any size.
 */
@Component({
  selector: "ate-font-bubble-menu",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AteButtonComponent],
  template: `
    <div
      #menuRef
      class="bubble-menu"
      (mousedown)="onMouseDown($event)"
      (keydown)="onKeydown($event)"
      tabindex="-1">
      <div class="ate-font-menu" [class.is-size]="activeMode() === 'size'">
        <div
          class="ate-font-grid"
          role="group"
          [attr.aria-label]="activeMode() === 'size' ? t().fontSize : t().fontFamily">
          <!-- No tooltip on the presets: their label is the text itself, read by screen readers too -->
          @for (preset of gridPresets(); track preset.value) {
            <ate-button
              class="ate-font-preset"
              variant="text"
              title=""
              [active]="isActive(preset)"
              (buttonClick)="apply(preset.value)">
              <span
                class="ate-font-preset-label"
                [style.font-family]="activeMode() === 'family' ? preset.value : null">
                {{ preset.label }}
              </span>
            </ate-button>
          }
        </div>

        @if (activeMode() === "size") {
          <div class="ate-font-controls">
            <ate-button
              class="ate-font-preset ate-font-default"
              variant="text"
              title=""
              [active]="isActive(defaultPreset())"
              (buttonClick)="apply(null)">
              {{ t().defaultFont }}
            </ate-button>

            <div class="ate-font-slider">
              <input
                class="ate-font-slider-input"
                type="range"
                [min]="sliderRange.min"
                [max]="sliderRange.max"
                step="1"
                [value]="sliderValue()"
                [attr.aria-label]="t().fontSize"
                (input)="onSlide($event)"
                (change)="endLiveChange()" />
              <div class="ate-font-slider-fill" [style.width.%]="sliderPercent()"></div>
              <div class="ate-font-slider-thumb" [style.left.%]="sliderPercent()"></div>
            </div>

            <label class="ate-font-input-wrapper">
              <input
                #sizeInput
                class="ate-font-input"
                type="text"
                inputmode="decimal"
                [value]="sizeValue()"
                [attr.aria-label]="t().customFontSize"
                (keydown.enter)="applyTypedSize($event)"
                (keydown.arrowup)="nudgeSize($event, 1)"
                (keydown.arrowdown)="nudgeSize($event, -1)"
                (wheel)="onSizeWheel($event)" />
              <span
                class="ate-font-input-affix ate-font-scrub"
                (pointerdown)="startScrub($event)"
                (pointermove)="onScrub($event)"
                (pointerup)="endScrub()"
                (pointercancel)="endScrub()"
                >px</span
              >
            </label>

            <ate-button
              icon="apply"
              [title]="common().apply"
              color="var(--ate-primary)"
              (buttonClick)="applyTypedSize($event)"></ate-button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      /* The menu takes the focus for keyboard navigation, without a focus ring */
      .bubble-menu:focus {
        outline: none;
      }

      .ate-font-menu {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 352px;
      }

      .ate-font-menu.is-size {
        width: 320px;
      }

      .ate-font-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 2px;
      }

      /* Like the color swatches: the sizes fit on a single row */
      .ate-font-menu.is-size .ate-font-grid {
        grid-template-columns: repeat(10, 1fr);
      }

      /* The presets are the library buttons (hover, active state), sized to fill the grid */
      .ate-font-grid ::ng-deep .ate-button {
        width: 100%;
        padding: 0 6px;
        font-size: 13px;
      }

      .ate-font-menu.is-size .ate-font-grid ::ng-deep .ate-button {
        padding: 0;
        font-variant-numeric: tabular-nums;
      }

      /* No lift in the dropdown: the pointer crosses many presets in a row, they stay still */
      .bubble-menu .ate-font-menu ::ng-deep .ate-button:hover,
      .bubble-menu .ate-font-menu ::ng-deep .ate-button:active {
        transform: none;
      }

      .ate-font-preset-label {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ate-font-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        padding-top: 4px;
        border-top: 1px solid var(--ate-border, #e2e8f0);
      }

      /* Same build as the sliders of the demo: a native range on top of a drawn track */
      .ate-font-slider {
        position: relative;
        flex: 1;
        min-width: 48px;
        height: 4px;
        border-radius: 2px;
        background: var(--ate-border, #e2e8f0);
      }

      .ate-font-slider-input {
        position: absolute;
        top: -10px;
        left: -2px;
        width: calc(100% + 4px);
        height: 24px;
        margin: 0;
        opacity: 0;
        cursor: pointer;
        z-index: 2;
      }

      .ate-font-slider-fill {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        border-radius: 2px;
        background: var(--ate-primary, #3b82f6);
        pointer-events: none;
      }

      .ate-font-slider-thumb {
        position: absolute;
        top: 50%;
        width: 14px;
        height: 14px;
        border: 2px solid var(--ate-primary, #3b82f6);
        border-radius: 50%;
        background: var(--ate-menu-bg, #ffffff);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        box-sizing: border-box;
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 1;
      }

      /* Dragging the unit sideways scrubs the size */
      .ate-font-scrub {
        cursor: ew-resize;
        touch-action: none;
        user-select: none;
      }

      .ate-font-scrub:hover {
        color: var(--ate-primary, #3b82f6);
      }

      /* Text buttons are 32px wide in the medium size: let this one fit its label */
      .ate-font-controls ::ng-deep .ate-font-default .ate-button {
        width: auto;
        padding: 0 10px;
        font-size: 13px;
      }

      /* Compact: a size takes 3 digits at most */
      .ate-font-input-wrapper {
        flex: none;
        box-sizing: border-box;
        width: 72px;

        display: flex;
        align-items: center;
        gap: 6px;
        height: 32px;
        padding: 0 8px;
        border: 1px solid var(--ate-border, #e2e8f0);
        border-radius: 8px;
        background: var(--ate-surface-secondary, #f8fafc);
        cursor: text;
        transition: border-color 150ms ease;
      }

      .ate-font-input-wrapper:focus-within {
        border-color: var(--ate-primary, #3b82f6);
        background: var(--ate-menu-bg, #ffffff);
      }

      .ate-font-input-affix {
        color: var(--ate-text-muted, #94a3b8);
        font-size: 0.8125rem;
      }

      .ate-font-input {
        flex: 1;
        min-width: 0;
        border: none;
        outline: none;
        background: transparent;
        color: var(--ate-text, #1e293b);
        font: inherit;
        font-size: 0.875rem;
        font-variant-numeric: tabular-nums;
      }
    `,
  ],
})
export class AteFontBubbleMenuComponent extends AteBaseSubBubbleMenu {
  private readonly fontService = inject(AteFontService);

  readonly t = this.i18nService.toolbar;
  readonly common = this.i18nService.common;

  private readonly sizeInput = viewChild<ElementRef<HTMLInputElement>>("sizeInput");

  /** Mode locked while the dropdown is shown, so it does not change during the hide animation */
  readonly activeMode = signal<AteFontEditMode>("family");

  /**
   * The default first, then the configured fonts or sizes. A font of the selection missing from
   * the list (Calibri pasted from Word) is added at the end, so it shows as the current one.
   */
  readonly presets = computed<AteFontPreset[]>(() => {
    const { families, sizes } = this.fontService.fonts();
    const presets: AteFontPreset[] = [{ value: null, label: this.t().defaultFont }];
    if (this.activeMode() === "family") {
      presets.push(...families.map(family => ({ value: family.value, label: family.label })));
      const { fontFamily } = this.state().marks;
      if (fontFamily && !findFontFamily(fontFamily, families)) {
        presets.push({ value: fontFamily, label: fontFamilyLabel(fontFamily, []) });
      }
      return presets;
    }
    presets.push(
      ...sizes.map(size => {
        const px = fontSizeToPx(size);
        return { value: size, label: Number.isFinite(px) ? formatFontSize(px) : size };
      })
    );
    return presets;
  });

  /** Presets of the grid: for sizes, the default sits next to the size field instead */
  readonly gridPresets = computed(() =>
    this.activeMode() === "size" ? this.presets().slice(1) : this.presets()
  );

  readonly defaultPreset = computed<AteFontPreset>(() => this.presets()[0]);

  /** Range of the slider: the usual sizes, a larger size stays reachable from the field */
  readonly sliderRange = { min: 8, max: 96 };

  readonly sliderValue = computed(() => {
    const px = currentFontSizePx(this.state().marks);
    const { min, max } = this.sliderRange;
    return Number.isFinite(px) ? Math.min(Math.max(Math.round(px), min), max) : min;
  });

  readonly sliderPercent = computed(() => {
    const { min, max } = this.sliderRange;
    return ((this.sliderValue() - min) / (max - min)) * 100;
  });

  /** Size shown in the field, in pixels */
  readonly sizeValue = computed(() => {
    const px = currentFontSizePx(this.state().marks);
    return Number.isFinite(px) ? formatFontSize(px) : "";
  });

  isActive(preset: AteFontPreset): boolean {
    const { fontFamily, fontSize } = this.state().marks;
    if (this.activeMode() === "family") {
      if (preset.value === null || !fontFamily) {
        return preset.value === fontFamily;
      }
      return !!findFontFamily(fontFamily, [{ label: "", value: preset.value }]);
    }
    if (preset.value === null || !fontSize) {
      return preset.value === fontSize;
    }
    return fontSizeToPx(preset.value) === fontSizeToPx(fontSize);
  }

  protected override onStateChange() {
    const mode = this.fontService.editMode();
    this.fontService.menuTrigger();
    // Follow a switch to the other menu made before this one finished hiding
    if (mode) {
      this.activeMode.set(mode);
    }
  }

  override shouldShow(): boolean {
    return this.state().isEditable && this.fontService.editMode() !== null;
  }

  override getSelectionRect(): DOMRect {
    // 1. Opened from the toolbar: anchor to its trigger while it is visible
    const rect = this.fontService.menuTrigger()?.getBoundingClientRect();
    if (rect && rect.width > 0) {
      return rect;
    }
    // 2. Opened from the bubble menu, which hides: anchor to the selected text, as the color menu
    const selection = typeof window !== "undefined" ? window.getSelection() : null;
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0).getBoundingClientRect();
      if (range.width > 0 && range.height > 0) {
        return range;
      }
    }
    const editor = this.editor();
    const { top, bottom, left, right } = editor.view.coordsAtPos(editor.state.selection.from);
    return new DOMRect(left, top, right - left, bottom - top);
  }

  protected override onTippyShow(_instance: TippyInstance) {
    this.activeMode.set(this.fontService.editMode() ?? "family");
    this.fontService.captureSelection(this.editor());
    // Take the focus for keyboard navigation: the first arrow key moves it to the current preset
    setTimeout(() => {
      this.menuRef().nativeElement.focus({ preventScroll: true });
      // A size typed and left unapplied must not come back: the field shows the current size again
      const sizeInput = this.sizeInput()?.nativeElement;
      if (sizeInput) {
        sizeInput.value = this.sizeValue();
      }
    });
  }

  protected override onTippyHide(_instance: TippyInstance) {
    // Clear the trigger only once hidden, to keep the anchor stable during the animation
    this.fontService.done();
    this.fontService.close();
  }

  /**
   * Applies a preset, or removes the font family or size with null. As with the color swatches,
   * the dropdown stays open to try another one: the apply button, Enter, Escape or a click
   * outside close it.
   */
  apply(value: string | null) {
    const editor = this.editor();
    if (this.activeMode() === "family") {
      this.fontService.applyFontFamily(editor, value);
    } else {
      this.fontService.applyFontSize(editor, value);
    }
  }

  applyTypedSize(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const raw = this.sizeInput()?.nativeElement.value.trim() ?? "";
    const px = parseFloat(raw.replace(",", "."));
    // Apply only a typed size: the field otherwise shows the current one, possibly inherited
    if (Number.isFinite(px) && px > 0 && raw !== this.sizeValue()) {
      this.apply(`${clampFontSizePx(px)}px`);
    }
    // Like the color picker apply button: done
    this.closeAndFocusEditor();
  }

  /** Ends a live size change (slider released, scrub ended): the next change is a new undo step */
  endLiveChange() {
    this.fontService.endLiveChange();
  }

  // --- Live size changes: the text follows, the dropdown stays open, a single undo step ---

  onSlide(event: Event) {
    this.fontService.setFontSizePx(
      this.editor(),
      Number((event.target as HTMLInputElement).value),
      true
    );
  }

  /** Arrow keys in the size field step the size by one pixel */
  nudgeSize(event: Event, delta: 1 | -1) {
    event.preventDefault();
    this.stepFromCurrent(delta);
  }

  /** The mouse wheel over the size field steps the size by one pixel */
  onSizeWheel(event: WheelEvent) {
    if (event.deltaY === 0) {
      return;
    }
    event.preventDefault();
    this.stepFromCurrent(event.deltaY < 0 ? 1 : -1);
  }

  private scrub: { pointerId: number; startX: number; startPx: number } | null = null;

  startScrub(event: PointerEvent) {
    const px = currentFontSizePx(this.state().marks);
    if (event.button !== 0 || !Number.isFinite(px)) {
      return;
    }
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.scrub = { pointerId: event.pointerId, startX: event.clientX, startPx: Math.round(px) };
  }

  onScrub(event: PointerEvent) {
    const scrub = this.scrub;
    if (!scrub || event.pointerId !== scrub.pointerId) {
      return;
    }
    const size = scrub.startPx + Math.trunc((event.clientX - scrub.startX) / SCRUB_STEP_DISTANCE);
    if (Math.round(currentFontSizePx(this.state().marks)) !== size) {
      this.fontService.setFontSizePx(this.editor(), size, true);
    }
  }

  endScrub() {
    this.scrub = null;
    this.endLiveChange();
  }

  private stepFromCurrent(delta: 1 | -1) {
    this.fontService.stepFontSize(
      this.editor(),
      currentFontSizePx(this.state().marks),
      delta,
      true
    );
  }

  onMouseDown(event: MouseEvent) {
    event.stopPropagation();
    // Keep the editor selection, except to let the size field and the slider take the focus
    if ((event.target as HTMLElement).tagName !== "INPUT") {
      event.preventDefault();
    }
  }

  onKeydown(event: KeyboardEvent) {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      this.closeAndFocusEditor();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      this.cycleFocus(event.shiftKey ? -1 : 1);
      return;
    }
    // The size field and the slider handle their own arrow keys: they change the size
    if ((event.target as HTMLElement).tagName === "INPUT") {
      return;
    }
    const presets = this.presetButtons();
    const index = presets.indexOf(document.activeElement as HTMLElement);
    const columns = GRID_COLUMNS[this.activeMode()];
    const moves: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: columns,
      ArrowUp: -columns,
    };
    if (!(event.key in moves)) {
      return;
    }
    event.preventDefault();
    if (index === -1) {
      const active = presets.findIndex(button => button.classList.contains("is-active"));
      this.focusPreset(Math.max(active, 0));
      return;
    }
    const next = index + moves[event.key];
    if (next >= presets.length && event.key === "ArrowDown" && this.sizeInput()) {
      this.sizeInput()!.nativeElement.focus();
      return;
    }
    this.focusPreset(Math.min(Math.max(next, 0), presets.length - 1));
  }

  /** Tab and Shift+Tab go through the presets and the controls, round the menu */
  private cycleFocus(delta: 1 | -1) {
    const focusable = Array.from(
      this.menuRef().nativeElement.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input:not(:disabled)"
      )
    );
    if (focusable.length === 0) {
      return;
    }
    const index = focusable.indexOf(document.activeElement as HTMLElement);
    const next =
      index === -1
        ? delta > 0
          ? 0
          : focusable.length - 1
        : (index + delta + focusable.length) % focusable.length;
    focusable[next].focus();
  }

  /** Closes the dropdown from the keyboard or the apply button, and gives the focus back to the text */
  private closeAndFocusEditor() {
    this.fontService.close();
    this.editor().commands.focus();
  }

  private presetButtons(): HTMLElement[] {
    return Array.from(
      this.menuRef().nativeElement.querySelectorAll<HTMLElement>(".ate-font-grid .ate-button")
    );
  }

  private focusPreset(index: number) {
    this.presetButtons()[index]?.focus();
  }
}
