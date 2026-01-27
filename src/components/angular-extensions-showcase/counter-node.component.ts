import { Component, ChangeDetectionStrategy, computed } from "@angular/core";
import { AteAngularNodeView } from "angular-tiptap-editor";
import { ActionButtonComponent } from "../ui/action-button.component";

/**
 * Counter Component - Exemple TipTap-Aware
 *
 * Style épuré qui respecte le design system de la demo
 */
@Component({
  selector: "app-counter-node",
  standalone: true,
  imports: [ActionButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="counter-container" [class.selected]="selected()">
      <div class="counter-header">
        <span class="counter-label">Counter Component</span>
        @if (selected()) {
          <span class="selected-badge">Selected</span>
        }
      </div>

      <div class="counter-body">
        <div class="counter-display">
          <span class="counter-value">{{ count() }}</span>
        </div>

        <div class="counter-actions">
          <app-action-button
            icon="remove"
            tooltip="Decrease"
            variant="danger"
            (buttonClick)="decrement()" />

          <app-action-button icon="refresh" tooltip="Reset to 0" (buttonClick)="reset()" />

          <app-action-button
            icon="add"
            tooltip="Increase"
            variant="success"
            (buttonClick)="increment()" />
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .counter-container {
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: 8px;
        padding: 1rem;
        margin: 0.5rem 0;
        transition: all 0.2s;
      }

      .counter-container.selected {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb), 0.1);
      }

      .counter-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.75rem;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid var(--app-border);
      }

      .counter-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .selected-badge {
        font-size: 0.75rem;
        background: var(--primary-gradient);
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-weight: 500;
      }

      .counter-body {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .counter-display {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--app-header-bg);
        border: 1px solid var(--app-border);
        border-radius: 6px;
        padding: 1rem;
        min-height: 60px;
      }

      .counter-value {
        font-size: 2rem;
        font-weight: 700;
        color: var(--text-main);
        font-variant-numeric: tabular-nums;
      }

      .counter-actions {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
    `,
  ],
})
export class CounterNodeComponent extends AteAngularNodeView {
  /**
   * Computed signal pour obtenir le count depuis les attributs du noeud
   */
  count = computed(() => (this.node().attrs["count"] as number) || 0);

  /**
   * Incrémenter le compteur
   */
  increment(): void {
    this.updateAttributes({ count: this.count() + 1 });
  }

  /**
   * Décrémenter le compteur (min: 0)
   */
  decrement(): void {
    const newCount = Math.max(0, this.count() - 1);
    this.updateAttributes({ count: newCount });
  }

  /**
   * Reset le compteur à 0
   */
  reset(): void {
    this.updateAttributes({ count: 0 });
  }
}
