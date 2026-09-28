import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  computed,
  inject,
  input,
} from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { AteIconKey, AteIconRegistry } from "../../services/ate-icon-registry.service";

/**
 * Renders an icon from the AteIconRegistry as inline SVG,
 * or with the Material Symbols font when the name is not registered.
 * Its size follows the `font-size` (1em). Library icons are filled with `currentColor`;
 * a full custom `<svg>` keeps its own `fill` and `stroke` attributes.
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

  /** Library icon, icon registered with provideAteIcons, or Material Symbols name (font) */
  name = input.required<AteIconKey>();

  // Icons come from the library or from the developer, never from user content
  readonly content = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.registry.markup(this.name()))
  );
}
