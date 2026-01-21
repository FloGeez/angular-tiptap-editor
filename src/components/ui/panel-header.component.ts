import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PanelButtonComponent } from "./panel-button.component";

@Component({
  selector: "app-panel-header",
  standalone: true,
  imports: [CommonModule, PanelButtonComponent],
  template: `
    <div class="panel-header">
      <div class="header-content">
        <div class="logo">
          <span class="material-symbols-outlined">{{ icon() }}</span>
          <h1>{{ title() }}</h1>
        </div>
        <div class="header-actions">
          <ng-content select="[actions]"></ng-content>
          <app-panel-button icon="close" variant="danger" tooltip="Close" (panelClick)="headerClose.emit()" />
        </div>
      </div>
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      .panel-header {
        background: var(--app-header-bg);
        border-bottom: 1px solid var(--app-border);
        border-radius: 16px 16px 0 0;
        flex-shrink: 0;
      }

      .header-content {
        padding: 1rem 1.25rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .logo {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .logo .material-symbols-outlined {
        font-size: 24px;
        color: var(--primary-color);
      }

      .logo h1 {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-main);
        margin: 0;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      /* Dark mode support - Now handled by global variables */
    `,
  ],
})
export class PanelHeaderComponent {
  title = input.required<string>();
  icon = input.required<string>();
  headerClose = output<void>();
}
