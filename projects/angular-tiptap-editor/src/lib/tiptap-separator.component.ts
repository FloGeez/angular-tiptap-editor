import { Component, input, ChangeDetectionStrategy } from "@angular/core";

@Component({
  selector: "tiptap-separator",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="tiptap-separator"
      [class.vertical]="orientation() === 'vertical'"
      [class.horizontal]="orientation() === 'horizontal'"
      [class.small]="size() === 'small'"
      [class.medium]="size() === 'medium'"
      [class.large]="size() === 'large'"></div>
  `,
  styles: [
    `
      .tiptap-separator {
        background-color: var(--ate-border, #e2e8f0);
        margin: 0;
      }

      .tiptap-separator.vertical {
        width: 1px;
        height: 24px;
        margin: 0 8px;
      }

      .tiptap-separator.horizontal {
        height: 1px;
        width: 100%;
        margin: 8px 0;
      }

      .tiptap-separator.small.vertical {
        height: 16px;
        margin: 0 4px;
      }

      .tiptap-separator.small.horizontal {
        margin: 4px 0;
      }

      .tiptap-separator.medium.vertical {
        height: 24px;
        margin: 0 8px;
      }

      .tiptap-separator.medium.horizontal {
        margin: 8px 0;
      }

      .tiptap-separator.large.vertical {
        height: 32px;
        margin: 0 12px;
      }

      .tiptap-separator.large.horizontal {
        margin: 12px 0;
      }
    `,
  ],
})
export class TiptapSeparatorComponent {
  orientation = input<"vertical" | "horizontal">("vertical");
  size = input<"small" | "medium" | "large">("medium");
}
