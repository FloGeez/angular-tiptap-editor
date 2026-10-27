import {
  Component,
  input,
  viewChild,
  ElementRef,
  OnDestroy,
  effect,
  signal,
  inject,
  ChangeDetectionStrategy,
  AfterViewInit,
} from "@angular/core";
import tippy, { Instance as TippyInstance, sticky } from "tippy.js";
import { Editor } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import { AteEditorI18n } from "../../services/ate-editor-i18n.service";
import { AteTooltipDirective } from "../../directives/ate-tooltip.directive";
import { AteIconComponent } from "../ui/ate-icon.component";
import {
  ATE_BLOCK_DRAG_MIME,
  ateMultiBlockSelection,
  endAteBlockDrag,
} from "../../extensions/ate-block-controls.extension";

// Glides from block to block; the strong ease-out covers most of the way at once, so it never trails the pointer
const BLOCK_CONTROLS_MOVE_TRANSITION = "transform 200ms cubic-bezier(0.23, 1, 0.32, 1)";

function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Component providing Notion-like block controls (Plus button and Drag Handle).
 */
@Component({
  selector: "ate-block-controls",
  standalone: true,
  imports: [AteTooltipDirective, AteIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #menuRef
      class="ate-block-controls"
      (mouseenter)="onMouseEnter()"
      (mouseleave)="onMouseLeave()"
      (mousedown)="onContainerMouseDown($event)">
      <button
        class="ate-control-btn ate-block-add"
        (mousedown)="onButtonMouseDown($event)"
        (click)="addBlock($event)"
        [ateTooltip]="i18n.editor().blockAdd"
        ateTooltipPlacement="top">
        <ate-icon name="blockAdd" />
      </button>
      <div
        class="ate-control-btn ate-block-drag"
        draggable="true"
        (mousedown)="onDragHandleMouseDown($event)"
        (dragstart)="onDragStart($event)"
        (dragend)="onDragEnd()"
        [ateTooltip]="i18n.editor().blockDrag"
        ateTooltipPlacement="top">
        <ate-icon name="blockDrag" />
      </div>
    </div>
  `,
  styles: [
    `
      .ate-block-controls {
        display: flex;
        align-items: center;
        gap: 2px;
        padding: 4px;
        pointer-events: auto;
        will-change: transform;
      }

      .ate-control-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 4px;
        border: none;
        background: transparent;
        color: var(--ate-text-secondary);
        cursor: pointer;
      }

      /* Hovered dozens of times a minute: a flash at most, and only with a real pointer */
      @media (hover: hover) and (pointer: fine) {
        .ate-control-btn {
          transition:
            background-color 120ms ease-out,
            color 120ms ease-out;
        }

        .ate-control-btn:hover {
          background: var(--ate-surface-tertiary);
          color: var(--ate-text);
        }
      }

      .ate-control-btn .ate-icon {
        font-size: 18px;
      }

      @media (max-width: 768px) {
        :host {
          display: none !important;
        }
      }
    `,
  ],
})
export class AteBlockControlsComponent implements AfterViewInit, OnDestroy {
  protected readonly i18n = inject(AteEditorI18n);

  editor = input.required<Editor>();
  hoveredData = input<{ node: PMNode; element: HTMLElement; pos: number } | null>(null);

  menuRef = viewChild.required<ElementRef<HTMLDivElement>>("menuRef");

  protected isInteracting = signal(false);
  private lastValidData: { node: PMNode; element: HTMLElement; pos: number } | null = null;
  private lastValidRect: DOMRect | null = null;
  private tippyInstance: TippyInstance | null = null;
  private updateTimeout: ReturnType<typeof setTimeout> | null = null;
  private glideFrame: number | null = null;

  constructor() {
    effect(() => {
      const data = this.hoveredData();
      const interacting = this.isInteracting();

      if (data) {
        this.lastValidData = data;
        this.lastValidRect = data.element.getBoundingClientRect();
      }

      this.updateMenu(!!data || interacting);
    });
  }

  ngAfterViewInit() {
    this.initTippy();
    window.addEventListener("scroll", this.onScroll, { capture: true, passive: true });
  }

  ngOnDestroy() {
    window.removeEventListener("scroll", this.onScroll, { capture: true });
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    if (this.glideFrame !== null) {
      cancelAnimationFrame(this.glideFrame);
    }
    if (this.tippyInstance) {
      this.tippyInstance.destroy();
      this.tippyInstance = null;
    }
  }

  private initTippy() {
    const nativeElement = this.menuRef().nativeElement;
    if (!nativeElement) {
      return;
    }

    this.tippyInstance = tippy(document.body, {
      content: nativeElement,
      trigger: "manual",
      placement: "left",
      theme: "ate-block-controls",
      appendTo: () => (this.editor()?.options?.element as HTMLElement) || document.body,
      interactive: true,
      hideOnClick: false,
      arrow: false,
      offset: [0, 8],
      zIndex: 99,
      plugins: [sticky],
      sticky: "reference",
      // The glide keeps the handle visibly the same one moving with the pointer (see withoutGlide for when it is skipped)
      moveTransition: prefersReducedMotion() ? "" : BLOCK_CONTROLS_MOVE_TRANSITION,
      getReferenceClientRect: () => this.getSelectionRect(),
      popperOptions: {
        modifiers: [
          {
            name: "preventOverflow",
            options: {
              boundary: (this.editor()?.options?.element as HTMLElement) || document.body,
              padding: 8,
            },
          },
        ],
      },
    });
  }

  private updateMenu(show: boolean) {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    const delay = show ? 0 : 400;
    this.updateTimeout = setTimeout(() => {
      if (show) {
        this.showTippy();
      } else {
        this.hideTippy();
      }
    }, delay);
  }

  /** While scrolling, the controls follow their block every frame: a glide would make them trail behind it */
  private onScroll = () => {
    if (this.tippyInstance?.state.isVisible) {
      this.withoutGlide();
    }
  };

  /**
   * Moves the controls without gliding until the position settles (two frames after the last call).
   * Tippy only skips the move transition on its very first show: the controls are never unmounted
   * afterwards, so they would otherwise glide in from wherever they were last shown.
   */
  private withoutGlide() {
    const popper = this.tippyInstance?.popper;
    if (!popper) {
      return;
    }
    popper.style.transition = "none";
    if (this.glideFrame !== null) {
      cancelAnimationFrame(this.glideFrame);
    }
    this.glideFrame = requestAnimationFrame(() => {
      this.glideFrame = requestAnimationFrame(() => {
        this.glideFrame = null;
        popper.style.transition = this.tippyInstance?.props.moveTransition ?? "";
      });
    });
  }

  private showTippy() {
    if (this.tippyInstance) {
      // Appearing: show the controls in place, the glide is only for moving between blocks
      if (!this.tippyInstance.state.isVisible) {
        this.withoutGlide();
      }
      this.tippyInstance.setProps({
        getReferenceClientRect: () => this.getSelectionRect(),
      });
      this.tippyInstance.show();
    }
  }

  private hideTippy() {
    if (this.tippyInstance) {
      this.tippyInstance.hide();
    }
  }

  private getSelectionRect(): DOMRect {
    const data = this.hoveredData();
    if (data && data.element) {
      return data.element.getBoundingClientRect();
    }
    return this.lastValidRect || new DOMRect(-9999, -9999, 0, 0);
  }

  onMouseEnter() {
    this.isInteracting.set(true);
  }

  onMouseLeave() {
    this.isInteracting.set(false);
  }

  onContainerMouseDown(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      event.preventDefault();
    }
  }

  onButtonMouseDown(event: MouseEvent) {
    event.preventDefault();
  }

  /**
   * Selection strategy to avoid partial node dragging (ghost table issue).
   */
  onDragHandleMouseDown(event: MouseEvent) {
    event.stopPropagation();
    const ed = this.editor();
    const data = this.hoveredData() || this.lastValidData;
    if (ed && data && !ateMultiBlockSelection(ed.state, data.pos)) {
      // Force whole-node selection. This is crucial for atomic nodes like tables and images.
      ed.commands.setNodeSelection(data.pos);
    }
  }

  addBlock(event: MouseEvent) {
    event.stopPropagation();
    const ed = this.editor();
    const data = this.hoveredData() || this.lastValidData;
    if (!ed || !data) {
      return;
    }

    const { pos, node } = data;
    if (node.content.size === 0) {
      ed.chain()
        .focus()
        .setTextSelection(pos + 1)
        .insertContent("/")
        .run();
    } else {
      const nextPos = pos + node.nodeSize;
      ed.chain()
        .focus()
        .insertContentAt(nextPos, { type: "paragraph", content: [{ type: "text", text: "/" }] })
        .setTextSelection(nextPos + 2)
        .run();
    }

    this.isInteracting.set(false);
    this.hideTippy();
  }

  onDragStart(event: DragEvent) {
    const ed = this.editor();
    const data = this.hoveredData() || this.lastValidData;
    if (!ed || !data || !event.dataTransfer) {
      return;
    }

    const { element, pos } = data;
    const view = ed.view;

    // 1. Select the grabbed block, unless it belongs to a multi-block selection that is dragged as a whole
    view.focus();
    if (!ateMultiBlockSelection(ed.state, pos)) {
      ed.commands.setNodeSelection(pos);
    }

    // 2. Browser Drag Image & metadata
    event.dataTransfer.setDragImage(element, 0, 10);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(ATE_BLOCK_DRAG_MIME, "1");

    // 3. Dispatch virtual dragstart, handled by the block drag plugin of AteBlockControlsExtension
    const pmEvent = new DragEvent("dragstart", {
      dataTransfer: event.dataTransfer,
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(pmEvent);

    // 4. Cleanup UI
    setTimeout(() => {
      this.hideTippy();
      this.isInteracting.set(false);
    }, 0);
  }

  onDragEnd() {
    const ed = this.editor();
    if (!ed.isDestroyed) {
      endAteBlockDrag(ed.view);
    }
    this.isInteracting.set(false);
  }
}
