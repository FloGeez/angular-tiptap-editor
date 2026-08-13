import { Component, input } from "@angular/core";
import { AteToolbarComponent, ATE_DEFAULT_TOOLBAR_CONFIG } from "angular-tiptap-editor";

/**
 * Proof of concept: a toolbar that lives entirely outside `ate-editor-chassis`,
 * with no `providers: ATE_EDITOR_PROVIDERS` anywhere in its ancestry. It
 * resolves the target editor purely through `AteEditorRegistry`, by ID.
 */
@Component({
  selector: "app-decoupled-chrome-demo",
  standalone: true,
  imports: [AteToolbarComponent],
  template: `
    <div class="decoupled-demo" data-testid="decoupled-chrome-demo">
      <p class="decoupled-demo-label">
        Toolbar autonome (hors <code>ate-editor-chassis</code>, ciblée par ID
        <code>{{ editorId() }}</code
        >)
      </p>
      <ate-toolbar [editor]="editorId()" [config]="toolbarConfig" />
    </div>
  `,
  styles: [
    `
      .decoupled-demo {
        margin-top: 1rem;
        padding: 0.75rem;
        border: 1px dashed var(--ate-border-color, var(--border-color, #e2e8f0));
        border-radius: 8px;
      }

      .decoupled-demo-label {
        margin: 0 0 0.5rem;
        font-size: 12px;
        color: var(--text-secondary, #64748b);
      }
    `,
  ],
})
export class DecoupledChromeDemoComponent {
  editorId = input<string>("");
  readonly toolbarConfig = ATE_DEFAULT_TOOLBAR_CONFIG;
}
