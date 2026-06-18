/**
 * HTML to Markdown converter utility (no external dependencies).
 */

export function htmlToMarkdown(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const result = convertNode(doc.body, { listDepth: 0, listType: null });
  // Normalize multiple blank lines to max two
  return result.replace(/\n{3,}/g, "\n\n").trim();
}

function convertNode(
  node: Node,
  ctx: { listDepth: number; listType: "ul" | "ol" | null; orderedIndex?: number }
): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || "";
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const children = Array.from(el.childNodes);

  const inner = (overrideCtx?: Partial<typeof ctx>) =>
    children.map(c => convertNode(c, { ...ctx, ...overrideCtx })).join("");

  // ── Block-level elements ──────────────────────────────────

  if (tag === "br") {
    return "\n";
  }

  if (tag === "hr") {
    return "\n\n---\n\n";
  }

  if (/^h[1-6]$/.test(tag)) {
    const level = parseInt(tag[1], 10);
    const prefix = "#".repeat(level);
    return `\n\n${prefix} ${inner().trim()}\n\n`;
  }

  if (tag === "p") {
    const content = inner().trim();
    if (!content) {
      return "";
    }
    return `\n\n${content}\n\n`;
  }

  if (tag === "blockquote") {
    const content = inner()
      .trim()
      .split("\n")
      .map(line => `> ${line}`)
      .join("\n");
    return `\n\n${content}\n\n`;
  }

  if (tag === "pre") {
    // Extract language from code class e.g. "language-typescript"
    const codeEl = el.querySelector("code");
    const lang = codeEl ? (codeEl.className.match(/language-(\S+)/) || [])[1] || "" : "";
    const code = codeEl ? codeEl.textContent || "" : el.textContent || "";
    return `\n\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
  }

  if (tag === "ul" || tag === "ol") {
    const isTaskList = el.getAttribute("data-type") === "taskList";
    const items = children
      .filter(c => (c as HTMLElement).tagName?.toLowerCase() === "li")
      .map((li, idx) =>
        convertListItem(li as HTMLElement, {
          listDepth: ctx.listDepth + 1,
          listType: tag === "ul" ? "ul" : "ol",
          orderedIndex: idx + 1,
          isTaskList,
        })
      )
      .join("\n");
    const block = `\n\n${items}\n\n`;
    // Only add surrounding newlines for root-level lists
    return ctx.listDepth === 0 ? block : `\n${items}`;
  }

  if (tag === "table") {
    return convertTable(el);
  }

  // ── Inline elements ──────────────────────────────────────

  if (tag === "strong" || tag === "b") {
    const content = inner();
    return content ? `**${content}**` : "";
  }

  if (tag === "em" || tag === "i") {
    const content = inner();
    return content ? `*${content}*` : "";
  }

  if (tag === "s" || tag === "del" || tag === "strike") {
    const content = inner();
    return content ? `~~${content}~~` : "";
  }

  if (tag === "u") {
    // No standard Markdown for underline — use HTML passthrough
    const content = inner();
    return content ? `<u>${content}</u>` : "";
  }

  if (tag === "code") {
    // Inline code (not inside pre)
    const content = el.textContent || "";
    return content ? `\`${content}\`` : "";
  }

  if (tag === "a") {
    const href = el.getAttribute("href") || "";
    const content = inner().trim();
    if (!content && !href) {
      return "";
    }
    if (!content) {
      return href;
    }
    return `[${content}](${href})`;
  }

  if (tag === "img") {
    const src = el.getAttribute("src") || "";
    const alt = el.getAttribute("alt") || "";
    return `![${alt}](${src})`;
  }

  // ── Wrapper / Unknown elements → recurse ─────────────────
  return inner();
}

function convertListItem(
  li: HTMLElement,
  ctx: {
    listDepth: number;
    listType: "ul" | "ol";
    orderedIndex: number;
    isTaskList: boolean;
  }
): string {
  const indent = "  ".repeat(ctx.listDepth - 1);

  // Task list item
  if (ctx.isTaskList) {
    const checked = li.getAttribute("data-checked") === "true";
    const checkMark = checked ? "[x]" : "[ ]";
    const content = Array.from(li.childNodes)
      .map(c => convertNode(c, { listDepth: ctx.listDepth, listType: ctx.listType }))
      .join("")
      .trim();
    return `${indent}- ${checkMark} ${content}`;
  }

  // Normal list item
  const bullet = ctx.listType === "ol" ? `${ctx.orderedIndex}.` : "-";

  // Check if li contains nested lists
  const nestedListNodes = Array.from(li.childNodes).filter(
    c =>
      (c as HTMLElement).tagName?.toLowerCase() === "ul" ||
      (c as HTMLElement).tagName?.toLowerCase() === "ol"
  );
  const textNodes = Array.from(li.childNodes).filter(
    c => !["ul", "ol"].includes((c as HTMLElement).tagName?.toLowerCase())
  );

  const textContent = textNodes
    .map(c => convertNode(c, { listDepth: ctx.listDepth, listType: ctx.listType }))
    .join("")
    .trim();

  const nestedContent = nestedListNodes
    .map(c => convertNode(c, { listDepth: ctx.listDepth, listType: ctx.listType }))
    .join("")
    .trimEnd();

  return `${indent}${bullet} ${textContent}${nestedContent}`;
}

function convertTable(table: HTMLElement): string {
  const rows = Array.from(table.querySelectorAll("tr"));
  if (rows.length === 0) {
    return "";
  }

  const tableData: string[][] = rows.map(row =>
    Array.from(row.querySelectorAll("th, td")).map(
      cell => cell.textContent?.replace(/\n/g, " ").trim() || ""
    )
  );

  if (tableData.length === 0) {
    return "";
  }

  const colCount = Math.max(...tableData.map(r => r.length));

  // Pad rows to same width
  const normalized = tableData.map(row => {
    while (row.length < colCount) {
      row.push("");
    }
    return row;
  });

  // Calculate column widths
  const colWidths = Array.from({ length: colCount }, (_, i) =>
    Math.max(...normalized.map(r => (r[i] || "").length), 3)
  );

  const pad = (str: string, len: number) => str.padEnd(len, " ");
  const separator = colWidths.map(w => "-".repeat(w)).join(" | ");

  // Build rows
  const lines: string[] = [];
  normalized.forEach((row, rowIdx) => {
    const line = row.map((cell, i) => pad(cell, colWidths[i])).join(" | ");
    lines.push(`| ${line} |`);
    // Add separator after header row (first row)
    if (rowIdx === 0) {
      lines.push(`| ${separator} |`);
    }
  });

  return `\n\n${lines.join("\n")}\n\n`;
}
