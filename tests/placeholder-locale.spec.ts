import { test, expect, type Page } from "@playwright/test";

type EditorComponent = {
  placeholder: unknown;
  locale: unknown;
  i18nService: { setLocale: (locale: string) => void; currentLocale: () => string };
};

type DebugWindow = Window & {
  ng?: {
    getComponent: (element: Element) => EditorComponent;
    getOwningComponent: (element: Element) => { editorConfig: () => Record<string, unknown> };
    applyChanges: (component: unknown) => void;
  };
};

type Overrides = {
  config?: Record<string, unknown>;
  inputs?: { placeholder?: string | undefined; locale?: string | undefined };
  globalLocale?: string;
};

const PLACEHOLDER = "p.is-editor-empty";

async function apply(page: Page, overrides: Overrides) {
  await page.evaluate(({ config, inputs, globalLocale }) => {
    const win = window as DebugWindow;
    if (!win.ng) {
      throw new Error("Angular debug API is not available in test mode.");
    }
    const host = document.querySelector("angular-tiptap-editor");
    if (!host) {
      throw new Error("Editor host element not found.");
    }
    const editor = win.ng.getComponent(host);
    const app = win.ng.getOwningComponent(host);

    if (globalLocale) {
      editor.i18nService.setLocale(globalLocale);
    }
    if (config) {
      const next = { ...app.editorConfig(), ...config };
      app.editorConfig = () => next;
    }
    for (const [name, value] of Object.entries(inputs ?? {})) {
      const input = (editor as unknown as Record<string, unknown>)[name] as Record<symbol, unknown>;
      const key = Object.getOwnPropertySymbols(input).find(s => s.description === "SIGNAL");
      const node =
        key && (input[key] as { applyValueToInputSignal: (n: unknown, v: unknown) => void });
      if (!node) {
        throw new Error(`Input signal "${name}" not found.`);
      }
      node.applyValueToInputSignal(node, value);
    }
    win.ng.applyChanges(app);
  }, overrides);
}

const placeholderText = (page: Page) => page.locator(PLACEHOLDER).getAttribute("data-placeholder");

const clearEditor = async (page: Page) => {
  await page.getByTestId("clear-button").click();
  await expect(page.locator(".ProseMirror")).toHaveText("");
};

const resetOverrides: Overrides = {
  config: { placeholder: undefined, locale: undefined },
};

test.describe("Placeholder follows runtime changes", () => {
  test.use({ locale: "en-US" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();
    await page.getByTestId("clear-button").click();
    await expect(page.locator(".ProseMirror")).toHaveText("");
    await apply(page, resetOverrides);
    await expect(page.locator(PLACEHOLDER)).toHaveAttribute("data-placeholder", "Start typing...");
  });

  test("the placeholder input updates the visible placeholder", async ({ page }) => {
    await apply(page, { inputs: { placeholder: "From the input" } });
    await expect(page.locator(PLACEHOLDER)).toHaveAttribute("data-placeholder", "From the input");

    await apply(page, { inputs: { placeholder: "Changed again" } });
    await expect(page.locator(PLACEHOLDER)).toHaveAttribute("data-placeholder", "Changed again");

    await apply(page, { inputs: { placeholder: undefined } });
    await expect(page.locator(PLACEHOLDER)).toHaveAttribute("data-placeholder", "Start typing...");
  });

  test("config.placeholder updates the visible placeholder", async ({ page }) => {
    await apply(page, { config: { placeholder: "From the config" } });
    await expect(page.locator(PLACEHOLDER)).toHaveAttribute("data-placeholder", "From the config");

    await apply(page, { config: { placeholder: "Config changed" } });
    await expect(page.locator(PLACEHOLDER)).toHaveAttribute("data-placeholder", "Config changed");
  });

  test("the global locale updates the translated placeholder", async ({ page }) => {
    await apply(page, { globalLocale: "pt" });
    await clearEditor(page);
    await expect(page.locator(PLACEHOLDER)).toHaveAttribute(
      "data-placeholder",
      "Comece a escrever..."
    );

    await apply(page, { globalLocale: "es" });
    await clearEditor(page);
    await expect(page.locator(PLACEHOLDER)).toHaveAttribute(
      "data-placeholder",
      "Empieza a escribir..."
    );
  });

  test("the per-instance locale input and config.locale update the translated placeholder", async ({
    page,
  }) => {
    await apply(page, { inputs: { locale: "pt" } });
    await expect(page.locator(PLACEHOLDER)).toHaveAttribute(
      "data-placeholder",
      "Comece a escrever..."
    );

    await apply(page, { inputs: { locale: undefined }, config: { locale: "es" } });
    await expect(page.locator(PLACEHOLDER)).toHaveAttribute(
      "data-placeholder",
      "Empieza a escribir..."
    );

    await apply(page, { config: { locale: undefined } });
    await expect(page.locator(PLACEHOLDER)).toHaveAttribute("data-placeholder", "Start typing...");
    expect(
      await page.evaluate(() =>
        (window as DebugWindow)
          .ng!.getComponent(document.querySelector("angular-tiptap-editor")!)
          .i18nService.currentLocale()
      )
    ).toBe("en");
  });

  test("keeps the precedence input > config > translations", async ({ page }) => {
    await apply(page, { config: { placeholder: "Config wins over locale", locale: "pt" } });
    await expect(page.locator(PLACEHOLDER)).toHaveAttribute(
      "data-placeholder",
      "Config wins over locale"
    );

    await apply(page, { inputs: { placeholder: "Input wins" } });
    await expect(page.locator(PLACEHOLDER)).toHaveAttribute("data-placeholder", "Input wins");

    await apply(page, { inputs: { placeholder: undefined } });
    await expect(page.locator(PLACEHOLDER)).toHaveAttribute(
      "data-placeholder",
      "Config wins over locale"
    );

    await apply(page, { config: { placeholder: undefined } });
    await expect(page.locator(PLACEHOLDER)).toHaveAttribute(
      "data-placeholder",
      "Comece a escrever..."
    );
  });

  test("updates without re-creating the editor and keeps the undo history", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await apply(page, { globalLocale: "pt" });
    await clearEditor(page);
    await page.evaluate(() => {
      (document.querySelector(".ProseMirror") as HTMLElement & { __marker?: boolean }).__marker =
        true;
    });
    await editor.click();
    await page.keyboard.type("Keep me");
    await expect(editor).toHaveText("Keep me");

    await apply(page, { config: { placeholder: "No re-creation" } });
    await apply(page, { inputs: { locale: "es" }, config: { placeholder: undefined } });

    expect(
      await page.evaluate(
        () =>
          (document.querySelector(".ProseMirror") as HTMLElement & { __marker?: boolean }).__marker
      )
    ).toBe(true);
    await expect(editor).toHaveText("Keep me");

    await page.keyboard.press("ControlOrMeta+z");
    await expect(editor).not.toContainText("Keep me");
  });
});
