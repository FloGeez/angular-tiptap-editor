import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

// Serves the development build of the demo (`npm run build:e2e`) for the Playwright tests.
// A static server neither watches nor reloads, so a file change cannot reload a page mid-test,
// and it needs a fraction of the memory of `ng serve`. The development build keeps the
// Angular debug API (`window.ng`) and `isDevMode()` warnings that the tests rely on.

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "e2e-dist", "browser");
const port = Number(process.env.PORT ?? 4200);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

if (!existsSync(join(root, "index.html"))) {
  console.error(`No build in ${root}. Run "npm run build:e2e" first.`);
  process.exit(1);
}

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  const requested = normalize(join(root, pathname));
  const isFile =
    requested.startsWith(root) && existsSync(requested) && statSync(requested).isFile();
  // Unknown paths are app routes: serve the index, as the dev server does
  const file = isFile ? requested : join(root, "index.html");

  response.writeHead(200, {
    "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  });
  createReadStream(file).pipe(response);
}).listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`));
