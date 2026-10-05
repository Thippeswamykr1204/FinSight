import { categories, isoDate, toPaise, type Transaction } from "./model";
import { region, displayDate } from "./region";

function csvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  const text = input.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index++;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" && !quoted) {
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (quoted) throw new Error("A quoted field is missing its closing quote.");
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

export function parseStatement(
  input: string,
  filename: string,
  accountId: string,
): Omit<Transaction, "id">[] {
  if (input.length > 2_000_000)
    throw new Error("Choose a statement smaller than 2 MB.");
  let records: Record<string, string>[];
  if (/\.ofx$/i.test(filename)) {
    const currency = input.match(/<CURDEF>([^<\r\n]+)/i)?.[1].trim();
    if (currency && currency !== region.currency)
      throw new Error(
        "Only INR statements can be imported. Convert externally with a documented exchange rate first.",
      );
    const blocks =
      input.match(
        /<STMTTRN>[\s\S]*?(?:<\/STMTTRN>|(?=<STMTTRN>|<\/BANKTRANLIST>))/gi,
      ) ?? [];
    const get = (block: string, tag: string) =>
      block.match(new RegExp(`<${tag}>([^<\r\n]+)`, "i"))?.[1].trim() ?? "";
    records = blocks.map((block) => {
      const date = get(block, "DTPOSTED").slice(0, 8);
      return {
        date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`,
        merchant: get(block, "NAME") || get(block, "MEMO"),
        amount: get(block, "TRNAMT"),
        category: "Other",
        type: get(block, "TRNAMT").startsWith("-") ? "expense" : "income",
      };
    });
  } else {
    const [header, ...rows] = csvRows(input);
    if (!header) throw new Error("This statement is empty.");
    const keys = header.map((value) => value.trim().toLowerCase());
    if (
      !["date", "amount"].every((key) => keys.includes(key)) ||
      !keys.some((key) => ["merchant", "description"].includes(key))
    )
      throw new Error(
        "CSV needs date, merchant (or description), and amount columns. Optional: type, category, note.",
      );
    records = rows.map((row) =>
      Object.fromEntries(
        keys.map((key, index) => [key, row[index]?.trim() ?? ""]),
      ),
    );
  }
  if (!records.length)
    throw new Error("No transactions found in this statement.");
  if (records.length > 1000)
    throw new Error("Import at most 1,000 rows at a time.");
  return records.map((record, index) => {
    const type =
      record.type?.toLowerCase() ||
      (record.amount.startsWith("-") ? "expense" : "income");
    try {
      if (record.currency && record.currency.toUpperCase() !== region.currency)
        throw new Error(
          "Statement currency must be INR; no automatic conversion is performed",
        );
      if (type !== "income" && type !== "expense")
        throw new Error("Type must be income or expense");
      const amount = toPaise(record.amount.replace(/^[+-]/, ""));
      const merchant = (record.merchant || record.description || "").trim();
      if (!merchant || merchant.length > 120)
        throw new Error("Merchant must contain 1–120 characters");
      if ((record.note ?? "").length > 500)
        throw new Error("Note exceeds 500 characters");
      const category =
        categories.find(
          (category) =>
            category.toLowerCase() === record.category?.toLowerCase(),
        ) ?? (type === "income" ? "Income" : "Other");
      return {
        merchant,
        amount,
        date: isoDate.parse(
          record.date.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, "$3-$2-$1"),
        ),
        type,
        category,
        accountId,
        note: record.note ?? "Imported statement",
      };
    } catch (error) {
      throw new Error(
        `Row ${index + 2}: ${error instanceof Error ? error.message : "Invalid value"}`,
      );
    }
  });
}

export function fingerprint(transaction: Omit<Transaction, "id">) {
  return JSON.stringify([
    transaction.accountId,
    transaction.date,
    transaction.amount,
    transaction.type,
    transaction.merchant.toLowerCase().trim(),
  ]);
}
export function uniqueImports(
  existing: Transaction[],
  rows: Omit<Transaction, "id">[],
) {
  const seen = new Set(existing.map(fingerprint));
  return rows.filter((row) => {
    const key = fingerprint(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
export function exportCsv(
  transactions: Transaction[],
  currency: string = region.currency,
) {
  const escape = (value: string) =>
    `"${(/^(?:\s*[=+@-]|[\t\r\n])/.test(value) ? `'${value}` : value).replace(/"/g, '""')}"`;
  return [
    "date,merchant,amount,type,category,note,currency",
    ...transactions.map((transaction) =>
      [
        displayDate(transaction.date),
        transaction.merchant,
        (transaction.amount / 100).toFixed(2),
        transaction.type,
        transaction.category,
        transaction.note,
        currency,
      ]
        .map(escape)
        .join(","),
    ),
  ].join("\r\n");
}
export function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
