import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCsv } from "@/lib/csv";
import { invalidateCache } from "@/lib/redis";
import { transactionSchema } from "@/lib/validations";
import {
  apiError,
  apiResponse,
  CATEGORY_LABELS,
  TRANSACTION_TYPE_LABELS,
  getCurrentMonthYear,
} from "@/lib/utils";
import type { Category, TransactionImportPreviewRow, TransactionImportResult, TransactionType } from "@/types";

const categoryLookup = new Map<string, string>(
  Object.entries(CATEGORY_LABELS).flatMap(([key, label]) => [
    [key, key],
    [label.toUpperCase(), key],
    [label.replace(/\s*&\s*/g, " AND ").toUpperCase(), key],
  ])
);

const transactionTypeLookup = new Map<string, TransactionType>(
  Object.entries(TRANSACTION_TYPE_LABELS).flatMap(([key, label]) => [
    [key, key as TransactionType],
    [label.toUpperCase(), key as TransactionType],
  ])
);

const supportedHeaders = ["amount", "date", "description", "type", "category", "recurrencefrequency"];

function makeDuplicateKey(input: {
  amount: number;
  date: Date;
  description: string;
  type: TransactionType;
  category: Category;
}) {
  return [
    input.amount.toFixed(2),
    input.date.toISOString(),
    input.description.trim().toLowerCase(),
    input.type,
    input.category,
  ].join("|");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const csv = typeof body.csv === "string" ? body.csv.trim() : "";
    const dryRun = body.dryRun === true;
    const skipDuplicates = body.skipDuplicates !== false;

    if (!csv) {
      return apiError("CSV content is required", 400);
    }

    const rows = parseCsv(csv);
    if (rows.length < 2) {
      return apiError("CSV must include a header row and at least one transaction row", 400);
    }

    const headers = rows[0].map((header) => header.trim().toLowerCase());
    const headerIndex = new Map(headers.map((header, index) => [header, index]));
    const missingHeaders = ["amount", "date", "description", "category"].filter(
      (header) => !headerIndex.has(header)
    );

    if (missingHeaders.length > 0) {
      return apiError(
        `Missing required header${missingHeaders.length > 1 ? "s" : ""}: ${missingHeaders.join(", ")}`,
        400
      );
    }

    const unsupportedHeadersFound = headers.filter((header) => !supportedHeaders.includes(header));
    if (unsupportedHeadersFound.length > 0) {
      return apiError(
        `Unsupported header${unsupportedHeadersFound.length > 1 ? "s" : ""}: ${unsupportedHeadersFound.join(", ")}`,
        400
      );
    }

    const validationErrors: string[] = [];
    const parsedRows = rows.slice(1).map((row, index) => {
      const rawCategory = row[headerIndex.get("category")!] ?? "";
      const rawType = row[headerIndex.get("type") ?? -1] ?? "EXPENSE";
      const normalizedType = transactionTypeLookup.get(rawType.trim().toUpperCase()) ?? "EXPENSE";
      const normalizedCategory = categoryLookup.get(rawCategory.trim().toUpperCase());
      const recurrenceFrequency = row[headerIndex.get("recurrencefrequency") ?? -1] ?? "";

      const candidate = {
        amount: Number(row[headerIndex.get("amount")!] ?? ""),
        date: row[headerIndex.get("date")!] ?? "",
        description: (row[headerIndex.get("description")!] ?? "").trim(),
        type: normalizedType,
        category: normalizedCategory,
        recurrenceFrequency: recurrenceFrequency || undefined,
      };

      const parsed = transactionSchema.safeParse(candidate);
      if (!parsed.success) {
        const messages = Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .filter(Boolean)
          .join(", ");
        validationErrors.push(`Row ${index + 2}: ${messages || "Invalid data"}`);
        return null;
      }

      return {
        rowNumber: index + 2,
        ...parsed.data,
        date: new Date(parsed.data.date),
        recurringSeriesId: parsed.data.recurrenceFrequency ? randomUUID() : null,
      };
    });

    if (validationErrors.length > 0) {
      return apiError(validationErrors.slice(0, 5).join(" | "), 422);
    }

    const validTransactions = parsedRows.filter(
      (transaction): transaction is NonNullable<(typeof parsedRows)[number]> => Boolean(transaction)
    );

    if (validTransactions.length === 0) {
      return apiError("No valid transaction rows found in CSV", 400);
    }

    const transactionDates = validTransactions.map((transaction) => transaction.date);
    const earliestDate = new Date(Math.min(...transactionDates.map((date) => date.getTime())));
    const latestDate = new Date(Math.max(...transactionDates.map((date) => date.getTime())));

    const existingTransactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: earliestDate,
          lte: latestDate,
        },
      },
      select: {
        amount: true,
        date: true,
        description: true,
        type: true,
        category: true,
      },
    });

    const existingKeys = new Set(existingTransactions.map(makeDuplicateKey));
    const seenImportKeys = new Set<string>();

    const previewRows: TransactionImportPreviewRow[] = validTransactions.map((transaction) => {
      const duplicateKey = makeDuplicateKey({
        amount: transaction.amount,
        date: transaction.date,
        description: transaction.description,
        type: transaction.type,
        category: transaction.category,
      });
      const duplicate = existingKeys.has(duplicateKey) || seenImportKeys.has(duplicateKey);
      seenImportKeys.add(duplicateKey);

      return {
        rowNumber: transaction.rowNumber,
        amount: transaction.amount,
        date: transaction.date.toISOString(),
        description: transaction.description,
        type: transaction.type,
        category: transaction.category,
        recurrenceFrequency: transaction.recurrenceFrequency ?? null,
        duplicate,
      };
    });

    const transactionsToInsert = validTransactions.filter((transaction, index) => {
      if (!skipDuplicates) return true;
      return !previewRows[index].duplicate;
    });

    if (!dryRun && transactionsToInsert.length > 0) {
      await prisma.transaction.createMany({
        data: transactionsToInsert.map(({ rowNumber, ...transaction }) => transaction),
      });

      await Promise.all([
        invalidateCache("transactions:*"),
        invalidateCache("dashboard:*"),
        invalidateCache("budgets:*"),
      ]);

      const { month, year } = getCurrentMonthYear();
      await invalidateCache(`budgets:${month}:${year}`);
    }

    const result: TransactionImportResult = {
      importedCount: transactionsToInsert.length,
      duplicateCount: previewRows.filter((row) => row.duplicate).length,
      skipDuplicates,
      rows: previewRows.slice(0, 8),
    };

    return apiResponse(result, dryRun ? 200 : 201);
  } catch (error) {
    console.error("[TRANSACTIONS_IMPORT_POST]", error);
    return apiError("Failed to import transactions", 500);
  }
}
