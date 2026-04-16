export type Category =
  | "FOOD"
  | "RENT"
  | "TRAVEL"
  | "SHOPPING"
  | "ENTERTAINMENT"
  | "SALARY"
  | "FREELANCE"
  | "INVESTMENTS"
  | "OTHER_INCOME";

export type ExpenseCategory =
  | "FOOD"
  | "RENT"
  | "TRAVEL"
  | "SHOPPING"
  | "ENTERTAINMENT";

export type RecurrenceFrequency = "MONTHLY";
export type TransactionType = "EXPENSE" | "INCOME";

export interface Transaction {
  id: string;
  amount: number;
  date: string;
  description: string;
  type: TransactionType;
  category: Category;
  recurringSeriesId: string | null;
  recurrenceFrequency: RecurrenceFrequency | null;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  category: ExpenseCategory;
  amount: number;
  month: number;
  year: number;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetWithSpent extends Budget {
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
}

export interface DashboardStats {
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
  netMonthlyCashflow: number;
  previousMonthExpenses: number;
  totalTransactions: number;
  incomeTransactionCount: number;
  expenseTransactionCount: number;
  budgetCount: number;
  recurringTemplateCount: number;
  categoryBreakdown: CategoryStat[];
  monthlyTrend: MonthlyTrend[];
  recentTransactions: Transaction[];
  budgetAlerts: BudgetAlert[];
  financialHealth: FinancialHealth;
  spendingAnomalies: SpendingAnomaly[];
}

export interface CategoryStat {
  category: ExpenseCategory;
  total: number;
  count: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  total: number;
  year: number;
  monthNum: number;
}

export interface BudgetAlert {
  category: ExpenseCategory;
  budgetAmount: number;
  spent: number;
  percentage: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface TransactionImportPreviewRow {
  rowNumber: number;
  amount: number;
  date: string;
  description: string;
  type: TransactionType;
  category: Category;
  recurrenceFrequency: RecurrenceFrequency | null;
  duplicate: boolean;
}

export interface TransactionImportResult {
  importedCount: number;
  duplicateCount: number;
  skipDuplicates: boolean;
  rows: TransactionImportPreviewRow[];
}

export interface FinancialHealth {
  score: number;
  label: "Needs Attention" | "Stable" | "Strong";
  summary: string;
  recommendations: string[];
}

export interface SpendingAnomaly {
  transactionId: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  reason: string;
}
