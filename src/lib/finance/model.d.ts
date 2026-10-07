import { z } from "zod";
export { money, toPaise, localDate } from "./region";
export declare const categories: readonly [
  "Groceries",
  "Dining",
  "Rent",
  "UPI/Transfers",
  "Utilities",
  "Mobile/DTH/Internet",
  "Fuel",
  "EMI/Loans",
  "Insurance",
  "Medical",
  "Education/School fees",
  "Domestic help",
  "Entertainment",
  "SIP/Mutual funds",
  "Gold",
  "Taxes",
  "Donations/Gifts",
  "Home",
  "Food & dining",
  "Transport",
  "Subscriptions",
  "Travel",
  "Shopping",
  "Health",
  "Income",
  "Other",
];
export declare const categoryColors: Record<string, string>;
export declare const paise: z.ZodNumber;
export declare const isoDate: z.ZodString;
export declare const transactionSchema: z.ZodObject<
  {
    id: z.ZodString;
    merchant: z.ZodString;
    amount: z.ZodNumber;
    date: z.ZodString;
    type: z.ZodEnum<{
      income: "income";
      expense: "expense";
    }>;
    category: z.ZodEnum<{
      Groceries: "Groceries";
      Dining: "Dining";
      Rent: "Rent";
      "UPI/Transfers": "UPI/Transfers";
      Utilities: "Utilities";
      "Mobile/DTH/Internet": "Mobile/DTH/Internet";
      Fuel: "Fuel";
      "EMI/Loans": "EMI/Loans";
      Insurance: "Insurance";
      Medical: "Medical";
      "Education/School fees": "Education/School fees";
      "Domestic help": "Domestic help";
      Entertainment: "Entertainment";
      "SIP/Mutual funds": "SIP/Mutual funds";
      Gold: "Gold";
      Taxes: "Taxes";
      "Donations/Gifts": "Donations/Gifts";
      Home: "Home";
      "Food & dining": "Food & dining";
      Transport: "Transport";
      Subscriptions: "Subscriptions";
      Travel: "Travel";
      Shopping: "Shopping";
      Health: "Health";
      Income: "Income";
      Other: "Other";
    }>;
    accountId: z.ZodString;
    note: z.ZodDefault<z.ZodString>;
  },
  z.core.$strip
>;
export declare const budgetSchema: z.ZodObject<
  {
    id: z.ZodString;
    category: z.ZodEnum<{
      Groceries: "Groceries";
      Dining: "Dining";
      Rent: "Rent";
      "UPI/Transfers": "UPI/Transfers";
      Utilities: "Utilities";
      "Mobile/DTH/Internet": "Mobile/DTH/Internet";
      Fuel: "Fuel";
      "EMI/Loans": "EMI/Loans";
      Insurance: "Insurance";
      Medical: "Medical";
      "Education/School fees": "Education/School fees";
      "Domestic help": "Domestic help";
      Entertainment: "Entertainment";
      "SIP/Mutual funds": "SIP/Mutual funds";
      Gold: "Gold";
      Taxes: "Taxes";
      "Donations/Gifts": "Donations/Gifts";
      Home: "Home";
      "Food & dining": "Food & dining";
      Transport: "Transport";
      Subscriptions: "Subscriptions";
      Travel: "Travel";
      Shopping: "Shopping";
      Health: "Health";
      Income: "Income";
      Other: "Other";
    }> &
      z.ZodType<
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
        | "Other",
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
        | "Other",
        z.core.$ZodTypeInternals<
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
          | "Other",
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
          | "Other"
        >
      >;
    limit: z.ZodNumber;
    month: z.ZodString;
  },
  z.core.$strip
>;
export declare const goalSchema: z.ZodObject<
  {
    id: z.ZodString;
    name: z.ZodString;
    saved: z.ZodNumber;
    target: z.ZodNumber;
    due: z.ZodString;
  },
  z.core.$strip
>;
export declare const accountTypes: readonly [
  "Savings",
  "Current",
  "Credit Card",
  "UPI wallet",
  "FD",
  "RD",
  "PPF",
  "EPF",
  "NPS",
  "Gold",
  "Mutual funds",
  "Loan",
  "Cash",
  "Credit",
  "Investments",
];
export declare const accountSchema: z.ZodObject<
  {
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<{
      Gold: "Gold";
      Savings: "Savings";
      Current: "Current";
      "Credit Card": "Credit Card";
      "UPI wallet": "UPI wallet";
      FD: "FD";
      RD: "RD";
      PPF: "PPF";
      EPF: "EPF";
      NPS: "NPS";
      "Mutual funds": "Mutual funds";
      Loan: "Loan";
      Cash: "Cash";
      Credit: "Credit";
      Investments: "Investments";
    }>;
    dueDate: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    openingBalance: z.ZodNumber;
  },
  z.core.$strip
>;
export declare const stateSchema: z.ZodObject<
  {
    version: z.ZodLiteral<3>;
    currency: z.ZodLiteral<"INR">;
    timeZone: z.ZodLiteral<"Asia/Kolkata">;
    name: z.ZodString;
    transactions: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          merchant: z.ZodString;
          amount: z.ZodNumber;
          date: z.ZodString;
          type: z.ZodEnum<{
            income: "income";
            expense: "expense";
          }>;
          category: z.ZodEnum<{
            Groceries: "Groceries";
            Dining: "Dining";
            Rent: "Rent";
            "UPI/Transfers": "UPI/Transfers";
            Utilities: "Utilities";
            "Mobile/DTH/Internet": "Mobile/DTH/Internet";
            Fuel: "Fuel";
            "EMI/Loans": "EMI/Loans";
            Insurance: "Insurance";
            Medical: "Medical";
            "Education/School fees": "Education/School fees";
            "Domestic help": "Domestic help";
            Entertainment: "Entertainment";
            "SIP/Mutual funds": "SIP/Mutual funds";
            Gold: "Gold";
            Taxes: "Taxes";
            "Donations/Gifts": "Donations/Gifts";
            Home: "Home";
            "Food & dining": "Food & dining";
            Transport: "Transport";
            Subscriptions: "Subscriptions";
            Travel: "Travel";
            Shopping: "Shopping";
            Health: "Health";
            Income: "Income";
            Other: "Other";
          }>;
          accountId: z.ZodString;
          note: z.ZodDefault<z.ZodString>;
        },
        z.core.$strip
      >
    >;
    budgets: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          category: z.ZodEnum<{
            Groceries: "Groceries";
            Dining: "Dining";
            Rent: "Rent";
            "UPI/Transfers": "UPI/Transfers";
            Utilities: "Utilities";
            "Mobile/DTH/Internet": "Mobile/DTH/Internet";
            Fuel: "Fuel";
            "EMI/Loans": "EMI/Loans";
            Insurance: "Insurance";
            Medical: "Medical";
            "Education/School fees": "Education/School fees";
            "Domestic help": "Domestic help";
            Entertainment: "Entertainment";
            "SIP/Mutual funds": "SIP/Mutual funds";
            Gold: "Gold";
            Taxes: "Taxes";
            "Donations/Gifts": "Donations/Gifts";
            Home: "Home";
            "Food & dining": "Food & dining";
            Transport: "Transport";
            Subscriptions: "Subscriptions";
            Travel: "Travel";
            Shopping: "Shopping";
            Health: "Health";
            Income: "Income";
            Other: "Other";
          }> &
            z.ZodType<
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
              | "Other",
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
              | "Other",
              z.core.$ZodTypeInternals<
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
                | "Other",
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
                | "Other"
              >
            >;
          limit: z.ZodNumber;
          month: z.ZodString;
        },
        z.core.$strip
      >
    >;
    goals: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          name: z.ZodString;
          saved: z.ZodNumber;
          target: z.ZodNumber;
          due: z.ZodString;
        },
        z.core.$strip
      >
    >;
    accounts: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          name: z.ZodString;
          type: z.ZodEnum<{
            Gold: "Gold";
            Savings: "Savings";
            Current: "Current";
            "Credit Card": "Credit Card";
            "UPI wallet": "UPI wallet";
            FD: "FD";
            RD: "RD";
            PPF: "PPF";
            EPF: "EPF";
            NPS: "NPS";
            "Mutual funds": "Mutual funds";
            Loan: "Loan";
            Cash: "Cash";
            Credit: "Credit";
            Investments: "Investments";
          }>;
          dueDate: z.ZodDefault<z.ZodNullable<z.ZodString>>;
          openingBalance: z.ZodNumber;
        },
        z.core.$strip
      >
    >;
    onboarded: z.ZodBoolean;
    dismissed: z.ZodArray<z.ZodString>;
    theme: z.ZodEnum<{
      light: "light";
      dark: "dark";
    }>;
    locale: z.ZodLiteral<"en-IN">;
    notifications: z.ZodBoolean;
  },
  z.core.$strip
>;
export type Transaction = z.infer<typeof transactionSchema>;
export type Budget = z.infer<typeof budgetSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type Account = z.infer<typeof accountSchema>;
export type FinanceState = z.infer<typeof stateSchema>;
export declare const seasonalGoals: readonly [
  "Diwali buffer",
  "School fees",
  "Wedding season",
  "Family festival travel",
];
export declare function seedState(now?: Date): FinanceState;
export declare function accountBalance(
  state: FinanceState,
  accountId: string,
): number;
export declare function summarize(
  state: FinanceState,
  month?: string,
): {
  transactions: {
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
  }[];
  income: number;
  expenses: number;
  saved: number;
  savingRate: number;
  budgets: {
    spent: number;
    id: string;
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
      | "Other";
    limit: number;
    month: string;
  }[];
  balance: number;
  score: number;
  remaining: number;
};
export declare function cashFlow(
  state: FinanceState,
  months: number,
  now?: Date,
): {
  month: string;
  income: number;
  expenses: number;
  saved: number;
}[];
