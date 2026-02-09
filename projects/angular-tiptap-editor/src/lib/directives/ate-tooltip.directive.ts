import { Directive, ElementRef, input, OnDestroy, inject, effect, computed } from "@angular/core";
import tippy, { Instance as TippyInstance, Placement } from "tippy.js";

// Pre-calculate platform once to avoid repeated checks
const IS_MAC = typeof window !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

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
      duration: [100, 100],
      offset: [0, 6],
      theme: "ate-tooltip",
      touch: ["hold", 500],
      maxWidth: 250,
      appendTo: () => container,
      aria: {
        content: "describedby",
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
      this.tippyInstance.destroy();
      this.tippyInstance = null;
    }
  }
}
