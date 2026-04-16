import { PrismaClient, Category } from "@prisma/client";
import { subDays, subMonths, startOfMonth, addDays } from "date-fns";

const prisma = new PrismaClient();

const CATEGORIES: Category[] = [
  "FOOD",
  "RENT",
  "TRAVEL",
  "SHOPPING",
  "ENTERTAINMENT",
];

const SAMPLE_TRANSACTIONS: Array<{
  description: string;
  category: Category;
  type?: "EXPENSE" | "INCOME";
  amountRange: [number, number];
}> = [
  { description: "Swiggy – dinner", category: "FOOD", amountRange: [200, 600] },
  { description: "Zomato order", category: "FOOD", amountRange: [150, 500] },
  { description: "Grocery – BigBasket", category: "FOOD", amountRange: [800, 2500] },
  { description: "Café Coffee Day", category: "FOOD", amountRange: [100, 350] },
  { description: "Monthly rent", category: "RENT", amountRange: [15000, 25000] },
  { description: "Society maintenance", category: "RENT", amountRange: [1000, 3000] },
  { description: "Electricity bill", category: "RENT", amountRange: [500, 1800] },
  { description: "Internet bill", category: "RENT", amountRange: [700, 1200] },
  { description: "Uber ride", category: "TRAVEL", amountRange: [80, 400] },
  { description: "Rapido bike", category: "TRAVEL", amountRange: [30, 150] },
  { description: "Flight – Bangalore to Mumbai", category: "TRAVEL", amountRange: [3500, 8000] },
  { description: "Petrol refill", category: "TRAVEL", amountRange: [500, 2000] },
  { description: "Amazon order", category: "SHOPPING", amountRange: [300, 5000] },
  { description: "Myntra clothes", category: "SHOPPING", amountRange: [500, 3000] },
  { description: "Nykaa skincare", category: "SHOPPING", amountRange: [400, 2000] },
  { description: "Electronics – Croma", category: "SHOPPING", amountRange: [2000, 15000] },
  { description: "Netflix subscription", category: "ENTERTAINMENT", amountRange: [149, 499] },
  { description: "Spotify premium", category: "ENTERTAINMENT", amountRange: [59, 119] },
  { description: "Movie – PVR", category: "ENTERTAINMENT", amountRange: [200, 600] },
  { description: "BookMyShow event", category: "ENTERTAINMENT", amountRange: [300, 1500] },
  { description: "Monthly salary", category: "SALARY", type: "INCOME", amountRange: [65000, 90000] },
  { description: "Freelance project payment", category: "FREELANCE", type: "INCOME", amountRange: [8000, 25000] },
  { description: "Mutual fund payout", category: "INVESTMENTS", type: "INCOME", amountRange: [1000, 5000] },
];

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing
  await prisma.budget.deleteMany();
  await prisma.transaction.deleteMany();
  console.log("🗑️  Cleared existing data");

  const now = new Date();
  const transactions = [];

  // Generate transactions for last 6 months
  for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
    const monthStart = startOfMonth(subMonths(now, monthOffset));
    const monthEnd =
      monthOffset === 0 ? now : addDays(startOfMonth(subMonths(now, monthOffset - 1)), -1);

    // 8–18 transactions per month
    const count = Math.floor(Math.random() * 10) + 8;

    for (let i = 0; i < count; i++) {
      const sample =
        SAMPLE_TRANSACTIONS[Math.floor(Math.random() * SAMPLE_TRANSACTIONS.length)];
      transactions.push({
        description: sample.description,
        type: sample.type ?? "EXPENSE",
        category: sample.category,
        amount: randomBetween(...sample.amountRange),
        date: randomDate(monthStart, monthEnd),
      });
    }
  }

  await prisma.transaction.createMany({ data: transactions });
  console.log(`✅ Created ${transactions.length} transactions`);

  // Create budgets for current month
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const budgets = [
    { category: "FOOD" as Category, amount: 8000 },
    { category: "RENT" as Category, amount: 25000 },
    { category: "TRAVEL" as Category, amount: 5000 },
    { category: "SHOPPING" as Category, amount: 10000 },
    { category: "ENTERTAINMENT" as Category, amount: 2000 },
  ];

  for (const budget of budgets) {
    await prisma.budget.upsert({
      where: {
        category_month_year: {
          category: budget.category,
          month: currentMonth,
          year: currentYear,
        },
      },
      update: { amount: budget.amount },
      create: { ...budget, month: currentMonth, year: currentYear },
    });
  }

  console.log("✅ Created 5 budgets for current month");
  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
