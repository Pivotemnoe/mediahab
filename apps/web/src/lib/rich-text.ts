import { type JsonObject } from "@/services/openapi-types";

export type RichTextMark =
  | { type: "bold" }
  | { type: "italic" }
  | { href: string; type: "link" };

export type RichTextSegment = { marks: RichTextMark[]; text: string };
export type RichTextDocument = { segments: RichTextSegment[]; version: 1 };

const markOrder: Record<RichTextMark["type"], number> = { bold: 0, italic: 1, link: 2 };

function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = new URL(value.trim());
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function normalizeMarks(value: unknown): RichTextMark[] {
  if (!Array.isArray(value)) return [];
  const marks = new Map<RichTextMark["type"], RichTextMark>();
  value.forEach((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
    const mark = raw as JsonObject;
    if (mark.type === "bold" || mark.type === "italic") marks.set(mark.type, { type: mark.type });
    if (mark.type === "link") {
      const href = safeUrl(mark.href);
      if (href) marks.set("link", { href, type: "link" });
    }
  });
  return Array.from(marks.values()).sort((left, right) => markOrder[left.type] - markOrder[right.type]);
}

export function plainRichText(text: string): RichTextDocument {
  return { segments: text ? [{ marks: [], text: text.replace(/\r\n?/g, "\n") }] : [], version: 1 };
}

export function normalizeRichText(value: unknown, fallback = ""): RichTextDocument {
  if (!value || typeof value !== "object" || Array.isArray(value)) return plainRichText(fallback);
  const candidate = value as JsonObject;
  if (candidate.version !== 1 || !Array.isArray(candidate.segments)) return plainRichText(fallback);
  const segments: RichTextSegment[] = [];
  candidate.segments.forEach((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
    const segment = raw as JsonObject;
    if (typeof segment.text !== "string" || !segment.text) return;
    const next = { marks: normalizeMarks(segment.marks), text: segment.text.replace(/\r\n?/g, "\n") };
    const previous = segments.at(-1);
    if (previous && JSON.stringify(previous.marks) === JSON.stringify(next.marks)) previous.text += next.text;
    else segments.push(next);
  });
  return { segments, version: 1 };
}

export function richTextPlain(value: RichTextDocument): string {
  return value.segments.map((segment) => segment.text).join("");
}

export function richTextLinkCount(value: RichTextDocument): number {
  let count = 0;
  let previousHref: string | null = null;
  value.segments.forEach((segment) => {
    const link = segment.marks.find(
      (mark): mark is Extract<RichTextMark, { type: "link" }> => mark.type === "link",
    );
    const href = link?.href ?? null;
    if (href && href !== previousHref) count += 1;
    previousHref = href;
  });
  return count;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function richTextHtml(value: RichTextDocument): string {
  return value.segments.map((segment) => {
    let html = escapeHtml(segment.text).replaceAll("\n", "<br>");
    if (segment.marks.some((mark) => mark.type === "bold")) html = `<strong>${html}</strong>`;
    if (segment.marks.some((mark) => mark.type === "italic")) html = `<em>${html}</em>`;
    const link = segment.marks.find((mark): mark is Extract<RichTextMark, { type: "link" }> => mark.type === "link");
    if (link) html = `<a href="${escapeHtml(link.href)}">${html}</a>`;
    return html;
  }).join("");
}

export function richTextFromElement(root: HTMLElement): RichTextDocument {
  const segments: RichTextSegment[] = [];
  const append = (text: string, marks: RichTextMark[]) => {
    if (!text) return;
    const normalized = normalizeMarks(marks);
    const previous = segments.at(-1);
    if (previous && JSON.stringify(previous.marks) === JSON.stringify(normalized)) previous.text += text;
    else segments.push({ marks: normalized, text });
  };
  const walk = (node: Node, inherited: RichTextMark[]) => {
    if (node.nodeType === Node.TEXT_NODE) {
      append(node.textContent ?? "", inherited);
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === "BR") {
      append("\n", inherited);
      return;
    }
    let marks = inherited;
    if (["B", "STRONG"].includes(node.tagName)) marks = [...marks, { type: "bold" }];
    if (["I", "EM"].includes(node.tagName)) marks = [...marks, { type: "italic" }];
    if (node.tagName === "A") {
      const href = safeUrl(node.getAttribute("href"));
      if (href) marks = [...marks, { href, type: "link" }];
    }
    const isBlock = ["DIV", "P"].includes(node.tagName);
    const before = segments.length ? richTextPlain({ segments, version: 1 }).length : 0;
    node.childNodes.forEach((child) => walk(child, marks));
    const afterText = richTextPlain({ segments, version: 1 });
    if (isBlock && afterText.length > before && !afterText.endsWith("\n")) append("\n", inherited);
  };
  root.childNodes.forEach((child) => walk(child, []));
  const document = normalizeRichText({ segments, version: 1 });
  const text = richTextPlain(document);
  if (!text.endsWith("\n")) return document;
  const trimmedSegments = document.segments.map((segment) => ({ ...segment, marks: [...segment.marks] }));
  const last = trimmedSegments.at(-1);
  if (last) {
    last.text = last.text.slice(0, -1);
    if (!last.text) trimmedSegments.pop();
  }
  return normalizeRichText({ segments: trimmedSegments, version: 1 });
}

export function richTextFromPayload(payload: JsonObject | null | undefined, fallback: string): RichTextDocument {
  return normalizeRichText(payload?.rich_text, fallback);
}

export async function copyRichText(document: RichTextDocument): Promise<"rich" | "plain"> {
  const text = richTextPlain(document);
  const html = richTextHtml(document);
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
      return "rich";
    } catch {
      // The browser may expose ClipboardItem while denying rich clipboard writes.
    }
  }
  await navigator.clipboard.writeText(text);
  return "plain";
}
