import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  computed,
  inject,
  input,
  OnDestroy,
  signal,
  viewChild,
} from "@angular/core";
import type { Editor } from "@tiptap/core";
import { AteFontService } from "../../services/ate-font.service";
import { AteEditorI18n } from "../../services/ate-editor-i18n.service";
import { AteEditorCommandsService } from "../../services/ate-editor-commands.service";
import { AteIconComponent } from "../ui/ate-icon.component";
import { AteButtonComponent } from "../ui/ate-button.component";
import {
  ATE_FONT_SIZE_RANGE,
  currentFontSizePx,
  formatFontSize,
  neighbourFontSizePx,
} from "../../utils/ate-font.utils";

/** Distance between two sizes of the wheel, in pixels: dragging this far changes the size by one */
const WHEEL_SPACING = 22;
/** Distance a press must travel to become a drag, in pixels */
const DRAG_THRESHOLD = 4;
/** Scale and opacity of the neighbours, as in the styles: a dragged size moves between them and 1 */
const NEIGHBOUR_SCALE = 0.72;
const NEIGHBOUR_OPACITY = 0.45;

/**
 * How close a dragged size is to its place, from 1 (on it) to 0 (one step away or more), along a
 * cosine: no angle at the middle nor at the neighbours, so slow drags do not jolt the digits
 */
const nearness = (position: number) =>
  (1 + Math.cos(Math.PI * Math.min(Math.abs(position), 1))) / 2;
/** Delay before a held neighbour starts repeating, then the delay between repeats, in milliseconds */
const REPEAT_DELAY = 400;
const REPEAT_INTERVAL = 70;
/** How long the transitions stay on after a click or a hover, in milliseconds (above their 150ms) */
const ANIMATION_WINDOW = 200;
/** How long the hover crossfade stays on, in milliseconds (above its 220ms) */
const MORPH_WINDOW = 300;

interface AteWheelItem {
  value: number;
  /** Position from the current size: 0 is the current size, -1 and 1 its neighbours */
  offset: number;
}

/** Where a press landed on the wheel: on a neighbour it steps, in the middle it opens the dropdown */
type AteWheelZone = -1 | 0 | 1;

interface AteWheelPress {
  pointerId: number;
  startX: number;
  startPx: number;
  zone: AteWheelZone;
  dragging: boolean;
  repeated: boolean;
}

/**
 * Trigger of the font size menu, an ate-button holding a wheel: the size between its neighbours
 * (`15 16 17`). A press on a neighbour steps to it, holding repeats, dragging scrolls through the
 * sizes, and a press in the middle opens the dropdown. With `neighbours: "hover"`, - and + stand in
 * their place until the pointer hovers the wheel (or it has the focus), so it looks like the other
 * toolbar buttons at rest.
 */
@Component({
  selector: "ate-font-size-wheel",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AteIconComponent, AteButtonComponent],
  template: `
    <ate-button
      #wheel
      class="ate-font-wheel"
      [class.is-dragging]="isDragging()"
      [class.is-animating]="isAnimating()"
      [class.is-morphing]="isMorphing()"
      [class.is-folded]="isFolded()"
      [title]="tooltip()"
      [ariaLabel]="t().fontSize + ' ' + sizeLabel()"
      ariaHasPopup="listbox"
      [ariaExpanded]="isOpen()"
      [tooltipDisabled]="isAnyMenuOpen()"
      [active]="isOpen()"
      [disabled]="isDisabled()"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp($event)"
      (pointercancel)="endPress()"
      (lostpointercapture)="endPress()"
      (pointerenter)="onPointerEnter()"
      (pointerleave)="onPointerLeave()"
      (focusin)="hasFocus.set(true)"
      (focusout)="hasFocus.set(false)"
      (keydown)="onKey($event)"
      (buttonClick)="onClick($event)">
      <span class="ate-font-wheel-track">
        @for (item of items(); track item.value) {
          <span
            class="ate-font-wheel-item"
            [class.is-current]="item.offset === 0"
            [class.is-hidden]="item.offset < -1 || item.offset > 1"
            [class.is-hovered]="item.offset !== 0 && item.offset === hoverZone()"
            [style.--ate-wheel-offset]="item.offset"
            [style.transform]="dragTransform(item)"
            [style.opacity]="dragOpacity(item)">
            {{ format(item.value) }}
          </span>
        }
      </span>
      <!-- At rest, - and + stand where the neighbours appear: they turn into them on hover -->
      <ate-icon name="fontSizeDecrease" class="ate-font-wheel-sign is-prev" aria-hidden="true" />
      <ate-icon name="fontSizeIncrease" class="ate-font-wheel-sign is-next" aria-hidden="true" />
    </ate-button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
      }

      /* The hover, active and disabled states are the ate-button ones: only the size differs */
      .ate-font-wheel {
        /* Keep in sync with WHEEL_SPACING */
        --ate-wheel-spacing: 22px;
        display: block;
      }

      .ate-font-wheel ::ng-deep .ate-button {
        width: 72px;
        padding: 0;
        font: inherit;
        touch-action: none;
        user-select: none;
      }

      .ate-font-wheel.is-dragging ::ng-deep .ate-button {
        cursor: grabbing;
      }

      .ate-font-wheel-track {
        position: absolute;
        inset: 0;
      }

      .ate-font-wheel-item {
        position: absolute;
        top: 50%;
        left: 50%;
        font-size: 14px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        line-height: 1;
        white-space: nowrap;
        opacity: 0.45;
        transform: translate(calc(-50% + var(--ate-wheel-offset) * var(--ate-wheel-spacing)), -50%)
          scale(0.72);
      }

      .ate-font-wheel-item.is-current {
        color: inherit;
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }

      .ate-font-wheel-item.is-hidden {
        opacity: 0;
      }

      /* The neighbour under the pointer lights up: a press there steps to it */
      .ate-font-wheel-item.is-hovered {
        color: var(--ate-toolbar-button-active-color, var(--ate-primary));
        opacity: 0.9;
      }

      /*
       * Folded: - and + stand in place of the neighbours. On hover they crossfade into each other:
       * from a slightly smaller scale (never from nothing) and through a light blur that bridges
       * the two states.
       */
      .ate-font-wheel.is-folded .ate-font-wheel-item:not(.is-current) {
        opacity: 0;
        filter: blur(2px);
        transform: translate(calc(-50% + var(--ate-wheel-offset) * var(--ate-wheel-spacing)), -50%)
          scale(0.66);
      }

      .ate-font-wheel-sign {
        position: absolute;
        top: 50%;
        left: 50%;
        font-size: 16px;
        opacity: 0;
        filter: blur(2px);
        pointer-events: none;
      }

      .ate-font-wheel-sign.is-prev {
        transform: translate(calc(-50% - var(--ate-wheel-spacing)), -50%) scale(0.92);
      }

      .ate-font-wheel-sign.is-next {
        transform: translate(calc(-50% + var(--ate-wheel-spacing)), -50%) scale(0.92);
      }

      .ate-font-wheel.is-folded .ate-font-wheel-sign {
        opacity: 1;
        filter: none;
      }

      .ate-font-wheel.is-folded .ate-font-wheel-sign.is-prev {
        transform: translate(calc(-50% - var(--ate-wheel-spacing)), -50%);
      }

      .ate-font-wheel.is-folded .ate-font-wheel-sign.is-next {
        transform: translate(calc(-50% + var(--ate-wheel-spacing)), -50%);
      }

      /* A hover crossfades - and + with the neighbours. Keyboard and held changes stay instant */
      .ate-font-wheel.is-morphing .ate-font-wheel-item,
      .ate-font-wheel.is-morphing .ate-font-wheel-sign {
        transition:
          transform 220ms cubic-bezier(0.23, 1, 0.32, 1),
          opacity 220ms cubic-bezier(0.23, 1, 0.32, 1),
          filter 220ms cubic-bezier(0.23, 1, 0.32, 1);
      }

      /* A click slides the size toward the clicked neighbour, a released drag settles on it.
         Placed after the hover crossfade, so a click right after a hover keeps its quicker pace */
      .ate-font-wheel.is-animating .ate-font-wheel-item {
        transition:
          transform 150ms cubic-bezier(0.23, 1, 0.32, 1),
          opacity 150ms cubic-bezier(0.23, 1, 0.32, 1);
      }

      @media (prefers-reduced-motion: reduce) {
        .ate-font-wheel.is-animating .ate-font-wheel-item,
        .ate-font-wheel.is-morphing .ate-font-wheel-item,
        .ate-font-wheel.is-morphing .ate-font-wheel-sign {
          transition: none;
        }
      }
    `,
  ],
})
export class AteFontSizeWheelComponent implements OnDestroy {
  editor = input.required<Editor>();
  disabled = input<boolean>(false);
  /** Anchor the dropdown to the selected text instead of this wheel, as in the bubble menu */
  anchorToText = input<boolean>(false);
  /** Show the neighbours always, or only on hover (- and + at rest) */
  neighbours = input<"always" | "hover">("hover");

  private readonly fontService = inject(AteFontService);
  private readonly i18nService = inject(AteEditorI18n);
  private readonly editorCommands = inject(AteEditorCommandsService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly wheel = viewChild.required("wheel", { read: ElementRef });

  readonly t = this.i18nService.toolbar;
  readonly state = this.editorCommands.editorState;

  /** Open from this wheel: the toolbar and the bubble menu each have their own */
  readonly isOpen = computed(
    () =>
      this.fontService.editMode() === "size" &&
      this.host.nativeElement.contains(this.fontService.menuTrigger())
  );

  /** A tooltip scheduled by the hover must not show over an open dropdown */
  readonly isAnyMenuOpen = computed(() => this.fontService.editMode() !== null);

  readonly isDisabled = computed(() => {
    const { can, isEditable } = this.state();
    return this.disabled() || !isEditable || !can.setFontSize;
  });

  readonly sizePx = computed(() => currentFontSizePx(this.state().marks));

  readonly sizeLabel = computed(() => {
    const px = this.sizePx();
    return Number.isFinite(px) ? formatFontSize(px) : "–";
  });

  /** Each side of the wheel names its action, the middle names the control */
  readonly tooltip = computed(() => {
    const zone = this.hoverZone();
    if (zone === -1) {
      return this.t().decreaseFontSize;
    }
    if (zone === 1) {
      return this.t().increaseFontSize;
    }
    return this.t().fontSize;
  });

  /**
   * The current size, its neighbours and the sizes beyond them (hidden), keyed by value so that
   * a change slides each one to its new place. Neighbours of a size like 14.67 are 14 and 15.
   */
  readonly items = computed<AteWheelItem[]>(() => {
    const px = this.sizePx();
    if (!Number.isFinite(px)) {
      return [];
    }
    const below = neighbourFontSizePx(px, -1);
    const above = neighbourFontSizePx(px, 1);
    const items: AteWheelItem[] = [
      { value: below - 1, offset: -2 },
      { value: below, offset: -1 },
      { value: px, offset: 0 },
      { value: above, offset: 1 },
      { value: above + 1, offset: 2 },
    ];
    return items.filter(
      item => item.value >= ATE_FONT_SIZE_RANGE.min && item.value <= ATE_FONT_SIZE_RANGE.max
    );
  });

  /** Dragging scrolls the sizes in place: the wheel itself does not move */
  readonly isDragging = signal(false);
  /** Whether the next size change or fold slides: only after a click or a hover */
  readonly isAnimating = signal(false);
  /**
   * While dragging, how far the sizes have moved between two steps, in steps (-1 to 1):
   * each size follows the pointer and grows as it nears the middle. Null when not dragging.
   */
  readonly dragShift = signal<number | null>(null);
  /** Whether - / + and the neighbours crossfade: only right after the pointer enters or leaves */
  readonly isMorphing = signal(false);
  /** Neighbour under the pointer, highlighted as the one a press would step to */
  readonly hoverZone = signal<AteWheelZone | null>(null);
  readonly hasFocus = signal(false);
  readonly isHovered = signal(false);

  /** Whether only the size shows, its neighbours folded behind it */
  readonly isFolded = computed(
    () =>
      this.neighbours() === "hover" &&
      !this.isHovered() &&
      !this.hasFocus() &&
      !this.isOpen() &&
      !this.isDragging()
  );

  private press: AteWheelPress | null = null;
  private repeatTimer: ReturnType<typeof setTimeout> | null = null;
  private animationTimer: ReturnType<typeof setTimeout> | null = null;
  private morphTimer: ReturnType<typeof setTimeout> | null = null;

  /** Position of a size while dragging, in steps from the middle */
  private dragPosition(item: AteWheelItem): number | null {
    const shift = this.dragShift();
    return shift === null ? null : item.offset + shift;
  }

  /** While dragging, a size follows the pointer and scales up as it nears the middle */
  dragTransform(item: AteWheelItem): string | null {
    const position = this.dragPosition(item);
    if (position === null) {
      return null;
    }
    const scale = NEIGHBOUR_SCALE + (1 - NEIGHBOUR_SCALE) * nearness(position);
    return `translate(calc(-50% + ${position * WHEEL_SPACING}px), -50%) scale(${scale})`;
  }

  /** While dragging, a size fades in toward the middle and out toward the edges */
  dragOpacity(item: AteWheelItem): number | null {
    const position = this.dragPosition(item);
    if (position === null) {
      return null;
    }
    const distance = Math.abs(position);
    return distance <= 1
      ? NEIGHBOUR_OPACITY + (1 - NEIGHBOUR_OPACITY) * nearness(position)
      : NEIGHBOUR_OPACITY * nearness(distance - 1);
  }

  format(px: number): string {
    return formatFontSize(px);
  }

  // --- Pointer: press, hold and drag ---

  onPointerDown(event: PointerEvent) {
    // One press at a time: a second finger or pointer is ignored until the first one is released
    if (event.button !== 0 || !event.isPrimary || this.press || this.isDisabled()) {
      return;
    }
    const zone = this.zoneAt(event);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    const press: AteWheelPress = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startPx: this.sizePx(),
      zone,
      dragging: false,
      repeated: false,
    };
    this.press = press;
    if (zone !== 0) {
      const repeat = () => {
        // The press ended, or the wheel was disabled while held (no pointerup reaches it then)
        if (this.press !== press || this.isDisabled()) {
          this.endPress();
          return;
        }
        press.repeated = true;
        this.step(zone, true);
        this.repeatTimer = setTimeout(repeat, REPEAT_INTERVAL);
      };
      this.repeatTimer = setTimeout(repeat, REPEAT_DELAY);
    }
  }

  onPointerMove(event: PointerEvent) {
    const press = this.press;
    if (!press) {
      this.hoverZone.set(this.zoneAt(event));
      return;
    }
    if (event.pointerId !== press.pointerId || !Number.isFinite(press.startPx)) {
      return;
    }
    const dx = event.clientX - press.startX;
    if (!press.dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD || press.repeated) {
        return;
      }
      press.dragging = true;
      this.isDragging.set(true);
      this.stopRepeat();
    }
    // The sizes follow the pointer: dragging left brings the larger sizes to the middle
    const steps = Math.trunc(-dx / WHEEL_SPACING);
    const size = Math.round(press.startPx) + steps;
    if (Math.round(this.sizePx()) !== size) {
      this.fontService.setFontSizePx(this.editor(), size, true);
    }
    this.dragShift.set((dx + steps * WHEEL_SPACING) / WHEEL_SPACING);
  }

  onPointerUp(event: PointerEvent) {
    const press = this.press;
    if (!press || event.pointerId !== press.pointerId) {
      return;
    }
    if (!press.dragging && !press.repeated) {
      if (press.zone === 0) {
        this.openDropdown();
      } else {
        this.animateNextChange();
        this.step(press.zone);
      }
    }
    this.endPress();
  }

  /** Ends the press: a drag or a hold is a single undo step, the next change starts a new one */
  endPress() {
    this.stopRepeat();
    if (!this.press) {
      return;
    }
    this.press = null;
    this.fontService.endLiveChange();
    if (this.dragShift() !== null) {
      // The sizes settle back on their places
      this.animateNextChange();
      this.dragShift.set(null);
    }
    this.isDragging.set(false);
  }

  // --- Keyboard and hover ---

  /** Pointer presses are handled on pointerup: a click only acts when it comes from the keyboard */
  onClick(event: Event) {
    if ((event as MouseEvent).detail === 0) {
      this.openDropdown();
    }
  }

  /** Arrow keys step the size, as in a number field */
  onKey(event: KeyboardEvent) {
    const steps: Record<string, 1 | -1> = {
      ArrowUp: 1,
      ArrowRight: 1,
      ArrowDown: -1,
      ArrowLeft: -1,
    };
    const delta = steps[event.key];
    if (delta) {
      event.preventDefault();
      this.step(delta);
    }
  }

  onPointerEnter() {
    this.morphNextFold();
    this.isHovered.set(true);
  }

  onPointerLeave() {
    this.morphNextFold();
    this.isHovered.set(false);
    this.hoverZone.set(null);
  }

  ngOnDestroy() {
    this.stopRepeat();
    if (this.animationTimer) {
      clearTimeout(this.animationTimer);
    }
    if (this.morphTimer) {
      clearTimeout(this.morphTimer);
    }
  }

  private openDropdown() {
    const wheel = this.wheel().nativeElement as HTMLElement;
    this.fontService.open("size", this.anchorToText() ? null : wheel);
  }

  /** A press on the left or right third steps to that neighbour, in the middle it opens the dropdown */
  private zoneAt(event: PointerEvent): AteWheelZone {
    const rect = (this.wheel().nativeElement as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const third = rect.width / 3;
    return x < third ? -1 : x > rect.width - third ? 1 : 0;
  }

  private step(delta: 1 | -1, live = false) {
    this.fontService.stepFontSize(this.editor(), this.sizePx(), delta, live);
  }

  /** Lets the crossfade between - / + and the neighbours run, then makes changes instant again */
  private morphNextFold() {
    this.isMorphing.set(true);
    if (this.morphTimer) {
      clearTimeout(this.morphTimer);
    }
    this.morphTimer = setTimeout(() => this.isMorphing.set(false), MORPH_WINDOW);
  }

  /** Lets the transitions run for the change that follows, then makes changes instant again */
  private animateNextChange() {
    this.isAnimating.set(true);
    if (this.animationTimer) {
      clearTimeout(this.animationTimer);
    }
    this.animationTimer = setTimeout(() => this.isAnimating.set(false), ANIMATION_WINDOW);
  }

  private stopRepeat() {
    if (this.repeatTimer) {
      clearTimeout(this.repeatTimer);
      this.repeatTimer = null;
    }
  }
}
