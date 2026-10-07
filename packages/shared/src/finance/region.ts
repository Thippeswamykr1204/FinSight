/** The ledger's regional contract. Formatting never performs currency conversion. */
export const region = {
  currency: "INR",
  locale: "en-IN",
  timeZone: "Asia/Kolkata",
  minorUnit: "paise",
  scale: 100,
  maxMinor: 100_000_000_000,
} as const;

export function money(
  value: number,
  locale: string = region.locale,
  currency: string = region.currency,
) {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    value / region.scale,
  );
}

/** Minor units in; one decimal lakh/crore out. Full values remain available in the UI. */
export function compactMoney(
  value: number,
  currency: string = region.currency,
) {
  const rupees = Math.abs(value) / region.scale;
  const rounded = Math.round(rupees / 10_000) * 10_000;
  const scale =
    rounded >= 10_000_000 ? 10_000_000 : rounded >= 100_000 ? 100_000 : 0;
  if (!scale) return money(value, region.locale, currency).replace(/\.00$/, "");
  const symbol = currency === region.currency ? "₹" : `${currency} `;
  return `${value < 0 ? "−" : ""}${symbol}${(rupees / scale).toFixed(1)}${scale === 100_000 ? "L" : "Cr"}`;
}

/** Decimal strings only: validate Indian grouping before removing commas, then use BigInt. */
export function parsePaise(
  value: string,
  { round = false, allowZero = false } = {},
) {
  const input = value.trim().replace(/^₹\s*/, "");
  if (
    !/^(?:\d+|\d{1,3}(?:,\d{3})|\d{1,2}(?:,\d{2})+,\d{3})(?:\.\d+)?$/.test(
      input,
    )
  )
    throw new Error(
      "Enter rupees using digits, optional Indian commas, and a decimal point.",
    );
  const [whole, fraction = ""] = input.replaceAll(",", "").split(".");
  if (!round && fraction.length > 2)
    throw new Error("Use at most two decimal places (paise).");
  const result =
    BigInt(whole) * 100n +
    BigInt(fraction.slice(0, 2).padEnd(2, "0")) +
    (round && Number(fraction[2] ?? 0) >= 5 ? 1n : 0n);
  if (result > BigInt(region.maxMinor) || (!allowZero && result === 0n))
    throw new Error("Enter a positive amount within the workspace limit.");
  return Number(result);
}

export const toPaise = (value: string) => parsePaise(value);

export function localDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: region.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function displayDate(value: string | Date) {
  const iso =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? value
      : localDate(new Date(value));
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

export function financialYear(value: string | Date = new Date()) {
  const date = typeof value === "string" ? value : localDate(value);
  const year =
    Number(date.slice(0, 4)) - (Number(date.slice(5, 7)) < 4 ? 1 : 0);
  return {
    year,
    label: `FY ${year}–${String(year + 1).slice(2)}`,
    start: `${year}-04-01`,
    end: `${year + 1}-03-31`,
    months: Array.from(
      { length: 12 },
      (_, index) =>
        `${year + (index >= 9 ? 1 : 0)}-${String(((index + 3) % 12) + 1).padStart(2, "0")}`,
    ),
  };
}

export function periodTotals<
  T extends { date: string; type: string; amount: number },
>(entries: T[], start: string, end: string) {
  const rows = entries.filter(
    (entry) =>
      entry.date.slice(0, 10) >= start && entry.date.slice(0, 10) <= end,
  );
  const income = rows
    .filter((entry) => entry.type === "income")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const expenses = rows
    .filter((entry) => entry.type === "expense")
    .reduce((sum, entry) => sum + entry.amount, 0);
  return { income, expenses, saved: income - expenses };
}
