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

export interface AteTocItem {
  text: string;
  level: number;
  pos: number;
  id: string;
  active: boolean;
}

/**
 * Table of Contents Component (Notion-style)
 * Dynamically extracts headings from the active editor and displays them
 * as minimal dashes that expand into text on hover.
 */
@Component({
  selector: "ate-table-of-contents",
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="ate-toc"
      [class.ate-toc-hovered]="isHovered()"
      (mouseenter)="setHover(true)"
      (mouseleave)="setHover(false)"
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
              [attr.data-level]="item.level"
              (click)="scrollToHeading(item, $event)"
              [title]="item.text">
              <!-- Notion-style visual dash -->
              <span class="ate-toc-dash" aria-hidden="true"></span>

              <!-- Full heading text (fades in on hover) -->
              <span class="ate-toc-text">{{ item.text }}</span>
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .ate-toc {
        font-family: inherit;
        user-select: none;
        background: transparent;
        border-radius: var(--ate-border-radius, 12px);
        padding: 12px;
        width: 100%;
        box-sizing: border-box;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .ate-toc-header {
        font-size: 0.65rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 700;
        color: var(--ate-text-muted, var(--text-muted, #9ca3af));
        margin-bottom: 8px;
        padding-left: 8px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .ate-toc-hovered .ate-toc-header {
        opacity: 1;
      }

      .ate-toc-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        position: relative;
      }

      .ate-toc-item {
        display: flex;
        align-items: center;
        position: relative;
        text-decoration: none;
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
        font: inherit;
        text-align: left;
        width: 100%;
        height: 24px;
        color: var(--ate-text-secondary, var(--text-secondary, #64748b));
        outline: none;
        box-sizing: border-box;
        transition: color 0.2s ease, background-color 0.2s ease;
        border-radius: var(--ate-sub-border-radius, 4px);
      }

      /* Indentations & Dash sizes based on heading levels */
      .ate-toc-item[data-level="1"] {
        padding-left: 0px;
      }
      .ate-toc-item[data-level="1"] .ate-toc-dash {
        width: 24px;
      }

      .ate-toc-item[data-level="2"] {
        padding-left: 12px;
      }
      .ate-toc-item[data-level="2"] .ate-toc-dash {
        width: 16px;
      }

      .ate-toc-item[data-level="3"] {
        padding-left: 24px;
      }
      .ate-toc-item[data-level="3"] .ate-toc-dash {
        width: 8px;
      }

      /* Dash styling */
      .ate-toc-dash {
        height: 2px;
        background-color: var(--ate-border, var(--app-border, #e2e8f0));
        border-radius: 1px;
        flex-shrink: 0;
        transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }

      /* Text styling (Notion style: hidden/minimized by default) */
      .ate-toc-text {
        font-size: 0.8rem;
        font-weight: 500;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
        opacity: 0;
        max-width: 0;
        transform: translateX(-4px);
        transition: opacity 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                    max-width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                    transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                    margin-left 0.25s ease;
        margin-left: 0;
      }

      /* Active item highlight (when not hovered, the dash is active) */
      .ate-toc-item.ate-toc-active .ate-toc-dash {
        background-color: var(--ate-primary, var(--primary-color, #2563eb));
        height: 3px;
        box-shadow: 0 0 4px rgba(var(--ate-primary-rgb, var(--primary-color-rgb, 37, 99, 235)), 0.4);
      }

      .ate-toc-item.ate-toc-active .ate-toc-text {
        color: var(--ate-primary, var(--primary-color, #2563eb));
        font-weight: 600;
      }

      /* Hover effects when the user hovers over the TOC container */
      .ate-toc-hovered .ate-toc-dash {
        opacity: 0.2;
        width: 4px !important; /* Turn dashes into dots when text appears */
        height: 4px !important;
        border-radius: 50%;
        margin-right: 6px;
      }

      .ate-toc-hovered .ate-toc-text {
        opacity: 1;
        max-width: 250px;
        transform: translateX(0);
        margin-left: 2px;
      }

      /* Hover effect on individual items for micro-interaction */
      .ate-toc-item:hover {
        color: var(--ate-primary, var(--primary-color, #2563eb));
        background-color: var(--ate-surface-secondary, var(--app-surface-hover, rgba(37, 99, 235, 0.05)));
      }

      .ate-toc-hovered .ate-toc-item:hover .ate-toc-dash {
        opacity: 1;
        background-color: var(--ate-primary, var(--primary-color, #2563eb));
      }
    `,
  ],
})
export class AteTableOfContentsComponent implements OnDestroy {
  // Input accepts raw Editor, AteEditorRef, or ID of registered editor
  editorInput = input<Editor | AteEditorRef | string | null | undefined>(null, { alias: "editor" });

  // Optional custom title (if not provided, uses i18n translation)
  title = input<string | null>(null);

  // Whether to show the header title
  showTitle = input<boolean>(true);

  private readonly registry = inject(AteEditorRegistry);
  private readonly i18n = inject(AteI18nService);

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
    const val = this.editorInput();
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

  // Track if mouse is currently hovering over the TOC container
  isHovered = signal<boolean>(false);

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

  // Handle manual hovering on container
  setHover(hovered: boolean) {
    this.isHovered.set(hovered);
  }

  // Navigate to heading on click
  scrollToHeading(item: AteTocItem, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const editor = this.resolvedEditor();
    if (!editor || !editor.view) return;

    try {
      const domNode = editor.view.nodeDOM(item.pos) as HTMLElement;
      if (domNode) {
        domNode.scrollIntoView({ behavior: "smooth", block: "start" });
        editor.commands.focus(item.pos);
      }
    } catch (e) {
      // Safe-guard in case nodeDOM is temporarily unavailable
    }
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

          if (text) {
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
    } catch (e) {
      // Safe guard against document access issues
    }

    untracked(() => {
      this.items.set(nextItems);
      this.checkActiveHeading();
    });
  }

  private checkActiveHeading() {
    const editor = this.resolvedEditor();
    if (!editor || !editor.view) return;

    untracked(() => {
      const currentItems = this.items();
      if (currentItems.length === 0) return;

      const headingsWithDom = currentItems
        .map(item => {
          try {
            const dom = editor.view.nodeDOM(item.pos) as HTMLElement;
            return { item, dom };
          } catch (e) {
            return { item, dom: null };
          }
        })
        .filter((h): h is { item: AteTocItem; dom: HTMLElement } => h.dom !== null);

      if (headingsWithDom.length === 0) return;

      const scrollThreshold = 120;
      let activeItem = headingsWithDom[0].item;

      for (const h of headingsWithDom) {
        const rect = h.dom.getBoundingClientRect();
        if (rect.top <= scrollThreshold) {
          activeItem = h.item;
        } else {
          break;
        }
      }

      let changed = false;
      const updatedItems = currentItems.map(item => {
        const isActive = item.pos === activeItem.pos;
        if (item.active !== isActive) {
          changed = true;
        }
        return { ...item, active: isActive };
      });

      if (changed) {
        this.items.set(updatedItems);
      }
    });
  }
}
