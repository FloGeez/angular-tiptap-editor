import { CounterNodeComponent } from "../components/angular-extensions-showcase/counter-node.component";
import { InfoBoxComponent } from "../components/ui/info-box.component";
import { AiBlockComponent } from "../components/angular-extensions-showcase/ai-block.component";
import { AiLoadingNodeComponent } from "../components/angular-extensions-showcase/ai-loading-node.component";
import { RegisterAngularComponentOptions } from "angular-tiptap-editor";

/**
 * Showcase Extension Configs
 */

export const AI_LOADING_CONF: RegisterAngularComponentOptions = {
  component: AiLoadingNodeComponent,
  name: "aiLoading",
  group: "inline",
  draggable: false,
};

export const AI_BLOCK_CONF: RegisterAngularComponentOptions = {
  component: AiBlockComponent,
  name: "aiBlock",
};

export const COUNTER_CONF: RegisterAngularComponentOptions = {
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
};

export const WARNING_BOX_CONF: RegisterAngularComponentOptions = {
  component: InfoBoxComponent,
  name: "warningBox",
  defaultInputs: {
    variant: "warning",
  },
  editableContent: true,
  contentSelector: ".app-alert-content",
  contentMode: "inline",
};
