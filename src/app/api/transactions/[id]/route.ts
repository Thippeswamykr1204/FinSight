import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { transactionUpdateSchema } from "@/lib/validations";
import { apiResponse, apiError } from "@/lib/utils";
import { invalidateCache } from "@/lib/redis";
import type { Transaction } from "@/types";

type RouteParams = { params: Promise<{ id: string }> };

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

export async function GET(_: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) return apiError("Transaction not found", 404);

    return apiResponse(serializeTransaction(transaction));
  } catch (error) {
    console.error("[TRANSACTION_GET]", error);
    return apiError("Failed to fetch transaction", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const existing = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!existing) return apiError("Transaction not found", 404);

    const body = await request.json();
    const parsed = transactionUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >;
      return apiError("Validation failed", 422, errors);
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(parsed.data.date && { date: new Date(parsed.data.date) }),
        ...(parsed.data.recurrenceFrequency !== undefined && {
          recurringSeriesId: parsed.data.recurrenceFrequency
            ? (existing.recurringSeriesId ?? randomUUID())
            : null,
        }),
      },
    });

    await Promise.all([
      invalidateCache("transactions:*"),
      invalidateCache("dashboard:*"),
      invalidateCache("budgets:*"),
    ]);

    return apiResponse(serializeTransaction(updated));
  } catch (error) {
    console.error("[TRANSACTION_PATCH]", error);
    return apiError("Failed to update transaction", 500);
  }
}

export async function DELETE(_: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const existing = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!existing) return apiError("Transaction not found", 404);

    await prisma.transaction.delete({ where: { id } });

    await Promise.all([
      invalidateCache("transactions:*"),
      invalidateCache("dashboard:*"),
      invalidateCache("budgets:*"),
    ]);

    return apiResponse({ deleted: true });
  } catch (error) {
    console.error("[TRANSACTION_DELETE]", error);
    return apiError("Failed to delete transaction", 500);
  }
}
