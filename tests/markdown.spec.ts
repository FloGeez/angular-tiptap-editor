import { test, expect, type Page } from "@playwright/test";

interface JSONContent {
  type: string;
  content?: JSONContent[];
  text?: string;
}

interface SetContentOptions {
  emitUpdate?: boolean;
  contentType?: "html" | "markdown" | "json";
}

interface EditorComponent {
  setContent: (content: string | JSONContent, options?: boolean | SetContentOptions) => void;
  getHTML: () => string;
  registeredId: () => string | null;
  editorRegistry: { get: (id?: string) => { getContent: (format: "markdown") => string } };
  getEditor: () => {
    extensionManager: { extensions: { name: string; configure: (o: object) => unknown }[] };
  } | null;
}

type DebugWindow = Window & {
  ng?: {
    getComponent: (element: Element) => EditorComponent;
    getOwningComponent: (element: Element) => {
      editorConfig: () => Record<string, unknown>;
    };
    applyChanges: (component: unknown) => void;
  };
};

const DOCUMENT = [
  "## Title",
  "",
  "Some **bold**, *italic*, ~~strike~~, `code`, ==marked== and a [link](https://example.com).",
  "",
  "- one",
  "- two",
  "  - nested",
  "",
  "1. first",
  "2. second",
  "",
  "- [ ] todo",
  "- [x] done",
  "",
  "> quote",
  "",
  "```ts",
  "const a = 1;",
  "```",
  "",
  "| A   | B   |",
  "| --- | --- |",
  "| 1   | 2   |",
  "",
  '![A cat](https://assets.test/a.png "My cat")',
  "",
  "---",
].join("\n");

const setContent = (page: Page, content: string | JSONContent, options?: SetContentOptions) =>
  page.evaluate(
    ({ value, opts }) => {
      const host = document.querySelector("angular-tiptap-editor")!;
      (window as DebugWindow).ng!.getComponent(host).setContent(value, opts);
    },
    { value: content, opts: options }
  );

/** Goes through the export service, as the copy and download buttons do */
const exportedMarkdown = (page: Page) =>
  page.evaluate(() => {
    const host = document.querySelector("angular-tiptap-editor")!;
    const component = (window as DebugWindow).ng!.getComponent(host);
    return component.editorRegistry
      .get(component.registeredId() ?? undefined)
      .getContent("markdown");
  });

// The serializer surrounds tables with an extra blank line: compare the content, not the spacing
const normalize = (markdown: string) => markdown.replace(/\n{3,}/g, "\n\n").trim();

test.describe("Markdown", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();
    await page.getByTestId("clear-button").click();
    await expect(page.locator(".ProseMirror")).toHaveText("");
  });

  test("setContent parses Markdown with contentType 'markdown'", async ({ page }) => {
    await setContent(page, DOCUMENT, { contentType: "markdown" });

    const editor = page.locator(".ProseMirror");
    await expect(editor.locator("h2")).toHaveText("Title");
    await expect(editor.locator("strong")).toHaveText("bold");
    await expect(editor.locator("mark")).toHaveText("marked");
    await expect(editor.locator("a[href='https://example.com']")).toHaveText("link");
    await expect(editor.locator("ul ul li")).toHaveText("nested");
    await expect(editor.locator("ol > li")).toHaveText(["first", "second"]);
    // The label of each item also holds a hidden "Task item checkbox for …" text: read the content
    await expect(editor.locator("ul[data-type='taskList'] > li > div")).toHaveText([
      "todo",
      "done",
    ]);
    const checkboxes = editor.locator("ul[data-type='taskList'] input[type='checkbox']");
    await expect(checkboxes.first()).not.toBeChecked();
    await expect(checkboxes.last()).toBeChecked();
    await expect(editor.locator("pre code")).toHaveText("const a = 1;");
    await expect(editor.locator("table th")).toHaveText(["A", "B"]);
    await expect(editor.locator("img")).toHaveAttribute("alt", "A cat");
    await expect(editor.locator("hr")).toHaveCount(1);
  });

  test("exports the Markdown it imported", async ({ page }) => {
    await setContent(page, DOCUMENT, { contentType: "markdown" });

    expect(normalize(await exportedMarkdown(page))).toBe(DOCUMENT);
  });

  test("keeps parsing strings as HTML by default", async ({ page }) => {
    await setContent(page, "<p>## not a heading</p>");

    await expect(page.locator(".ProseMirror h2")).toHaveCount(0);
    await expect(page.locator(".ProseMirror p").first()).toHaveText("## not a heading");
  });

  test("accepts JSON content", async ({ page }) => {
    await setContent(page, {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "From JSON" }] },
      ],
    } as JSONContent);

    await expect(page.locator(".ProseMirror h3")).toHaveText("From JSON");
    expect(normalize(await exportedMarkdown(page))).toBe("### From JSON");
  });

  test("a custom Markdown in tiptapExtensions replaces the built-in one without warning", async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== "chromium",
      "reconfigures the demo through the Angular debug API, verified on chromium only"
    );
    const warnings: string[] = [];
    page.on("console", msg => {
      if (msg.type() === "warning") {
        warnings.push(msg.text());
      }
    });

    await page.evaluate(() => {
      const win = window as DebugWindow;
      const host = document.querySelector("angular-tiptap-editor")!;
      const builtIn = win
        .ng!.getComponent(host)
        .getEditor()!
        .extensionManager.extensions.find(ext => ext.name === "markdown")!;
      const app = win.ng!.getOwningComponent(host);
      const nextConfig = {
        ...app.editorConfig(),
        tiptapExtensions: [builtIn.configure({ indentation: { style: "space", size: 4 } })],
      };
      app.editorConfig = () => nextConfig;
      win.ng!.applyChanges(app);
    });

    const markdownOptions = () =>
      page.evaluate(() => {
        const host = document.querySelector("angular-tiptap-editor")!;
        const extensions = (window as DebugWindow)
          .ng!.getComponent(host)
          .getEditor()!
          .extensionManager.extensions.filter(ext => ext.name === "markdown");
        return extensions.map(
          ext => (ext as unknown as { options: { indentation?: object } }).options.indentation
        );
      });
    await expect.poll(markdownOptions).toEqual([{ style: "space", size: 4 }]);

    await setContent(page, "- one\n  - nested", { contentType: "markdown" });
    await expect.poll(() => exportedMarkdown(page)).toContain("    - nested");
    expect(warnings.filter(w => w.includes("[ATE]"))).toEqual([]);
  });
});
