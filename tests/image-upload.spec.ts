import { test, expect } from "@playwright/test";

test.describe("Editor Image Upload", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();

    const editorBtn = page.getByTestId("mode-editor");
    const text = await editorBtn.innerText();
    if (text.toLowerCase().includes("éditeur")) {
      await page.getByTestId("lang-switch").click();
      await expect(editorBtn).toHaveText(/editor/i);
    }

    await page.getByTestId("clear-button").click();
    await expect(page.locator(".ProseMirror")).toHaveText("");
  });

  test("should call custom imageUploadHandler when image is pasted", async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== "chromium",
      "this regression test uses synthetic clipboard image events, currently reliable only in chromium"
    );

    await page.locator(".ProseMirror").click();

    const diagnostics = await page.evaluate(async () => {
      const win = window as Window & {
        ng?: {
          getComponent: (element: Element) => {
            editorCommandsService: {
              uploadHandler: ((ctx: unknown) => Promise<{ src: string }>) | null;
            };
            getEditor: () => {
              commands: { focus: (position: string) => void };
              view: {
                someProp: (
                  propName: "handlePaste",
                  callback: (
                    handler: (view: unknown, event: ClipboardEvent, slice: unknown) => boolean
                  ) => boolean
                ) => boolean;
              };
            } | null;
          };
        };
        __uploadHandlerCalls?: number;
      };

      if (!win.ng) {
        throw new Error("Angular debug API is not available in test mode.");
      }

      const host = document.querySelector("angular-tiptap-editor");
      if (!host) {
        throw new Error("Editor host element not found.");
      }

      const component = win.ng.getComponent(host);
      win.__uploadHandlerCalls = 0;
      component.editorCommandsService.uploadHandler = async () => {
        win.__uploadHandlerCalls = (win.__uploadHandlerCalls ?? 0) + 1;
        return { src: "https://example.com/uploaded-from-handler.png" };
      };

      const editor = component.getEditor();
      if (!editor) {
        throw new Error("Editor instance not available.");
      }

      editor.commands.focus("end");

      const base64Png =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6V6mQAAAAASUVORK5CYII=";
      const bytes = Uint8Array.from(atob(base64Png), char => char.charCodeAt(0));
      const file = new File([bytes], "pasted-image.png", { type: "image/png" });
      const clipboardData = new DataTransfer();
      clipboardData.items.add(file);

      const pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      });

      let handled = false;
      editor.view.someProp("handlePaste", handler => {
        const handlerResult = handler(editor.view, pasteEvent, null);
        if (handlerResult) {
          handled = true;
          return true;
        }

        return false;
      });

      const timeoutMs = 2000;
      const start = Date.now();
      while ((win.__uploadHandlerCalls ?? 0) < 1 && Date.now() - start < timeoutMs) {
        await new Promise(resolve => setTimeout(resolve, 25));
      }

      return {
        uploadHandlerCalls: win.__uploadHandlerCalls ?? 0,
        handled,
      };
    });

    expect(diagnostics.handled).toBe(true);

    expect(diagnostics.uploadHandlerCalls).toBe(1);
  });
  test.describe("images inside pasted HTML", () => {
    type PastedHtmlScenario = {
      html: string;
      withHandler: boolean;
    };

    const pasteHtml = (page: import("@playwright/test").Page, scenario: PastedHtmlScenario) =>
      page.evaluate(async ({ html, withHandler }) => {
        const win = window as Window & {
          ng?: { getComponent: (element: Element) => unknown };
        };
        if (!win.ng) {
          throw new Error("Angular debug API is not available in test mode.");
        }
        const host = document.querySelector("angular-tiptap-editor");
        if (!host) {
          throw new Error("Editor host element not found.");
        }
        const component = win.ng.getComponent(host) as {
          editorCommandsService: {
            uploadHandler: ((ctx: { file: File }) => Promise<{ src: string }>) | null;
          };
          pastedImageRejected: {
            subscribe: (fn: (value: { reason: string; src: string }) => void) => void;
          };
          getEditor: () => {
            commands: { focus: (position: string) => void };
            view: { pasteHTML: (html: string) => boolean };
            state: {
              doc: {
                descendants: (
                  fn: (node: { type: { name: string }; attrs: Record<string, unknown> }) => void
                ) => void;
              };
            };
            getText: () => string;
          } | null;
        };

        const uploadedTypes: string[] = [];
        component.editorCommandsService.uploadHandler = withHandler
          ? async ctx => {
              uploadedTypes.push(ctx.file.type);
              return { src: "https://example.com/rehosted.png" };
            }
          : null;
        const rejections: { reason: string; src: string }[] = [];
        component.pastedImageRejected.subscribe(value => rejections.push(value));

        const editor = component.getEditor();
        if (!editor) {
          throw new Error("Editor instance not available.");
        }
        editor.commands.focus("end");
        editor.view.pasteHTML(html);

        const imageSources = () => {
          const sources: string[] = [];
          editor.state.doc.descendants(node => {
            if (node.type.name === "resizableImage" || node.type.name === "image") {
              sources.push(String(node.attrs["src"]));
            }
          });
          return sources;
        };

        const start = Date.now();
        while (
          withHandler &&
          imageSources().some(src => src.startsWith("data:")) &&
          Date.now() - start < 3000
        ) {
          await new Promise(resolve => setTimeout(resolve, 25));
        }
        await new Promise(resolve => setTimeout(resolve, 50));

        return {
          sources: imageSources(),
          uploadedTypes,
          rejections: rejections.map(rejection => rejection.reason),
          text: editor.getText(),
        };
      }, scenario);

    const base64Png =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6V6mQAAAAASUVORK5CYII=";

    test.beforeEach(async ({ browserName }) => {
      test.skip(
        browserName !== "chromium",
        "these regression tests use synthetic paste events, currently reliable only in chromium"
      );
    });

    test("should send base64 images through imageUploadHandler and swap in the hosted URL", async ({
      page,
    }) => {
      await page.locator(".ProseMirror").click();

      const result = await pasteHtml(page, {
        html: `<p>before</p><img src="${base64Png}"><p>after</p>`,
        withHandler: true,
      });

      expect(result.uploadedTypes).toEqual(["image/png"]);
      expect(result.sources).toEqual(["https://example.com/rehosted.png"]);
      expect(result.text).toContain("before");
      expect(result.text).toContain("after");
    });

    test("should keep base64 images when no upload handler is configured", async ({ page }) => {
      await page.locator(".ProseMirror").click();

      const result = await pasteHtml(page, {
        html: `<p>before</p><img src="${base64Png}">`,
        withHandler: false,
      });

      expect(result.uploadedTypes).toEqual([]);
      expect(result.sources).toEqual([base64Png]);
      expect(result.rejections).toEqual([]);
    });

    test("should drop images whose source cannot be loaded and keep the text", async ({ page }) => {
      await page.locator(".ProseMirror").click();

      const result = await pasteHtml(page, {
        html: '<p>from notion</p><p><img src="attachment:643f03f4:notion.png"></p><img src="file:///C:/Users/me/image001.png"><p>end</p>',
        withHandler: true,
      });

      expect(result.sources).toEqual([]);
      expect(result.rejections).toEqual(["unreachable", "unreachable"]);
      expect(result.text).toContain("from notion");
      expect(result.text).toContain("end");
    });

    test("should drop a base64 image rejected by validation", async ({ page }) => {
      await page.locator(".ProseMirror").click();

      const result = await pasteHtml(page, {
        html: '<p>before</p><img src="data:image/png;base64,%%%">',
        withHandler: true,
      });

      expect(result.sources).toEqual([]);
      expect(result.rejections).toEqual(["unreachable"]);
      expect(result.text).toContain("before");
    });
  });
});
