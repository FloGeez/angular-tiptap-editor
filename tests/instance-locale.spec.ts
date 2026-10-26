import { test, expect, type Page } from "@playwright/test";

type DebugWindow = Window & {
  ng?: {
    getComponent: (element: Element) => {
      i18nService: { currentLocale: () => string };
      getEditor: () => {
        commands: {
          insertContent: (content: unknown) => boolean;
          insertTable: (options: { rows: number; cols: number }) => boolean;
        };
      } | null;
    };
    getOwningComponent: (element: Element) => {
      editorConfig: () => Record<string, unknown>;
    };
    applyChanges: (component: unknown) => void;
  };
};

const IMAGE_SRC = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

async function setInstanceLocale(
  page: Page,
  locale: string | undefined,
  overrides: Record<string, unknown> = {}
) {
  await page.evaluate(
    ({ nextLocale, extra }) => {
      const win = window as DebugWindow;
      const host = document.querySelector("angular-tiptap-editor")!;
      const app = win.ng!.getOwningComponent(host);
      const nextConfig = { ...app.editorConfig(), locale: nextLocale, ...extra };
      app.editorConfig = () => nextConfig;
      win.ng!.applyChanges(app);
    },
    { nextLocale: locale, extra: overrides }
  );
}

async function globalLocale(page: Page) {
  return page.evaluate(() => {
    const win = window as DebugWindow;
    const host = document.querySelector("angular-tiptap-editor")!;
    return win.ng!.getComponent(host).i18nService.currentLocale();
  });
}

async function clearEditor(page: Page) {
  await page.getByTestId("clear-button").click();
  await expect(page.locator(".ProseMirror")).toHaveText("");
}

async function selectTypedText(page: Page, text: string) {
  const editor = page.locator(".ProseMirror");
  await editor.focus();
  await page.keyboard.type(text);
  await editor.selectText();
  await expect(page.locator(".tippy-box")).toBeVisible();
}

test.describe("Per-instance locale", () => {
  test.use({ locale: "en-US" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();
    expect(await globalLocale(page)).toBe("en");
    await clearEditor(page);
  });

  test.afterEach(async ({ page }) => {
    expect(await globalLocale(page)).toBe("en");
  });

  test.describe("with the instance locale set to pt-BR", () => {
    test.beforeEach(async ({ page }) => {
      await setInstanceLocale(page, "pt-BR");
    });

    test("translates the toolbar tooltips", async ({ page }) => {
      const toolbar = page.locator("ate-toolbar");
      await expect(toolbar.getByRole("button", { name: /Negrito/ })).toBeVisible();
      await expect(toolbar.getByRole("button", { name: /Itálico/ })).toBeVisible();
      await expect(toolbar.getByRole("button", { name: /Desfazer/ })).toBeVisible();
      await expect(toolbar.getByRole("button", { name: /^Bold/ })).toHaveCount(0);
    });

    test("translates the text bubble menu tooltips", async ({ page }) => {
      await selectTypedText(page, "Selecione");
      const bubbleMenu = page.locator(".tippy-box");
      await expect(bubbleMenu.getByRole("button", { name: /Negrito/ })).toBeVisible();
      await expect(bubbleMenu.getByRole("button", { name: /Sublinhado/ })).toBeVisible();
      await expect(bubbleMenu.getByRole("button", { name: /Cor do texto/ })).toBeVisible();
      await expect(bubbleMenu.getByRole("button", { name: /Bold/ })).toHaveCount(0);
      await expect(bubbleMenu.getByRole("button", { name: /Text Color/ })).toHaveCount(0);
    });

    test("translates the color picker labels", async ({ page }) => {
      await selectTypedText(page, "Colorir");
      await page
        .locator(".tippy-box")
        .getByRole("button", { name: /Cor do texto/ })
        .click();
      const colorMenu = page.locator(".color-bubble-menu");
      await expect(colorMenu).toBeVisible();
      await expect(colorMenu.getByRole("button", { name: /Cor personalizada/ })).toBeVisible();
      await expect(colorMenu.getByRole("button", { name: /Limpar/ })).toBeVisible();
      await expect(colorMenu.getByRole("button", { name: /Aplicar/ })).toBeVisible();
      await expect(colorMenu.getByRole("button", { name: /Custom color/ })).toHaveCount(0);
    });

    test("translates the link bubble menu", async ({ page }) => {
      await selectTypedText(page, "Meu link");
      await page.locator(".tippy-box").getByRole("button", { name: /Link/ }).click();
      await expect(page.locator('input[placeholder*="URL"]')).toBeVisible();
      await expect(page.getByRole("button", { name: /Aplicar/ }).last()).toBeVisible();
      await expect(page.getByRole("button", { name: /Apply/ })).toHaveCount(0);
    });

    test("translates the image bubble menu", async ({ page }) => {
      await page.locator(".ProseMirror").focus();
      await page.evaluate(src => {
        const win = window as DebugWindow;
        const host = document.querySelector("angular-tiptap-editor")!;
        win.ng!.getComponent(host).getEditor()!.commands.insertContent({
          type: "resizableImage",
          attrs: { src },
        });
      }, IMAGE_SRC);
      await page.locator(".ProseMirror img").click();
      const imageMenu = page.locator(".tippy-box");
      await expect(imageMenu).toBeVisible();
      await expect(imageMenu.getByRole("button", { name: /Trocar imagem/ })).toBeVisible();
      await expect(imageMenu.getByRole("button", { name: /Change image/ })).toHaveCount(0);
    });

    test("translates the table and cell bubble menus", async ({ page }) => {
      await page.evaluate(() => {
        const win = window as DebugWindow;
        const host = document.querySelector("angular-tiptap-editor")!;
        win.ng!.getComponent(host).getEditor()!.commands.insertTable({ rows: 2, cols: 2 });
      });
      await page.locator(".ProseMirror td").first().click();
      const menus = page.locator(".tippy-box");
      await expect(menus.getByRole("button", { name: /Inserir linha acima/ })).toBeVisible();
      await expect(menus.getByRole("button", { name: /Add row above/i })).toHaveCount(0);
    });

    test("translates the slash menu", async ({ page }) => {
      await page.locator(".ProseMirror").focus();
      await page.keyboard.type("/", { delay: 100 });
      const items = page.locator(".slash-command-item");
      await expect(items.filter({ hasText: "Lista com marcadores" })).toBeVisible();
      await expect(items.filter({ hasText: "Bullet List" })).toHaveCount(0);
    });

    test("translates the placeholder", async ({ page }) => {
      await setInstanceLocale(page, "pt-BR", {
        placeholder: undefined,
        starterKitOptions: { undoRedo: false },
      });
      await expect(page.locator(".ProseMirror p.is-editor-empty")).toHaveAttribute(
        "data-placeholder",
        /Comece a escrever/
      );
    });
  });

  test("an editor without a locale keeps following the global locale", async ({ page }) => {
    await setInstanceLocale(page, undefined);
    await selectTypedText(page, "Select me");
    const bubbleMenu = page.locator(".tippy-box");
    await expect(bubbleMenu.getByRole("button", { name: /Bold/ })).toBeVisible();
    await expect(bubbleMenu.getByRole("button", { name: /Negrito/ })).toHaveCount(0);
  });

  test("switching the instance locale back and forth updates the menus", async ({ page }) => {
    await setInstanceLocale(page, "pt");
    await expect(
      page.locator("ate-toolbar").getByRole("button", { name: /Negrito/ })
    ).toBeVisible();
    await setInstanceLocale(page, "es");
    await expect(
      page.locator("ate-toolbar").getByRole("button", { name: /Negrita/ })
    ).toBeVisible();
    await setInstanceLocale(page, undefined);
    await expect(page.locator("ate-toolbar").getByRole("button", { name: /^Bold/ })).toBeVisible();
    expect(await globalLocale(page)).toBe("en");
  });
});
