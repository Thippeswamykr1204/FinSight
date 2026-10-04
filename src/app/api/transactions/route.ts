import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { transactionSchema, paginationSchema } from "@/lib/validations";
import { apiResponse, apiError, getCurrentMonthYear } from "@/lib/utils";
import { getCache, setCache, invalidateCache, CACHE_TTL } from "@/lib/redis";
import type { PaginatedResponse, Transaction } from "@/types";

function serializeTransaction(transaction: {
  id: string;
  amount: number;
  date: Date;
  description: string;
  type: Transaction["type"];
  category: Transaction["category"];
  recurringSeriesId: string | null;
  recurrenceFrequency: Transaction["recurrenceFrequency"];
  createdAt: Date;
  updatedAt: Date;
}): Transaction {
  return {
    ...transaction,
    date: transaction.date.toISOString(),
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = paginationSchema.safeParse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      type: searchParams.get("type"),
      category: searchParams.get("category"),
      search: searchParams.get("search"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
    });

    if (!parsed.success) {
      return apiError("Invalid query parameters", 400);
    }

    const { page, limit, type, category, search, startDate, endDate } =
      parsed.data;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {
      ...(type && { type }),
      ...(category && { category }),
      ...(search
        ? {
            description: {
              contains: search,
              mode: "insensitive",
            },
          }
        : {}),
      ...(startDate || endDate
        ? {
            date: {
              ...(startDate && { gte: startOfDay(startDate) }),
              ...(endDate && { lte: endOfDay(endDate) }),
            },
          }
        : {}),
    };

    const cacheKey = `transactions:${JSON.stringify({
      page,
      limit,
      type,
      category,
      search,
      startDate,
      endDate,
    })}`;
    const cached = await getCache<PaginatedResponse<Transaction>>(cacheKey);
    if (cached) return apiResponse(cached);

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    const result: PaginatedResponse<Transaction> = {
      data: transactions.map(serializeTransaction),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    await setCache(cacheKey, result, CACHE_TTL.TRANSACTIONS);
    return apiResponse(result);
  } catch (error) {
    console.error("[TRANSACTIONS_GET]", error);
    return apiError("Failed to fetch transactions", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = transactionSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >;
      return apiError("Validation failed", 422, errors);
    }

    const transaction = await prisma.transaction.create({
      data: {
        ...parsed.data,
        date: new Date(parsed.data.date),
        recurringSeriesId: parsed.data.recurrenceFrequency
          ? randomUUID()
          : null,
      },
    });

    // Invalidate related caches
    await Promise.all([
      invalidateCache("transactions:*"),
      invalidateCache("dashboard:*"),
    ]);

    const { month, year } = getCurrentMonthYear();
    await invalidateCache(`budgets:${month}:${year}`);

    return apiResponse(serializeTransaction(transaction), 201);
  } catch (error) {
    console.error("[TRANSACTIONS_POST]", error);
    return apiError("Failed to create transaction", 500);
  }
}
