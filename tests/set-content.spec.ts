import { test, expect, type Page } from "@playwright/test";

interface EditorHandle {
  state: {
    selection: { anchor: number; head: number };
    doc: { content: { size: number } };
  };
  can: () => { undo: () => boolean; redo: () => boolean };
  commands: { setTextSelection: (range: { from: number; to: number }) => boolean };
  on: (event: "update", handler: () => void) => void;
}

interface SetContentOptions {
  emitUpdate?: boolean;
  preserveSelection?: boolean;
  preserveScroll?: boolean;
  resetHistory?: boolean;
}

type SetContent = (content: string, emitUpdateOrOptions?: boolean | SetContentOptions) => void;

interface EditorComponent {
  getEditor: () => EditorHandle | null;
  setContent: SetContent;
  content: unknown;
  registeredId: () => string | null;
  editorRegistry: { get: (id?: string) => { setContent: SetContent } | undefined };
}

type DebugWindow = Window & {
  ng?: {
    getComponent: (element: Element) => EditorComponent;
    getOwningComponent: (element: Element) => unknown;
    applyChanges: (component: unknown) => void;
  };
  __updates?: number;
};

const COUNTER = ".character-count";
const EDITOR = ".ProseMirror";

test.use({ locale: "en-US" });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".ate-editor")).toBeVisible();
  await page.getByTestId("clear-button").click();
  await expect(page.locator(EDITOR)).toHaveText("");
  await page.evaluate(() => {
    const win = window as DebugWindow;
    const host = document.querySelector("angular-tiptap-editor")!;
    win.__updates = 0;
    win
      .ng!.getComponent(host)
      .getEditor()!
      .on("update", () => (win.__updates! += 1));
  });
});

const run = <T, A>(page: Page, fn: (component: EditorComponent, arg: A) => T, arg?: A) =>
  page.evaluate(
    ({ source, value }) => {
      const win = window as DebugWindow;
      const host = document.querySelector("angular-tiptap-editor")!;
      const component = win.ng!.getComponent(host);
      return new Function("component", "arg", `return (${source})(component, arg)`)(
        component,
        value
      );
    },
    { source: fn.toString(), value: arg }
  ) as Promise<T>;

const setContentInput = (page: Page, html: string) =>
  page.evaluate(html => {
    const win = window as DebugWindow;
    const host = document.querySelector("angular-tiptap-editor")!;
    const input = win.ng!.getComponent(host).content as Record<symbol, unknown>;
    const key = Object.getOwnPropertySymbols(input).find(s => s.description === "SIGNAL")!;
    const node = input[key] as { applyValueToInputSignal: (n: unknown, v: unknown) => void };
    node.applyValueToInputSignal(node, html);
    win.ng!.applyChanges(win.ng!.getOwningComponent(host));
  }, html);

const updates = (page: Page) => page.evaluate(() => (window as DebugWindow).__updates);

const selectionOf = (page: Page) =>
  run(page, c => {
    const { selection, doc } = c.getEditor()!.state;
    return { anchor: selection.anchor, head: selection.head, size: doc.content.size };
  });

const canUndo = (page: Page) => run(page, c => c.getEditor()!.can().undo());

test.describe("Counters follow content set from outside", () => {
  test("updates after the content input changes", async ({ page }) => {
    await setContentInput(page, "<p>hello brave world</p>");
    await expect(page.locator(EDITOR)).toHaveText("hello brave world");
    await expect(page.locator(COUNTER)).toContainText(/17\s+characters/);
    await expect(page.locator(COUNTER)).toContainText(/3\s+words/);

    await setContentInput(page, "<p>one two</p>");
    await expect(page.locator(COUNTER)).toContainText(/7\s+characters/);
    await expect(page.locator(COUNTER)).toContainText(/2\s+words/);
    expect(await updates(page)).toBe(0);
  });

  test("updates after component.setContent(content, false)", async ({ page }) => {
    await run(page, c => c.setContent("<p>alpha beta gamma delta</p>", false));
    await expect(page.locator(COUNTER)).toContainText(/22\s+characters/);
    await expect(page.locator(COUNTER)).toContainText(/4\s+words/);
    expect(await updates(page)).toBe(0);
  });

  test("updates after AteEditorRef.setContent(content, false)", async ({ page }) => {
    await run(page, c =>
      c.editorRegistry.get(c.registeredId()!)!.setContent("<p>from the ref</p>", false)
    );
    await expect(page.locator(COUNTER)).toContainText(/12\s+characters/);
    await expect(page.locator(COUNTER)).toContainText(/3\s+words/);
    expect(await updates(page)).toBe(0);
  });

  test("keeps updating after setContent(content) and while typing", async ({ page }) => {
    await run(page, c => c.setContent("<p>hello</p>"));
    await expect(page.locator(COUNTER)).toContainText(/5\s+characters/);
    expect(await updates(page)).toBe(1);

    await page.locator(EDITOR).click();
    await page.keyboard.press("End");
    await page.keyboard.type(" you");
    await expect(page.locator(COUNTER)).toContainText(/9\s+characters/);
    await expect(page.locator(COUNTER)).toContainText(/2\s+words/);
  });
});

test.describe("setContent options", () => {
  test("emitUpdate follows the boolean and the options object alike", async ({ page }) => {
    await run(page, c => c.setContent("<p>a</p>", false));
    await run(page, c => c.setContent("<p>b</p>", { emitUpdate: false }));
    expect(await updates(page)).toBe(0);

    await run(page, c => c.setContent("<p>c</p>", true));
    await run(page, c => c.setContent("<p>d</p>", { emitUpdate: true }));
    await run(page, c => c.setContent("<p>e</p>", {}));
    await run(page, c => c.setContent("<p>f</p>"));
    expect(await updates(page)).toBe(4);
  });

  test("preserveSelection keeps the selection, clamped to the new document", async ({ page }) => {
    await run(page, c => c.setContent("<p>0123456789</p>"));
    await run(page, c => c.getEditor()!.commands.setTextSelection({ from: 4, to: 7 }));

    await run(page, c => c.setContent("<p>abcdefghij</p>", { preserveSelection: true }));
    expect(await selectionOf(page)).toMatchObject({
      anchor: 4,
      head: 7,
    });

    await run(page, c => c.setContent("<p>ab</p>", { preserveSelection: true }));
    const clamped = await selectionOf(page);
    expect(clamped.head).toBeLessThanOrEqual(clamped.size);
    expect(clamped).toMatchObject({ anchor: 3, head: 3 });

    await run(page, c => c.getEditor()!.commands.setTextSelection({ from: 1, to: 2 }));
    await run(page, c => c.setContent("<p>0123456789</p>"));
    expect((await selectionOf(page)).head).not.toBe(2);
  });

  test("preserveScroll restores the scroll position of the editor", async ({ page }) => {
    const paragraphs = (label: string) =>
      Array.from({ length: 60 }, (_, i) => `<p>${label} ${i}</p>`).join("");
    await page.evaluate(() => {
      const scroller = document.querySelector<HTMLElement>(".ate-content")!;
      scroller.style.height = "200px";
      scroller.style.overflowY = "auto";
    });
    await run(page, (c, html) => c.setContent(html), paragraphs("first"));
    await page.evaluate(() => {
      document.querySelector<HTMLElement>(".ate-content")!.scrollTop = 300;
    });
    const scrollTop = () =>
      page.evaluate(() => document.querySelector<HTMLElement>(".ate-content")!.scrollTop);
    expect(await scrollTop()).toBe(300);

    await run(
      page,
      (c, html) => c.setContent(html, { preserveScroll: true }),
      paragraphs("second")
    );
    await expect(page.locator(`${EDITOR} p`).first()).toHaveText("second 0");
    expect(await scrollTop()).toBe(300);
  });

  test("preserveScroll restores the page scroll when the editor has no height", async ({
    page,
  }) => {
    const paragraphs = (label: string) =>
      Array.from({ length: 150 }, (_, i) => `<p>${label} ${i}</p>`).join("");
    await run(page, (c, html) => c.setContent(html), paragraphs("first"));
    await page.evaluate(() => window.scrollTo(0, 800));
    const pageScroll = () => page.evaluate(() => document.scrollingElement!.scrollTop);
    expect(await pageScroll()).toBe(800);

    // Browsers keep the page scroll on their own when the height does not change: reset it during
    // the replacement, as a listener of the app could, so the test checks the restore itself
    await run(page, c => c.getEditor()!.on("update", () => window.scrollTo(0, 0)));
    await run(
      page,
      (c, html) => c.setContent(html, { preserveScroll: true }),
      paragraphs("second")
    );
    await expect(page.locator(`${EDITOR} p`).first()).toHaveText("second 0");
    expect(await pageScroll()).toBe(800);
  });

  test("resetHistory drops the undo history of the replaced content", async ({ page }) => {
    await run(page, c => c.setContent("<p>start</p>"));
    await page.locator(EDITOR).click();
    await page.keyboard.press("End");
    await page.keyboard.type(" typed");
    await expect(page.locator(EDITOR)).toHaveText("start typed");
    expect(await canUndo(page)).toBe(true);

    await run(page, c => c.setContent("<p>fresh</p>"));
    expect(await canUndo(page)).toBe(true);

    await run(page, c => c.setContent("<p>replaced</p>", { resetHistory: true }));
    await expect(page.locator(EDITOR)).toHaveText("replaced");
    expect(await canUndo(page)).toBe(false);
    expect(await run(page, c => c.getEditor()!.can().redo())).toBe(false);

    await page.locator(EDITOR).click();
    await page.keyboard.press("End");
    await page.keyboard.type("!");
    await expect(page.locator(EDITOR)).toHaveText("replaced!");
    expect(await canUndo(page)).toBe(true);
    await page.keyboard.press("ControlOrMeta+z");
    await expect(page.locator(EDITOR)).toHaveText("replaced");
    await page.keyboard.press("ControlOrMeta+z");
    await expect(page.locator(EDITOR)).toHaveText("replaced");
  });
});
