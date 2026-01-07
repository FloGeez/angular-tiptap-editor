import { Component, inject, computed, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { CodeGeneratorService } from "../services/code-generator.service";
import { AppI18nService } from "../services/app-i18n.service";
import { ActionButtonComponent } from "./ui";

@Component({
  selector: "app-code-view",
  standalone: true,
  imports: [CommonModule, ActionButtonComponent],
  template: `
    <div class="code-view">
      <div class="code-header">
        <div class="code-title">
          <span class="material-symbols-outlined">integration_instructions</span>
          <span>{{ appI18n.titles().generatedCode }}</span>
        </div>
        <app-action-button
          [icon]="isCopied() ? 'check' : 'content_copy'"
          [label]="isCopied() ? appI18n.ui().copied : appI18n.ui().copy"
          [tooltip]="appI18n.tooltips().copyGeneratedCode"
          [variant]="isCopied() ? 'success' : 'default'"
          (onClick)="copyCode()"
        />
      </div>

      <div class="code-container">
        <pre class="code-block"><code>{{ generatedCode() }}</code></pre>
      </div>
    </div>
  `,
  styles: [
    `
      /* Mode Code - Largeur limitée */
      .code-view {
        background: var(--app-surface);
        border-radius: 12px;
        border: 1px solid var(--app-border);
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        max-width: 100%;
        animation: fadeIn 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .code-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        background: var(--app-header-bg);
        border-bottom: 1px solid var(--app-border);
      }

      .code-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
        color: var(--text-main);
        font-size: 0.9rem;
      }

      .code-title .material-symbols-outlined {
        font-size: 18px;
        color: var(--primary-color);
      }

      .code-container {
        max-height: 70vh;
        overflow-y: auto;
        overflow-x: auto;
        background: #1e293b;
        color: #e2e8f0;
        padding: 16px;
        border-radius: 8px;
        font-family: "Courier New", monospace;
        font-size: 14px;
        line-height: 1.5;
        white-space: pre-wrap;
        max-width: 100%;
        box-sizing: border-box;
        word-wrap: break-word;
      }

      .code-block {
        margin: 0;
        padding: 1.5rem;
        font-family: "Fira Code", "Monaco", "Menlo", "Ubuntu Mono", monospace;
        font-size: 14px;
        line-height: 1.6;
        color: #e2e8f0;
        background: transparent;
        white-space: pre;
        word-wrap: break-word;
        max-width: 100%;
      }

      /* Coloration syntaxique */
      .code-container .keyword {
        color: #f472b6;
        font-weight: 600;
      }

      .code-container .type {
        color: #60a5fa;
        font-weight: 500;
      }

      .code-container .string {
        color: #34d399;
      }

      .code-container .comment {
        color: #6b7280;
        font-style: italic;
      }

      .code-container .decorator {
        color: #fbbf24;
        font-weight: 600;
      }

      .code-container .punctuation {
        color: #94a3b8;
      }

      /* Scrollbar personnalisée pour le code */
      .code-container::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      .code-container::-webkit-scrollbar-track {
        background: #334155;
      }

      .code-container::-webkit-scrollbar-thumb {
        background: #475569;
        border-radius: 4px;
      }

      .code-container::-webkit-scrollbar-thumb:hover {
        background: #64748b;
      }

      /* Dark mode support - Now handled by global variables */
    `,
  ],
})
export class CodeViewComponent {
  private codeGeneratorService = inject(CodeGeneratorService);
  readonly appI18n = inject(AppI18nService);

  readonly generatedCode = computed(() =>
    this.codeGeneratorService.generateCode()
  );

  isCopied = signal(false);

  async copyCode() {
    const success = await this.codeGeneratorService.copyCode();
    if (success) {
      this.isCopied.set(true);
      setTimeout(() => this.isCopied.set(false), 2000);
    }
  }
}
