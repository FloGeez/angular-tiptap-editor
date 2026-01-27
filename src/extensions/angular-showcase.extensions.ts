import { Injector } from "@angular/core";
import { registerAngularComponent } from "angular-tiptap-editor";
import { CounterNodeComponent } from "../components/angular-extensions-showcase/counter-node.component";
import { InfoBoxComponent } from "../components/ui/info-box.component";
import { AiBlockComponent } from "../components/angular-extensions-showcase/ai-block.component";
import { AiLoadingNodeComponent } from "../components/angular-extensions-showcase/ai-loading-node.component";

/**
 * Showcase Extensions - with Tiptap-Aware and classic component
 */

// Extension to display a premium breathing/spinning AI indicator
export function AiLoadingExtension(injector: Injector) {
  return registerAngularComponent(injector, {
    component: AiLoadingNodeComponent,
    name: "aiLoading",
    group: "inline",
    draggable: false,
  });
}

// Extension AI Block (TipTap-Aware)
export function AiBlockExtension(injector: Injector) {
  return registerAngularComponent(injector, {
    component: AiBlockComponent,
    name: "aiBlock",
  });
}

// Extension Counter (TipTap-Aware)
export function CounterExtension(injector: Injector) {
  return registerAngularComponent(injector, {
    component: CounterNodeComponent,
    name: "counterNode",
    attributes: {
      count: {
        default: 0,
        parseHTML: (element: HTMLElement) => {
          const count = element.getAttribute("data-count");
          return count ? parseInt(count, 10) : 0;
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          return { "data-count": attributes["count"] as string };
        },
      },
    },
  });
}

// Extension InfoBox - Warning variant
export function WarningBoxExtension(injector: Injector) {
  return registerAngularComponent(injector, {
    component: InfoBoxComponent,
    name: "warningBox",
    defaultInputs: {
      variant: "warning",
    },
    editableContent: true,
    contentSelector: ".app-alert-content",
    contentMode: "inline",
  });
}
