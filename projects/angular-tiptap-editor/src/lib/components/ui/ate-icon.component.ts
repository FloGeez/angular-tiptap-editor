import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  computed,
  inject,
  input,
} from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { AteIconRegistry } from "../../services/ate-icon-registry.service";

/**
 * Renders an icon from the AteIconRegistry as inline SVG,
 * or with the Material Symbols font when the name is not registered.
 * Its size follows the `font-size` (1em) and its color `currentColor`.
 */
@Component({
  selector: "ate-icon",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The SVG is injected as HTML: its styles cannot be scoped to the component
  encapsulation: ViewEncapsulation.None,
  host: {
    class: "ate-icon",
    "aria-hidden": "true",
    "[innerHTML]": "content()",
  },
  template: "",
  styles: [
    `
      .ate-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 1em;
        height: 1em;
        font-size: 24px;
        line-height: 1;
      }

      .ate-icon > svg {
        display: block;
        width: 100%;
        height: 100%;
        fill: currentColor;
      }

      .ate-icon > .material-symbols-outlined {
        font-size: inherit;
      }
    `,
  ],
})
export class AteIconComponent {
  private readonly registry = inject(AteIconRegistry);
  private readonly sanitizer = inject(DomSanitizer);

  /** Icon name (Material Symbols name or a name registered with provideAteIcons) */
  name = input.required<string>();

  // Icons come from the library or from the developer, never from user content
  readonly content = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.registry.markup(this.name()))
  );
}
