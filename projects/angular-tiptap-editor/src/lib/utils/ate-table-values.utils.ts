export type AteTableSortDirection = "asc" | "desc";

/** How the values of a column are compared */
export type AteTableColumnKind = "number" | "date" | "text";

export type AteTableDecimalSeparator = "," | ".";
type AteTableSortValue = number | string | null;

const FIXED_LENGTH_MIN = 5;
const GROUP_SIZE = 3;
const DATE_DMY = /^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](.+))?$/;
const DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](.+))?$/;
const TIME_PART = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;
const ISO_ZONE = /(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/;
const NUMBER_CHARS = /^-?\d[\d.,]*$/;
const DOT_GROUPED = /^-?[1-9]\d{0,2}(?:\.\d{3})+$/;
const COMMA_GROUPED = /^-?[1-9]\d{0,2}(?:,\d{3})+$/;
const COMBINING_MARKS = /[̀-ͯ]/g;

const collator = new Intl.Collator(undefined, { numeric: true });

/** Lowercase text without accents, so "Émile" and "emile" compare equal */
export function normalizeTableText(text: string): string {
  return text.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase();
}

function cleanNumber(raw: string): string {
  return raw
    .replace(/R\$|[$€£%]|\s/g, "")
    .replace(/^\+/, "")
    .trim();
}

function groupedInteger(text: string, separator: string): string | null {
  const digits = text.startsWith("-") ? text.slice(1) : text;
  const groups = digits.split(separator);
  const valid =
    groups[0].length >= 1 &&
    (groups.length === 1 || groups[0] !== "0") &&
    groups[0].length <= GROUP_SIZE &&
    groups.slice(1).every(group => group.length === GROUP_SIZE);
  return valid ? text.split(separator).join("") : null;
}

/**
 * The decimal separator a number points to, or null when it could be either ("1.234").
 * A zero before the separator ("0.500") always makes it the decimal separator.
 */
function decimalVote(text: string): AteTableDecimalSeparator | null {
  const dot = text.lastIndexOf(".");
  const comma = text.lastIndexOf(",");
  if (dot >= 0 && comma >= 0) {
    return dot > comma ? "." : ",";
  }
  const index = Math.max(dot, comma);
  if (index < 0) {
    return null;
  }
  const separator = dot >= 0 ? "." : ",";
  if (text.indexOf(separator) !== index) {
    return separator === "." ? "," : ".";
  }
  if (/^-?0$/.test(text.slice(0, index))) {
    return separator;
  }
  return text.length - index - 1 === GROUP_SIZE ? null : separator;
}

function readNumber(text: string, decimal: AteTableDecimalSeparator): number | null {
  const group = decimal === "," ? "." : ",";
  const cut = text.lastIndexOf(decimal);
  const integerPart = cut >= 0 ? text.slice(0, cut) : text;
  const fraction = cut >= 0 ? text.slice(cut + 1) : "";
  if (cut >= 0 && !/^\d+$/.test(fraction)) {
    return null;
  }
  const integer = integerPart.includes(group) ? groupedInteger(integerPart, group) : integerPart;
  if (integer === null || !/^-?\d+$/.test(integer)) {
    return null;
  }
  const value = Number(fraction ? `${integer}.${fraction}` : integer);
  return Number.isFinite(value) ? value : null;
}

/** Reads "1,234.5", "1.234,5", "R$ 10", "15%"; `decimal` settles ambiguous values like "1.234" */
export function parseTableNumber(
  raw: string,
  decimal: AteTableDecimalSeparator = "."
): number | null {
  const text = cleanNumber(raw);
  if (!NUMBER_CHARS.test(text)) {
    return null;
  }
  const vote = decimalVote(text);
  const candidates: AteTableDecimalSeparator[] = vote
    ? [vote]
    : [decimal, decimal === "," ? "." : ","];
  for (const separator of candidates) {
    const value = readNumber(text, separator);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

/**
 * The decimal separator of a column: the one most values point to; when none settles it,
 * `fallback` (the editor language), unless every ambiguous value is grouped by thousands with
 * the other separator and some value has two groups or more ("1.234.567").
 */
function columnDecimal(
  values: string[],
  fallback: AteTableDecimalSeparator
): AteTableDecimalSeparator {
  let comma = 0;
  let dot = 0;
  const numbers: string[] = [];
  const ambiguous: string[] = [];
  for (const value of values) {
    const text = cleanNumber(value);
    if (NUMBER_CHARS.test(text)) {
      const vote = decimalVote(text);
      comma += vote === "," ? 1 : 0;
      dot += vote === "." ? 1 : 0;
      numbers.push(text);
      if (vote === null && /[.,]/.test(text)) {
        ambiguous.push(text);
      }
    }
  }
  if (comma !== dot) {
    return comma > dot ? "," : ".";
  }
  const groupedBy = (separator: AteTableDecimalSeparator, pattern: RegExp) =>
    ambiguous.length > 0 &&
    ambiguous.every(text => pattern.test(text)) &&
    numbers.some(text => pattern.test(text) && text.split(separator).length > 2);
  if (fallback === "." && groupedBy(".", DOT_GROUPED)) {
    return ",";
  }
  if (fallback === "," && groupedBy(",", COMMA_GROUPED)) {
    return ".";
  }
  return fallback;
}

function buildTimestamp(match: string[], dayFirst: boolean): number | null {
  const [year, month, day] = (
    dayFirst ? [match[3], match[2], match[1]] : [match[1], match[2], match[3]]
  ).map(Number);
  const time = match[4] === undefined ? [] : TIME_PART.exec(match[4]);
  if (!time) {
    return null;
  }
  const date = new Date(
    Date.UTC(year, month - 1, day, Number(time[1] ?? 0), Number(time[2] ?? 0), Number(time[3] ?? 0))
  );
  const valid =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid ? date.getTime() : null;
}

/** Reads "dd/mm/yyyy" or "yyyy-mm-dd", each with an optional time */
export function parseTableDate(raw: string): number | null {
  const text = raw.trim();
  const dayFirst = DATE_DMY.exec(text);
  if (dayFirst) {
    return buildTimestamp(dayFirst, true);
  }
  const iso = DATE_ISO.exec(text.replace(ISO_ZONE, ""));
  return iso ? buildTimestamp(iso, false) : null;
}

/** Digits with a leading zero or all of one length (ids, postal codes) are codes, not amounts */
function isCodeLike(values: string[]): boolean {
  const compact = values.map(value => value.replace(/\s/g, ""));
  if (compact.some(value => /^0\d/.test(value))) {
    return true;
  }
  if (!compact.every(value => /^\d+$/.test(value))) {
    return false;
  }
  const length = compact[0].length;
  return length >= FIXED_LENGTH_MIN && compact.every(value => value.length === length);
}

/** Dates when every filled value is a date, numbers when every one is a number, text otherwise */
export function inferTableColumnKind(values: string[]): AteTableColumnKind {
  const filled = values.map(value => value.trim()).filter(Boolean);
  if (filled.length === 0) {
    return "text";
  }
  if (filled.every(value => parseTableDate(value) !== null)) {
    return "date";
  }
  if (filled.every(value => parseTableNumber(value) !== null)) {
    return isCodeLike(filled) ? "text" : "number";
  }
  return "text";
}

function sortValues(
  values: string[],
  kind: AteTableColumnKind,
  fallbackDecimal: AteTableDecimalSeparator
): AteTableSortValue[] {
  const decimal = kind === "number" ? columnDecimal(values, fallbackDecimal) : ".";
  return values.map(raw => {
    const text = raw.trim();
    if (!text) {
      return null;
    }
    if (kind === "number") {
      return parseTableNumber(text, decimal);
    }
    return kind === "date" ? parseTableDate(text) : normalizeTableText(text);
  });
}

function compareSortValues(a: number | string, b: number | string): number {
  return typeof a === "number" && typeof b === "number" ? a - b : collator.compare(`${a}`, `${b}`);
}

/**
 * The order of the given cell texts once sorted, as indexes into `values`.
 * Empty values go last in both directions and equal values keep their order.
 * `fallbackDecimal` reads numbers like "1.234" when nothing in the column settles it.
 */
export function tableSortOrder(
  values: string[],
  direction: AteTableSortDirection,
  fallbackDecimal: AteTableDecimalSeparator = "."
): number[] {
  const keys = sortValues(values, inferTableColumnKind(values), fallbackDecimal);
  return keys
    .map((_, index) => index)
    .sort((a, b) => {
      const left = keys[a];
      const right = keys[b];
      if (left === null || right === null) {
        return left === right ? a - b : left === null ? 1 : -1;
      }
      const diff = compareSortValues(left, right);
      if (diff === 0) {
        return a - b;
      }
      return direction === "asc" ? diff : -diff;
    });
}

/**
 * A filter on one table column, with the values the menu offers for it:
 * - `text`: cells containing `query`, without case or accents
 * - `values`: cells equal to one of `values` ("" stands for empty cells)
 * - `number`: numbers between `min` and `max`, both included
 * - `date`: dates between `from` and `to` (`yyyy-mm-dd`), both days included
 */
export type AteTableFilter =
  | { kind: "text"; query: string }
  | { kind: "values"; values: string[] }
  | { kind: "number"; min?: number | null; max?: number | null }
  | { kind: "date"; from?: string | null; to?: string | null };

export type AteTableFilterKind = AteTableFilter["kind"];

export interface AteTableValueCount {
  value: string;
  count: number;
}

export interface AteTableColumnSummary {
  kind: AteTableFilterKind;
  /** Every distinct value with its number of rows, empty last */
  counts: AteTableValueCount[];
  min: number | null;
  max: number | null;
  /** Decimal separator of the column, to read and show its bounds */
  decimal: AteTableDecimalSeparator;
}

const VALUES_MAX_DISTINCT = 20;
const DAY_MS = 86_400_000;
const FILTER_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Dates and numbers as for sorting; text with few distinct values is a list of values */
export function inferTableFilterKind(values: string[]): AteTableFilterKind {
  const kind = inferTableColumnKind(values);
  if (kind !== "text") {
    return kind;
  }
  const distinct = new Set(values.map(value => value.trim()).filter(Boolean));
  return distinct.size > 0 && distinct.size <= VALUES_MAX_DISTINCT ? "values" : "text";
}

/** The numbers of a column, read with the decimal separator of the whole column */
export function parseTableColumnNumbers(
  values: string[],
  fallbackDecimal: AteTableDecimalSeparator = "."
): (number | null)[] {
  const decimal = columnDecimal(values, fallbackDecimal);
  return values.map(value => (value.trim() ? parseTableNumber(value, decimal) : null));
}

/** Reads a `yyyy-mm-dd` day as the timestamp of its start, in UTC like the cell dates */
export function parseTableFilterDay(value: string | null | undefined): number | null {
  const match = value ? FILTER_DAY.exec(value.trim()) : null;
  return match ? buildTimestamp([match[0], match[1], match[2], match[3]], false) : null;
}

/** Whether each of the given cell texts passes the filter */
export function tableFilterMatches(
  values: string[],
  filter: AteTableFilter,
  fallbackDecimal: AteTableDecimalSeparator = "."
): boolean[] {
  switch (filter.kind) {
    case "text": {
      const query = normalizeTableText(filter.query.trim());
      return values.map(value => normalizeTableText(value).includes(query));
    }
    case "values": {
      const allowed = new Set(filter.values.map(value => value.trim()));
      return values.map(value => allowed.has(value.trim()));
    }
    case "number": {
      const { min, max } = filter;
      return parseTableColumnNumbers(values, fallbackDecimal).map(
        value => value !== null && (min == null || value >= min) && (max == null || value <= max)
      );
    }
    case "date": {
      const from = parseTableFilterDay(filter.from);
      const to = parseTableFilterDay(filter.to);
      return values.map(value => {
        const stamp = parseTableDate(value);
        return (
          stamp !== null && (from === null || stamp >= from) && (to === null || stamp < to + DAY_MS)
        );
      });
    }
    default:
      return values.map(() => true);
  }
}

/** The filter kind of a column, its distinct values with their counts and its number range */
export function summarizeTableColumn(
  values: string[],
  fallbackDecimal: AteTableDecimalSeparator = "."
): AteTableColumnSummary {
  const kind = inferTableFilterKind(values);
  const counts = new Map<string, number>();
  values.forEach(raw => {
    const value = raw.trim();
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  const numbers =
    kind === "number"
      ? parseTableColumnNumbers(values, fallbackDecimal).filter(
          (value): value is number => value !== null
        )
      : [];
  return {
    kind,
    counts: Array.from(counts, ([value, count]) => ({ value, count })).sort((a, b) =>
      !a.value || !b.value
        ? Number(!a.value) - Number(!b.value)
        : collator.compare(normalizeTableText(a.value), normalizeTableText(b.value))
    ),
    min: numbers.length ? Math.min(...numbers) : null,
    max: numbers.length ? Math.max(...numbers) : null,
    decimal: kind === "number" ? columnDecimal(values, fallbackDecimal) : fallbackDecimal,
  };
}
