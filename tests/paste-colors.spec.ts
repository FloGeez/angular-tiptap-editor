import { test, expect, type Page } from "@playwright/test";

type EditorLike = { getHTML: () => string };

type DebugWindow = Window & {
  ng?: {
    getComponent: (element: Element) => { getEditor: () => EditorLike | null };
    getOwningComponent: (element: Element) => { editorConfig: () => Record<string, unknown> };
    applyChanges: (component: unknown) => void;
  };
};

const DOCS_HTML =
  `<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1">` +
  `<p dir="ltr"><span style="font-size:11pt;color:#000000;background-color:#ffffff;font-weight:700;">Bold black</span>` +
  `<span style="color:#ff0000;background-color:transparent;"> red</span>` +
  `<span style="background-color:#ffff00;"> yellow</span>` +
  `<mark style="background-color:#00ff00;" data-color="#00ff00"> marked</mark>` +
  `<a href="https://example.com/docs" style="color:#1155cc;"> link</a></p>` +
  `<ul><li><p><span style="color:#222222;font-style:italic;">item</span></p></li></ul></b>`;

const WORD_HTML =
  `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">` +
  `<body><p class="MsoNormal"><span style="color:#C00000;mso-fareast-language:EN-US">Word red</span>` +
  `<span style="color:black;background:white"> Word black</span></p></body></html>`;

async function setConfig(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(values => {
    const win = window as DebugWindow;
    const host = document.querySelector("angular-tiptap-editor");
    if (!win.ng || !host) {
      throw new Error("Angular debug API or editor host not available.");
    }
    const app = win.ng.getOwningComponent(host);
    const config = { ...app.editorConfig(), ...values };
    app.editorConfig = () => config;
    win.ng.applyChanges(app);
  }, patch);
}

async function pasteHtml(page: Page, html: string) {
  await page.evaluate(content => {
    const data = new DataTransfer();
    data.setData("text/html", content);
    data.setData("text/plain", "plain");
    const target = document.querySelector(".ProseMirror") as HTMLElement;
    target.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true })
    );
  }, html);
}

async function copyAndPasteInside(page: Page) {
  await page.evaluate(() => {
    const data = new DataTransfer();
    const target = document.querySelector(".ProseMirror") as HTMLElement;
    target.dispatchEvent(
      new ClipboardEvent("copy", { clipboardData: data, bubbles: true, cancelable: true })
    );
    const host = document.querySelector("angular-tiptap-editor") as Element;
    const editor = (window as DebugWindow).ng!.getComponent(host).getEditor() as unknown as {
      commands: { focus: (position: string) => boolean };
    };
    editor.commands.focus("end");
    target.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true })
    );
  });
}

const editorHtml = (page: Page) =>
  page.evaluate(() => {
    const host = document.querySelector("angular-tiptap-editor");
    return (host && (window as DebugWindow).ng?.getComponent(host).getEditor()?.getHTML()) ?? "";
  });

const clearEditor = async (page: Page) => {
  await page.getByTestId("clear-button").click();
  await expect(page.locator(".ProseMirror")).toHaveText("");
  await page.locator(".ProseMirror").click();
};

test.describe("Pasted colors", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();

    const editorBtn = page.getByTestId("mode-editor");
    const text = await editorBtn.innerText();
    if (text.toLowerCase().includes("éditeur")) {
      await page.getByTestId("lang-switch").click();
      await expect(editorBtn).toHaveText(/editor/i);
    }

    await clearEditor(page);
  });

  test("keeps colors and highlights from other apps by default", async ({ page }) => {
    await pasteHtml(page, DOCS_HTML);

    await expect.poll(() => editorHtml(page)).toContain("Bold black");
    const html = await editorHtml(page);
    expect(html).toMatch(/color:\s*(#ff0000|rgb\(255,\s*0,\s*0\))/i);
    expect(html).toMatch(/color: rgb\(0, 0, 0\)/i);
    expect(html).toMatch(/<mark[^>]*background-color:\s*(#00ff00|rgb\(0,\s*255,\s*0\))/i);
  });

  test("stripPastedColors removes text colors, highlights and backgrounds from other apps", async ({
    page,
  }) => {
    await setConfig(page, { stripPastedColors: true });
    await pasteHtml(page, DOCS_HTML);

    await expect.poll(() => editorHtml(page)).toContain("Bold black");
    const html = await editorHtml(page);
    expect(html).not.toMatch(/color/i);
    expect(html).not.toContain("<mark");
    expect(html).not.toContain("background");
    expect(html).not.toContain('style=""');
  });

  test("stripPastedColors keeps the other formatting", async ({ page }) => {
    await setConfig(page, { stripPastedColors: true });
    await pasteHtml(page, DOCS_HTML);

    await expect.poll(() => editorHtml(page)).toContain("Bold black");
    const html = await editorHtml(page);
    expect(html).toMatch(/<strong>\s*Bold black/);
    expect(html).toContain('href="https://example.com/docs"');
    expect(html).toMatch(/<ul>.*<li>.*<em>item<\/em>/s);
    await expect(page.locator(".ProseMirror strong")).toHaveText("Bold black");
    await expect(page.locator(".ProseMirror em")).toHaveText("item");
  });

  test("stripPastedColors cleans Word HTML together with office paste", async ({ page }) => {
    await setConfig(page, { stripPastedColors: true, enableOfficePaste: true });
    await pasteHtml(page, WORD_HTML);

    await expect.poll(() => editorHtml(page)).toContain("Word red");
    const html = await editorHtml(page);
    expect(html).toContain("Word black");
    expect(html).not.toMatch(/color|background/i);
  });

  test("Word HTML keeps its colors when the option is off", async ({ page }) => {
    await pasteHtml(page, WORD_HTML);

    await expect.poll(() => editorHtml(page)).toContain("Word red");
    expect(await editorHtml(page)).toMatch(/color:\s*(#c00000|rgb\(192,\s*0,\s*0\))/i);
  });

  test("copy and paste inside the editor keeps colors when stripPastedColors is on", async ({
    page,
  }) => {
    await setConfig(page, { stripPastedColors: true });
    await page.evaluate(() => {
      const host = document.querySelector("angular-tiptap-editor");
      const editor = (host &&
        (window as DebugWindow).ng?.getComponent(host).getEditor()) as unknown as {
        commands: Record<string, (...args: unknown[]) => boolean>;
      };
      editor.commands["setContent"](
        '<p><span style="color: #ff0000">Red</span> <mark data-color="#ffff00" style="background-color: #ffff00">Yellow</mark></p>'
      );
      editor.commands["selectAll"]();
    });
    const countRed = async () =>
      (await editorHtml(page)).split(/color:\s*(?:#ff0000|rgb\(255,\s*0,\s*0\))/i).length - 1;
    await expect.poll(countRed).toBe(1);

    await copyAndPasteInside(page);

    await expect.poll(countRed).toBe(2);
    expect((await editorHtml(page)).match(/<mark/g)).toHaveLength(2);
  });

  test("toggling stripPastedColors at runtime applies to the next paste", async ({ page }) => {
    await setConfig(page, { stripPastedColors: true });
    await pasteHtml(page, DOCS_HTML);
    await expect.poll(() => editorHtml(page)).toContain("Bold black");
    expect(await editorHtml(page)).not.toMatch(/color/i);

    await setConfig(page, { stripPastedColors: false });
    await clearEditor(page);
    await pasteHtml(page, DOCS_HTML);
    await expect.poll(() => editorHtml(page)).toMatch(/color:/i);
  });
});
