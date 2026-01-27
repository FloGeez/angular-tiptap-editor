import { Component, ChangeDetectionStrategy, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AppI18nService } from "../../services/app-i18n.service";

@Component({
  selector: "app-ai-loading-node",
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="ai-loading-inline">
      <span class="ai-loading-icon material-symbols-outlined">psychology</span>
      <span class="ai-loading-text">{{ t().items.aiThinking }}</span>
      <span class="ai-loading-glimmer"></span>
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-block;
        vertical-align: middle;
      }

      .ai-loading-inline {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 4px 12px;
        background: var(--ate-bg-secondary);
        border: 1px solid var(--ate-primary);
        border-radius: 20px;
        color: var(--ate-primary);
        font-size: 0.85rem;
        font-weight: 500;
        position: relative;
        overflow: hidden;
        user-select: none;
        box-shadow: 0 0 10px rgba(var(--ate-primary-rgb, 37, 99, 235), 0.2);
        animation: ai-pulse 2s infinite ease-in-out;
      }

      .ai-loading-icon {
        font-size: 18px;
        animation: ai-spin 2s linear infinite;
      }

      .ai-loading-text {
        letter-spacing: 0.02em;
      }

      .ai-loading-glimmer {
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
        animation: ai-glimmer 1.5s infinite;
      }

      @keyframes ai-pulse {
        0%,
        100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.8;
          transform: scale(0.98);
        }
      }

      @keyframes ai-spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes ai-glimmer {
        from {
          left: -100%;
        }
        to {
          left: 100%;
        }
      }
    `,
  ],
})
export class AiLoadingNodeComponent {
  protected t = inject(AppI18nService).translations;
}
