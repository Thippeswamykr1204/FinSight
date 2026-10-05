import { displayDate, money, localDate } from "./region";

export function reportShareText(
  label: string,
  totals: { income: number; expenses: number; saved: number },
  mode: string,
) {
  return [
    `FinSight · ${label}`,
    `${mode} · INR · ${displayDate(localDate())}`,
    `Income: ${money(totals.income)}`,
    `Expenses: ${money(totals.expenses)}`,
    `Net cash flow: ${money(totals.saved)}`,
    "Recorded transactions only; not financial or tax advice.",
  ].join("\n");
}
