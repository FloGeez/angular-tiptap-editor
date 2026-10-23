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
  test.describe("image file validation feedback", () => {
    type FileScenario = {
      via: "paste" | "drop";
      type: string;
      sizeBytes: number;
      handler: "none" | "resolve" | "reject";
    };

    type HtmlScenario = {
      html: string;
      handler: "resolve" | "reject";
    };

    const base64Png =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6V6mQAAAAASUVORK5CYII=";

    test.beforeEach(async ({ browserName }) => {
      test.skip(
        browserName !== "chromium",
        "these regression tests use synthetic clipboard and drag events, currently reliable only in chromium"
      );
    });

    const rejectFile = (page: import("@playwright/test").Page, scenario: FileScenario) =>
      page.evaluate(async ({ via, type, sizeBytes, handler }) => {
        const win = window as Window & {
          ng?: { getComponent: (element: Element) => unknown };
        };
        const host = document.querySelector("angular-tiptap-editor");
        if (!win.ng || !host) {
          throw new Error("Angular debug API or editor host is not available.");
        }
        const component = win.ng.getComponent(host) as {
          editorCommandsService: {
            uploadHandler: (() => Promise<{ src: string }>) | null;
          };
          imageRejected: {
            subscribe: (
              fn: (value: { reason: string; source: string; file: File }) => void
            ) => void;
          };
          onDrop: (event: DragEvent) => void;
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
            getHTML: () => string;
          } | null;
        };

        let handlerCalls = 0;
        if (handler === "none") {
          component.editorCommandsService.uploadHandler = null;
        } else {
          component.editorCommandsService.uploadHandler = async () => {
            handlerCalls++;
            if (handler === "reject") {
              throw new Error("storage unavailable");
            }
            return { src: "https://example.com/uploaded.png" };
          };
        }

        const rejections: { reason: string; source: string; fileName: string }[] = [];
        component.imageRejected.subscribe(value =>
          rejections.push({
            reason: value.reason,
            source: value.source,
            fileName: value.file.name,
          })
        );

        const editor = component.getEditor();
        if (!editor) {
          throw new Error("Editor instance not available.");
        }
        editor.commands.focus("end");

        const file = new File([new Uint8Array(sizeBytes)], "big-screenshot.png", { type });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        if (via === "paste") {
          const pasteEvent = new ClipboardEvent("paste", {
            bubbles: true,
            cancelable: true,
            clipboardData: dataTransfer,
          });
          editor.view.someProp("handlePaste", paste => paste(editor.view, pasteEvent, null));
        } else {
          component.onDrop(
            new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer })
          );
        }

        const start = Date.now();
        while (!rejections.length && Date.now() - start < 3000) {
          await new Promise(resolve => setTimeout(resolve, 25));
        }
        await new Promise(resolve => setTimeout(resolve, 100));

        return { rejections, handlerCalls, html: editor.getHTML() };
      }, scenario);

    test("should emit imageRejected with too-large for an oversized pasted file, without unhandled errors", async ({
      page,
    }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", error => pageErrors.push(error.message));
      await page.locator(".ProseMirror").click();

      const result = await rejectFile(page, {
        via: "paste",
        type: "image/png",
        sizeBytes: 6 * 1024 * 1024,
        handler: "resolve",
      });

      expect(result.rejections).toEqual([
        { reason: "too-large", source: "paste", fileName: "big-screenshot.png" },
      ]);
      expect(result.handlerCalls).toBe(0);
      expect(result.html).not.toContain("<img");
      expect(pageErrors).toEqual([]);
    });

    test("should emit imageRejected with invalid-type for a dropped file of a disallowed type", async ({
      page,
    }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", error => pageErrors.push(error.message));
      await page.locator(".ProseMirror").click();

      const result = await rejectFile(page, {
        via: "drop",
        type: "image/tiff",
        sizeBytes: 1024,
        handler: "resolve",
      });

      expect(result.rejections).toEqual([
        { reason: "invalid-type", source: "drop", fileName: "big-screenshot.png" },
      ]);
      expect(result.handlerCalls).toBe(0);
      expect(result.html).not.toContain("<img");
      expect(pageErrors).toEqual([]);
    });

    test("should emit imageRejected with upload-failed when the upload handler rejects", async ({
      page,
    }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", error => pageErrors.push(error.message));
      await page.locator(".ProseMirror").click();

      const result = await rejectFile(page, {
        via: "drop",
        type: "image/png",
        sizeBytes: 1024,
        handler: "reject",
      });

      expect(result.rejections).toEqual([
        { reason: "upload-failed", source: "drop", fileName: "big-screenshot.png" },
      ]);
      expect(pageErrors).toEqual([]);
    });

    const pasteHtml = (page: import("@playwright/test").Page, scenario: HtmlScenario) =>
      page.evaluate(async ({ html, handler }) => {
        const win = window as Window & {
          ng?: { getComponent: (element: Element) => unknown };
        };
        const host = document.querySelector("angular-tiptap-editor");
        if (!win.ng || !host) {
          throw new Error("Angular debug API or editor host is not available.");
        }
        const component = win.ng.getComponent(host) as {
          editorCommandsService: { uploadHandler: (() => Promise<{ src: string }>) | null };
          pastedImageRejected: {
            subscribe: (fn: (value: { reason: string }) => void) => void;
          };
          getEditor: () => {
            commands: { focus: (position: string) => void };
            view: { pasteHTML: (html: string) => boolean };
            getHTML: () => string;
          } | null;
        };

        let handlerCalls = 0;
        component.editorCommandsService.uploadHandler = async () => {
          handlerCalls++;
          if (handler === "reject") {
            throw new Error("storage unavailable");
          }
          return { src: "https://example.com/rehosted.png" };
        };
        const reasons: string[] = [];
        component.pastedImageRejected.subscribe(value => reasons.push(value.reason));

        const editor = component.getEditor();
        if (!editor) {
          throw new Error("Editor instance not available.");
        }
        editor.commands.focus("end");
        editor.view.pasteHTML(html);

        const start = Date.now();
        while (!reasons.length && Date.now() - start < 3000) {
          await new Promise(resolve => setTimeout(resolve, 25));
        }
        await new Promise(resolve => setTimeout(resolve, 50));

        return { reasons, handlerCalls, html: editor.getHTML() };
      }, scenario);

    test("should report too-large for an oversized base64 image in pasted HTML", async ({
      page,
    }) => {
      await page.locator(".ProseMirror").click();
      const oversized = `data:image/png;base64,${"A".repeat(8 * 1024 * 1024)}`;

      const result = await pasteHtml(page, {
        html: `<p>before</p><img src="${oversized}">`,
        handler: "resolve",
      });

      expect(result.reasons).toEqual(["too-large"]);
      expect(result.handlerCalls).toBe(0);
      expect(result.html).not.toContain("<img");
      expect(result.html).toContain("before");
    });

    test("should report invalid-type for a base64 image of a disallowed type in pasted HTML", async ({
      page,
    }) => {
      await page.locator(".ProseMirror").click();

      const result = await pasteHtml(page, {
        html: `<p>before</p><img src="data:image/tiff;base64,${base64Png.split(",")[1]}">`,
        handler: "resolve",
      });

      expect(result.reasons).toEqual(["invalid-type"]);
      expect(result.handlerCalls).toBe(0);
    });

    test("should keep reporting upload-failed for a pasted HTML image when the handler rejects", async ({
      page,
    }) => {
      await page.locator(".ProseMirror").click();

      const result = await pasteHtml(page, {
        html: `<p>before</p><img src="${base64Png}">`,
        handler: "reject",
      });

      expect(result.reasons).toEqual(["upload-failed"]);
      expect(result.handlerCalls).toBe(1);
      expect(result.html).not.toContain("<img");
    });
  });
});
