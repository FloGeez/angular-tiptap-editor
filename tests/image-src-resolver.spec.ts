import { test, expect, type Page } from "@playwright/test";

const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6V6mQAAAAASUVORK5CYII=";

const STORED = {
  initial: "https://assets.test/initial.png",
  uploaded: "https://assets.test/uploaded.png",
  pasted: "https://assets.test/pasted.png",
  replaced: "https://assets.test/replaced.png",
};

type ResolverMode = "promise" | "sync" | "observable" | "reject" | "throw" | "empty";

type ImageSnapshot = { docSrc: string; domSrc: string | null; width: number | null };

type AteTestWindow = Window & {
  ng?: {
    getComponent: (element: Element) => unknown;
    getOwningComponent: (element: Element) => { editorConfig: () => Record<string, unknown> };
    applyChanges: (component: unknown) => void;
  };
  __ate?: {
    calls: string[];
    resolved: string[];
    images: () => ImageSnapshot[];
    install: (mode: ResolverMode) => void;
    installControlled: () => void;
    createResolver: (mode: ResolverMode) => (src: string) => unknown;
    createControlled: () => (src: string) => unknown;
    release: (src: string) => void;
    editor: () => EditorHandle;
    component: () => ComponentHandle;
  };
};

type EditorHandle = {
  commands: {
    focus: (position?: string) => void;
    setContent: (html: string) => boolean;
    setNodeSelection: (pos: number) => boolean;
    updateAttributes: (name: string, attrs: Record<string, unknown>) => boolean;
  };
  view: { pasteHTML: (html: string) => boolean };
  state: {
    doc: {
      descendants: (
        fn: (node: { type: { name: string }; attrs: Record<string, unknown> }, pos: number) => void
      ) => void;
    };
  };
  getHTML: () => string;
  getJSON: () => unknown;
};

type ComponentHandle = {
  editorCommandsService: {
    srcResolver: ((src: string) => unknown) | null;
    uploadHandler: ((ctx: unknown) => Promise<{ src: string }>) | null;
  };
  getEditor: () => EditorHandle | null;
};

async function prepare(page: Page) {
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

  await page.evaluate(pngBase64 => {
    const win = window as AteTestWindow;
    const host = document.querySelector("angular-tiptap-editor");
    if (!win.ng || !host) {
      throw new Error("Angular debug API or editor host is not available.");
    }
    const component = () => win.ng!.getComponent(host) as ComponentHandle;
    const editor = () => {
      const instance = component().getEditor();
      if (!instance) {
        throw new Error("Editor instance not available.");
      }
      return instance;
    };
    const bytes = Uint8Array.from(atob(pngBase64), char => char.charCodeAt(0));
    const blobUrl = () => URL.createObjectURL(new Blob([bytes], { type: "image/png" }));

    const calls: string[] = [];
    const resolved: string[] = [];
    const pending = new Map<string, (url: string) => void>();

    const track = (url: string) => {
      resolved.push(url);
      return url;
    };

    win.__ate = {
      calls,
      resolved,
      component,
      editor,
      images: () => {
        const docSources: string[] = [];
        editor().state.doc.descendants(node => {
          if (node.type.name === "resizableImage") {
            docSources.push(String(node.attrs["src"]));
          }
        });
        const elements = Array.from(
          document.querySelectorAll<HTMLImageElement>(".ProseMirror img")
        );
        return docSources.map((docSrc, index) => ({
          docSrc,
          domSrc: elements[index]?.getAttribute("src") ?? null,
          width: elements[index]?.getAttribute("width")
            ? Number(elements[index].getAttribute("width"))
            : null,
        }));
      },
      install: mode => {
        component().editorCommandsService.srcResolver = win.__ate!.createResolver(mode);
      },
      installControlled: () => {
        component().editorCommandsService.srcResolver = win.__ate!.createControlled();
      },
      createResolver: mode => {
        return src => {
          calls.push(src);
          switch (mode) {
            case "sync":
              return track(blobUrl());
            case "observable":
              return {
                lift: () => undefined,
                subscribe: (observer: { next: (v: string) => void; complete: () => void }) => {
                  queueMicrotask(() => {
                    observer.next(track(blobUrl()));
                    observer.complete();
                  });
                  return { unsubscribe: () => undefined, closed: false };
                },
              };
            case "reject":
              return Promise.reject(new Error("token expired"));
            case "throw":
              throw new Error("resolver exploded");
            case "empty":
              return Promise.resolve("");
            default:
              return Promise.resolve().then(() => track(blobUrl()));
          }
        };
      },
      createControlled: () => {
        return src => {
          calls.push(src);
          return new Promise<string>(resolve => {
            pending.set(src, url => resolve(track(url)));
          });
        };
      },
      release: src => {
        const settle = pending.get(src);
        if (!settle) {
          throw new Error(`No pending resolution for ${src}`);
        }
        pending.delete(src);
        settle(blobUrl());
      },
    };
  }, PNG_BASE64);
}

const images = (page: Page) => page.evaluate(() => (window as AteTestWindow).__ate!.images());

async function expectResolved(page: Page, docSrc: string) {
  await expect
    .poll(async () => {
      const image = (await images(page)).find(item => item.docSrc === docSrc);
      return image?.domSrc?.startsWith("blob:") ?? false;
    })
    .toBe(true);
}

async function setContent(page: Page, html: string) {
  await page.evaluate(content => {
    (window as AteTestWindow).__ate!.editor().commands.setContent(content);
  }, html);
}

// Sets the resolver through the demo's [config], like an app would, instead of the internal service
async function setConfigResolver(page: Page, resolver: "promise" | "controlled") {
  await page.evaluate(kind => {
    const win = window as AteTestWindow;
    const host = document.querySelector("angular-tiptap-editor") as Element;
    const app = win.ng!.getOwningComponent(host);
    const imageSrcResolver =
      kind === "controlled" ? win.__ate!.createControlled() : win.__ate!.createResolver(kind);
    const nextConfig = { ...app.editorConfig(), imageSrcResolver };
    app.editorConfig = () => nextConfig;
    win.ng!.applyChanges(app);
  }, resolver);
}

async function selectFirstImage(page: Page) {
  await page.evaluate(() => {
    const editor = (window as AteTestWindow).__ate!.editor();
    let position = -1;
    editor.state.doc.descendants((node, pos) => {
      if (position < 0 && node.type.name === "resizableImage") {
        position = pos;
      }
    });
    editor.commands.focus();
    editor.commands.setNodeSelection(position);
  });
  await expect(page.getByRole("button", { name: "Download Image" })).toBeVisible();
}

test.describe("Image src resolver", () => {
  test.beforeEach(async ({ page }) => {
    await prepare(page);
  });

  test("should display the resolved URL for initial content and keep the original src in the document", async ({
    page,
  }) => {
    await page.evaluate(() => (window as AteTestWindow).__ate!.install("promise"));
    await setContent(page, `<p>text</p><img src="${STORED.initial}">`);

    await expectResolved(page, STORED.initial);
    const [image] = await images(page);
    expect(image.docSrc).toBe(STORED.initial);
    expect(image.domSrc).not.toBe(STORED.initial);

    const exported = await page.evaluate(() => {
      const editor = (window as AteTestWindow).__ate!.editor();
      return { html: editor.getHTML(), json: JSON.stringify(editor.getJSON()) };
    });
    expect(exported.html).toContain(`src="${STORED.initial}"`);
    expect(exported.html).not.toContain("blob:");
    expect(exported.json).toContain(STORED.initial);
    expect(exported.json).not.toContain("blob:");
  });

  test("should never request the original src while a resolver is pending", async ({
    page,
    browserName,
  }) => {
    const requested: string[] = [];
    await page.route("https://assets.test/**", route => {
      requested.push(route.request().url());
      return route.fulfill({ status: 401, body: "" });
    });
    await page.evaluate(() => (window as AteTestWindow).__ate!.installControlled());
    await setContent(page, `<img src="${STORED.initial}">`);

    await expect
      .poll(() => page.evaluate(() => (window as AteTestWindow).__ate!.calls))
      .toEqual([STORED.initial]);
    expect((await images(page))[0].domSrc).toBeNull();

    await page.evaluate(src => (window as AteTestWindow).__ate!.release(src), STORED.initial);
    await expectResolved(page, STORED.initial);
    if (browserName === "chromium") {
      expect(requested).toEqual([]);
    }
  });

  for (const mode of ["sync", "promise", "observable"] as const) {
    test(`should accept a ${mode} resolver result`, async ({ page }) => {
      await page.evaluate(
        resolverMode => (window as AteTestWindow).__ate!.install(resolverMode),
        mode
      );
      await setContent(page, `<img src="${STORED.initial}">`);

      await expectResolved(page, STORED.initial);
      expect((await images(page))[0].docSrc).toBe(STORED.initial);
    });
  }

  for (const mode of ["reject", "throw", "empty"] as const) {
    test(`should fall back to the original src when the resolver ends with "${mode}"`, async ({
      page,
    }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", error => pageErrors.push(error.message));
      await page.route("https://assets.test/**", route =>
        route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from("") })
      );
      await page.evaluate(
        resolverMode => (window as AteTestWindow).__ate!.install(resolverMode),
        mode
      );
      await setContent(page, `<img src="${STORED.initial}">`);

      await expect.poll(async () => (await images(page))[0]?.domSrc).toBe(STORED.initial);
      expect((await images(page))[0].docSrc).toBe(STORED.initial);
      expect(await page.evaluate(() => (window as AteTestWindow).__ate!.calls)).toEqual([
        STORED.initial,
      ]);
      expect(pageErrors).toEqual([]);
    });
  }

  test("should not let an older resolution overwrite a newer src", async ({ page }) => {
    await page.evaluate(() => (window as AteTestWindow).__ate!.installControlled());
    await setContent(page, `<img src="${STORED.initial}">`);
    await expect
      .poll(() => page.evaluate(() => (window as AteTestWindow).__ate!.calls))
      .toEqual([STORED.initial]);

    await page.evaluate(src => {
      (window as AteTestWindow)
        .__ate!.editor()
        .commands.updateAttributes("resizableImage", { src });
    }, STORED.replaced);
    await expect
      .poll(() => page.evaluate(() => (window as AteTestWindow).__ate!.calls))
      .toEqual([STORED.initial, STORED.replaced]);

    await page.evaluate(src => (window as AteTestWindow).__ate!.release(src), STORED.replaced);
    await expectResolved(page, STORED.replaced);
    const newer = (await images(page))[0].domSrc;

    await page.evaluate(src => (window as AteTestWindow).__ate!.release(src), STORED.initial);
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 100)));

    const [image] = await images(page);
    expect(image.docSrc).toBe(STORED.replaced);
    expect(image.domSrc).toBe(newer);
  });

  test("should resolve an image inserted through the upload handler", async ({ page }) => {
    await page.evaluate(src => {
      const ate = (window as AteTestWindow).__ate!;
      ate.install("promise");
      ate.component().editorCommandsService.uploadHandler = async () => ({ src });
    }, STORED.uploaded);
    await page.locator(".ProseMirror").click();

    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.locator("ate-toolbar").getByRole("button", { name: /image/i }).click(),
    ]);
    await fileChooser.setFiles({
      name: "upload.png",
      mimeType: "image/png",
      buffer: Buffer.from(PNG_BASE64, "base64"),
    });

    await expectResolved(page, STORED.uploaded);
    const [image] = await images(page);
    expect(image.docSrc).toBe(STORED.uploaded);
  });

  test("should resolve a pasted image and keep the pasted src in the document", async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== "chromium",
      "synthetic paste events are currently reliable only in chromium"
    );
    await page.evaluate(() => (window as AteTestWindow).__ate!.install("promise"));
    await page.locator(".ProseMirror").click();
    await page.evaluate(html => {
      const editor = (window as AteTestWindow).__ate!.editor();
      editor.commands.focus("end");
      editor.view.pasteHTML(html);
    }, `<p>before</p><img src="${STORED.pasted}">`);

    await expectResolved(page, STORED.pasted);
    const [image] = await images(page);
    expect(image.docSrc).toBe(STORED.pasted);
  });

  test("should resolve the new src when the image is replaced from the bubble menu", async ({
    page,
  }) => {
    await page.evaluate(src => {
      const ate = (window as AteTestWindow).__ate!;
      ate.install("promise");
      ate.component().editorCommandsService.uploadHandler = async () => ({ src });
    }, STORED.replaced);
    await setContent(page, `<img src="${STORED.initial}" width="200" height="200">`);
    await expectResolved(page, STORED.initial);
    const before = (await images(page))[0].domSrc;

    await selectFirstImage(page);
    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("button", { name: "Change Image" }).click(),
    ]);
    await fileChooser.setFiles({
      name: "replacement.png",
      mimeType: "image/png",
      buffer: Buffer.from(PNG_BASE64, "base64"),
    });

    await expect.poll(async () => (await images(page))[0]?.docSrc).toBe(STORED.replaced);
    await expectResolved(page, STORED.replaced);
    const [image] = await images(page);
    expect(image.domSrc).not.toBe(before);
    expect(await images(page)).toHaveLength(1);
  });

  test("should keep the resolved image when it is resized from the bubble menu", async ({
    page,
  }) => {
    await page.evaluate(() => (window as AteTestWindow).__ate!.install("promise"));
    await setContent(page, `<img src="${STORED.initial}" width="200" height="200">`);
    await expectResolved(page, STORED.initial);
    const before = (await images(page))[0].domSrc;

    await selectFirstImage(page);
    await page.getByRole("button", { name: "Small" }).click();

    await expect.poll(async () => (await images(page))[0]?.width).toBe(300);
    const [image] = await images(page);
    expect(image.docSrc).toBe(STORED.initial);
    expect(image.domSrc).toBe(before);
    expect(await page.evaluate(() => (window as AteTestWindow).__ate!.calls)).toEqual([
      STORED.initial,
    ]);
  });

  test("should keep the resolved image when it is resized with the drag handle", async ({
    page,
  }) => {
    await page.evaluate(() => (window as AteTestWindow).__ate!.install("promise"));
    await setContent(page, `<img src="${STORED.initial}" width="200" height="200">`);
    await expectResolved(page, STORED.initial);
    const before = (await images(page))[0].domSrc;

    await selectFirstImage(page);
    const handle = page.locator(".resize-handle-e");
    await handle.hover({ force: true });
    const box = await handle.boundingBox();
    if (!box) {
      throw new Error("Resize handle is not visible.");
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();

    await expect.poll(async () => (await images(page))[0]?.width).toBeGreaterThan(200);
    const [image] = await images(page);
    expect(image.docSrc).toBe(STORED.initial);
    expect(image.domSrc).toBe(before);
  });

  test("should download the resolved URL instead of the stored src", async ({ page }) => {
    await page.evaluate(() => {
      const win = window as AteTestWindow & { __downloads?: string[] };
      win.__downloads = [];
      HTMLAnchorElement.prototype.click = function () {
        win.__downloads!.push(`${this.download}|${this.href}`);
      };
      win.__ate!.install("promise");
    });
    await setContent(page, `<img src="${STORED.initial}" alt="logo" width="200" height="200">`);
    await expectResolved(page, STORED.initial);

    await selectFirstImage(page);
    await page.getByRole("button", { name: "Download Image" }).click();

    await expect
      .poll(() =>
        page.evaluate(() => (window as AteTestWindow & { __downloads?: string[] }).__downloads)
      )
      .toHaveLength(1);
    const download = await page.evaluate(() => {
      const win = window as AteTestWindow & { __downloads?: string[] };
      const [fileName, href] = win.__downloads![0].split("|");
      return { fileName, href, resolved: win.__ate!.resolved, calls: win.__ate!.calls };
    });
    expect(download.fileName).toBe("logo");
    expect(download.href.startsWith("blob:")).toBe(true);
    expect(download.resolved).toContain(download.href);
    expect(download.calls).toEqual([STORED.initial, STORED.initial]);
  });

  test("should keep the original src when copying and pasting an image inside the editor", async ({
    page,
    browserName,
    context,
  }) => {
    test.skip(
      browserName !== "chromium",
      "clipboard permissions are currently reliable only in chromium"
    );
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.evaluate(() => (window as AteTestWindow).__ate!.install("promise"));
    await setContent(page, `<img src="${STORED.initial}" width="200" height="200">`);
    await expectResolved(page, STORED.initial);

    await selectFirstImage(page);
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.press(`${modifier}+c`);
    await page.evaluate(() => (window as AteTestWindow).__ate!.editor().commands.focus("end"));
    await page.keyboard.press(`${modifier}+v`);

    await expect.poll(async () => (await images(page)).length).toBe(2);
    const snapshot = await images(page);
    expect(snapshot.map(image => image.docSrc)).toEqual([STORED.initial, STORED.initial]);
    await expect
      .poll(async () => (await images(page)).every(image => image.domSrc?.startsWith("blob:")))
      .toBe(true);
    const html = await page.evaluate(() => (window as AteTestWindow).__ate!.editor().getHTML());
    expect(html).not.toContain("blob:");
  });

  test("should resolve the images already displayed when a resolver is set after the editor was created", async ({
    page,
  }) => {
    await setContent(page, `<p>text</p><img src="${STORED.initial}">`);
    await expect.poll(async () => (await images(page))[0]?.domSrc).toBe(STORED.initial);
    await page.evaluate(() => {
      const win = window as AteTestWindow & { __editorBefore?: unknown };
      win.__editorBefore = win.__ate!.editor();
    });

    await setConfigResolver(page, "promise");

    await expectResolved(page, STORED.initial);
    expect((await images(page))[0].docSrc).toBe(STORED.initial);
    const sameEditor = await page.evaluate(() => {
      const win = window as AteTestWindow & { __editorBefore?: unknown };
      return win.__ate!.editor() === win.__editorBefore;
    });
    expect(sameEditor).toBe(true);
  });

  test("should re-resolve displayed images with a new resolver and keep the current image until it is ready", async ({
    page,
  }) => {
    await setConfigResolver(page, "promise");
    await setContent(page, `<p>text</p><img src="${STORED.initial}">`);
    await expectResolved(page, STORED.initial);
    const first = (await images(page))[0].domSrc;

    await setConfigResolver(page, "controlled");
    await expect
      .poll(() => page.evaluate(() => (window as AteTestWindow).__ate!.calls.length))
      .toBe(2);
    expect((await images(page))[0].domSrc).toBe(first);

    await page.evaluate(src => (window as AteTestWindow).__ate!.release(src), STORED.initial);
    await expect.poll(async () => (await images(page))[0].domSrc).not.toBe(first);
    await expectResolved(page, STORED.initial);
  });

  test("should show the stored src unchanged when no resolver is configured", async ({ page }) => {
    await page.route("https://assets.test/**", route =>
      route.fulfill({
        status: 200,
        contentType: "image/png",
        body: Buffer.from(PNG_BASE64, "base64"),
      })
    );
    await setContent(page, `<img src="${STORED.initial}">`);

    await expect.poll(async () => (await images(page))[0]?.domSrc).toBe(STORED.initial);
  });
});
