import { test, expect, type Page } from "@playwright/test";

type ExtensionInstance = {
  name: string;
  options: Record<string, unknown>;
};

type EditorLike = {
  extensionManager: { extensions: ExtensionInstance[] };
};

type DebugWindow = Window & {
  ng?: {
    getComponent: (element: Element) => { getEditor: () => EditorLike | null };
    getOwningComponent: (element: Element) => {
      editorConfig: () => Record<string, unknown>;
      finalTiptapExtensions: () => ExtensionInstance[];
    };
    applyChanges: (component: unknown) => void;
  };
};

const collectWarnings = (page: Page) => {
  const warnings: string[] = [];
  page.on("console", msg => {
    if (msg.type() === "warning") {
      warnings.push(msg.text());
    }
  });
  return warnings;
};

async function getExtensionsByName(page: Page, name: string) {
  return page.evaluate(extensionName => {
    const win = window as DebugWindow;
    const host = document.querySelector("angular-tiptap-editor");
    const editor = host && win.ng?.getComponent(host).getEditor();
    const matches =
      editor?.extensionManager.extensions.filter(item => item.name === extensionName) ?? [];
    return matches.map(ext => ({
      name: ext.name,
      options: JSON.parse(JSON.stringify(ext.options ?? {})),
    }));
  }, name);
}

test.describe("Custom extension overrides and dev warnings", () => {
  test.beforeEach(async ({ page, browserName }) => {
    test.skip(
      browserName !== "chromium",
      "reconfigures the demo through the Angular debug API, verified on chromium only"
    );

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

  test("replaces a built-in ATE extension with the custom one and warns only once per instance in dev mode", async ({
    page,
  }) => {
    const warnings = collectWarnings(page);

    // Clone the existing highlight extension with custom options and pass it in tiptapExtensions
    await page.evaluate(() => {
      const win = window as DebugWindow;
      const host = document.querySelector("angular-tiptap-editor")!;
      const editor = win.ng!.getComponent(host).getEditor()!;
      const builtInHighlight = editor.extensionManager.extensions.find(
        ext => ext.name === "highlight"
      ) as unknown as {
        configure: (opts: Record<string, unknown>) => ExtensionInstance;
      };
      const customHighlight = builtInHighlight.configure({
        multicolor: false,
        HTMLAttributes: { class: "custom-highlight" },
      });

      const app = win.ng!.getOwningComponent(host);
      const nextConfig = {
        ...app.editorConfig(),
        tiptapExtensions: [customHighlight],
      };
      app.editorConfig = () => nextConfig;
      win.ng!.applyChanges(app);
    });

    await expect
      .poll(() => getExtensionsByName(page, "highlight"))
      .toEqual([
        {
          name: "highlight",
          options: { multicolor: false, HTMLAttributes: { class: "custom-highlight" } },
        },
      ]);

    const ateWarnings = warnings.filter(w => w.includes("[ATE]") && w.includes("highlight"));
    expect(ateWarnings).toHaveLength(1);
    expect(ateWarnings[0]).toContain("replaced built-in extension(s): highlight");
    expect(ateWarnings[0]).toContain("toolbar/bubble menu highlight picker");
    expect(warnings.filter(w => w.includes("Duplicate extension names found"))).toEqual([]);

    // Wait for the editor to finish its post-create initialization window before triggering a second re-init
    await page.waitForFunction(() => {
      const win = window as DebugWindow;
      const host = document.querySelector("angular-tiptap-editor");
      const comp = host && (win.ng?.getComponent(host) as { editorFullyInitialized?: () => boolean });
      return comp?.editorFullyInitialized?.() === true;
    });

    // Trigger another editor re-init on the same instance by changing starterKitOptions;
    // highlight must not warn a second time.
    await page.evaluate(() => {
      const win = window as DebugWindow;
      const host = document.querySelector("angular-tiptap-editor")!;
      const app = win.ng!.getOwningComponent(host);
      const nextConfig = {
        ...app.editorConfig(),
        starterKitOptions: { undoRedo: false },
      };
      app.editorConfig = () => nextConfig;
      win.ng!.applyChanges(app);
    });

    await expect.poll(() => getExtensionsByName(page, "undoRedo")).toEqual([]);
    expect(warnings.filter(w => w.includes("[ATE]") && w.includes("highlight"))).toHaveLength(1);
  });

  test("custom extension in tiptapExtensions wins over StarterKit and ignores conflicting starterKitOptions with a warning", async ({
    page,
  }) => {
    const warnings = collectWarnings(page);

    await page.evaluate(() => {
      const win = window as DebugWindow;
      const host = document.querySelector("angular-tiptap-editor")!;
      const editor = win.ng!.getComponent(host).getEditor()!;
      const builtInLink = editor.extensionManager.extensions.find(
        ext => ext.name === "link"
      ) as unknown as {
        configure: (opts: Record<string, unknown>) => ExtensionInstance;
      };
      const customLink = builtInLink.configure({
        autolink: true,
        openOnClick: true,
        HTMLAttributes: { class: "custom-link" },
      });

      const app = win.ng!.getOwningComponent(host);
      const nextConfig = {
        ...app.editorConfig(),
        starterKitOptions: { link: { autolink: false } },
        tiptapExtensions: [customLink],
      };
      app.editorConfig = () => nextConfig;
      win.ng!.applyChanges(app);
    });

    const links = await getExtensionsByName(page, "link");
    expect(links).toHaveLength(1);
    expect(links[0].options).toMatchObject({
      autolink: true,
      openOnClick: true,
      HTMLAttributes: { class: "custom-link" },
    });

    const linkWarnings = warnings.filter(w => w.includes("[ATE]") && w.includes("link"));
    expect(linkWarnings).toHaveLength(1);
    expect(linkWarnings[0]).toContain("replaced built-in extension(s): link");
    expect(linkWarnings[0]).toContain(
      "starterKitOptions.link was ignored because the custom extension in tiptapExtensions takes precedence"
    );
    expect(warnings.filter(w => w.includes("Duplicate extension names found"))).toEqual([]);
  });

  test("does not warn for a custom extension with a unique name", async ({ page }) => {
    const warnings = collectWarnings(page);
    const editor = page.locator(".ProseMirror");
    await editor.evaluate(el => el.setAttribute("data-marker", "before"));

    await page.getByTestId("open-config-button").click();
    await page.getByTestId("extension-task-card").click();

    await expect(page.locator(".ProseMirror:not([data-marker])")).toBeVisible();
    expect(warnings.filter(w => w.includes("[ATE]"))).toEqual([]);
  });
});
