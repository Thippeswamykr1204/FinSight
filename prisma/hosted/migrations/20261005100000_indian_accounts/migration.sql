ALTER TABLE "v2_financial_accounts" ADD COLUMN "dueDate" DATE;
ALTER TABLE "v2_financial_accounts" DROP CONSTRAINT "account_type";
ALTER TABLE "v2_financial_accounts" ADD CONSTRAINT "account_type" CHECK ("type" IN ('Savings', 'Current', 'Credit Card', 'UPI wallet', 'FD', 'RD', 'PPF', 'EPF', 'NPS', 'Gold', 'Mutual funds', 'Loan', 'Cash', 'Credit', 'Investments'));
