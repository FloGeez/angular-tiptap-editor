import { Component, input, inject, computed, ChangeDetectionStrategy } from "@angular/core";
import { AteI18nService } from "../../services/ate-i18n.service";
import { AteEditorInput } from "../../models/ate-editor-ref";
import { injectAteEditorRef } from "../../services/ate-editor-ref-resolver";
import { SupportedLocale } from "../../i18n/ateTranslationsModel";
import { ATE_INITIAL_EDITOR_STATE } from "../../models/ate-editor-state.model";

/**
 * Autonomous Footer component for AteEditorChassis or standalone layouts.
 * Automatically resolves character/word counts reactively from the editor instance
 * and supports custom projected content (buttons, status messages, etc.).
 *
 * @example
 * ```html
 * <ate-footer [showCharacterCount]="true" [showWordCount]="true" />
 * ```
 */
@Component({
  selector: "ate-footer",
  exportAs: "ateFooter",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[class.dark]": "editorRef()?.isDark",
    "[attr.data-theme]": "editorRef()?.theme",
  },
  template: `
    <div class="ate-footer">
      <ng-content></ng-content>
      @if (showCharacterCount() || showWordCount()) {
        <div
          class="character-count"
          [class.limit-reached]="maxCharacters() && characterCount() >= maxCharacters()!">
          @if (showCharacterCount()) {
            {{ characterCount() }}
            {{
              characterCount() > 1
                ? t().editor.characterPlural
                : t().editor.character
            }}
            @if (maxCharacters()) {
              / {{ maxCharacters() }}
            }
          }

          @if (showCharacterCount() && showWordCount()) {
            ,
          }

          @if (showWordCount()) {
            {{ wordCount() }}
            {{
              wordCount() > 1
                ? t().editor.wordPlural
                : t().editor.word
            }}
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .ate-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 12px;
        font-size: 12px;
        color: var(--ate-counter-color, var(--ate-text-secondary, #64748b));
        border-top: 1px solid var(--ate-counter-border-color, var(--ate-border, #e2e8f0));
        background: var(--ate-counter-background, var(--ate-surface-secondary, #f8f9fa));
        border-bottom-left-radius: calc(var(--ate-border-radius, 12px) - var(--ate-border-width, 2px));
        border-bottom-right-radius: calc(var(--ate-border-radius, 12px) - var(--ate-border-width, 2px));
      }

      .character-count {
        margin-left: auto;
        transition: color 0.2s ease;
      }

      .character-count.limit-reached {
        color: var(--ate-error-color, #ef4444);
        font-weight: 600;
      }
    `,
  ],
})
export class AteFooterComponent {
  editor = input<AteEditorInput>();
  showCharacterCount = input<boolean>(true);
  showWordCount = input<boolean>(true);
  maxCharacters = input<number | undefined>(undefined);
  locale = input<SupportedLocale | undefined>(undefined);

  protected readonly editorRef = injectAteEditorRef(this.editor);
  private readonly i18n = inject(AteI18nService);

  protected readonly t = computed(() => {
    const loc = this.locale();
    return loc ? (this.i18n.allTranslations()[loc] ?? this.i18n.translations()) : this.i18n.translations();
  });

  protected readonly state = computed(
    () => this.editorRef()?.stateSignal() ?? ATE_INITIAL_EDITOR_STATE
  );

  readonly characterCount = computed(() => {
    const editor = this.editorRef()?.editor;
    if (!editor) {
      return 0;
    }
    // Track reactive state updates
    this.state();
    const storage = editor.storage["characterCount"];
    if (storage && typeof storage.characters === "function") {
      return storage.characters();
    }
    return editor.state.doc.textContent.length;
  });

  readonly wordCount = computed(() => {
    const editor = this.editorRef()?.editor;
    if (!editor) {
      return 0;
    }
    // Track reactive state updates
    this.state();
    const storage = editor.storage["characterCount"];
    if (storage && typeof storage.words === "function") {
      return storage.words();
    }
    const text = editor.state.doc.textContent.trim();
    return text ? text.split(/\s+/).length : 0;
  });
}
