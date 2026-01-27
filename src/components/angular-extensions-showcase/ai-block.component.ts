import { Component, signal, ViewChild, ElementRef, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AteAngularNodeView } from "angular-tiptap-editor";
import { ReactiveFormsModule, FormControl, Validators } from "@angular/forms";
import { AppI18nService } from "../../services/app-i18n.service";
import { simulateAiResponse } from "../../utils/ai-utils";
import { firstValueFrom } from "rxjs";

@Component({
  selector: "app-ai-block",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="ai-block-container">
      <div class="ai-prompt-area">
        <textarea
          #textareaRef
          [formControl]="promptControl"
          placeholder="Describe what you want to generate..."
          class="ai-textarea"></textarea>

        <div class="ai-footer">
          <div class="ai-info-text">
            <span class="material-symbols-outlined">info</span>
            Ask AI to improve or generate content
          </div>
          <button
            title="Generate Content"
            [disabled]="isGenerating() || promptControl.invalid"
            (click)="onSend()"
            class="generate-btn">
            <span class="material-symbols-outlined">auto_awesome</span>
            {{ isGenerating() ? "Generating..." : "Generate" }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        margin: 1.5rem 0;
      }

      .ai-block-container {
        background: var(--ate-bg-secondary);
        border: 1px solid var(--ate-border-color);
        border-radius: var(--ate-border-radius, 12px);
        padding: 12px;
        color: var(--ate-text-primary);
        box-shadow: var(--ate-shadow-md);
        max-width: 100%;
      }

      .ai-prompt-area {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .ai-textarea {
        background: var(--ate-bg-primary);
        border: 1px solid var(--ate-border-color);
        border-radius: var(--ate-sub-border-radius, 8px);
        width: 100%;
        min-height: 100px;
        box-sizing: border-box;
        padding: 12px;
        color: var(--ate-text-primary);
        font-size: 1rem;
        font-family: inherit;
        resize: vertical;
        outline: none;
        transition: all 0.2s ease;
        line-height: 1.6;
      }

      .ai-textarea:focus {
        border-color: var(--ate-primary);
        background: var(--ate-bg-secondary);
      }

      .ai-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 4px;
      }

      .ai-info-text {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.8rem;
        color: var(--ate-text-secondary);
      }

      .ai-info-text .material-symbols-outlined {
        font-size: 16px;
      }

      .generate-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        border: none;
        border-radius: 8px;
        background: var(--primary-color);
        color: white;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .generate-btn:hover {
        background: var(--primary-color-hover);
      }

      .generate-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background: var(--ate-text-secondary);
      }

      .generate-btn .material-symbols-outlined {
        font-size: 18px;
      }
    `,
  ],
})
export class AiBlockComponent extends AteAngularNodeView {
  @ViewChild("textareaRef") textareaRef!: ElementRef<HTMLTextAreaElement>;

  private appI18nService = inject(AppI18nService);

  promptControl = new FormControl("", {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(1)],
  });
  isGenerating = signal(false);

  async onSend() {
    if (this.isGenerating() || this.promptControl.invalid) {
      return;
    }

    this.isGenerating.set(true);
    this.promptControl.disable();

    try {
      const response = await firstValueFrom(
        simulateAiResponse(this.promptControl.value, this.appI18nService.codeGeneration())
      );

      this.isGenerating.set(false);

      const pos = this.getPos();
      if (pos !== undefined) {
        this.editor()
          .chain()
          .focus()
          .insertContentAt(pos, response as string)
          .run();
        this.deleteNode();
      }
    } catch (_e) {
      this.isGenerating.set(false);
      this.promptControl.enable();
    }
  }
}
