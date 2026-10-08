export function nextOccurrence(
  date: string,
  frequency: "daily" | "weekly" | "monthly" | "yearly",
  anchorDay = Number(date.slice(8, 10)),
  anchorMonth = Number(date.slice(5, 7)),
) {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7)) - 1;
  const day = Number(date.slice(8, 10));
  if (frequency === "daily" || frequency === "weekly")
    return new Date(
      Date.UTC(year, month, day + (frequency === "daily" ? 1 : 7)),
    )
      .toISOString()
      .slice(0, 10);
  const targetYear = frequency === "yearly" ? year + 1 : year;
  const targetMonth = frequency === "yearly" ? anchorMonth - 1 : month + 1;
  const lastDay = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(targetYear, targetMonth, Math.min(anchorDay, lastDay)),
  )
    .toISOString()
    .slice(0, 10);
}
