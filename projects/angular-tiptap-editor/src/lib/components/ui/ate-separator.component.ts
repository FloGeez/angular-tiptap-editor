import { Component, input, ChangeDetectionStrategy } from "@angular/core";

@Component({
  selector: "ate-separator",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="ate-separator"
      [class.vertical]="orientation() === 'vertical'"
      [class.horizontal]="orientation() === 'horizontal'"
      [class.small]="size() === 'small'"
      [class.medium]="size() === 'medium'"
      [class.large]="size() === 'large'"></div>
  `,
  styles: [
    `
      .ate-separator {
        background-color: var(--ate-border, #e2e8f0);
        margin: 0;
      }

      .ate-separator.vertical {
        width: 1px;
        height: 24px;
        margin: 0 8px;
      }

      .ate-separator.horizontal {
        height: 1px;
        width: 100%;
        margin: 8px 0;
      }

      .ate-separator.small.vertical {
        height: 16px;
        margin: 0 4px;
      }

      .ate-separator.small.horizontal {
        margin: 4px 0;
      }

      .ate-separator.medium.vertical {
        height: 24px;
        margin: 0 8px;
      }

      .ate-separator.medium.horizontal {
        margin: 8px 0;
      }

      .ate-separator.large.vertical {
        height: 32px;
        margin: 0 12px;
      }

      .ate-separator.large.horizontal {
        margin: 12px 0;
      }
    `,
  ],
})
export class AteSeparatorComponent {
  orientation = input<"vertical" | "horizontal">("vertical");
  size = input<"small" | "medium" | "large">("medium");
}
