import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ToastService } from "../services/toast.service";

@Component({
  selector: "app-toast-container",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toasts(); track toast.id) {
        <div
          class="toast"
          [class]="toast.type"
          role="alert"
          tabindex="0"
          (click)="dismiss(toast.id)"
          (keydown.enter)="dismiss(toast.id)"
          (keydown.escape)="dismiss(toast.id)">
          <span class="material-symbols-outlined toast-icon">
            @switch (toast.type) {
              @case ("success") {
                check_circle
              }
              @case ("error") {
                error
              }
              @case ("warning") {
                warning
              }
              @default {
                info
              }
            }
          </span>
          <span class="toast-message">{{ toast.message }}</span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .toast-container {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
      }

      .toast {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 20px;
        border-radius: 8px;
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        animation: toast-in 0.3s ease-out;
        pointer-events: auto;
        cursor: pointer;
        max-width: 400px;
      }

      .toast:hover {
        opacity: 0.9;
      }

      .toast.info {
        border-left: 4px solid var(--primary-color);
      }

      .toast.info .toast-icon {
        color: var(--primary-color);
      }

      .toast.success {
        border-left: 4px solid var(--success-text);
      }

      .toast.success .toast-icon {
        color: var(--success-text);
      }

      .toast.warning {
        border-left: 4px solid var(--warning-text);
      }

      .toast.warning .toast-icon {
        color: var(--warning-text);
      }

      .toast.error {
        border-left: 4px solid var(--error-color);
      }

      .toast.error .toast-icon {
        color: var(--error-color);
      }

      .toast-icon {
        font-size: 20px;
      }

      .toast-message {
        font-size: 14px;
        color: var(--text-primary);
      }

      @keyframes toast-in {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class ToastContainerComponent {
  private toastService = inject(ToastService);

  toasts = this.toastService.toasts;

  dismiss(id: number) {
    this.toastService.dismiss(id);
  }
}
