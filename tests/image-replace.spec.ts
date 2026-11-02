import { test, expect, type JSHandle, type Page } from "@playwright/test";

// Regression tests for #87: "Change Image" must replace the image that was selected when it was clicked,
// even if the selection moves while the file picker is open (WebKit) or the document changes during the upload.

const PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6V6mQAAAAASUVORK5CYII=";
const OLD_SRC = `data:image/png;base64,${PNG}`;
const NEW_SRC = "https://example.com/new.png";
const IMAGE_LOADING_NOISE = /Failed to load resource|Image corrupt or truncated/;

interface EditorHandle {
  state: {
    doc: {
      content: { size: number };
      descendants: (fn: (node: { type: { name: string } }, pos: number) => void) => void;
    };
    selection: { from: number; node?: { type: { name: string } } };
  };
  commands: {
    focus: (position?: string) => boolean;
    setContent: (html: string) => boolean;
    setNodeSelection: (pos: number) => boolean;
    setTextSelection: (pos: number) => boolean;
    insertContentAt: (pos: number, content: string) => boolean;
    deleteRange: (range: { from: number; to: number }) => boolean;
  };
}

type DebugWindow = Window & {
  ng?: {
    getComponent: (element: Element) => {
      getEditor: () => EditorHandle | null;
      editorCommandsService: { uploadHandler: (() => Promise<{ src: string }>) | null };
    };
  };
};

/** Holds the upload: `started` settles once the handler is called, `release` lets it finish */
interface UploadGate {
  started: Promise<void>;
  release: () => void;
}

/**
 * The gate is created here and kept as a handle, rather than created by the upload handler and read
 * back from a `window` global: it exists before the upload starts, whatever the timing
 */
async function setup(
  page: Page,
  html: string,
  { holdUpload = false } = {}
): Promise<JSHandle<UploadGate>> {
  return page.evaluateHandle(
    ({ content, newSrc, hold }) => {
      const win = window as DebugWindow;
      const component = win.ng!.getComponent(document.querySelector("angular-tiptap-editor")!);
      let markStarted!: () => void;
      let release!: () => void;
      const started = new Promise<void>(resolve => (markStarted = resolve));
      const released = new Promise<void>(resolve => (release = resolve));
      if (!hold) {
        release();
      }
      component.editorCommandsService.uploadHandler = () => {
        markStarted();
        return released.then(() => ({ src: newSrc }));
      };
      const editor = component.getEditor()!;
      editor.commands.setContent(content);
      let pos = -1;
      editor.state.doc.descendants((node, nodePos) => {
        if (pos < 0 && node.type.name === "resizableImage") {
          pos = nodePos;
        }
      });
      editor.commands.focus();
      editor.commands.setNodeSelection(pos);
      return { started, release };
    },
    { content: html, newSrc: NEW_SRC, hold: holdUpload }
  );
}

async function run<R>(page: Page, action: (editor: EditorHandle) => R): Promise<R> {
  const editor = await page.evaluateHandle(
    () =>
      (window as DebugWindow)
        .ng!.getComponent(document.querySelector("angular-tiptap-editor")!)
        .getEditor()!
  );
  return editor.evaluate(action);
}

/** Clicks "Change Image", optionally does something while the picker is open, then picks a file */
async function changeImage(page: Page, whilePickerIsOpen?: () => Promise<void>) {
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Change Image" }).click(),
  ]);
  await whilePickerIsOpen?.();
  await chooser.setFiles({
    name: "new.png",
    mimeType: "image/png",
    buffer: Buffer.from(PNG, "base64"),
  });
}

const imageSources = (page: Page) =>
  page
    .locator(".ProseMirror img")
    .evaluateAll(images => images.map(img => img.getAttribute("src")));

test.describe("Replacing an image from the bubble menu (#87)", () => {
  let consoleErrors: string[];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on("console", message => {
      // Image loading noise is not an editor error: the new URL does not exist,
      // and Firefox reports the tiny test PNG as "corrupt or truncated"
      if (message.type() === "error" && !IMAGE_LOADING_NOISE.test(message.text())) {
        consoleErrors.push(message.text());
      }
    });
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();
    await page.getByTestId("clear-button").click();
  });

  test("replaces an image that ends the document and keeps it selected", async ({ page }) => {
    await setup(page, `<p>before</p><img src="${OLD_SRC}" width="200" height="200">`);

    await changeImage(page);

    await expect.poll(() => imageSources(page)).toEqual([NEW_SRC]);
    const selected = await run(page, editor => editor.state.selection.node?.type.name);
    expect(selected).toBe("resizableImage");
    expect(consoleErrors).toEqual([]);
  });

  test("replaces the clicked image even if the selection moves while the picker is open", async ({
    page,
  }) => {
    await setup(page, `<p>before</p><img src="${OLD_SRC}" width="200" height="200"><p>after</p>`);

    // What WebKit does on its own: the selection leaves the image before the upload starts
    await changeImage(page, () =>
      run(page, editor => {
        editor.commands.setTextSelection(editor.state.doc.content.size - 1);
      })
    );

    await expect.poll(() => imageSources(page)).toEqual([NEW_SRC]);
    await expect(page.locator(".ProseMirror")).toContainText("after");
    expect(consoleErrors).toEqual([]);
  });

  test("replaces the image at its new position when content is added before it during the upload", async ({
    page,
  }) => {
    const upload = await setup(
      page,
      `<p>before</p><img src="${OLD_SRC}" width="200" height="200">`,
      {
        holdUpload: true,
      }
    );

    await changeImage(page);
    await upload.evaluate(gate => gate.started);
    await run(page, editor => {
      editor.commands.insertContentAt(0, "<p>added during upload</p>");
    });
    await upload.evaluate(gate => gate.release());

    await expect.poll(() => imageSources(page)).toEqual([NEW_SRC]);
    await expect(page.locator(".ProseMirror")).toContainText("added during upload");
    expect(consoleErrors).toEqual([]);
  });

  test("inserts the new image when the old one was removed during the upload", async ({ page }) => {
    const upload = await setup(
      page,
      `<p>before</p><img src="${OLD_SRC}" width="200" height="200"><p>after</p>`,
      {
        holdUpload: true,
      }
    );

    await changeImage(page);
    await upload.evaluate(gate => gate.started);
    await run(page, editor => {
      let pos = -1;
      editor.state.doc.descendants((node, nodePos) => {
        if (pos < 0 && node.type.name === "resizableImage") {
          pos = nodePos;
        }
      });
      editor.commands.deleteRange({ from: pos, to: pos + 1 });
    });
    await upload.evaluate(gate => gate.release());

    await expect.poll(() => imageSources(page)).toEqual([NEW_SRC]);
    expect(consoleErrors).toEqual([]);
  });
});
