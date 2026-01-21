import { Component, inject, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { EditorConfigurationService } from "../services/editor-configuration.service";
import { AppI18nService } from "../services/app-i18n.service";
import { PanelHeaderComponent } from "./ui";

@Component({
  selector: "app-state-debug",
  standalone: true,
  imports: [CommonModule, PanelHeaderComponent],
  template: `
    <div class="inspector-panel" [class.open]="editorState().showInspector">
      <app-panel-header [title]="appI18n.translations().ui.inspector" icon="monitoring" (closeClick)="close()">
        <div actions class="header-status-area">
          <div class="monitor-status">
            <div class="latency-dot"></div>
            <span>{{ appI18n.translations().status.ready }}</span>
          </div>
          <span class="app-badge active">Snapshot Engine</span>
        </div>
      </app-panel-header>

      <div class="inspector-content">
        <!-- Selection Insights -->
        <div class="debug-section">
          <div class="section-label">
            <span class="material-symbols-outlined">ads_click</span>
            Selection Info
          </div>
          <div class="selection-box">
            <div class="info-pill">
              <span class="pill-key">Range</span>
              <span class="pill-val">{{ state().selection.from }} → {{ state().selection.to }}</span>
            </div>
            <div class="info-pill">
              <span class="pill-key">Type</span>
              <span class="pill-val">{{ state().selection.type }}</span>
            </div>
            @if (state().selection.empty) {
              <div class="info-pill">
                <span class="pill-key">Empty</span>
                <span class="pill-val">true</span>
              </div>
            }
          </div>
        </div>

        <!-- Live Hierarchy -->
        <div class="debug-section">
          <div class="section-label">
            <span class="material-symbols-outlined">account_tree</span>
            Active Nodes
          </div>
          <div class="hierarchy-path">
            <div class="path-item root">doc</div>
            @for (item of hierarchy(); track $index) {
              <div class="path-sep">/</div>
              <div class="path-item" [class.highlight]="item.active">
                {{ item.name }}
                @if (item.attrs?.level) {
                  <span class="attr-tag">h{{ item.attrs?.level }}</span>
                }
              </div>
            }
          </div>
        </div>

        <!-- Quick Marks Discovery -->
        <div class="debug-section">
          <div class="section-label">
            <span class="material-symbols-outlined">discover_tune</span>
            Active Marks
          </div>
          <div class="marks-cloud">
            @for (mark of activeMarks(); track mark.name) {
              <div class="mark-tag active">
                <span class="material-symbols-outlined">check_circle</span>
                {{ mark.name }}
                @if (mark.value !== true) {
                  <span class="attr-tag">{{ mark.value }}</span>
                }
              </div>
            } @empty {
              <div class="empty-state">No marks active at cursor</div>
            }
          </div>
        </div>
      </div>
    </div>

    <!-- Toggle Button (Self-managed) -->
    @if (!editorState().showInspector) {
      <button class="open-panel-btn right bottom" (click)="open()" [title]="appI18n.translations().ui.openInspector">
        <span class="material-symbols-outlined">monitoring</span>
      </button>
    }
  `,
  styles: [
    `
      .inspector-panel {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: var(--app-surface);
        border-top: 1px solid var(--app-border);
        z-index: 1000;
        display: flex;
        flex-direction: column;
        transform: translateY(100%);
        transition: transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.15);
      }

      .inspector-panel.open {
        transform: translateY(0);
      }

      .header-status-area {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        margin-right: 1.25rem;
      }

      .monitor-status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--text-secondary);
      }

      .latency-dot {
        width: 8px;
        height: 8px;
        background: #10b981;
        border-radius: 50%;
        box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
        animation: blink 2s infinite;
      }

      @keyframes blink {
        0%,
        100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.5;
          transform: scale(1.1);
        }
      }

      .inspector-content {
        flex: 1;
        padding: 1.5rem 2rem;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 2.5rem;
        overflow-y: auto;
        background: var(--app-bg);
        scrollbar-width: thin;
        scrollbar-color: var(--app-border) transparent;
      }

      .debug-section {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .section-label {
        font-size: 0.75rem;
        color: var(--text-secondary);
        text-transform: uppercase;
        font-weight: 700;
        letter-spacing: 0.1em;
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }

      .section-label .material-symbols-outlined {
        font-size: 1.1rem;
        color: var(--primary-color);
        opacity: 0.8;
      }

      .selection-box {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .info-pill {
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: 12px;
        padding: 10px 16px;
        display: flex;
        gap: 12px;
        font-size: 0.85rem;
        font-family: "Fira Code", "JetBrains Mono", monospace;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        transition: all 0.2s ease;
      }

      .info-pill:hover {
        border-color: var(--text-muted);
        transform: translateY(-1px);
      }

      .pill-key {
        color: var(--text-secondary);
        font-weight: 400;
        font-size: 0.8rem;
      }
      .pill-val {
        color: var(--primary-color);
        font-weight: 700;
      }

      .hierarchy-path {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        padding: 12px 16px;
        border-radius: 14px;
        font-size: 0.85rem;
        font-family: "Fira Code", "JetBrains Mono", monospace;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      }

      .path-item {
        color: var(--text-secondary);
        transition: all 0.2s;
      }

      .path-item.highlight {
        color: var(--text-primary);
        font-weight: 700;
      }

      .path-sep {
        color: var(--app-border);
        font-weight: 300;
      }

      .attr-tag {
        background: var(--primary-light);
        color: var(--primary-color);
        font-size: 0.65rem;
        padding: 2px 6px;
        border-radius: 6px;
        margin-left: 6px;
        font-weight: 800;
      }

      .marks-cloud {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .mark-tag {
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        padding: 10px 16px;
        border-radius: 12px;
        font-size: 0.85rem;
        transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        font-family: "Fira Code", "JetBrains Mono", monospace;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        color: var(--text-secondary);
      }

      .mark-tag.active {
        border-color: var(--primary-color);
        color: var(--primary-color);
        background: var(--primary-light);
        box-shadow: 0 4px 15px rgba(var(--primary-color-rgb), 0.15);
        transform: translateY(-2px);
      }

      .mark-tag .material-symbols-outlined {
        font-size: 1.1rem;
      }

      .empty-state {
        font-size: 0.85rem;
        color: var(--text-muted);
        font-style: italic;
        display: flex;
        align-items: center;
        height: 48px;
      }

      @media (max-width: 768px) {
        .inspector-content {
          grid-template-columns: 1fr;
          gap: 2rem;
        }
      }
    `,
  ],
})
export class StateDebugComponent {
  private configService = inject(EditorConfigurationService);
  readonly appI18n = inject(AppI18nService);

  readonly state = this.configService.liveEditorState;
  readonly editorState = this.configService.editorState;

  // Track dynamic hierarchy from state
  readonly hierarchy = computed(() => {
    const s = this.state();
    const items = [];

    // Table context
    if (s.nodes.isTable) {
      items.push({ name: "table", active: true });
    }
    if (s.nodes.isTableCell) {
      items.push({ name: "cell", active: true });
    }

    // Node content
    if (s.nodes.h1 || s.nodes.h2 || s.nodes.h3) {
      items.push({
        name: "heading",
        active: true,
        attrs: { level: s.nodes.h1 ? 1 : s.nodes.h2 ? 2 : s.nodes.h3 ? 3 : 0 },
      });
    }
    if (s.nodes.isBulletList) {
      items.push({ name: "bulletList", active: true });
    }
    if (s.nodes.isOrderedList) {
      items.push({ name: "orderedList", active: true });
    }
    if (s.nodes.isBlockquote) {
      items.push({ name: "blockquote", active: true });
    }
    if (s.nodes.isCodeBlock) {
      items.push({ name: "codeBlock", active: true });
    }
    if (s.nodes.isImage) {
      items.push({ name: "image", active: true });
    }
    if (
      (s.nodes as unknown as { taskList: boolean; taskItem: boolean }).taskList ||
      (s.nodes as unknown as { taskList: boolean; taskItem: boolean }).taskItem
    ) {
      items.push({
        name: (s.nodes as unknown as { taskList: boolean; taskItem: boolean }).taskList ? "taskList" : "taskItem",
        active: true,
      });
    }

    // Add leaf node if not already added by specialized checks
    const currentLeaf = s.nodes.activeNodeName || "paragraph";
    const alreadyAdded = items.some(i => i.name === currentLeaf);
    if (!alreadyAdded) {
      items.push({ name: currentLeaf, active: s.selection.type === "text" });
    }

    return items;
  });

  // Dynamic discovery of active marks (including colors and highlights)
  readonly activeMarks = computed(() => {
    const m = this.state().marks;
    return Object.keys(m)
      .map(key => ({ name: key, value: (m as Record<string, unknown>)[key] }))
      .filter(mark => mark.value === true || (typeof mark.value === "string" && mark.value.length > 0));
  });

  open() {
    this.configService.toggleInspector();
  }

  close() {
    this.configService.toggleInspector();
  }
}
