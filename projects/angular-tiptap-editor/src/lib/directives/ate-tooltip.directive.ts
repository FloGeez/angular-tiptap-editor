import { Directive, ElementRef, input, OnDestroy, inject, effect, computed } from "@angular/core";
import tippy, { Instance as TippyInstance, Placement } from "tippy.js";

// Pre-calculate platform once to avoid repeated checks
const IS_MAC = typeof window !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

const DURATION: [number, number] = [100, 100];
// After a tooltip closes, the next one still opens at once if hovered within this gap
const WARM_GAP = 300;

// Shared by every tooltip: the first one waits for its delay, the next ones open at once,
// without animation, as long as the pointer moves from one control to the next.
let openTooltip: TippyInstance | null = null;
let warm = false;
let coolTimeout: ReturnType<typeof setTimeout> | undefined;

@Directive({
  selector: "[ateTooltip]",
  standalone: true,
  host: {
    "[attr.aria-keyshortcuts]": "ariaShortcut()",
  },
})
export class AteTooltipDirective implements OnDestroy {
  private readonly el = inject(ElementRef);
  private tippyInstance: TippyInstance | null = null;

  // Signal Inputs
  content = input<string | null>(null, { alias: "ateTooltip" });
  placement = input<Placement>("top", { alias: "ateTooltipPlacement" });
  delay = input<number | [number, number]>([200, 50], { alias: "ateTooltipDelay" });
  disabled = input<boolean>(false, { alias: "ateTooltipDisabled" });

  /**
   * Computed logic for ARIA shortcuts.
   */
  protected readonly ariaShortcut = computed(() => {
    const text = this.content();
    if (!text || !text.includes("\n")) {
      return null;
    }
    return text.split("\n")[1].replace(/\+/g, " ");
  });

  /**
   * Computed logic for Tippy content.
   * Includes strict escaping of dynamic content to prevent XSS.
   */
  private readonly processedTooltip = computed(() => {
    const text = this.content();
    if (!text) {
      return { content: "", isHTML: false };
    }

    if (text.includes("\n")) {
      const [label, shortcut] = text.split("\n");

      // Escape dynamic parts to prevent XSS before wrapping in safe HTML
      const safeLabel = this.escapeHtml(label);
      let safeShortcut = this.escapeHtml(shortcut);

      if (IS_MAC) {
        safeShortcut = safeShortcut.replace(/Ctrl\+/g, "⌘").replace(/Mod\+/g, "⌘");
      } else {
        safeShortcut = safeShortcut.replace(/Mod\+/g, "Ctrl+");
      }

      return {
        content: `<div class="ate-tooltip-label">${safeLabel}</div><div class="ate-tooltip-shortcut"><kbd>${safeShortcut}</kbd></div>`,
        isHTML: true,
      };
    }

    // No newline? Keep it as plain text (Tippy handles string as text by default)
    return { content: text, isHTML: false };
  });

  constructor() {
    effect(() => {
      const { content, isHTML } = this.processedTooltip();
      const placement = this.placement();
      const delay = this.delay();
      const isDisabled = this.disabled();

      if (isDisabled || !content) {
        this.destroyTippy();
        return;
      }

      if (!this.tippyInstance) {
        this.initTippy(content, isHTML, placement, delay);
      } else {
        this.tippyInstance.setProps({
          content,
          allowHTML: isHTML,
          placement,
          delay,
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyTippy();
  }

  /**
   * Basic HTML escaping for security.
   * Effectively neutralizes scripts or malicious HTML tags.
   */
  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  private initTippy(
    content: string,
    allowHTML: boolean,
    placement: Placement,
    delay: number | [number, number]
  ): void {
    const container = this.el.nativeElement.closest(".ate-editor") || document.body;

    this.tippyInstance = tippy(this.el.nativeElement, {
      content,
      allowHTML,
      placement,
      delay,
      duration: DURATION,
      offset: [0, 6],
      theme: "ate-tooltip",
      touch: ["hold", 500],
      maxWidth: 250,
      appendTo: () => container,
      aria: {
        content: "describedby",
      },
      onTrigger: (instance, event) => {
        const base = this.delay();
        const instant = warm && event.type === "mouseenter";
        instance.setProps({
          delay: instant ? [0, Array.isArray(base) ? base[1] : base] : base,
          duration: instant ? [0, DURATION[1]] : DURATION,
        });
      },
      onShow: instance => {
        // Only one tooltip at a time: the previous one goes away at once
        if (openTooltip && openTooltip !== instance) {
          openTooltip.unmount();
        }
        openTooltip = instance;
        warm = true;
        clearTimeout(coolTimeout);
      },
      onHidden: instance => {
        if (openTooltip !== instance) {
          return;
        }
        openTooltip = null;
        coolTimeout = setTimeout(() => (warm = false), WARM_GAP);
      },
      popperOptions: {
        modifiers: [
          {
            name: "preventOverflow",
            options: {
              boundary: document.body,
              padding: 8,
            },
          },
        ],
      },
    }) as unknown as TippyInstance;
  }

  private destroyTippy(): void {
    if (this.tippyInstance) {
      if (openTooltip === this.tippyInstance) {
        openTooltip = null;
      }
      this.tippyInstance.destroy();
      this.tippyInstance = null;
    }
  }
}
