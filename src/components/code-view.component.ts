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
          (buttonClick)="copyCode()" />
      </div>

      <div class="code-editor-wrapper">
        <pre class="code-block"><code>{{ generatedCode() }}</code></pre>
      </div>
    </div>
  `,
  styles: [
    `
      .code-view {
        background: #0f172a;
        border-radius: 12px;
        border: 1px solid var(--app-border);
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        animation: fadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        flex-direction: column;
        flex: 1;
        width: 100%;
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
        padding: 0.75rem 1.25rem;
        background: rgba(255, 255, 255, 0.03);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .code-title {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 500;
        color: #e2e8f0;
        font-size: 0.85rem;
      }

      .code-title .material-symbols-outlined {
        font-size: 20px;
        color: var(--primary-color);
      }

      .code-editor-wrapper {
        flex: 1;
        overflow: auto;
        padding: 1rem;
        background: #0f172a; /* Deep dark background */
      }

      .code-block {
        margin: 0;
        font-family: "Fira Code", "Monaco", "Menlo", "Ubuntu Mono", monospace;
        font-size: 13px;
        line-height: 1.7;
        color: #94a3b8;
        white-space: pre;
      }

      .code-block code {
        font-family: inherit;
        color: inherit;
      }

      /* Scrollbar Styling */
      .code-editor-wrapper::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }

      .code-editor-wrapper::-webkit-scrollbar-track {
        background: transparent;
      }

      .code-editor-wrapper::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        border: 2px solid #0f172a;
      }

      .code-editor-wrapper::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    `,
  ],
})
export class CodeViewComponent {
  private codeGeneratorService = inject(CodeGeneratorService);
  readonly appI18n = inject(AppI18nService);

  readonly generatedCode = computed(() => this.codeGeneratorService.generateCode());

  isCopied = signal(false);

  async copyCode() {
    const success = await this.codeGeneratorService.copyCode();
    if (success) {
      this.isCopied.set(true);
      setTimeout(() => this.isCopied.set(false), 2000);
    }
  }
}
