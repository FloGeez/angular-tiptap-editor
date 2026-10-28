import { test, expect, type Page } from "@playwright/test";

const PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6V6mQAAAAASUVORK5CYII=";
const ALIGN_BUTTONS = ["Align Left", "Align Center", "Align Right", "Align Justify"];
const ALIGN_SHORTCUTS = ["L", "E", "R", "J"];

interface EditorHandle {
  extensionManager: { extensions: { name: string }[] };
  schema: { nodes: Record<string, { spec: { attrs?: Record<string, unknown> } }> };
  commands: {
    focus: (position?: string) => boolean;
    setContent: (html: string) => boolean;
    setNodeSelection: (pos: number) => boolean;
  };
  state: {
    doc: { descendants: (fn: (node: { type: { name: string } }, pos: number) => void) => void };
  };
  view: { pasteHTML: (html: string) => boolean };
  getHTML: () => string;
}

type DebugWindow = Window & {
  ng?: {
    getComponent: (element: Element) => { getEditor: () => EditorHandle | null };
    getOwningComponent: (element: Element) => { editorConfig: () => Record<string, unknown> };
    applyChanges: (component: unknown) => void;
  };
};

async function configure(page: Page, enableTextAlign: boolean) {
  await page.evaluate(enabled => {
    const win = window as DebugWindow;
    const app = win.ng!.getOwningComponent(document.querySelector("angular-tiptap-editor")!);
    const current = app.editorConfig();
    const config = {
      ...current,
      enableTextAlign: enabled,
      toolbar: {
        ...(current["toolbar"] as object),
        alignLeft: true,
        alignCenter: true,
        alignRight: true,
        alignJustify: true,
      },
    };
    app.editorConfig = () => config;
    win.ng!.applyChanges(app);
  }, enableTextAlign);
  await expect
    .poll(() => extensionNames(page).then(names => names.includes("textAlign")))
    .toBe(enableTextAlign);
  await page.getByTestId("clear-button").click();
  await expect(page.locator(".ProseMirror")).toHaveText("");
}

const extensionNames = (page: Page) =>
  page.evaluate(() => {
    const host = document.querySelector("angular-tiptap-editor")!;
    const editor = (window as DebugWindow).ng!.getComponent(host).getEditor()!;
    return editor.extensionManager.extensions.map(extension => extension.name);
  });

const schemaHasTextAlign = (page: Page, nodeName: string) =>
  page.evaluate(name => {
    const host = document.querySelector("angular-tiptap-editor")!;
    const editor = (window as DebugWindow).ng!.getComponent(host).getEditor()!;
    return "textAlign" in (editor.schema.nodes[name].spec.attrs ?? {});
  }, nodeName);

const editorHtml = (page: Page) =>
  page.evaluate(() => {
    const host = document.querySelector("angular-tiptap-editor")!;
    return (window as DebugWindow).ng!.getComponent(host).getEditor()!.getHTML();
  });

const pastedAligned = (alignment: string) =>
  `<p>before</p><p style="text-align: ${alignment}">pasted</p><h2 style="text-align: ${alignment}">title</h2><p>after</p>`;

async function pasteHtml(page: Page, html: string) {
  await page.evaluate(content => {
    const host = document.querySelector("angular-tiptap-editor")!;
    const editor = (window as DebugWindow).ng!.getComponent(host).getEditor()!;
    editor.commands.focus("end");
    editor.view.pasteHTML(content);
  }, html);
}

async function selectImage(page: Page) {
  await page.evaluate(src => {
    const host = document.querySelector("angular-tiptap-editor")!;
    const editor = (window as DebugWindow).ng!.getComponent(host).getEditor()!;
    editor.commands.setContent(`<img src="${src}">`);
    let pos = -1;
    editor.state.doc.descendants((node, nodePos) => {
      if (pos < 0 && node.type.name === "resizableImage") {
        pos = nodePos;
      }
    });
    editor.commands.focus();
    editor.commands.setNodeSelection(pos);
  }, `data:image/png;base64,${PNG}`);
  await expect(page.getByRole("button", { name: "Change Image" })).toBeVisible();
}

test.describe("enableTextAlign", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();

    const editorBtn = page.getByTestId("mode-editor");
    const text = await editorBtn.innerText();
    if (text.toLowerCase().includes("éditeur")) {
      await page.getByTestId("lang-switch").click();
      await expect(editorBtn).toHaveText(/editor/i);
    }
  });

  test("keeps alignment working by default", async ({ page }) => {
    await configure(page, true);

    expect(await schemaHasTextAlign(page, "paragraph")).toBe(true);
    expect(await schemaHasTextAlign(page, "heading")).toBe(true);
    expect(await schemaHasTextAlign(page, "resizableImage")).toBe(true);
    for (const name of ALIGN_BUTTONS) {
      await expect(page.getByRole("button", { name })).toBeVisible();
    }

    await page.locator(".ProseMirror").click();
    await page.keyboard.type("aligned");
    await page.keyboard.press("ControlOrMeta+Shift+E");
    await expect.poll(() => editorHtml(page)).toContain("text-align: center");

    await page.getByTestId("clear-button").click();
    await pasteHtml(page, pastedAligned("right"));
    await expect.poll(() => editorHtml(page)).toContain("text-align: right");
  });

  test("leaves textAlign out of the schema when disabled", async ({ page }) => {
    await configure(page, false);

    expect(await schemaHasTextAlign(page, "paragraph")).toBe(false);
    expect(await schemaHasTextAlign(page, "heading")).toBe(false);
    expect(await schemaHasTextAlign(page, "resizableImage")).toBe(false);
  });

  test("hides the toolbar alignment buttons even when their own config enables them", async ({
    page,
  }) => {
    await configure(page, false);

    await expect(page.getByRole("button", { name: "Bold" })).toBeVisible();
    for (const name of ALIGN_BUTTONS) {
      await expect(page.getByRole("button", { name })).toHaveCount(0);
    }
  });

  test("hides the image bubble menu alignment buttons", async ({ page }) => {
    await configure(page, false);
    await selectImage(page);

    for (const name of ALIGN_BUTTONS) {
      await expect(page.getByRole("button", { name })).toHaveCount(0);
    }
  });

  test("ignores Mod+Shift+L/E/R/J", async ({ page }) => {
    await configure(page, false);

    await page.locator(".ProseMirror").click();
    await page.keyboard.type("not aligned");
    for (const key of ALIGN_SHORTCUTS) {
      await page.keyboard.press(`ControlOrMeta+Shift+${key}`);
    }

    await expect(page.locator(".ProseMirror")).toHaveText("not aligned");
    expect(await editorHtml(page)).not.toContain("text-align");
  });

  test("does not keep pasted text-align styles", async ({ page }) => {
    await configure(page, false);

    await pasteHtml(page, pastedAligned("center"));

    await expect(page.locator(".ProseMirror")).toContainText("pasted");
    expect(await editorHtml(page)).not.toContain("text-align");
  });
});
