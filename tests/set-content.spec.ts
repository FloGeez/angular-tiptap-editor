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
