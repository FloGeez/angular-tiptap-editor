import { Component, inject, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { EditorConfigurationService } from "../services/editor-configuration.service";
import { CodeGeneratorService } from "../services/code-generator.service";
import { AteI18nService } from "angular-tiptap-editor";
import { ToastService } from "../services/toast.service";
import { AppI18nService } from "../services/app-i18n.service";
import { ActionButtonComponent } from "./ui";
import { CodeViewComponent } from "./code-view.component";

type ContentTab = "html" | "markdown" | "code";

@Component({
  selector: "app-content-view",
  standalone: true,
  imports: [CommonModule, ActionButtonComponent, CodeViewComponent],
  template: `
    <div class="content-view">
      <!-- Header -->
      <div class="cv-header">
        <!-- Tab switcher -->
        <div class="cv-tabs">
          <button
            class="cv-tab"
            [class.active]="activeTab() === 'code'"
            (click)="setTab('code')"
            id="content-tab-code">
            <span class="cv-tab-dot code-dot"></span>
            Code
          </button>
          <button
            class="cv-tab"
            [class.active]="activeTab() === 'markdown'"
            (click)="setTab('markdown')"
            id="content-tab-markdown">
            <span class="cv-tab-dot md-dot"></span>
            MD
          </button>
          <button
            class="cv-tab"
            [class.active]="activeTab() === 'html'"
            (click)="setTab('html')"
            id="content-tab-html">
            <span class="cv-tab-dot html-dot"></span>
            HTML
          </button>
        </div>

        <!-- Actions -->
        <div class="cv-actions">
          <app-action-button
            id="content-copy-btn"
            [icon]="isCopied() ? 'check' : 'content_copy'"
            [label]="isCopied() ? appI18n.ui().copied : appI18n.ui().copy"
            [variant]="isCopied() ? 'success' : 'default'"
            [tooltip]="currentCopyLabel()"
            (buttonClick)="copyContent()" />
          <app-action-button
            id="content-download-btn"
            icon="download"
            [label]="currentExt()"
            [tooltip]="currentDownloadLabel()"
            (buttonClick)="downloadContent()" />
        </div>
      </div>

      <!-- Tab indicator bar -->
      <div class="cv-tab-indicator" [class]="activeTab() + '-indicator'"></div>

      <!-- Content area -->
      <div class="cv-body">
        <div class="cv-meta">
          <span class="cv-meta-format">{{ currentFormatLabel() }}</span>
          <span class="cv-meta-chars">
            {{ currentContent().length }} {{ appI18n.contentView().characters }}
          </span>
        </div>

        <div class="cv-code-wrapper">
          @if (activeTab() === "code") {
            <app-code-view [code]="currentContent()" />
          } @else if (activeTab() === "html") {
            <pre><code class="language-html">{{ currentContent() }}</code></pre>
          } @else if (activeTab() === "markdown") {
            <pre><code class="language-markdown">{{ currentContent() }}</code></pre>
          } @else {
            <pre class="plain-text-pre">{{ currentContent() }}</pre>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .content-view {
        display: flex;
        flex-direction: column;
        flex: 1;
        height: 100%;
        background: #0f172a;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        overflow: hidden;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* ── Header ─────────────────────────────────────────────── */
      .cv-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 16px;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(8px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        position: relative;
        z-index: 10;
      }

      /* ── Tabs ───────────────────────────────────────────────── */
      .cv-tabs {
        display: flex;
        gap: 4px;
        height: 100%;
        align-items: flex-end;
      }

      .cv-tab {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 12px;
        height: 38px;
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        color: #64748b;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        bottom: -1px;
      }

      .cv-tab:hover {
        color: #94a3b8;
      }

      .cv-tab.active {
        color: #f8fafc;
      }

      .cv-tab-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        display: inline-block;
      }

      .code-dot {
        background: #a855f7;
      }
      .html-dot {
        background: #f97316;
      }
      .md-dot {
        background: #6366f1;
      }

      /* Tab indicator line */
      .cv-tab-indicator {
        height: 2px;
        width: 100%;
        background: transparent;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .html-indicator {
        background: linear-gradient(to right, #f97316, #fb923c);
      }
      .markdown-indicator {
        background: linear-gradient(to right, #6366f1, #818cf8);
      }

      .code-indicator {
        background: linear-gradient(to right, #a855f7, #c084fc);
      }

      /* ── Actions ────────────────────────────────────────────── */
      .cv-actions {
        display: flex;
        gap: 6px;
        align-items: center;
        flex-shrink: 0;
      }

      /* ── Body ───────────────────────────────────────────────── */
      .cv-body {
        flex: 1;
        overflow: auto;
        display: flex;
        flex-direction: column;
        min-height: 0;
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
      }

      .cv-body::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      .cv-body::-webkit-scrollbar-track {
        background: transparent;
      }
      .cv-body::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.08);
        border-radius: 10px;
      }

      .cv-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px 4px;
        flex-shrink: 0;
      }

      .cv-meta-format {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: rgba(148, 163, 184, 0.5);
        font-family: "Fira Code", monospace;
      }

      .cv-meta-chars {
        font-size: 10px;
        color: rgba(100, 116, 139, 0.7);
        font-family: "Fira Code", monospace;
      }

      /* ── Pre / Code block ───────────────────────────────────── */
      .cv-pre {
        flex: 1;
        margin: 0;
        padding: 8px 12px 16px;
        font-family: "Fira Code", "JetBrains Mono", "Monaco", "Consolas", monospace;
        font-size: 13px;
        line-height: 1.7;
        color: #94a3b8;
        white-space: pre-wrap;
        word-break: break-all;
        overflow-wrap: break-word;
      }

      .cv-pre code {
        font-family: inherit;
        color: inherit;
        background: none;
        border: none;
        padding: 0;
      }

      /* ── Raw content blocks (HTML / Markdown / TXT tabs) ────── */
      .cv-code-wrapper pre {
        margin: 0;
        padding: 12px 16px 20px;
        font-family: "Fira Code", "JetBrains Mono", "Monaco", "Consolas", monospace;
        font-size: 13px;
        line-height: 1.7;
        color: #94a3b8;
        white-space: pre-wrap;
        word-break: break-all;
        overflow-wrap: break-word;
        background: transparent;
        border: none;
      }

      .cv-code-wrapper pre code {
        font-family: inherit;
        color: inherit;
        background: none;
        border: none;
        padding: 0;
      }

      /* ── Override app-action-btn for the dark panel context ─── */
      .cv-actions ::ng-deep .app-action-btn {
        color: #64748b;
      }

      .cv-actions ::ng-deep .app-action-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #e2e8f0;
      }

      .cv-actions ::ng-deep .app-action-btn.success {
        color: #2dd4bf;
        background: rgba(20, 184, 166, 0.15);
      }
    `,
  ],
})
export class ContentViewComponent {
  private configService = inject(EditorConfigurationService);
  private codeGeneratorService = inject(CodeGeneratorService);
  private toastService = inject(ToastService);
  readonly ateI18n = inject(AteI18nService);
  readonly appI18n = inject(AppI18nService);

  readonly activeTab = signal<ContentTab>("code");
  readonly isCopied = signal(false);

  readonly currentContent = computed(() => {
    const tab = this.activeTab();
    switch (tab) {
      case "code":
        return this.codeGeneratorService.generateCode();
      case "html":
        return this.configService.liveHtml();
      case "markdown":
        return this.configService.liveMarkdown();
    }
  });

  readonly currentFormatLabel = computed(() => {
    switch (this.activeTab()) {
      case "html":
        return "HTML";
      case "markdown":
        return "Markdown";

      case "code":
        return this.appI18n.contentView().angularComponent;
    }
  });

  readonly currentExt = computed(() => {
    switch (this.activeTab()) {
      case "html":
        return ".html";
      case "markdown":
        return ".md";

      case "code":
        return ".ts";
    }
  });

  readonly currentDownloadLabel = computed(() => {
    const labels = this.ateI18n.export();
    switch (this.activeTab()) {
      case "html":
        return labels.downloadHtml;
      case "markdown":
        return labels.downloadMarkdown;

      case "code":
        return this.appI18n.contentView().downloadAngular;
    }
  });

  readonly currentCopyLabel = computed(() => {
    if (this.isCopied()) {
      return this.ateI18n.export().copiedSuccess;
    }
    switch (this.activeTab()) {
      case "code":
        return this.appI18n.ui().copyCode;
      case "html":
        return this.ateI18n.export().copyHtml;
      case "markdown":
        return this.ateI18n.export().copyMarkdown;
    }
  });

  setTab(tab: ContentTab) {
    this.activeTab.set(tab);
  }

  async copyContent() {
    const content = this.currentContent();
    if (!content) {
      return;
    }
    try {
      await navigator.clipboard.writeText(content);
      this.isCopied.set(true);
      this.toastService.success(this.ateI18n.export().copiedSuccess);
      setTimeout(() => this.isCopied.set(false), 2000);
    } catch {
      this.toastService.error(this.appI18n.contentView().copyError);
    }
  }

  async downloadContent() {
    const tab = this.activeTab();
    const content = this.currentContent();
    const configs: Record<ContentTab, { name: string; mime: string }> = {
      code: { name: "tiptap-demo.component.ts", mime: "text/typescript;charset=utf-8" },
      html: { name: "document.html", mime: "text/html;charset=utf-8" },
      markdown: { name: "document.md", mime: "text/markdown;charset=utf-8" },
    };
    try {
      const { name, mime } = configs[tab];
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.toastService.success(this.appI18n.contentView().downloadSuccess);
    } catch {
      this.toastService.error(this.appI18n.contentView().downloadError);
    }
  }
}
