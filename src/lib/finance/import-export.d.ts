import { type Transaction } from "./model";
export declare function parseStatement(
  input: string,
  filename: string,
  accountId: string,
): Omit<Transaction, "id">[];
export declare function fingerprint(
  transaction: Omit<Transaction, "id">,
): string;
export declare function uniqueImports(
  existing: Transaction[],
  rows: Omit<Transaction, "id">[],
): Omit<
  {
    id: string;
    merchant: string;
    amount: number;
    date: string;
    type: "income" | "expense";
    category:
      | "Groceries"
      | "Dining"
      | "Rent"
      | "UPI/Transfers"
      | "Utilities"
      | "Mobile/DTH/Internet"
      | "Fuel"
      | "EMI/Loans"
      | "Insurance"
      | "Medical"
      | "Education/School fees"
      | "Domestic help"
      | "Entertainment"
      | "SIP/Mutual funds"
      | "Gold"
      | "Taxes"
      | "Donations/Gifts"
      | "Home"
      | "Food & dining"
      | "Transport"
      | "Subscriptions"
      | "Travel"
      | "Shopping"
      | "Health"
      | "Income"
      | "Other";
    accountId: string;
    note: string;
  },
  "id"
>[];
export declare function exportCsv(
  transactions: Transaction[],
  currency?: string,
): string;
export declare function download(
  content: string,
  filename: string,
  type: string,
): void;
