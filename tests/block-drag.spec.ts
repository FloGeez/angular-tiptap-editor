import { test, expect, type Locator, type Page } from "@playwright/test";

type EditorLike = {
  state: {
    doc: { forEach: (callback: (node: { textContent: string }) => void) => void };
    selection: { from: number; to: number };
  };
  view: { dragging: unknown };
  extensionManager: { extensions: { name: string }[] };
  commands: {
    setContent: (content: string) => boolean;
    setTextSelection: (range: { from: number; to: number }) => boolean;
    selectAll: () => boolean;
  };
};

type DebugWindow = Window & {
  ng?: {
    getComponent: (element: Element) => { getEditor: () => EditorLike | null };
    getOwningComponent: (element: Element) => { editorConfig: () => Record<string, unknown> };
    applyChanges: (component: unknown) => void;
  };
};

const BLOCKS = "<p>one</p><p>two</p><p>three</p><p>four</p><p>five</p>";

async function enableBlockControls(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const win = window as DebugWindow;
        const host = document.querySelector("angular-tiptap-editor");
        const component = win.ng!.getComponent(host!) as unknown as {
          editorFullyInitialized: () => boolean;
        };
        return component.editorFullyInitialized();
      })
    )
    .toBe(true);
  await page.evaluate(() => {
    const win = window as DebugWindow;
    const host = document.querySelector("angular-tiptap-editor");
    if (!win.ng || !host) {
      throw new Error("Angular debug API or editor host not available.");
    }
    const app = win.ng.getOwningComponent(host);
    const config = { ...app.editorConfig(), blockControls: "inside" };
    app.editorConfig = () => config;
    win.ng.applyChanges(app);
  });
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const win = window as DebugWindow;
          const host = document.querySelector("angular-tiptap-editor");
          const editor = win.ng!.getComponent(host!).getEditor()!;
          return editor.extensionManager.extensions.some(
            extension => extension.name === "ateBlockControls"
          );
        }),
      { timeout: 20000 }
    )
    .toBe(true);
}

async function setContent(page: Page, html: string, expected: string[]) {
  await page.evaluate(content => {
    const win = window as DebugWindow;
    const host = document.querySelector("angular-tiptap-editor");
    win.ng!.getComponent(host!).getEditor()!.commands.setContent(content);
  }, html);
  await expect.poll(() => topLevelBlocks(page)).toEqual(expected);
}

const topLevelBlocks = (page: Page) =>
  page.evaluate(() => {
    const win = window as DebugWindow;
    const host = document.querySelector("angular-tiptap-editor");
    const editor = win.ng!.getComponent(host!).getEditor()!;
    const blocks: string[] = [];
    editor.state.doc.forEach(node => blocks.push(node.textContent));
    return blocks.filter(text => text !== "");
  });

const topLevelTypes = (page: Page) =>
  page.evaluate(() => {
    const win = window as DebugWindow;
    const host = document.querySelector("angular-tiptap-editor");
    const editor = win.ng!.getComponent(host!).getEditor()!;
    const types: string[] = [];
    editor.state.doc.forEach(node =>
      types.push((node as unknown as { type: { name: string } }).type.name)
    );
    return types;
  });

const selectionRange = (page: Page) =>
  page.evaluate(() => {
    const win = window as DebugWindow;
    const host = document.querySelector("angular-tiptap-editor");
    const { from, to } = win.ng!.getComponent(host!).getEditor()!.state.selection;
    return { from, to };
  });

async function selectBlocks(page: Page, firstBlock: number, lastBlock: number) {
  const range = await page.evaluate(
    ([first, last]) => {
      const win = window as DebugWindow;
      const host = document.querySelector("angular-tiptap-editor");
      const editor = win.ng!.getComponent(host!).getEditor()!;
      const offsets: { start: number; end: number }[] = [];
      let offset = 0;
      editor.state.doc.forEach(node => {
        const size = node.textContent.length + 2;
        offsets.push({ start: offset, end: offset + size });
        offset += size;
      });
      const from = offsets[first].start + 2;
      const to = offsets[last].end - 2;
      editor.commands.setTextSelection({ from, to });
      return { from, to };
    },
    [firstBlock, lastBlock]
  );
  await expect.poll(() => selectionRange(page)).toEqual(range);
}

const dragState = (page: Page) =>
  page.evaluate(() => {
    const win = window as DebugWindow;
    const host = document.querySelector("angular-tiptap-editor");
    const editor = win.ng!.getComponent(host!).getEditor()!;
    return {
      dragging: editor.view.dragging !== null,
      indicators: document.querySelectorAll(".ate-block-drop-before, .ate-block-drop-after").length,
      hostMarked: document.querySelector(".ate-block-dragging") !== null,
    };
  });

const expectDragStateCleared = (page: Page) =>
  expect.poll(() => dragState(page)).toEqual({ dragging: false, indicators: 0, hostMarked: false });

const block = (page: Page, text: string) =>
  page.locator(".ProseMirror > *", { hasText: new RegExp(`^${text}$`) }).first();

async function pointIn(target: Locator, part: "upper" | "lower") {
  const box = await target.boundingBox();
  if (!box) {
    throw new Error("Target is not rendered.");
  }
  return { x: box.x + box.width / 2, y: box.y + box.height * (part === "upper" ? 0.25 : 0.75) };
}

async function handleBesides(page: Page, source: Locator) {
  const handle = page.locator(".ate-block-drag");
  let previous = "";
  await expect(async () => {
    await page.locator(".ProseMirror > *").filter({ hasNot: source }).last().hover();
    await source.hover();
    const sourceBox = await source.boundingBox();
    await page.mouse.move(sourceBox!.x + 24, sourceBox!.y + 4, { steps: 3 });
    await expect(handle).toBeVisible({ timeout: 1500 });
  }).toPass();
  await expect
    .poll(async () => {
      const [handleBox, sourceBox] = await Promise.all([
        handle.boundingBox(),
        source.boundingBox(),
      ]);
      const center = handleBox ? handleBox.y + handleBox.height / 2 : -1;
      const aligned =
        !!sourceBox && center >= sourceBox.y && center <= sourceBox.y + sourceBox.height;
      const current = JSON.stringify(handleBox);
      const settled = aligned && current === previous;
      previous = current;
      return settled;
    })
    .toBe(true);
  return (await handle.boundingBox())!;
}

async function grabHandle(page: Page, source: Locator) {
  const box = await handleBesides(page, source);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
}

async function dragTo(page: Page, point: { x: number; y: number }) {
  await page.mouse.move(point.x, point.y, { steps: 8 });
  await page.mouse.move(point.x, point.y + 1);
}

async function dragBlock(page: Page, source: Locator, target: Locator, part: "upper" | "lower") {
  await grabHandle(page, source);
  await dragTo(page, await pointIn(target, part));
  await page.mouse.up();
}

test.describe("Block drag handle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();

    const editorBtn = page.getByTestId("mode-editor");
    const text = await editorBtn.innerText();
    if (text.toLowerCase().includes("éditeur")) {
      await page.getByTestId("lang-switch").click();
      await expect(editorBtn).toHaveText(/editor/i);
    }

    await enableBlockControls(page);
    await setContent(page, BLOCKS, ["one", "two", "three", "four", "five"]);
  });

  test("moves a single block to a top-level boundary", async ({ page }) => {
    await dragBlock(page, block(page, "one"), block(page, "four"), "lower");

    await expect.poll(() => topLevelBlocks(page)).toEqual(["two", "three", "four", "one", "five"]);
    await expectDragStateCleared(page);
  });

  test("moves a block to the start of the document", async ({ page }) => {
    await dragBlock(page, block(page, "three"), block(page, "one"), "upper");

    await expect.poll(() => topLevelBlocks(page)).toEqual(["three", "one", "two", "four", "five"]);
  });

  test("moves a block to the end of the document", async ({ page }) => {
    await dragBlock(page, block(page, "two"), block(page, "five"), "lower");

    await expect.poll(() => topLevelBlocks(page)).toEqual(["one", "three", "four", "five", "two"]);
  });

  test("drags every selected block together and keeps their order", async ({ page }) => {
    await selectBlocks(page, 1, 3);

    await dragBlock(page, block(page, "three"), block(page, "five"), "lower");

    await expect.poll(() => topLevelBlocks(page)).toEqual(["one", "five", "two", "three", "four"]);
    await expectDragStateCleared(page);
  });

  test("drags a partially selected range as whole blocks", async ({ page }) => {
    await selectBlocks(page, 0, 1);

    await dragBlock(page, block(page, "one"), block(page, "four"), "upper");

    await expect.poll(() => topLevelBlocks(page)).toEqual(["three", "one", "two", "four", "five"]);
  });

  test("keeps the multi-block selection when the drag ends outside the editor", async ({
    page,
  }) => {
    await selectBlocks(page, 1, 3);
    const selection = await selectionRange(page);

    await grabHandle(page, block(page, "two"));
    await dragTo(page, await pointIn(block(page, "five"), "lower"));
    await dragTo(page, { x: 2, y: 2 });
    await page.mouse.up();

    await expect.poll(() => topLevelBlocks(page)).toEqual(["one", "two", "three", "four", "five"]);
    await expect.poll(() => selectionRange(page)).toEqual(selection);
    await expectDragStateCleared(page);
  });

  test("drags only the grabbed block when it is outside the selection", async ({ page }) => {
    await selectBlocks(page, 1, 2);

    await dragBlock(page, block(page, "five"), block(page, "one"), "upper");

    await expect.poll(() => topLevelBlocks(page)).toEqual(["five", "one", "two", "three", "four"]);
  });

  test("drags the whole document when everything is selected", async ({ page }) => {
    await page.evaluate(() => {
      const win = window as DebugWindow;
      const host = document.querySelector("angular-tiptap-editor");
      win.ng!.getComponent(host!).getEditor()!.commands.selectAll();
    });

    await grabHandle(page, block(page, "three"));
    await dragTo(page, await pointIn(block(page, "five"), "lower"));
    await page.mouse.up();

    await expect.poll(() => topLevelBlocks(page)).toEqual(["one", "two", "three", "four", "five"]);
    await expectDragStateCleared(page);
  });

  test("never drops a block inside a list, blockquote or table cell", async ({ page }) => {
    const nested =
      "<p>one</p><ul><li><p>item a</p></li><li><p>item b</p></li></ul>" +
      "<blockquote><p>quoted</p></blockquote>" +
      "<table><tbody><tr><td><p>cell</p></td><td><p>other</p></td></tr></tbody></table><p>last</p>";
    await setContent(page, nested, ["one", "item aitem b", "quoted", "cellother", "last"]);

    await dragBlock(page, block(page, "one"), page.locator(".ProseMirror li").nth(1), "upper");
    await expect
      .poll(() => topLevelBlocks(page))
      .toEqual(["item aitem b", "one", "quoted", "cellother", "last"]);

    await dragBlock(page, block(page, "last"), page.locator(".ProseMirror blockquote p"), "lower");
    await expect
      .poll(() => topLevelBlocks(page))
      .toEqual(["item aitem b", "one", "quoted", "last", "cellother"]);

    await dragBlock(page, block(page, "one"), page.locator(".ProseMirror td p").first(), "upper");
    await expect
      .poll(() => topLevelBlocks(page))
      .toEqual(["item aitem b", "quoted", "last", "one", "cellother"]);
    await expect(page.locator(".ProseMirror td p", { hasText: "one" })).toHaveCount(0);
  });

  test("moves image and table blocks grabbed by their handle", async ({ page }) => {
    const pixel = "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=";
    const rich =
      `<p>one</p><img src="${pixel}" width="120" height="60">` +
      "<table><tbody><tr><td><p>cell</p></td><td><p>other</p></td></tr></tbody></table><p>last</p>";
    await setContent(page, rich, ["one", "cellother", "last"]);
    const firstFour = async () => (await topLevelTypes(page)).slice(0, 4);
    expect(await firstFour()).toEqual(["paragraph", "resizableImage", "table", "paragraph"]);

    await dragBlock(page, page.locator(".ProseMirror > *").nth(2), block(page, "one"), "upper");
    await expect.poll(firstFour).toEqual(["table", "paragraph", "resizableImage", "paragraph"]);

    await dragBlock(page, page.locator(".ProseMirror > *").nth(2), block(page, "last"), "lower");
    await expect.poll(firstFour).toEqual(["table", "paragraph", "paragraph", "resizableImage"]);
    await expectDragStateCleared(page);
  });

  test("shows a single indicator at the boundary before or after the hovered block", async ({
    page,
  }) => {
    await grabHandle(page, block(page, "one"));

    await dragTo(page, await pointIn(block(page, "three"), "upper"));
    await expect(page.locator(".ate-block-drop-before, .ate-block-drop-after")).toHaveCount(1);
    await expect(block(page, "three")).toHaveClass(/ate-block-drop-before/);

    await dragTo(page, await pointIn(block(page, "three"), "lower"));
    await expect(page.locator(".ate-block-drop-before, .ate-block-drop-after")).toHaveCount(1);
    await expect(block(page, "four")).toHaveClass(/ate-block-drop-before/);

    await dragTo(page, await pointIn(block(page, "five"), "lower"));
    await expect(block(page, "five")).toHaveClass(/ate-block-drop-after/);

    await page.mouse.up();
    await expectDragStateCleared(page);
  });

  test("shows the indicator at the top level when hovering a nested block", async ({ page }) => {
    await setContent(
      page,
      "<p>one</p><ul><li><p>item a</p></li><li><p>item b</p></li></ul><p>last</p>",
      ["one", "item aitem b", "last"]
    );
    await grabHandle(page, block(page, "one"));

    await dragTo(page, await pointIn(page.locator(".ProseMirror li").nth(0), "upper"));
    await expect(page.locator(".ProseMirror > ul")).toHaveClass(/ate-block-drop-before/);

    await dragTo(page, await pointIn(page.locator(".ProseMirror li").nth(1), "lower"));
    await expect(block(page, "last")).toHaveClass(/ate-block-drop-before/);
    await expect(
      page.locator(".ProseMirror li.ate-block-drop-before, .ProseMirror li.ate-block-drop-after")
    ).toHaveCount(0);
    await page.mouse.up();
  });

  test("hides the native drop cursor while a block is dragged", async ({ page }) => {
    await grabHandle(page, block(page, "one"));
    await dragTo(page, await pointIn(block(page, "three"), "lower"));

    await expect(page.locator(".ate-block-drop-before, .ate-block-drop-after")).toHaveCount(1);
    await expect(page.locator(".prosemirror-dropcursor-block")).toBeHidden();
    await page.mouse.up();
  });

  test("drops below the fold after scrolling during the drag", async ({ page }) => {
    const filler = Array.from({ length: 40 }, (_, index) => `<p>filler ${index}</p>`).join("");
    const expected = [
      "one",
      ...Array.from({ length: 40 }, (_, index) => `filler ${index}`),
      "last",
    ];
    await setContent(page, `<p>one</p>${filler}<p>last</p>`, expected);
    await page.evaluate(() => window.scrollTo(0, 0));
    const target = block(page, "last");
    await expect(target).not.toBeInViewport();

    await grabHandle(page, block(page, "one"));
    await dragTo(page, { x: 300, y: 300 });
    await target.evaluate(element => element.scrollIntoView({ block: "center" }));
    await expect(target).toBeInViewport();
    await dragTo(page, await pointIn(target, "lower"));
    await page.mouse.up();

    await expect.poll(() => topLevelBlocks(page)).toEqual([...expected.slice(1), "one"]);
    await expectDragStateCleared(page);
  });

  test("clears the drag state when the drag ends outside the editor", async ({ page }) => {
    await grabHandle(page, block(page, "one"));
    await dragTo(page, await pointIn(block(page, "three"), "lower"));
    await dragTo(page, { x: 2, y: 2 });
    await page.mouse.up();

    await expect.poll(() => topLevelBlocks(page)).toEqual(["one", "two", "three", "four", "five"]);
    await expectDragStateCleared(page);
  });

  test("clears the drag state when the drag is cancelled with Escape", async ({ page }) => {
    await grabHandle(page, block(page, "one"));
    await dragTo(page, await pointIn(block(page, "three"), "lower"));
    await expect(page.locator(".ate-block-drop-before, .ate-block-drop-after")).toHaveCount(1);

    await page.keyboard.press("Escape");
    await page.mouse.up();

    await expect.poll(() => topLevelBlocks(page)).toEqual(["one", "two", "three", "four", "five"]);
    await expectDragStateCleared(page);
  });

  test("treats a text drop after a cancelled drag as a plain insert", async ({ page }) => {
    await grabHandle(page, block(page, "two"));
    await dragTo(page, { x: 2, y: 2 });
    await page.mouse.up();

    const target = await pointIn(block(page, "four"), "lower");
    await page.evaluate(({ x, y }) => {
      const transfer = new DataTransfer();
      transfer.setData("text/plain", "external");
      const dom = document.querySelector(".ProseMirror")!;
      dom.dispatchEvent(
        new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          dataTransfer: transfer,
        })
      );
    }, target);

    await expect
      .poll(() => topLevelBlocks(page))
      .toEqual(["one", "two", "three", "fourexternal", "five"]);
  });

  test("keeps the controls on the block under the pointer when an edit removes a block above", async ({
    page,
  }) => {
    await setContent(page, BLOCKS, ["one", "two", "three", "four", "five"]);
    await handleBesides(page, block(page, "three"));
    const pointerY = (await block(page, "three").boundingBox())!.y + 4;

    // Remove "one" without moving the pointer: every block below shifts up under it
    await page.evaluate(() => {
      const host = document.querySelector("angular-tiptap-editor");
      const editor = (window as DebugWindow).ng!.getComponent(host!).getEditor()! as unknown as {
        commands: { deleteRange: (range: { from: number; to: number }) => boolean };
      };
      editor.commands.deleteRange({ from: 0, to: 5 });
    });
    await expect.poll(() => topLevelBlocks(page)).toEqual(["two", "three", "four", "five"]);

    // The controls follow the block now under the pointer, instead of flying to the editor corner
    const handle = page.locator(".ate-block-drag");
    await expect
      .poll(async () => {
        const handleBox = await handle.boundingBox();
        const hovered = await page.evaluate(y => {
          const target = Array.from(document.querySelectorAll(".ProseMirror > *")).find(element => {
            const rect = element.getBoundingClientRect();
            return y >= rect.top && y <= rect.bottom;
          });
          const rect = target?.getBoundingClientRect();
          return rect ? { top: rect.top, bottom: rect.bottom } : null;
        }, pointerY);
        const center = handleBox ? handleBox.y + handleBox.height / 2 : -1;
        return !!hovered && center >= hovered.top && center <= hovered.bottom;
      })
      .toBe(true);
  });
});
