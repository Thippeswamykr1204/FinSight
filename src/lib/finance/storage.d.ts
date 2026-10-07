export declare const demoStorageKey = "finsight-demo-v3";
export declare const legacyDemoStorageKey = "finsight-demo-v2";
export declare function restoreDemo(
  saved: string | null,
  legacy: string | null,
): {
  state: {
    version: 3;
    currency: "INR";
    timeZone: "Asia/Kolkata";
    name: string;
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
    budgets: {
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
    goals: {
      id: string;
      name: string;
      saved: number;
      target: number;
      due: string;
    }[];
    accounts: {
      id: string;
      name: string;
      type:
        | "Gold"
        | "Savings"
        | "Current"
        | "Credit Card"
        | "UPI wallet"
        | "FD"
        | "RD"
        | "PPF"
        | "EPF"
        | "NPS"
        | "Mutual funds"
        | "Loan"
        | "Cash"
        | "Credit"
        | "Investments";
      dueDate: string | null;
      openingBalance: number;
    }[];
    onboarded: boolean;
    dismissed: string[];
    theme: "light" | "dark";
    locale: "en-IN";
    notifications: boolean;
  };
  reseeded: boolean;
};
