import type { Transaction, Account } from "./model";
/** Conservative suggestions: explicit CSV categories win; UPI itself is not a spending purpose. */
export declare function suggestCategory(
  narration: string,
  type: "income" | "expense",
): Transaction["category"];
export declare function upiReference(narration: string): string | null;
export declare function cardReminders(
  accounts: Pick<Account, "id" | "name" | "type" | "dueDate">[],
  today?: string,
): {
  id: string;
  name: string;
  dueDate: string;
  days: number;
}[];
