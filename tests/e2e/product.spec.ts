import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("transaction lifecycle persists across reloads and exports filtered data", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/transactions");
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Merchant or source").fill("Lifecycle Bakery");
  await dialog.getByLabel("Amount (INR)", { exact: true }).fill("12.34");
  await dialog.getByRole("button", { name: "Save transaction" }).click();
  await page.getByPlaceholder("Search transactions").fill("Lifecycle Bakery");
  await expect(
    page.getByRole("row").filter({ hasText: "Lifecycle Bakery" }),
  ).toContainText("₹12.34");
  await page.reload();
  await page.getByPlaceholder("Search transactions").fill("Lifecycle Bakery");
  await page
    .getByRole("button", { name: "Lifecycle Bakery", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Amount (INR)", { exact: true })
    .fill("20.50");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Lifecycle Bakery" }),
  ).toContainText("₹20.50");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  expect((await download).suggestedFilename()).toBe(
    "finsight-transactions.csv",
  );
  await page.getByRole("button", { name: "Delete Lifecycle Bakery" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete transaction", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No matching money moves" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("CSV preview imports once and rejects repeat duplicates", async ({
  page,
}) => {
  await page.goto("/transactions?action=import");
  const dialog = page.getByRole("dialog");
  const file = {
    name: "bank.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "date,merchant,amount,type,category\n2026-10-01,Import Cafe,25.10,expense,Food & dining\n2026-10-02,Import Cafe,10.20,expense,Food & dining",
    ),
  };
  await dialog.getByLabel("Statement file").setInputFiles(file);
  await expect(dialog).toContainText("2 new · 0 duplicates skipped");
  await dialog.getByRole("button", { name: "Import 2 transactions" }).click();
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Statement file")
    .setInputFiles(file);
  await expect(page.getByRole("dialog")).toContainText(
    "0 new · 2 duplicates skipped",
  );
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Import transactions", exact: true }),
  ).toBeDisabled();
});

test("budget, goal, and account mutations survive reload", async ({ page }) => {
  await page.goto("/budgets");
  await page.getByRole("button", { name: "Add budget", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Category").selectOption("Health");
  await page.getByRole("dialog").getByLabel("Monthly limit (INR)").fill("250");
  await page.getByRole("button", { name: "Save budget" }).click();
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Health", exact: true }),
  ).toBeVisible();
  await page.goto("/goals");
  await page.getByRole("button", { name: "New goal" }).click();
  await page.getByLabel("Goal name").fill("Weekend adventure");
  await page.getByLabel("Target amount (INR)").fill("100");
  await page.getByLabel("Target date").fill("2028-12-01");
  await page.getByRole("button", { name: "Create goal", exact: true }).click();
  const goal = page
    .getByRole("article")
    .filter({ hasText: "Weekend adventure" });
  await goal.getByRole("button", { name: "Record contribution" }).click();
  await page.getByLabel("Contribution (INR)").fill("100");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Record contribution" })
    .click();
  await page.reload();
  await expect(
    page
      .getByRole("article")
      .filter({ hasText: "Weekend adventure" })
      .getByRole("button", { name: "Goal reached" }),
  ).toBeDisabled();
  await page.goto("/accounts");
  await page.getByRole("button", { name: "Add account", exact: true }).click();
  await page.getByLabel("Account name").fill("Travel savings");
  await page.getByLabel("Opening balance").fill("1500.25");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add account" })
    .click();
  await page.reload();
  await expect(
    page.getByRole("article").filter({ hasText: "Travel savings" }),
  ).toContainText("₹1,500.25");
});

test("onboarding, keyboard palette, preferences and local deletion", async ({
  page,
}) => {
  await page.goto("/onboarding");
  await page.getByLabel("What should we call you?").fill("Taylor");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Open my workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back, Taylor" }),
  ).toBeVisible();
  await page.keyboard.press("Control+k");
  await page.getByLabel("Search actions").fill("Settings");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/settings/);
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("button", { name: "Clear demo data", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Clear demo data", exact: true })
    .click();
  await page.goto("/transactions");
  await expect(
    page.getByRole("heading", { name: "No matching money moves" }),
  ).toBeVisible();
});

test("public routes, finance screens, and mobile navigation are accessible", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of [
    "/",
    "/pricing",
    "/features",
    "/faq",
    "/privacy",
    "/terms",
    "/login",
    "/dashboard",
    "/transactions",
    "/budgets",
    "/goals",
    "/insights",
    "/accounts",
    "/settings",
    "/onboarding",
  ]) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations,
      `${route}: ${JSON.stringify(results.violations.map((item) => ({ id: item.id, nodes: item.nodes.map((node) => node.target) })))}`,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      route,
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Accounts", exact: true })
    .click();
  await expect(page).toHaveURL(/accounts/);
  for (const route of [
    "/",
    "/dashboard",
    "/transactions",
    "/budgets",
    "/goals",
    "/settings",
  ]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      route,
    ).toBe(true);
  }
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS("color", "rgb(242, 247, 244)");
  const dark = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(dark.violations).toEqual([]);
});

test("health works and disabled legacy endpoints fail closed", async ({
  request,
}) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect((await health.json()).status).toBe("ok");
  for (const path of ["/api/transactions", "/api/budgets", "/api/dashboard"])
    expect((await request.get(path)).status()).toBe(503);
  const headers = (await request.get("/")).headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  const manifest = await request.get("/manifest.webmanifest");
  expect((await manifest.json()).display).toBe("standalone");
  for (const size of [192, 512]) {
    const icon = await request.get(`/app-icons/${size}`);
    expect(icon.status()).toBe(200);
    expect(icon.headers()["content-type"]).toContain("image/png");
  }
});

test("installed preview offers offline recovery without caching financial pages", async ({
  page,
  context,
}) => {
  test.skip(
    !process.env.E2E_PRODUCTION,
    "The service worker is intentionally production-only.",
  );
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  const cachedUrls = await page.evaluate(async () => {
    const names = await caches.keys();
    const entries = await Promise.all(
      names.map(async (name) =>
        (await (await caches.open(name)).keys()).map((request) => request.url),
      ),
    );
    return entries.flat();
  });
  expect(
    cachedUrls.some(
      (url) => url.includes("/api/") || url.includes("/dashboard"),
    ),
  ).toBe(false);
  await context.setOffline(true);
  await page.goto("/accounts");
  await expect(
    page.getByRole("heading", { name: "Your picture is still here." }),
  ).toBeVisible();
});
