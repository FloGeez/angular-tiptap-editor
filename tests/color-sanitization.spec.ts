import { test, expect, type Page } from "@playwright/test";

interface EditorHandle {
  getHTML: () => string;
  getJSON: () => unknown;
  commands: {
    setContent: (content: string | object) => boolean;
    selectAll: () => boolean;
    focus: (position?: string) => boolean;
    setHighlight: (attributes: { color: string }) => boolean;
    setColor: (color: string) => boolean;
  };
  view: { pasteHTML: (html: string) => boolean };
}

type DebugWindow = Window & {
  ng?: { getComponent: (element: Element) => { getEditor: () => EditorHandle | null } };
};

type EntryPoint =
  | "paste-mark"
  | "paste-span"
  | "set-content-html-mark"
  | "set-content-json-highlight"
  | "set-content-json-text-style"
  | "command-set-highlight"
  | "command-set-color";

interface Rendered {
  html: string;
  styledElements: {
    tag: string;
    style: string;
    inlineColor: string;
    inlineBackgroundColor: string;
    dataColor: string | null;
    position: string;
    backgroundImage: string;
  }[];
}

const INVALID_COLORS = [
  "red; position: fixed; inset: 0; z-index: 9999",
  "red; background: url(https://example.invalid/x.png)",
  "url(https://example.invalid/x.png)",
  "red !important",
  '#fff" onmouseover="x',
];

const VALID_COLORS = [
  "red",
  "#ff0000",
  "#f00a",
  "rgb(255, 0, 0)",
  "hsl(0 100% 50%)",
  "var(--ate-primary)",
];

const HIGHLIGHT_ENTRY_POINTS: EntryPoint[] = [
  "paste-mark",
  "set-content-html-mark",
  "set-content-json-highlight",
  "command-set-highlight",
];

const COLOR_ENTRY_POINTS: EntryPoint[] = [
  "paste-span",
  "set-content-json-text-style",
  "command-set-color",
];

const ALL_ENTRY_POINTS: EntryPoint[] = [...HIGHLIGHT_ENTRY_POINTS, ...COLOR_ENTRY_POINTS];

const INJECTED_DECLARATIONS =
  /position|inset|z-index|url\(|!important|onmouseover|example\.invalid/i;

async function applyColor(page: Page, entryPoint: EntryPoint, value: string) {
  await page.evaluate(
    ({ entry, color }) => {
      const host = document.querySelector("angular-tiptap-editor") as Element;
      const editor = (window as DebugWindow).ng!.getComponent(host).getEditor()!;
      const escaped = color.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      const jsonDoc = (mark: object) => ({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [mark] }] }],
      });
      switch (entry) {
        case "paste-mark":
          editor.commands.focus("end");
          editor.view.pasteHTML(`<p><mark data-color="${escaped}">x</mark></p>`);
          break;
        case "paste-span":
          editor.commands.focus("end");
          editor.view.pasteHTML(`<p><span style="color: ${escaped}">x</span></p>`);
          break;
        case "set-content-html-mark":
          editor.commands.setContent(`<p><mark data-color="${escaped}">x</mark></p>`);
          break;
        case "set-content-json-highlight":
          editor.commands.setContent(jsonDoc({ type: "highlight", attrs: { color } }));
          break;
        case "set-content-json-text-style":
          editor.commands.setContent(jsonDoc({ type: "textStyle", attrs: { color } }));
          break;
        case "command-set-highlight":
          editor.commands.setContent("<p>x</p>");
          editor.commands.selectAll();
          editor.commands.setHighlight({ color });
          break;
        case "command-set-color":
          editor.commands.setContent("<p>x</p>");
          editor.commands.selectAll();
          editor.commands.setColor(color);
          break;
      }
    },
    { entry: entryPoint, color: value }
  );
}

const rendered = (page: Page): Promise<Rendered> =>
  page.evaluate(() => {
    const host = document.querySelector("angular-tiptap-editor") as Element;
    const editor = (window as DebugWindow).ng!.getComponent(host).getEditor()!;
    const elements = Array.from(document.querySelectorAll(".ProseMirror mark, .ProseMirror span"));
    return {
      html: editor.getHTML(),
      styledElements: elements.map(element => ({
        tag: element.tagName.toLowerCase(),
        style: element.getAttribute("style") ?? "",
        inlineColor: (element as HTMLElement).style.color,
        inlineBackgroundColor: (element as HTMLElement).style.backgroundColor,
        dataColor: element.getAttribute("data-color"),
        position: getComputedStyle(element).position,
        backgroundImage: getComputedStyle(element).backgroundImage,
      })),
    };
  });

const clearEditor = async (page: Page) => {
  await page.getByTestId("clear-button").click();
  await expect(page.locator(".ProseMirror")).toHaveText("");
};

test.describe("Color sanitization", () => {
  let beaconRequests: string[];

  test.beforeEach(async ({ page }) => {
    beaconRequests = [];
    page.on("request", request => {
      if (request.url().includes("example.invalid")) {
        beaconRequests.push(request.url());
      }
    });

    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();
    await clearEditor(page);
  });

  for (const entryPoint of ALL_ENTRY_POINTS) {
    for (const payload of INVALID_COLORS) {
      test(`${entryPoint} never renders injected CSS from "${payload}"`, async ({ page }) => {
        await applyColor(page, entryPoint, payload);

        await expect(page.locator(".ProseMirror")).toContainText("x");
        await expect
          .poll(async () => {
            const { html, styledElements } = await rendered(page);
            const inline = styledElements.map(
              element => `${element.style} ${element.dataColor ?? ""}`
            );
            return [html, ...inline].filter(part => INJECTED_DECLARATIONS.test(part));
          })
          .toEqual([]);

        const { styledElements } = await rendered(page);
        for (const element of styledElements) {
          expect(element.position).not.toBe("fixed");
          expect(element.backgroundImage).toBe("none");
        }

        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 150)));
        expect(beaconRequests).toEqual([]);
      });
    }
  }

  for (const entryPoint of [
    "paste-mark",
    "set-content-html-mark",
    "set-content-json-highlight",
    "command-set-highlight",
    "set-content-json-text-style",
    "command-set-color",
  ] as EntryPoint[]) {
    for (const payload of INVALID_COLORS) {
      test(`${entryPoint} drops the color of "${payload}" and keeps the text`, async ({ page }) => {
        await applyColor(page, entryPoint, payload);

        await expect(page.locator(".ProseMirror")).toContainText("x");
        await expect
          .poll(async () => (await rendered(page)).html)
          .not.toMatch(/style=|data-color=/);
      });
    }
  }

  for (const entryPoint of ALL_ENTRY_POINTS) {
    for (const value of VALID_COLORS) {
      test(`${entryPoint} still applies the valid color "${value}"`, async ({ page }) => {
        await applyColor(page, entryPoint, value);

        const isHighlight = HIGHLIGHT_ENTRY_POINTS.includes(entryPoint);
        await expect
          .poll(async () => {
            const { styledElements } = await rendered(page);
            return styledElements.some(
              element => (isHighlight ? element.inlineBackgroundColor : element.inlineColor) !== ""
            );
          })
          .toBe(true);
        if (isHighlight) {
          await expect.poll(async () => (await rendered(page)).html).toContain(value);
        } else {
          await expect.poll(async () => (await rendered(page)).html).toMatch(/style="color: /);
        }
      });
    }
  }
});
