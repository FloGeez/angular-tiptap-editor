import { test, expect, type Page } from "@playwright/test";

interface EditorHandle {
  getHTML: () => string;
  commands: {
    setContent: (html: string) => boolean;
    selectAll: () => boolean;
    focus: (position?: string | number) => boolean;
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

/** Dispatches a real paste event carrying the given clipboard types, at `at` (default: the end) */
async function pasteClipboard(
  page: Page,
  data: Record<string, string>,
  at: "end" | number = "end"
) {
  await page.evaluate(
    ({ entries, position }) => {
      const host = document.querySelector("angular-tiptap-editor") as Element;
      const editor = (window as DebugWindow).ng!.getComponent(host).getEditor()!;
      editor.commands.focus(position);
      const clipboardData = new DataTransfer();
      Object.entries(entries).forEach(([type, value]) => clipboardData.setData(type, value));
      editor.view.dom.dispatchEvent(
        new ClipboardEvent("paste", { clipboardData, bubbles: true, cancelable: true })
      );
    },
    { entries: data, position: at }
  );
}

const MARKDOWN = "## Notes\n\nSome **bold** and a [link](https://example.com).\n\n- one\n- two";

test.describe("Markdown paste", () => {
  test.beforeEach(async ({ page, browserName }, testInfo) => {
    test.skip(
      browserName === "firefox" && !testInfo.title.includes("Mod+Shift+V"),
      "Firefox does not deliver the clipboardData of a ClipboardEvent created by a script"
    );
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();
    await clearEditor(page);
  });

  test("parses plain text that contains Markdown", async ({ page }) => {
    await pasteClipboard(page, { "text/plain": MARKDOWN });

    const editor = page.locator(".ProseMirror");
    await expect(editor.locator("h2")).toHaveText("Notes");
    await expect(editor.locator("strong")).toHaveText("bold");
    await expect(editor.locator("a[href='https://example.com']")).toHaveText("link");
    await expect(editor.locator("ul > li")).toHaveText(["one", "two"]);
  });

  test("pastes plain text without Markdown syntax line by line", async ({ page }) => {
    await pasteClipboard(page, { "text/plain": "First line\nSecond line" });

    await expect(page.locator(".ProseMirror p")).toHaveText(["First line", "Second line"]);
  });

  test("parses Markdown copied from VS Code instead of its colored HTML", async ({ page }) => {
    await pasteClipboard(page, {
      "text/plain": MARKDOWN,
      "text/html": `<div style="color: #d4d4d4;"><div><span style="color: #569cd6;">## Notes</span></div></div>`,
      "vscode-editor-data": '{"version":1,"mode":"markdown"}',
    });

    await expect(page.locator(".ProseMirror h2")).toHaveText("Notes");
    await expect(page.locator(".ProseMirror ul > li")).toHaveText(["one", "two"]);
    expect(await editorHtml(page)).not.toMatch(/color:/);
  });

  test("keeps the HTML when the clipboard has some", async ({ page }) => {
    await pasteClipboard(page, {
      "text/plain": "## Not parsed",
      "text/html": "<p>## Not parsed</p>",
    });

    await expect(page.locator(".ProseMirror h2")).toHaveCount(0);
    await expect(page.locator(".ProseMirror p")).toHaveText("## Not parsed");
  });

  test("pastes as plain text without parsing (Mod+Shift+V)", async ({ page }) => {
    await page.evaluate(text => {
      const host = document.querySelector("angular-tiptap-editor") as Element;
      const editor = (window as DebugWindow).ng!.getComponent(host).getEditor()!;
      editor.commands.focus("end");
      // pasteText is ProseMirror's plain-text paste, the path Mod+Shift+V takes
      (editor.view as unknown as { pasteText: (value: string) => boolean }).pasteText(text);
    }, "## Title\n- item");

    await expect(page.locator(".ProseMirror h2")).toHaveCount(0);
    await expect(page.locator(".ProseMirror p")).toHaveText(["## Title", "- item"]);
  });

  test("pastes Markdown into a code block as raw text", async ({ page }) => {
    await setContent(page, "<pre><code></code></pre>");
    // Inside the code block, not in the paragraph the editor keeps after it
    await pasteClipboard(page, { "text/plain": "## Title\n- item" }, 1);

    await expect(page.locator(".ProseMirror pre code")).toHaveText("## Title\n- item");
    await expect(page.locator(".ProseMirror h2")).toHaveCount(0);
  });

  test("markdown: false pastes Markdown line by line", async ({ page }) => {
    await setConfig(page, { paste: { markdown: false } });
    await clearEditor(page);
    await pasteClipboard(page, { "text/plain": "## Title\n- item" });

    await expect(page.locator(".ProseMirror h2")).toHaveCount(0);
    await expect(page.locator(".ProseMirror p")).toHaveText(["## Title", "- item"]);
  });
});
