import { randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

test.use({ permissions: ["clipboard-read", "clipboard-write"] });
async function mailLink(page: Page, email: string, subject: string) {
  const base = process.env.E2E_MAILPIT_URL!;
  let message: { ID: string } | undefined;
  await expect
    .poll(
      async () => {
        const response = await page.request.get(`${base}/api/v1/messages`);
        const data = await response.json();
        message = data.messages.find(
          (item: { ID: string; Subject: string; To: { Address: string }[] }) =>
            item.Subject.includes(subject) &&
            item.To.some((to) => to.Address === email),
        );
        return Boolean(message);
      },
      { timeout: 40_000, intervals: [500, 1000] },
    )
    .toBe(true);
  const response = await page.request.get(
    `${base}/api/v1/message/${message!.ID}`,
  );
  const detail = await response.json();
  const link = String(detail.Text).match(
    /https?:\/\/[^\s]+\/api\/identity\/[^\s]+/,
  );
  expect(link).toBeTruthy();
  return link![0];
}
async function signup(page: Page, name: string) {
  const email = `e2e-${randomBytes(8).toString("hex")}@example.test`;
  const password = randomBytes(24).toString("base64url");
  await page.goto("/sign-up");
  await page.getByLabel("Your name", { exact: true }).fill(name);
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByLabel("Accept privacy notice and terms").check();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Check your inbox");
  await page.goto(await mailLink(page, email, "Verify your FinSight email"));
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  return { email, password };
}
test("real verified account, finance persistence, Free billing, export and deletion", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await signup(page, "Taylor");
  await page.getByLabel("Workspace name").fill("Finance flow");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Account name", { exact: true })
    .fill("Primary account");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Open my workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.locator("body")).toContainText("₹0.00");
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  await page.goto("/budgets");
  await page.getByRole("button", { name: "Add budget", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Category").selectOption("Health");
  await page.getByRole("dialog").getByLabel("Monthly limit (INR)").fill("50");
  await page.getByRole("button", { name: "Save budget", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Health", exact: true }),
  ).toBeVisible();
  await page.goto("/transactions?action=add");
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Merchant or source").fill("Clinic payment");
  await dialog.getByLabel("Amount (INR)", { exact: true }).fill("75");
  await dialog.getByLabel("Category").selectOption("Health");
  await dialog.getByRole("button", { name: "Save transaction" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Clinic payment" }),
  ).toContainText("₹75.00");
  await page.goto("/transactions");
  await expect(
    page.getByRole("row").filter({ hasText: "Clinic payment" }),
  ).toBeVisible();
  await page.goto("/budgets");
  await expect(page.locator("body")).toContainText("over budget");
  await page.goto("/transactions?action=import");
  const today = new Date().toLocaleDateString("en-GB", {
    timeZone: "Asia/Kolkata",
  });
  await page.getByLabel("Statement file").setInputFiles({
    name: "statement.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      `date,merchant,amount,type,category,currency\n${today},Statement payment,10.25,expense,Other,INR`,
    ),
  });
  await expect(page.getByRole("dialog")).toContainText("1 new");
  await page.getByRole("button", { name: "Import 1 transactions" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Statement payment" }),
  ).toBeVisible();
  await page.goto("/goals");
  await page.getByRole("button", { name: "New goal" }).click();
  await page.getByLabel("Goal name").fill("Emergency reserve");
  await page.getByLabel("Target amount (INR)").fill("100");
  await page.getByLabel("Target date").fill("2030-10-07");
  await page.getByRole("button", { name: "Create goal", exact: true }).click();
  const goal = page
    .getByRole("article")
    .filter({ hasText: "Emergency reserve" });
  await expect(goal).toBeVisible();
  await goal.getByRole("button", { name: "Record contribution" }).click();
  await page.getByLabel("Contribution (INR)").fill("25");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Record contribution" })
    .click();
  await expect(goal).toContainText("₹25.00");
  await page.goto("/insights");
  await page.getByRole("button", { name: "Share report", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Pro or Business");
  await page.goto("/billing");
  await expect(
    page.getByRole("heading", { name: "A plan for your next chapter." }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "This installation offers Free",
  );
  await expect(
    page.getByRole("button", { name: "Save billing details" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Subscribe to Pro" }),
  ).toHaveCount(0);
  await page.goto("/settings");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export workspace data" }).click();
  expect((await downloaded).suggestedFilename()).toBe(
    "finsight-workspace.json",
  );
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("button", { name: "Delete workspace", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Type DELETE Finance flow")
    .fill("DELETE Finance flow");
  await page
    .getByRole("button", { name: "Permanently delete workspace" })
    .click();
  await expect(page.getByRole("status")).toContainText("Workspace deleted");
  await page.goto("/security");
  await page
    .getByRole("button", { name: "Delete my account", exact: true })
    .click();
  await page.getByLabel("Type DELETE MY ACCOUNT").fill("DELETE MY ACCOUNT");
  await page
    .getByRole("button", { name: "Permanently delete account" })
    .click();
  await expect(page).toHaveURL(/\/sign-in/);
  expect(errors).toEqual([]);
});
test("password reset revokes sessions and one-time mail links authenticate a real account", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const { email, password } = await signup(page, "Security account");
  const isolated = await browser.newContext();
  const reset = await isolated.newPage();
  await reset.goto(`${process.env.E2E_BASE_URL}/auth/reset`);
  await reset.getByLabel("Email address", { exact: true }).fill(email);
  await reset.getByRole("button", { name: "Send reset email" }).click();
  await expect(reset.getByRole("status")).toContainText("password reset email");
  await reset.goto(
    await mailLink(reset, email, "Reset your FinSight password"),
  );
  const replacement = randomBytes(24).toString("base64url");
  await reset.getByLabel("New password").fill(replacement);
  await reset.getByRole("button", { name: "Save new password" }).click();
  await expect(reset.getByRole("status")).toContainText("Password changed");
  await page.goto("/security");
  await expect(page).toHaveURL(/\/sign-in/);
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Magic link", exact: true }).click();
  await page
    .getByRole("button", { name: "Send sign-in link", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "single-use sign-in link",
  );
  const link = await mailLink(page, email, "Your FinSight sign-in link");
  await page.goto(link);
  await expect(page).toHaveURL(/\/onboarding/);
  await reset.goto(link);
  await expect(reset).toHaveURL(/\/sign-in/);
  await isolated.close();
});
