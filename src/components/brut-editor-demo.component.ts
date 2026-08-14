import { Component, inject, signal, computed } from "@angular/core";
import {
  AteEditorBrutComponent,
  AteToolbarComponent,
  ATE_DEFAULT_TOOLBAR_CONFIG,
} from "angular-tiptap-editor";
import { EditorConfigurationService } from "../services/editor-configuration.service";

/**
 * Proof of concept: `ate-editor-brut`, the same batteries-included host as
 * `ate-editor-chassis` (registration/lifecycle wiring, no `providers` setup
 * needed) but without the content-projection/auto-scoping magic. The toolbar
 * lives entirely outside it and targets it explicitly by editor ID — the
 * pattern documented under "Standalone Chrome Components" for chrome that
 * can't be projected inside the host (e.g. it lives in a different part of
 * the layout, or a different Angular component altogether).
 */
@Component({
  selector: "app-brut-editor-demo",
  standalone: true,
  imports: [AteEditorBrutComponent, AteToolbarComponent],
  template: `
    <div class="brut-demo" data-testid="brut-editor-demo">
      <p class="brut-demo-label">
        Toolbar (hors <code>ate-editor-brut</code>) + éditeur "brut" ciblés
        l'un l'autre par ID <code>{{ editorId }}</code>
      </p>
      <ate-toolbar [editor]="editorId" [config]="toolbarConfig" />
      <ate-editor-brut
        [editorId]="editorId"
        [content]="content()"
        [theme]="theme()"
        (contentChange)="content.set($event)" />
    </div>
  `,
  styles: [
    `
      .brut-demo {
        margin-top: 1rem;
        padding: 0.5rem;
        border: 1px dashed var(--ate-border-color, var(--border-color, #e2e8f0));
        border-radius: 8px;
      }

      .brut-demo-label {
        margin: 0 0 0.5rem;
        font-size: 12px;
        color: var(--text-secondary, #64748b);
      }
    `,
  ],
})
export class BrutEditorDemoComponent {
  private readonly configService = inject(EditorConfigurationService);

  readonly editorId = "brut-demo-doc";
  readonly toolbarConfig = ATE_DEFAULT_TOOLBAR_CONFIG;
  readonly content = signal("<p>Bare editor, no chassis, no projection.</p>");
  readonly theme = computed(() => (this.configService.editorState().darkMode ? "dark" : "light"));
}
