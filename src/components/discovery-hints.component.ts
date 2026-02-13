import { Component, inject, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { EditorConfigurationService } from "../services/editor-configuration.service";
import { AppI18nService } from "../services/app-i18n.service";

@Component({
  selector: "app-discovery-hints",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="discovery-hints" [class.visible]="isVisible()">
      <!-- Left hint (Theme) -->
      <div class="hint-container left">
        <div class="hint-content">
          <svg class="hint-arrow" viewBox="0 0 60 60">
            <!-- Loopy line pointing to top-left -->
            <path
              d="M35,45 C30,42 20,40 25,25 C30,10 10,18 7,4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              class="arrow-path" />
            <!-- Arrow head pointing to top-left -->
            <path
              d="M4,8 L7,4 L12,6"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              class="arrow-head" />
          </svg>
          <span class="hint-text">{{ appI18n.hints().customize }}</span>
        </div>
      </div>

      <!-- Right hint (Config) -->
      <div class="hint-container right">
        <div class="hint-content">
          <svg class="hint-arrow" viewBox="0 0 60 60">
            <!-- Loopy line pointing to top-right -->
            <path
              d="M25,45 C30,42 40,40 35,25 C30,10 50,18 53,4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              class="arrow-path" />
            <!-- Arrow head pointing to top-right -->
            <path
              d="M56,8 L53,4 L48,6"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              class="arrow-head" />
          </svg>
          <span class="hint-text">{{ appI18n.hints().configure }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .discovery-hints {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 50;
        opacity: 0;
        transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .discovery-hints.visible {
        opacity: 1;
      }

      .hint-container {
        position: absolute;
        top: 70px;
        color: var(--primary-color);
        opacity: 0.8;
        width: 100px;
      }

      .hint-container.left {
        left: 24px;
      }

      .hint-container.right {
        right: 24px;
      }

      .hint-content {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .hint-text {
        font-family: "Segoe UI", "Chalkboard SE", "Marker Felt", "Inter", sans-serif;
        font-size: 0.9rem;
        font-weight: 600;
        transform: rotate(-5deg) translateX(-7px);
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
      }

      .hint-container.right .hint-text {
        transform: rotate(5deg) translateX(7px);
      }

      .hint-arrow {
        width: 60px;
        height: 60px;
        opacity: 0.8;
      }

      .hint-container.left .hint-arrow {
        transform: rotate(10deg) translate(-10px, 7px);
      }

      .hint-container.right .hint-arrow {
        transform: rotate(-10deg) translate(10px, 7px);
      }

      .arrow-path {
        stroke-dasharray: 200;
        stroke-dashoffset: 200;
        animation: drawArrow 1.5s ease-out forwards;
      }
      .arrow-head {
        stroke-dasharray: 200;
        stroke-dashoffset: 200;
        animation: drawArrow 0.2s ease-out forwards;
        animation-delay: 0.3s;
      }

      @keyframes drawArrow {
        to {
          stroke-dashoffset: 0;
        }
      }

      @media (max-width: 1024px) {
        .discovery-hints {
          display: none;
        }
      }
    `,
  ],
})
export class DiscoveryHintsComponent {
  private configService = inject(EditorConfigurationService);
  readonly appI18n = inject(AppI18nService);

  isVisible = computed(() => {
    const state = this.configService.editorState();
    const liveState = this.configService.liveEditorState();
    return (
      state.activePanel === "none" &&
      !state.showCodeMode &&
      !liveState.isFocused &&
      !this.configService.isEditorHovered()
    );
  });
}
