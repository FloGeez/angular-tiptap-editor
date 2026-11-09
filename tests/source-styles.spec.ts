import { test, expect, type Page } from "@playwright/test";
import { clearEditor } from "./helpers";

interface EditorHandle {
  getHTML: () => string;
  commands: { setContent: (html: string) => boolean; focus: (position?: string) => boolean };
  view: { pasteHTML: (html: string) => boolean };
}

type DebugWindow = Window & {
  ng?: {
    getComponent: (element: Element) => { getEditor: () => EditorHandle | null };
    getOwningComponent: (element: Element) => { editorConfig: () => Record<string, unknown> };
    applyChanges: (component: unknown) => void;
  };
};

// As Google Docs puts it on the clipboard: every block and cell styled inline
const DOCS_HTML =
  `<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-2">` +
  `<p dir="ltr" style="line-height:1.38;margin-top:12pt;margin-bottom:6pt;"><span style="font-size:11pt;color:#ff0000;">Spaced</span></p>` +
  `<div dir="ltr" style="margin-left:0pt;" align="left"><table style="border:none;border-collapse:collapse;">` +
  `<colgroup><col width="200"><col width="150"></colgroup><tbody><tr style="height:30pt">` +
  `<td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:middle;background-color:#d9ead3;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;">` +
  `<p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span>A1</span></p></td>` +
  `<td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:middle;padding:5pt 5pt 5pt 5pt;">` +
  `<p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span>B1</span></p></td>` +
  `</tr></tbody></table></div></b>`;

// As Word puts it on the clipboard: paragraph spacing in a stylesheet, cell sizes as attributes
const WORD_HTML =
  `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">` +
  `<head><style><!-- p.MsoNormal, li.MsoNormal, div.MsoNormal {margin-top:0cm;margin-right:0cm;margin-bottom:8.0pt;margin-left:0cm;line-height:107%;font-size:11.0pt;font-family:"Calibri",sans-serif;} --></style></head>` +
  `<body><p class=MsoNormal>Word paragraph</p>` +
  `<table class=MsoTableGrid border=1 cellspacing=0 cellpadding=0 style='border-collapse:collapse;border:none;mso-border-alt:solid windowtext .5pt'>` +
  `<tr><td width=302 valign=top style='width:226.55pt;border:solid windowtext 1.0pt;padding:0cm 5.4pt 0cm 5.4pt'>` +
  `<p class=MsoNormal style='margin-bottom:0cm;line-height:normal'>W1</p></td>` +
  `<td width=200 valign=top style='width:150pt;border:solid windowtext 1.0pt;border-left:none;padding:0cm 5.4pt 0cm 5.4pt'>` +
  `<p class=MsoNormal style='margin-bottom:0cm;line-height:normal'>W2</p></td></tr></table></body></html>`;

async function setPaste(page: Page, paste: Record<string, unknown>) {
  await page.evaluate(values => {
    const win = window as DebugWindow;
    const host = document.querySelector("angular-tiptap-editor") as Element;
    const app = win.ng!.getOwningComponent(host);
    const current = app.editorConfig();
    const config = { ...current, paste: { ...(current["paste"] as object), ...values } };
    app.editorConfig = () => config;
    win.ng!.applyChanges(app);
  }, paste);
}

/** Like a Ctrl+V: the focus lands first (Tiptap applies it on the next frame), then the paste */
async function pasteHtml(page: Page, html: string) {
  await page.evaluate(() => {
    const host = document.querySelector("angular-tiptap-editor") as Element;
    (window as DebugWindow).ng!.getComponent(host).getEditor()!.commands.focus("end");
  });
  await page.evaluate(
    () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  );
  await page.evaluate(content => {
    const host = document.querySelector("angular-tiptap-editor") as Element;
    (window as DebugWindow).ng!.getComponent(host).getEditor()!.view.pasteHTML(content);
  }, html);
}

const editorHtml = (page: Page) =>
  page.evaluate(() => {
    const host = document.querySelector("angular-tiptap-editor") as Element;
    return (window as DebugWindow).ng!.getComponent(host).getEditor()!.getHTML();
  });

const style = (page: Page, selector: string, property: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property);

const px = async (page: Page, selector: string, property: string) =>
  parseFloat(await style(page, selector, property));

const prompt = (page: Page) => page.locator(".tippy-box [role='toolbar']");

test.describe("Source styles", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();
    await clearEditor(page);
    await page.locator(".ProseMirror").click();
  });

  test("merge drops the block styles by default, as before", async ({ page }) => {
    await pasteHtml(page, DOCS_HTML);
    await expect.poll(() => editorHtml(page)).toContain("A1");

    const html = await editorHtml(page);
    expect(html).not.toContain("line-height");
    expect(html).not.toContain("padding");
    expect(await px(page, ".ProseMirror td", "padding-left")).toBe(12);
  });

  test("Google Docs: prompt keeps spacing, borders, backgrounds and widths, Clean up drops them", async ({
    page,
  }) => {
    await setPaste(page, { external: "prompt" });
    await pasteHtml(page, DOCS_HTML);
    await expect.poll(() => editorHtml(page)).toContain("A1");

    // Paragraph: 12pt above it
    expect(await px(page, ".ProseMirror > p:has-text('Spaced')", "margin-top")).toBeCloseTo(16, 0);
    // Cells: 5pt padding, solid borders, background, vertical alignment
    const cell = ".ProseMirror td";
    expect(await px(page, cell, "padding-left")).toBeCloseTo(6.67, 1);
    expect(await style(page, cell, "border-top-style")).toBe("solid");
    expect(await style(page, cell, "background-color")).toBe("rgb(217, 234, 211)");
    expect(await style(page, cell, "vertical-align")).toBe("middle");
    expect(await style(page, ".ProseMirror table", "border-collapse")).toBe("collapse");
    // Column widths from the colgroup
    expect(await editorHtml(page)).toMatch(/colwidth="200"/);

    await expect(prompt(page)).toBeVisible();
    await prompt(page).locator(".ate-button", { hasText: "Clean up" }).click();
    await expect.poll(() => editorHtml(page)).not.toContain("line-height");
    expect(await editorHtml(page)).not.toContain("background-color");
    expect(await px(page, cell, "padding-left")).toBe(12);
  });

  test("prompt: Merge takes the editor's layout and keeps the colors, one undo brings it back", async ({
    page,
  }) => {
    await setPaste(page, { external: "prompt" });
    await pasteHtml(page, DOCS_HTML);
    await expect.poll(() => editorHtml(page)).toContain("A1");

    await prompt(page).locator(".ate-button", { hasText: "Merge" }).click();
    await expect(prompt(page)).toHaveCount(0);
    await expect.poll(() => editorHtml(page)).not.toContain("line-height");
    const html = await editorHtml(page);
    expect(html).not.toContain("padding");
    expect(html).toMatch(/color:\s*(#ff0000|rgb\(255,\s*0,\s*0\))/);
    expect(await px(page, ".ProseMirror td", "padding-left")).toBe(12);

    await page.keyboard.press("ControlOrMeta+z");
    await expect.poll(() => editorHtml(page)).toContain("line-height");
    expect(await px(page, ".ProseMirror td", "padding-left")).toBeCloseTo(6.67, 1);
  });

  test("prompt: Merge is not offered when it would change nothing", async ({ page }) => {
    await setPaste(page, { external: "prompt" });
    await pasteHtml(page, `<p><span style="color:#ff0000">Only red</span></p>`);

    await expect(prompt(page)).toBeVisible();
    await expect(prompt(page).locator(".ate-button", { hasText: "Clean up" })).toBeVisible();
    await expect(prompt(page).locator(".ate-button", { hasText: "Merge" })).toHaveCount(0);
  });

  test("merge keeps them with blockStyles: true", async ({ page }) => {
    await setPaste(page, { blockStyles: true });
    await pasteHtml(page, DOCS_HTML);
    await expect.poll(() => editorHtml(page)).toContain("A1");
    expect(await px(page, ".ProseMirror td", "padding-left")).toBeCloseTo(6.67, 1);
    await expect(prompt(page)).toHaveCount(0);
  });

  test("Word: stylesheet spacing, cell widths and alignment are kept", async ({ page }) => {
    await setPaste(page, { blockStyles: true });
    await pasteHtml(page, WORD_HTML);
    await expect.poll(() => editorHtml(page)).toContain("W2");

    // p.MsoNormal: 8pt below the paragraph, from Word's stylesheet
    expect(
      await px(page, ".ProseMirror > p:has-text('Word paragraph')", "margin-bottom")
    ).toBeCloseTo(10.67, 1);
    // ...but the inline margin of the cell paragraphs wins over it
    expect(await px(page, ".ProseMirror td p", "margin-bottom")).toBe(0);
    const html = await editorHtml(page);
    expect(html).toMatch(/colwidth="302"/);
    expect(html).toMatch(/colwidth="200"/);
    expect(html).toContain("vertical-align: top");
    expect(html).not.toContain("font-family");
    expect(await style(page, ".ProseMirror td", "border-top-style")).toBe("solid");
    expect(await style(page, ".ProseMirror td:nth-child(2)", "border-left-style")).toBe("none");
  });

  test("loaded HTML keeps the block styles the editor knows, and only those", async ({ page }) => {
    await page.evaluate(() => {
      const host = document.querySelector("angular-tiptap-editor") as Element;
      (window as DebugWindow)
        .ng!.getComponent(host)
        .getEditor()!
        .commands.setContent(
          `<p style="margin-top: 20px; line-height: 2; position: absolute; color: red">Loaded</p>` +
            `<table><tbody><tr><td style="background-color: rgb(1, 2, 3); padding: 4px; width: 50px">C</td></tr></tbody></table>`
        );
    });
    const html = await editorHtml(page);
    expect(html).toContain("margin-top: 20px");
    expect(html).toContain("line-height: 2");
    expect(html).toContain("background-color: rgb(1, 2, 3)");
    expect(html).toContain("padding: 4px");
    expect(html).not.toContain("position");
    expect(html).not.toContain("color: red");
    expect(html).not.toContain("width: 50px");
  });
});
