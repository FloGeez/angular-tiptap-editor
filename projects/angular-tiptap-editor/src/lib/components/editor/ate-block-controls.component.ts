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
import { AteI18nService } from "../../services/ate-i18n.service";
import { AteTooltipDirective } from "../../directives/ate-tooltip.directive";

/**
 * Component providing Notion-like block controls (Plus button and Drag Handle).
 */
@Component({
  selector: "ate-block-controls",
  standalone: true,
  imports: [AteTooltipDirective],
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
        <span class="material-symbols-outlined">add</span>
      </button>
      <div
        class="ate-control-btn ate-block-drag"
        draggable="true"
        (mousedown)="onDragHandleMouseDown($event)"
        (dragstart)="onDragStart($event)"
        (dragend)="onDragEnd()"
        [ateTooltip]="i18n.editor().blockDrag"
        ateTooltipPlacement="top">
        <span class="material-symbols-outlined">drag_indicator</span>
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
        transition: all 0.15s ease;
      }

      .ate-control-btn:hover {
        background: var(--ate-surface-tertiary);
        color: var(--ate-text);
      }

      .ate-control-btn .material-symbols-outlined {
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
  protected readonly i18n = inject(AteI18nService);

  editor = input.required<Editor>();
  hoveredData = input<{ node: PMNode; element: HTMLElement; pos: number } | null>(null);

  menuRef = viewChild.required<ElementRef<HTMLDivElement>>("menuRef");

  protected isInteracting = signal(false);
  private lastValidData: { node: PMNode; element: HTMLElement; pos: number } | null = null;
  private lastValidRect: DOMRect | null = null;
  private tippyInstance: TippyInstance | null = null;
  private updateTimeout: number | null = null;

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
  }

  ngOnDestroy() {
    if (this.updateTimeout) {
      window.clearTimeout(this.updateTimeout);
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
      moveTransition: "transform 0.2s ease-out",
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
      window.clearTimeout(this.updateTimeout);
    }
    const delay = show ? 0 : 400;
    this.updateTimeout = window.setTimeout(() => {
      if (show) {
        this.showTippy();
      } else {
        this.hideTippy();
      }
    }, delay);
  }

  private showTippy() {
    if (this.tippyInstance) {
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
    if (ed && data) {
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

    // 1. Force the editor to focus and select the ENTIRE node
    view.focus();
    ed.commands.setNodeSelection(pos);

    // 2. Browser Drag Image & metadata
    event.dataTransfer.setDragImage(element, 0, 10);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", "");

    // 3. PRO-HACK: Indicate this is a move of the current selection (the whole node)
    (view as unknown as { dragging: unknown }).dragging = {
      slice: ed.state.selection.content(),
      move: true,
    };

    // 4. Dispatch virtual dragstart
    const pmEvent = new DragEvent("dragstart", {
      dataTransfer: event.dataTransfer,
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(pmEvent);

    // 5. Cleanup UI
    setTimeout(() => {
      this.hideTippy();
      this.isInteracting.set(false);
    }, 0);
  }

  onDragEnd() {
    this.isInteracting.set(false);
  }
}
