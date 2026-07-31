import { Component, ChangeDetectionStrategy } from "@angular/core";
import { Injector } from "@angular/core";
import { AteAngularNodeView } from "../../node-view/ate-angular-node-view";
import { registerAngularComponent } from "../../node-view/ate-register-angular-component";
import { RegisterAngularComponentOptions } from "../../node-view/ate-node-view.models";
import { AteTableOfContentsComponent } from "./ate-table-of-contents.component";

/**
 * Custom Angular NodeView wrapper for displaying Table of Contents directly inside the editor content.
 */
@Component({
  selector: "ate-toc-node",
  standalone: true,
  imports: [AteTableOfContentsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ate-toc-node-wrapper">
      <ate-table-of-contents
        [editor]="editor()"
        [floating]="false"
        [variant]="node().attrs['variant'] || 'minimal'"
        [showTitle]="node().attrs['showTitle'] !== false"
        [maxDepth]="node().attrs['maxDepth'] || 6" />
    </div>
  `,
  styles: [
    `
      .ate-toc-node-wrapper {
        margin: 1rem 0;
        user-select: none;
      }
    `,
  ],
})
export class AteTocNodeComponent extends AteAngularNodeView {}

/**
 * Registration options for the Table of Contents Angular NodeView
 */
export const AteTocNodeOptions: RegisterAngularComponentOptions<AteTocNodeComponent> = {
  component: AteTocNodeComponent,
  name: "tableOfContents",
  group: "block",
  draggable: true,
  attributes: {
    variant: {
      default: "minimal",
    },
    showTitle: {
      default: true,
    },
    maxDepth: {
      default: 6,
    },
  },
};

/**
 * Creates the Table of Contents TipTap Node Extension instance.
 */
export function getAteTocNodeExtension(injector?: Injector) {
  if (injector) {
    return registerAngularComponent(injector, AteTocNodeOptions);
  }
  return registerAngularComponent(AteTocNodeOptions);
}
