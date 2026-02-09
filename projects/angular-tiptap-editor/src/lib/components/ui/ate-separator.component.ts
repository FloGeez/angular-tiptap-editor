import { Component, ChangeDetectionStrategy } from "@angular/core";

@Component({
  selector: "ate-separator",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="ate-separator"></div>`,
  styles: [
    `
      .ate-separator {
        width: 1px;
        height: 24px;
        background-color: var(--ate-border, #e2e8f0);
        margin: 0 var(--ate-menu-gap, 2px);
        flex-shrink: 0;
      }
    `,
  ],
})
export class AteSeparatorComponent {}
