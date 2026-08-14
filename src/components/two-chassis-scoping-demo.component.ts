import { Component, inject, signal, computed } from "@angular/core";
import {
  AteEditorChassisComponent,
  AteToolbarComponent,
  ATE_DEFAULT_TOOLBAR_CONFIG,
} from "angular-tiptap-editor";
import { EditorConfigurationService } from "../services/editor-configuration.service";

/**
 * Proof of concept: two independent `ate-editor-chassis` instances, each with
 * an editor-less `<ate-toolbar />` projected inside. Each toolbar must always
 * control its OWN chassis's editor — including after focus moves to the
 * other one, which is exactly the bug this auto-scoping mechanism fixes
 * (previously, an editor-less toolbar fell back to whichever editor was
 * globally "active", so it would silently follow focus across chassis).
 *
 * Each chassis also gets `[theme]` wired to the demo's own dark-mode toggle:
 * a bare `ate-editor-chassis` has no theme of its own by default (unlike
 * `angular-tiptap-editor`, which reads it from `[config]`), so without this
 * it would silently stay light while the rest of the page goes dark.
 */
@Component({
  selector: "app-two-chassis-scoping-demo",
  standalone: true,
  imports: [AteEditorChassisComponent, AteToolbarComponent],
  template: `
    <div class="chassis-scoping-demo" data-testid="chassis-scoping-demo">
      <div class="chassis-scoping-editor" data-testid="chassis-scoping-editor-1">
        <p class="chassis-scoping-label">Chassis 1</p>
        <ate-editor-chassis
          [content]="content1()"
          [theme]="theme()"
          (contentChange)="content1.set($event)">
          <ate-toolbar [config]="toolbarConfig" />
        </ate-editor-chassis>
      </div>
      <div class="chassis-scoping-editor" data-testid="chassis-scoping-editor-2">
        <p class="chassis-scoping-label">Chassis 2</p>
        <ate-editor-chassis
          [content]="content2()"
          [theme]="theme()"
          (contentChange)="content2.set($event)">
          <ate-toolbar [config]="toolbarConfig" />
        </ate-editor-chassis>
      </div>
    </div>
  `,
  styles: [
    `
      .chassis-scoping-demo {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-top: 1rem;
      }

      .chassis-scoping-editor {
        border: 1px dashed var(--ate-border-color, var(--border-color, #e2e8f0));
        border-radius: 8px;
        padding: 0.5rem;
      }

      .chassis-scoping-label {
        margin: 0 0 0.5rem;
        font-size: 12px;
        color: var(--text-secondary, #64748b);
      }
    `,
  ],
})
export class TwoChassisScopingDemoComponent {
  private readonly configService = inject(EditorConfigurationService);

  readonly toolbarConfig = ATE_DEFAULT_TOOLBAR_CONFIG;
  readonly content1 = signal("<p>Editor one.</p>");
  readonly content2 = signal("<p>Editor two.</p>");
  readonly theme = computed(() => (this.configService.editorState().darkMode ? "dark" : "light"));
}
