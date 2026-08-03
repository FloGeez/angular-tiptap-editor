import {
  Component,
  input,
  inject,
  signal,
  computed,
  effect,
  untracked,
  ChangeDetectionStrategy,
  OnDestroy,
  HostListener,
} from "@angular/core";
import { Editor } from "@tiptap/core";
import { AteEditorRef } from "../../models/ate-editor-ref";
import { AteEditorRegistry } from "../../services/ate-editor-registry.service";
import { AteI18nService } from "../../services/ate-i18n.service";

import { AteTocItem, AteTocVariant } from "../../models/ate-toc.model";

/**
 * Table of Contents Component (Notion-style)
 * Dynamically extracts headings from the active editor and displays them.
 * Configurable via inputs (floating, position, variants, hover expansion) and CSS variables.
 */
@Component({
  selector: "ate-table-of-contents",
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[class.ate-toc-host-floating]": "floating()",
    "[style.--ate-toc-position-mode]": "floating() ? positionMode() : null",
    "[class.ate-toc-host-absolute]": "floating() && positionMode() === 'absolute'",
    "[class.ate-toc-host-fixed]": "floating() && positionMode() === 'fixed'",
  },
  template: `
    <div
      class="ate-toc-wrapper"
      [class.ate-toc-floating]="floating()"
      [class.ate-toc-position-absolute]="floating() && positionMode() === 'absolute'"
      [class.ate-toc-position-fixed]="floating() && positionMode() === 'fixed'"
      [class.ate-toc-position-left]="position() === 'left'"
      [class.ate-toc-position-right]="position() === 'right'"
      (mouseenter)="setMouseHover(true)"
      (mouseleave)="setMouseHover(false)"
      (focusin)="setFocused(true)"
      (focusout)="setFocused(false)">
      <div
        class="ate-toc"
        [class.ate-toc-floating]="floating()"
        [class.ate-toc-position-left]="position() === 'left'"
        [class.ate-toc-position-right]="position() === 'right'"
        [class.ate-toc-variant-card]="variant() === 'card'"
        [class.ate-toc-variant-transparent]="variant() === 'transparent'"
        [class.ate-toc-variant-minimal]="variant() === 'minimal'"
        [class.ate-toc-hover-expand]="floating() && hoverExpand()"
        [class.ate-toc-hovered]="floating() && hoverExpand() && isExpanded()"
        role="navigation"
        aria-label="Table of Contents">
        @if (items().length > 0) {
          @if (showTitle()) {
            <div class="ate-toc-header">{{ headerTitle() }}</div>
          }
          <div class="ate-toc-list">
            @for (item of items(); track item.id) {
              <button
                type="button"
                class="ate-toc-item"
                [class.ate-toc-active]="item.active"
                [attr.aria-current]="item.active ? 'true' : null"
                [attr.data-level]="item.level"
                (click)="scrollToHeading(item, $event)"
                [title]="item.text">
                <!-- Perfect native vector SVG dash with level-adapted viewBox & width -->
                <svg
                  [attr.width]="dashWidth(item.level)"
                  height="2"
                  [attr.viewBox]="'0 0 ' + dashWidth(item.level) + ' 2'"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  class="ate-toc-dash">
                  <rect
                    [attr.width]="dashWidth(item.level)"
                    height="2"
                    rx="1"
                    ry="1"
                    fill="currentColor"></rect>
                </svg>

                <!-- Full heading text -->
                <span class="ate-toc-text">{{ item.text }}</span>
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      /* Outer Hitbox Container Positioning */
      .ate-toc-wrapper.ate-toc-floating {
        position: var(--ate-toc-position-mode, fixed);
        top: var(--ate-toc-top, 50%);
        transform: translateY(-50%);
        z-index: var(--ate-toc-z-index, 95);
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
      }

      .ate-toc-wrapper.ate-toc-floating.ate-toc-position-absolute,
      :host(.ate-toc-host-absolute) .ate-toc-wrapper.ate-toc-floating {
        position: absolute;
      }

      .ate-toc-wrapper.ate-toc-floating.ate-toc-position-fixed,
      :host(.ate-toc-host-fixed) .ate-toc-wrapper.ate-toc-floating {
        position: fixed;
      }

      .ate-toc-wrapper.ate-toc-floating.ate-toc-position-right {
        right: var(--ate-toc-right, 2rem);
        left: auto;
        padding-left: var(--ate-toc-hitbox-padding, 16px);
        padding-right: 0;
        padding-top: var(--ate-toc-hitbox-padding-vertical, 8px);
        padding-bottom: var(--ate-toc-hitbox-padding-vertical, 8px);
      }

      .ate-toc-wrapper.ate-toc-floating.ate-toc-position-left {
        left: var(--ate-toc-left, 2rem);
        right: auto;
        padding-right: var(--ate-toc-hitbox-padding, 16px);
        padding-left: 0;
        padding-top: var(--ate-toc-hitbox-padding-vertical, 8px);
        padding-bottom: var(--ate-toc-hitbox-padding-vertical, 8px);
      }

      .ate-toc {
        font-family: inherit;
        user-select: none;
        width: 100%;
        box-sizing: border-box;
        transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }

      /* Floating Mode Container Positioning */
      .ate-toc.ate-toc-floating {
        max-height: var(--ate-toc-max-height, 400px);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      /* Floating mode width & padding */
      .ate-toc.ate-toc-floating:not(.ate-toc-hover-expand),
      .ate-toc.ate-toc-floating.ate-toc-hover-expand:hover,
      .ate-toc.ate-toc-floating.ate-toc-hover-expand.ate-toc-hovered {
        width: var(--ate-toc-width, 240px);
        border-radius: var(--ate-toc-border-radius, var(--ate-border-radius, 16px));
        padding: var(--ate-toc-padding);
      }

      .ate-toc.ate-toc-floating.ate-toc-hover-expand:not(.ate-toc-hovered):not(:hover) {
        width: var(--ate-toc-collapsed-width, 32px);
        border-radius: var(--ate-toc-collapsed-radius, 16px);
        padding: var(--ate-toc-padding);
      }

      /* Variant: card */
      .ate-toc.ate-toc-variant-card {
        background: var(--ate-toc-bg, var(--ate-surface, #ffffff));
        border: 1px solid var(--ate-toc-border, var(--ate-border, #e2e8f0));
        border-radius: var(--ate-toc-border-radius, var(--ate-border-radius, 12px));
        box-shadow: var(--ate-toc-shadow, 0 4px 20px rgba(0, 0, 0, 0.06));
        padding: var(--ate-toc-padding);
      }

      /* Variant: minimal */
      .ate-toc.ate-toc-variant-minimal {
        background: transparent;
        border: 1px solid transparent;
        box-shadow: none;
        border-radius: var(--ate-toc-border-radius, var(--ate-border-radius, 12px));
        padding: 10px 12px;
      }

      .ate-toc.ate-toc-variant-minimal:hover {
        background: var(--ate-toc-hover-bg, var(--ate-surface, rgba(255, 255, 255, 0.95)));
        border-color: var(--ate-toc-hover-border, var(--ate-border, #e2e8f0));
        box-shadow: var(--ate-toc-hover-shadow, 0 4px 20px rgba(0, 0, 0, 0.06));
      }

      /* Variant: transparent */
      .ate-toc.ate-toc-variant-transparent {
        background: transparent;
        border: none;
        box-shadow: none;
        padding: 0;
      }

      /* Header styling */
      .ate-toc-header {
        font-size: 0.65rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 700;
        color: var(--ate-text-muted, #9ca3af);
        margin-bottom: 10px;
        margin-top: 6px;
        padding-left: 12px;
        padding-right: 0;
        text-align: left;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: opacity 0.2s ease;
      }

      /* List container */
      .ate-toc-list {
        display: flex;
        flex-direction: column;
        gap: var(--ate-toc-text-gap, var(--ate-toc-gap, 2px));
        position: relative;
        transition: gap 0.2s ease;
      }

      /* Base Item (Expanded / Text mode default) */
      .ate-toc-item {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        text-align: left;
        position: relative;
        text-decoration: none;
        background: transparent;
        border: none;
        padding-right: 0;
        cursor: pointer;
        font: inherit;
        width: 100%;
        height: var(--ate-toc-item-hover-height, 22px);
        color: var(--ate-toolbar-button-color, var(--ate-text-secondary, #64748b));
        outline: none;
        box-sizing: border-box;
        border-radius: var(--ate-sub-border-radius, 8px);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        overflow: hidden;
      }

      .ate-toc-item:focus-visible {
        outline: 2px solid var(--ate-primary, #2563eb);
        outline-offset: 1px;
      }

      /* Level Indentations in Text mode */
      .ate-toc-item[data-level="1"] {
        padding-left: 8px;
      }
      .ate-toc-item[data-level="2"] {
        padding-left: 16px;
      }
      .ate-toc-item[data-level="3"] {
        padding-left: 24px;
      }
      .ate-toc-item[data-level="4"] {
        padding-left: 32px;
      }
      .ate-toc-item[data-level="5"] {
        padding-left: 40px;
      }
      .ate-toc-item[data-level="6"] {
        padding-left: 48px;
      }

      /* Item hover overlay & active state (Expanded / Text mode) */
      .ate-toc-item::before {
        content: "";
        position: absolute;
        inset: 0;
        background: var(--ate-primary, #2563eb);
        opacity: 0;
        transition: opacity 0.2s ease;
        border-radius: var(--ate-sub-border-radius, 8px);
        pointer-events: none;
      }

      .ate-toc-item:hover {
        color: var(--ate-toolbar-button-active-color, var(--ate-primary, #2563eb));
        background: var(--ate-toolbar-button-hover-background, transparent);
      }

      .ate-toc-item:hover::before {
        opacity: 0.1;
      }

      .ate-toc-item.ate-toc-active {
        color: var(--ate-toolbar-button-active-color, var(--ate-primary, #2563eb));
        background: var(
          --ate-toolbar-button-active-background,
          var(--ate-primary-light, color-mix(in srgb, var(--ate-primary, #2563eb), transparent 90%))
        );
        font-weight: 600;
      }

      /* Heading Text styling */
      .ate-toc-text {
        font-size: 0.8rem;
        font-weight: 500;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
        flex: 1;
        min-width: 0;
        opacity: 1;
        max-width: 250px;
        transform: translateX(0);
        margin-left: 4px;
        margin-right: 0;
        transition:
          opacity 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94),
          max-width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94),
          transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94),
          margin 0.25s ease;
      }

      /* SVG Rect Dash styling (Hidden in Text mode) */
      .ate-toc-dash {
        display: none;
        height: 3px;
        color: var(--ate-toc-dash-color, var(--ate-border, #cbd5e1));
        flex-shrink: 0;
        vertical-align: middle;
        overflow: visible;
        transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }

      /* --- COLLAPSED NOTION MODE (Dashes only, when hover-expand is active & not hovered) --- */
      .ate-toc.ate-toc-hover-expand:not(.ate-toc-hovered) .ate-toc-header {
        display: none;
      }

      .ate-toc.ate-toc-hover-expand:not(.ate-toc-hovered) .ate-toc-dash {
        display: inline-block;
      }

      .ate-toc.ate-toc-hover-expand:not(.ate-toc-hovered) .ate-toc-item {
        height: var(--ate-toc-item-height, 18px);
        padding-left: 0;
        padding-right: 0;
        background: transparent;
      }

      .ate-toc.ate-toc-hover-expand:not(.ate-toc-hovered) .ate-toc-item::before {
        opacity: 0;
      }

      .ate-toc.ate-toc-hover-expand:not(.ate-toc-hovered) .ate-toc-item:hover .ate-toc-dash,
      .ate-toc.ate-toc-hover-expand:not(.ate-toc-hovered)
        .ate-toc-item.ate-toc-active
        .ate-toc-dash {
        color: var(--ate-primary, #2563eb);
        opacity: 1;
      }

      /* Direction & text collapse for Collapsed RIGHT position */
      .ate-toc.ate-toc-hover-expand.ate-toc-position-right:not(.ate-toc-hovered) .ate-toc-item {
        flex-direction: row-reverse;
        justify-content: flex-start;
      }

      .ate-toc.ate-toc-hover-expand.ate-toc-position-right:not(.ate-toc-hovered) .ate-toc-text {
        opacity: 0;
        max-width: 0;
        transform: translateX(4px);
        margin-right: 0;
      }

      /* Direction & text collapse for Collapsed LEFT position */
      .ate-toc.ate-toc-hover-expand:not(.ate-toc-position-right):not(.ate-toc-hovered)
        .ate-toc-item,
      .ate-toc.ate-toc-hover-expand.ate-toc-position-left:not(.ate-toc-hovered) .ate-toc-item {
        flex-direction: row;
        justify-content: flex-start;
      }

      .ate-toc.ate-toc-hover-expand:not(.ate-toc-position-right):not(.ate-toc-hovered)
        .ate-toc-text,
      .ate-toc.ate-toc-hover-expand.ate-toc-position-left:not(.ate-toc-hovered) .ate-toc-text {
        opacity: 0;
        max-width: 0;
        transform: translateX(-4px);
        margin-left: 0;
      }
    `,
  ],
})
export class AteTableOfContentsComponent implements OnDestroy {
  // Input accepts raw Editor, AteEditorRef, or ID of registered editor
  editor = input<Editor | AteEditorRef | string | null | undefined>(null);

  // Optional custom title (if not provided, uses i18n translation)
  title = input<string | null>(null);

  // Whether to show the header title
  showTitle = input<boolean>(true);

  // Layout mode: floating on fixed position or inline inside parent container
  floating = input<boolean>(true);

  // Positioning mode when floating: 'fixed' (relative to viewport, default) or 'absolute' (relative to parent container)
  positionMode = input<"absolute" | "fixed">("fixed");

  // Floating position: 'right' | 'left'
  position = input<"left" | "right">("right");

  // Visual variant: 'minimal' | 'card' | 'transparent'
  variant = input<AteTocVariant>("minimal");

  // Notion-style hover expansion (collapses text into dashes until hovered)
  hoverExpand = input<boolean>(true);

  // Maximum heading level depth to include (1-6, default: 6)
  maxDepth = input<number, number | string>(6, {
    transform: (v: number | string) => {
      const parsed = typeof v === "string" ? parseInt(v, 10) : v;
      if (isNaN(parsed)) {
        return 6;
      }
      return Math.min(Math.max(1, parsed), 6);
    },
  });

  private readonly registry = inject(AteEditorRegistry);
  private readonly i18n = inject(AteI18nService);

  // Helper method for exact native SVG dash width per heading level
  dashWidth(level: number): number {
    switch (level) {
      case 1:
        return 16;
      case 2:
        return 12;
      case 3:
        return 8;
      case 4:
        return 6;
      case 5:
        return 4;
      default:
        return 3;
    }
  }

  // Computed header title with fallback to i18n
  readonly headerTitle = computed(() => {
    const custom = this.title();
    if (custom !== null && custom !== undefined) {
      return custom;
    }
    return this.i18n.editor().tableOfContents;
  });

  // Resolved editor instance
  readonly resolvedEditor = computed(() => {
    const val = this.editor();
    if (!val) {
      return this.registry.activeEditor()?.editor || null;
    }
    if (val instanceof AteEditorRef) {
      return val.editor;
    }
    if (typeof val === "string") {
      return this.registry.get(val)?.editor || null;
    }
    return val;
  });

  // Table of Contents items
  readonly items = signal<AteTocItem[]>([]);

  // Distinct mouse hover and keyboard focus state tracking
  isMouseHovered = signal<boolean>(false);
  isFocused = signal<boolean>(false);
  readonly isExpanded = computed(() => this.isMouseHovered() || this.isFocused());

  constructor() {
    // React strictly to editor instance changes without tracking internal signal updates
    effect(() => {
      const editor = this.resolvedEditor();
      untracked(() => {
        if (editor) {
          this.bindEditorEvents(editor);
          this.updateHeadings(editor);
        } else {
          this.items.set([]);
        }
      });
    });
  }

  ngOnDestroy() {
    const editor = this.resolvedEditor();
    if (editor) {
      this.unbindEditorEvents(editor);
    }
  }

  @HostListener("window:scroll", [])
  @HostListener("window:resize", [])
  onScroll() {
    this.checkActiveHeading();
  }

  // Handle mouse hover state independently
  setMouseHover(hovered: boolean) {
    this.isMouseHovered.set(hovered);
  }

  // Handle keyboard focus state independently
  setFocused(focused: boolean) {
    this.isFocused.set(focused);
  }

  // Navigate to heading on click
  scrollToHeading(item: AteTocItem, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const editor = this.resolvedEditor();
    if (!editor || !editor.view) {
      return;
    }

    try {
      // 1. Position cursor inside the heading text (item.pos + 1 points to inline text)
      const targetPos = Math.min(item.pos + 1, editor.state.doc.content.size);
      editor.commands.setTextSelection(targetPos);
      editor.commands.focus();
    } catch (_e) {
      // Safe-guard against position selection errors
    }

    // 2. Smoothly scroll DOM node into view
    setTimeout(() => {
      try {
        const domNode = editor.view.nodeDOM(item.pos) as HTMLElement;
        if (domNode) {
          domNode.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } catch (_e) {
        // Safe-guard
      }
    }, 10);
  }

  private bindEditorEvents(editor: Editor) {
    this.unbindEditorEvents(editor);
    editor.on("update", this.onEditorUpdate);
    editor.on("selectionUpdate", this.onEditorUpdate);
  }

  private unbindEditorEvents(editor: Editor) {
    editor.off("update", this.onEditorUpdate);
    editor.off("selectionUpdate", this.onEditorUpdate);
  }

  private readonly onEditorUpdate = () => {
    const editor = this.resolvedEditor();
    if (editor) {
      this.updateHeadings(editor);
    }
  };

  private updateHeadings(editor: Editor) {
    const nextItems: AteTocItem[] = [];

    try {
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "heading") {
          const text = node.textContent.trim();
          const level = node.attrs["level"] || 1;

          const maxDepthLevel = this.maxDepth();
          if (text && level <= maxDepthLevel) {
            nextItems.push({
              text,
              level,
              pos,
              id: `heading-${pos}`,
              active: false,
            });
          }
        }
      });
    } catch (_e) {
      // Safe guard against document access issues
    }

    untracked(() => {
      this.items.set(nextItems);
      this.checkActiveHeading();
    });
  }

  private checkActiveHeading() {
    // Active heading scroll tracking only applies to floating TOC mode
    if (!this.floating()) {
      return;
    }

    const editor = this.resolvedEditor();
    if (!editor || !editor.view) {
      return;
    }

    untracked(() => {
      const currentItems = this.items();
      if (currentItems.length === 0) {
        return;
      }

      const headingsWithDom = currentItems
        .map(item => {
          try {
            const dom = editor.view.nodeDOM(item.pos) as HTMLElement;
            return { item, dom };
          } catch (_e) {
            return { item, dom: null };
          }
        })
        .filter((entry): entry is { item: AteTocItem; dom: HTMLElement } => entry.dom !== null);

      if (headingsWithDom.length === 0) {
        return;
      }

      const windowHeight = typeof window !== "undefined" ? window.innerHeight : 800;
      let activeItem: AteTocItem | null = null;

      for (let i = headingsWithDom.length - 1; i >= 0; i--) {
        const { item, dom } = headingsWithDom[i];
        const rect = dom.getBoundingClientRect();

        if (rect.top <= windowHeight * 0.35) {
          activeItem = item;
          break;
        }
      }

      if (!activeItem && headingsWithDom.length > 0) {
        activeItem = headingsWithDom[0].item;
      }

      if (activeItem) {
        const updated = currentItems.map(item => ({
          ...item,
          active: item.id === activeItem!.id,
        }));

        const isDifferent = updated.some((item, idx) => item.active !== currentItems[idx].active);
        if (isDifferent) {
          this.items.set(updated);
        }
      }
    });
  }
}
