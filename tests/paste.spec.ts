import { test, expect, type Page } from "@playwright/test";

interface EditorHandle {
  getHTML: () => string;
  commands: {
    setContent: (html: string) => boolean;
    selectAll: () => boolean;
    focus: (position?: string) => boolean;
  };
  state: { selection: { content: () => unknown } };
  view: {
    pasteHTML: (html: string) => boolean;
    serializeForClipboard: (slice: unknown) => { dom: HTMLElement };
  };
}

interface PasteCall {
  html: string;
  source: string;
}

type DebugWindow = Window & {
  ng?: {
    getComponent: (element: Element) => { getEditor: () => EditorHandle | null };
    getOwningComponent: (element: Element) => { editorConfig: () => Record<string, unknown> };
    applyChanges: (component: unknown) => void;
  };
  __pasteCalls?: PasteCall[];
};

type TransformKind = "record" | "replace" | "throw" | "no-string";

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

// HTML copied from another ProseMirror-based editor (e.g. Confluence): it carries ProseMirror's marker, not ours
const OTHER_EDITOR_HTML = `<p data-pm-slice="1 1 []"><span style="color: #ff0000">Other editor red</span></p>`;

const RED = /color:\s*(?:#ff0000|rgb\(255,\s*0,\s*0\))/i;
// A text color other than the `color: inherit` the editor itself sets on highlights
const PASTED_COLOR = /(^|[^-])color:(?!\s*inherit)/i;

async function setConfig(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(values => {
    const win = window as DebugWindow;
    const host = document.querySelector("angular-tiptap-editor");
    if (!win.ng || !host) {
      throw new Error("Angular debug API or editor host not available.");
    }
    const app = win.ng.getOwningComponent(host);
    const current = app.editorConfig();
    const config = {
      ...current,
      ...values,
      paste: { ...(current["paste"] as object), ...(values["paste"] as object) },
    };
    app.editorConfig = () => config;
    win.ng.applyChanges(app);
  }, patch);
}

/** Sets `paste.transformHTML` (functions cannot cross `page.evaluate`, so it is built in the page) */
async function setTransform(page: Page, kind: TransformKind) {
  await page.evaluate(transformKind => {
    const win = window as DebugWindow;
    const host = document.querySelector("angular-tiptap-editor") as Element;
    const app = win.ng!.getOwningComponent(host);
    const calls: PasteCall[] = [];
    win.__pasteCalls = calls;
    const transformHTML = (html: string, context: { source: string }) => {
      calls.push({ html, source: context.source });
      switch (transformKind) {
        case "replace":
          return html.replace("Bold black", "Transformed");
        case "throw":
          throw new Error("transform exploded");
        case "no-string":
          return undefined;
        default:
          return html;
      }
    };
    const current = app.editorConfig();
    const config = { ...current, paste: { ...(current["paste"] as object), transformHTML } };
    app.editorConfig = () => config;
    win.ng!.applyChanges(app);
  }, kind);
}

const pasteCalls = (page: Page) => page.evaluate(() => (window as DebugWindow).__pasteCalls ?? []);

async function pasteHtml(page: Page, html: string) {
  await page.evaluate(content => {
    const host = document.querySelector("angular-tiptap-editor") as Element;
    const editor = (window as DebugWindow).ng!.getComponent(host).getEditor()!;
    editor.commands.focus("end");
    editor.view.pasteHTML(content);
  }, html);
}

/** Copies the whole document the way the editor fills the clipboard, then pastes it at the end */
async function copyAllAndPasteInside(page: Page) {
  await page.evaluate(() => {
    const host = document.querySelector("angular-tiptap-editor") as Element;
    const editor = (window as DebugWindow).ng!.getComponent(host).getEditor()!;
    editor.commands.selectAll();
    const { dom } = editor.view.serializeForClipboard(editor.state.selection.content());
    editor.commands.focus("end");
    editor.view.pasteHTML(dom.innerHTML);
  });
}

const editorHtml = (page: Page) =>
  page.evaluate(() => {
    const host = document.querySelector("angular-tiptap-editor");
    return (host && (window as DebugWindow).ng?.getComponent(host).getEditor()?.getHTML()) ?? "";
  });

const setContent = (page: Page, html: string) =>
  page.evaluate(content => {
    const host = document.querySelector("angular-tiptap-editor") as Element;
    (window as DebugWindow).ng!.getComponent(host).getEditor()!.commands.setContent(content);
  }, html);

const clearEditor = async (page: Page) => {
  await page.getByTestId("clear-button").click();
  await expect(page.locator(".ProseMirror")).toHaveText("");
  await page.locator(".ProseMirror").click();
};

test.describe("Paste settings", () => {
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
    expect(html).toMatch(RED);
    expect(html).toMatch(/<mark[^>]*background-color:\s*(#00ff00|rgb\(0,\s*255,\s*0\))/i);
  });

  test("colors: false removes text colors and keeps highlights and other formatting", async ({
    page,
  }) => {
    await setConfig(page, { paste: { colors: false } });
    await pasteHtml(page, DOCS_HTML);

    await expect.poll(() => editorHtml(page)).toContain("Bold black");
    const html = await editorHtml(page);
    expect(html).not.toMatch(PASTED_COLOR);
    expect(html).toContain("<mark");
    expect(html).toMatch(/<strong>\s*Bold black/);
    expect(html).toContain('href="https://example.com/docs"');
    expect(html).toMatch(/<ul>.*<li>.*<em>item<\/em>/s);
  });

  test("highlights: false removes highlights and keeps text colors", async ({ page }) => {
    await setConfig(page, { paste: { highlights: false } });
    await pasteHtml(page, DOCS_HTML);

    await expect.poll(() => editorHtml(page)).toContain("Bold black");
    const html = await editorHtml(page);
    expect(html).not.toContain("<mark");
    expect(html).not.toContain("background");
    expect(html).toMatch(RED);
  });

  test("cleans Word HTML together with the Office cleanup", async ({ page }) => {
    await setConfig(page, { enableOfficePaste: true, paste: { colors: false, highlights: false } });
    await pasteHtml(page, WORD_HTML);

    await expect.poll(() => editorHtml(page)).toContain("Word red");
    const html = await editorHtml(page);
    expect(html).toContain("Word black");
    expect(html).not.toMatch(/color|background/i);
  });

  test("Word HTML keeps its colors by default", async ({ page }) => {
    await pasteHtml(page, WORD_HTML);

    await expect.poll(() => editorHtml(page)).toContain("Word red");
    expect(await editorHtml(page)).toMatch(/color:\s*(#c00000|rgb\(192,\s*0,\s*0\))/i);
  });

  test("content copied from the editor keeps its colors and highlights", async ({ page }) => {
    await setConfig(page, { paste: { colors: false, highlights: false } });
    await setContent(
      page,
      '<p><span style="color: #ff0000">Red</span> <mark data-color="#ffff00" style="background-color: #ffff00">Yellow</mark></p>'
    );
    const countRed = async () =>
      ((await editorHtml(page)).match(new RegExp(RED.source, "gi")) ?? []).length;
    await expect.poll(countRed).toBe(1);

    await copyAllAndPasteInside(page);

    await expect.poll(countRed).toBe(2);
    expect((await editorHtml(page)).match(/<mark/g)).toHaveLength(2);
  });

  test("content from another ProseMirror-based editor is treated as an other app", async ({
    page,
  }) => {
    await setConfig(page, { paste: { colors: false } });
    await pasteHtml(page, OTHER_EDITOR_HTML);

    await expect.poll(() => editorHtml(page)).toContain("Other editor red");
    expect(await editorHtml(page)).not.toMatch(RED);
  });

  test("changing the paste settings at runtime applies to the next paste", async ({ page }) => {
    await setConfig(page, { paste: { colors: false } });
    await pasteHtml(page, DOCS_HTML);
    await expect.poll(() => editorHtml(page)).toContain("Bold black");
    expect(await editorHtml(page)).not.toMatch(RED);

    await setConfig(page, { paste: { colors: true } });
    await clearEditor(page);
    await pasteHtml(page, DOCS_HTML);
    await expect.poll(() => editorHtml(page)).toMatch(RED);
  });

  test("transformHTML receives the source of each paste", async ({ page }) => {
    await setTransform(page, "record");

    await pasteHtml(page, DOCS_HTML);
    await pasteHtml(page, WORD_HTML);
    await pasteHtml(page, OTHER_EDITOR_HTML);
    await copyAllAndPasteInside(page);

    await expect
      .poll(async () => (await pasteCalls(page)).map(call => call.source))
      .toEqual(["external", "office", "external", "editor"]);
  });

  test("transformHTML runs after the Office cleanup and the format settings", async ({ page }) => {
    await setConfig(page, { enableOfficePaste: true, paste: { colors: false } });
    await setTransform(page, "record");

    await pasteHtml(page, WORD_HTML);

    await expect.poll(async () => (await pasteCalls(page)).length).toBe(1);
    const [call] = await pasteCalls(page);
    expect(call.source).toBe("office");
    expect(call.html).toContain("Word red");
    expect(call.html).not.toContain("mso-");
    expect(call.html).not.toMatch(PASTED_COLOR);
  });

  test("transformHTML's result is what gets inserted", async ({ page }) => {
    await setTransform(page, "replace");
    await pasteHtml(page, DOCS_HTML);

    await expect.poll(() => editorHtml(page)).toContain("Transformed");
    expect(await editorHtml(page)).not.toContain("Bold black");
  });

  for (const kind of ["throw", "no-string"] as const) {
    test(`transformHTML that ${kind === "throw" ? "throws" : "returns no string"} leaves the paste unchanged`, async ({
      page,
    }) => {
      await setTransform(page, kind);
      await pasteHtml(page, DOCS_HTML);

      await expect.poll(() => editorHtml(page)).toContain("Bold black");
      expect(await editorHtml(page)).toMatch(RED);
    });
  }
});
