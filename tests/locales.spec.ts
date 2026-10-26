import { test, expect, Page } from "@playwright/test";
import { ENGLISH_TRANSLATIONS } from "../projects/angular-tiptap-editor/src/lib/i18n/en_ateTranslations";
import { PORTUGUESE_TRANSLATIONS } from "../projects/angular-tiptap-editor/src/lib/i18n/pt_ateTranslations";
import { SPANISH_TRANSLATIONS } from "../projects/angular-tiptap-editor/src/lib/i18n/es_ateTranslations";
import type { AteTranslations } from "../projects/angular-tiptap-editor/src/lib/i18n/ateTranslationsModel";

const flatten = (value: unknown, prefix = ""): Record<string, string | string[]> =>
  Object.entries(value as Record<string, unknown>).reduce(
    (acc, [key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof child === "string" || Array.isArray(child)) {
        acc[path] = child as string | string[];
      } else {
        Object.assign(acc, flatten(child, path));
      }
      return acc;
    },
    {} as Record<string, string | string[]>
  );

const builtIns: Array<[string, AteTranslations]> = [
  ["pt", PORTUGUESE_TRANSLATIONS],
  ["es", SPANISH_TRANSLATIONS],
];

for (const [code, translations] of builtIns) {
  test.describe(`Built-in "${code}" translations`, () => {
    test("covers exactly the keys of the English reference", () => {
      expect(Object.keys(flatten(translations)).sort()).toEqual(
        Object.keys(flatten(ENGLISH_TRANSLATIONS)).sort()
      );
    });

    test("has no empty strings and keeps English slash keywords searchable", () => {
      const reference = flatten(ENGLISH_TRANSLATIONS);
      const flat = flatten(translations);
      for (const [path, value] of Object.entries(flat)) {
        if (typeof value === "string") {
          expect(value.trim(), path).not.toBe("");
        } else {
          expect(value, path).toEqual(expect.arrayContaining(reference[path] as string[]));
          expect(value.length, path).toBeGreaterThan((reference[path] as string[]).length);
        }
      }
    });
  });
}

const prepareEditor = async (page: Page) => {
  await page.goto("/");
  await expect(page.locator(".ate-editor")).toBeVisible();
  await page.getByTestId("clear-button").click();
  await expect(page.locator(".ProseMirror")).toHaveText("");
};

const openSlashMenu = async (page: Page, filter = "") => {
  const editor = page.locator(".ProseMirror");
  await editor.focus();
  await page.keyboard.type("/", { delay: 100 });
  if (filter) {
    await page.keyboard.type(filter, { delay: 100 });
  }
  await expect(page.locator(".tippy-box")).toBeVisible({ timeout: 5000 });
};

test.describe("Brazilian Portuguese (navigator.language pt-BR)", () => {
  test.use({ locale: "pt-BR" });
  test.beforeEach(async ({ page }) => prepareEditor(page));

  test("detects pt-BR and translates the slash menu", async ({ page }) => {
    await openSlashMenu(page);
    const items = page.locator(".slash-command-item");
    await expect(items.filter({ hasText: "Lista com marcadores" })).toBeVisible();
    await expect(items.filter({ hasText: "Bloco de código" })).toBeVisible();
    await expect(items.filter({ hasText: "Citação" })).toBeVisible();
    await expect(items.filter({ hasText: "Bullet List" })).toHaveCount(0);
  });

  test("finds a command by a Portuguese keyword and still by an English one", async ({ page }) => {
    await openSlashMenu(page, "marcadores");
    await expect(page.locator(".slash-command-item")).toHaveCount(1);
    await expect(page.locator(".slash-command-item")).toContainText("Lista com marcadores");
    for (let i = 0; i < "marcadores".length; i++) {
      await page.keyboard.press("Backspace");
    }
    await page.keyboard.type("bullet", { delay: 50 });
    await expect(page.locator(".slash-command-item")).toContainText("Lista com marcadores");
  });

  test("translates bubble menu tooltips", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.focus();
    await page.keyboard.type("Selecione");
    await editor.selectText();
    const bubbleMenu = page.locator(".tippy-box");
    await expect(bubbleMenu.getByRole("button", { name: /Negrito/ })).toBeVisible();
    await expect(bubbleMenu.getByRole("button", { name: /Itálico/ })).toBeVisible();
    await expect(bubbleMenu.getByRole("button", { name: /Sublinhado/ })).toBeVisible();
  });

  test("translates demo UI and content into Portuguese", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();
    await expect(page.locator(".current-lang")).toHaveText("PT");
    await expect(page.getByTestId("clear-button")).toContainText("Limpar");
    await expect(page.locator(".ProseMirror h1")).toContainText("Angular Tiptap Editor");
    await expect(page.locator(".ProseMirror")).toContainText("Formatação");
  });
});

test.describe("Spanish (navigator.language es-MX)", () => {
  test.use({ locale: "es-MX" });
  test.beforeEach(async ({ page }) => prepareEditor(page));

  test("detects es-MX and translates the slash menu", async ({ page }) => {
    await openSlashMenu(page);
    const items = page.locator(".slash-command-item");
    await expect(items.filter({ hasText: "Lista con viñetas" })).toBeVisible();
    await expect(items.filter({ hasText: "Bloque de código" })).toBeVisible();
    await expect(items.filter({ hasText: "Cita" })).toBeVisible();
    await expect(items.filter({ hasText: "Bullet List" })).toHaveCount(0);
  });

  test("finds a command by a Spanish keyword", async ({ page }) => {
    await openSlashMenu(page, "viñetas");
    await expect(page.locator(".slash-command-item")).toHaveCount(1);
    await expect(page.locator(".slash-command-item")).toContainText("Lista con viñetas");
  });

  test("translates bubble menu tooltips", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.focus();
    await page.keyboard.type("Selecciona");
    await editor.selectText();
    const bubbleMenu = page.locator(".tippy-box");
    await expect(bubbleMenu.getByRole("button", { name: /Negrita/ })).toBeVisible();
    await expect(bubbleMenu.getByRole("button", { name: /Cursiva/ })).toBeVisible();
    await expect(bubbleMenu.getByRole("button", { name: /Subrayado/ })).toBeVisible();
  });

  test("translates demo UI and content into Spanish", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();
    await expect(page.locator(".current-lang")).toHaveText("ES");
    await expect(page.getByTestId("clear-button")).toContainText("Vaciar");
    await expect(page.locator(".ProseMirror h1")).toContainText("Angular Tiptap Editor");
    await expect(page.locator(".ProseMirror")).toContainText("Formato");
  });
});
