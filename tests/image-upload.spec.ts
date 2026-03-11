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
});
