import { test, expect, type Page } from "@playwright/test";

type MarkdownCase = { src: string; alt?: string; title?: string; width?: number; height?: number };

type MarkdownOutput = { storage: string; config: string; closedBlocks: number };

async function serializeImage(page: Page, attrs: MarkdownCase): Promise<MarkdownOutput> {
  return page.evaluate(imageAttrs => {
    const win = window as unknown as {
      ng: { getComponent: (element: Element) => { getEditor: () => EditorHandle } };
    };
    type EditorHandle = {
      storage: Record<
        string,
        {
          markdown: {
            serialize: (state: unknown, node: unknown) => void;
            parse: Record<string, never>;
          };
        }
      >;
      extensionManager: {
        extensions: {
          name: string;
          config: { renderMarkdown: (node: unknown) => string; markdownTokenName: string };
        }[];
      };
    };
    const host = document.querySelector("angular-tiptap-editor");
    const editor = win.ng.getComponent(host!).getEditor();
    const node = { attrs: imageAttrs, isInline: false };

    let written = "";
    let closedBlocks = 0;
    const state = {
      write: (text: string) => (written += text),
      esc: (text: string) => text.replace(/[[\]*_`]/g, "\\$&"),
      closeBlock: () => closedBlocks++,
    };
    editor.storage["resizableImage"].markdown.serialize(state, node);

    const extension = editor.extensionManager.extensions.find(
      item => item.name === "resizableImage"
    )!;
    return { storage: written, config: extension.config.renderMarkdown(node), closedBlocks };
  }, attrs);
}

test.describe("Resizable image Markdown spec", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();
  });

  test("serializes src, alt and title as a Markdown image", async ({ page }) => {
    const output = await serializeImage(page, {
      src: "https://assets.test/a.png",
      alt: "A cat",
      title: "My cat",
    });
    expect(output.storage).toBe('![A cat](https://assets.test/a.png "My cat")');
    expect(output.config).toBe(output.storage);
  });

  test("omits the title when there is none and drops width and height", async ({ page }) => {
    const output = await serializeImage(page, {
      src: "https://assets.test/a.png",
      alt: "A cat",
      width: 120,
      height: 80,
    });
    expect(output.storage).toBe("![A cat](https://assets.test/a.png)");
    expect(output.config).toBe(output.storage);
  });

  test("escapes parentheses in the src and quotes in the title", async ({ page }) => {
    const output = await serializeImage(page, {
      src: "https://assets.test/a(1).png",
      title: 'say "hi"',
    });
    expect(output.storage).toBe('![](https://assets.test/a\\(1\\).png "say \\"hi\\"")');
    expect(output.config).toBe(output.storage);
  });

  test("escapes brackets in the alt text", async ({ page }) => {
    const output = await serializeImage(page, {
      src: "https://assets.test/a.png",
      alt: "photo [2024]",
    });
    expect(output.storage).toBe("![photo \\[2024\\]](https://assets.test/a.png)");
    expect(output.config).toBe(output.storage);
  });

  test("closes the block so the next block is separated by a blank line", async ({ page }) => {
    const output = await serializeImage(page, { src: "https://assets.test/a.png" });
    expect(output.closedBlocks).toBe(1);
  });

  test("declares the token name and the empty parse spec read by the Markdown extensions", async ({
    page,
  }) => {
    const spec = await page.evaluate(() => {
      const win = window as unknown as {
        ng: {
          getComponent: (element: Element) => {
            getEditor: () => {
              storage: Record<string, { markdown: { parse: unknown } }>;
              extensionManager: {
                extensions: { name: string; config: Record<string, unknown> }[];
              };
            };
          };
        };
      };
      const editor = win.ng
        .getComponent(document.querySelector("angular-tiptap-editor")!)
        .getEditor();
      const extension = editor.extensionManager.extensions.find(
        item => item.name === "resizableImage"
      )!;
      return {
        parse: editor.storage["resizableImage"].markdown.parse,
        tokenName: extension.config["markdownTokenName"],
        hasParseMarkdown: typeof extension.config["parseMarkdown"],
      };
    });
    expect(spec).toEqual({ parse: {}, tokenName: "image", hasParseMarkdown: "function" });
  });

  test("keeps the image source refreshers next to the Markdown spec", async ({ page }) => {
    const keys = await page.evaluate(() => {
      const win = window as unknown as {
        ng: {
          getComponent: (element: Element) => {
            getEditor: () => { storage: Record<string, Record<string, unknown>> };
          };
        };
      };
      const editor = win.ng
        .getComponent(document.querySelector("angular-tiptap-editor")!)
        .getEditor();
      return Object.keys(editor.storage["resizableImage"]).sort();
    });
    expect(keys).toEqual(["markdown", "srcRefreshers"]);
  });
});
