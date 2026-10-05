import type { Transaction, Account } from "./model";
import { localDate } from "./region";

const rules: Array<[RegExp, Transaction["category"]]> = [
  [/\b(bigbasket|blinkit|dmart|zepto|nandini)\b/i, "Groceries"],
  [/\b(swiggy|zomato)\b/i, "Dining"],
  [/\b(irctc|makemytrip|goibibo|indigo)\b/i, "Travel"],
  [
    /\b(jio|airtel|bsnl|tatasky|tata play|act fibernet)\b/i,
    "Mobile/DTH/Internet",
  ],
  [
    /\b(bescom|mescom|tangedco|mseb|mahanagar gas|indraprastha gas)\b/i,
    "Utilities",
  ],
  [/\b(indian oil|iocl|bpcl|hpcl|bharat petroleum)\b/i, "Fuel"],
  [/\b(uber|ola|rapido|bmrcl|metro)\b/i, "Transport"],
  [/\b(apollo pharmacy|1mg|pharmeasy)\b/i, "Medical"],
  [/\b(netflix|spotify|bookmyshow|pvr)\b/i, "Entertainment"],
];

/** Conservative suggestions: explicit CSV categories win; UPI itself is not a spending purpose. */
export function suggestCategory(
  narration: string,
  type: "income" | "expense",
): Transaction["category"] {
  if (type === "income") return "Income";
  return rules.find(([pattern]) => pattern.test(narration))?.[1] ?? "Other";
}

export function upiReference(narration: string) {
  return (
    /\bUPI(?:[\s/-]+(?:DR|CR))?[\s/-]+(\d{12})\b/i.exec(narration)?.[1] ?? null
  );
}

export function cardReminders(
  accounts: Pick<Account, "id" | "name" | "type" | "dueDate">[],
  today = localDate(),
) {
  return accounts
    .filter(
      (account) =>
        ["Credit Card", "Credit"].includes(account.type) && account.dueDate,
    )
    .map((account) => ({
      id: `card-${account.id}-${account.dueDate}`,
      name: account.name,
      dueDate: account.dueDate!,
      days: Math.round(
        (Date.parse(account.dueDate!) - Date.parse(today)) / 86_400_000,
      ),
    }))
    .filter((reminder) => reminder.days <= 7);
}
