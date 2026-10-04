import { NextRequest } from "next/server";
import { endOfMonth, isAfter } from "date-fns";
import { prisma } from "@/lib/prisma";
import { apiError, apiResponse } from "@/lib/utils";
import { invalidateCache } from "@/lib/redis";

function getMonthlyOccurrenceDate(anchorDate: Date, monthOffset: number) {
  const occurrence = new Date(anchorDate);
  occurrence.setMonth(occurrence.getMonth() + monthOffset, 1);
  const lastDay = endOfMonth(occurrence).getDate();
  occurrence.setDate(Math.min(anchorDate.getDate(), lastDay));
  occurrence.setHours(
    anchorDate.getHours(),
    anchorDate.getMinutes(),
    anchorDate.getSeconds(),
    anchorDate.getMilliseconds(),
  );
  return occurrence;
}

export async function POST(_: NextRequest) {
  try {
    const anchors = await prisma.transaction.findMany({
      where: {
        recurrenceFrequency: "MONTHLY",
        recurringSeriesId: { not: null },
      },
      orderBy: { date: "asc" },
    });

    const now = new Date();
    let createdCount = 0;

    for (const anchor of anchors) {
      if (!anchor.recurringSeriesId) continue;

      const existingOccurrences = await prisma.transaction.findMany({
        where: {
          recurringSeriesId: anchor.recurringSeriesId,
        },
        select: { date: true },
      });

      const existingMonths = new Set(
        existingOccurrences.map(
          (transaction) =>
            `${transaction.date.getFullYear()}-${transaction.date.getMonth() + 1}`,
        ),
      );

      let monthOffset = 1;
      while (true) {
        const occurrenceDate = getMonthlyOccurrenceDate(
          anchor.date,
          monthOffset,
        );
        if (isAfter(occurrenceDate, now)) break;

        const occurrenceKey = `${occurrenceDate.getFullYear()}-${occurrenceDate.getMonth() + 1}`;
        if (!existingMonths.has(occurrenceKey)) {
          await prisma.transaction.create({
            data: {
              amount: anchor.amount,
              date: occurrenceDate,
              description: anchor.description,
              type: anchor.type,
              category: anchor.category,
              recurringSeriesId: anchor.recurringSeriesId,
              recurrenceFrequency: null,
            },
          });
          existingMonths.add(occurrenceKey);
          createdCount += 1;
        }

        monthOffset += 1;
      }
    }

    await Promise.all([
      invalidateCache("transactions:*"),
      invalidateCache("dashboard:*"),
      invalidateCache("budgets:*"),
    ]);

    return apiResponse({ createdCount });
  } catch (error) {
    console.error("[TRANSACTIONS_RECURRING_GENERATE]", error);
    return apiError("Failed to generate recurring transactions", 500);
  }
}
