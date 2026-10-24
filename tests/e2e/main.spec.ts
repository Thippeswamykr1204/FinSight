import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

test("a new user can create a workspace and record a money move", async ({
  page,
}) => {
  const email = `browser-${randomUUID()}@example.test`;
  await page.goto("/register");
  await page.getByLabel("Your name").fill("Browser Tester");
  await page.getByLabel("Email address").fill(email);
  const password = page.getByLabel("Password", { exact: true });
  await expect(password).toHaveCount(1);
  await password.fill("Correct horse battery staple 456!");
  await password.focus();
  await password.press("End");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toBeFocused();
  await expect
    .poll(() =>
      page
        .locator("#password")
        .evaluate((input) => (input as HTMLInputElement).selectionStart),
    )
    .toBe("Correct horse battery staple 456!".length);
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.getByLabel("Workspace name").fill("Browser money");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page.getByLabel("Current workspace")).toContainText(
    "Browser money",
  );
  await page.goto("/budgets");
  await page.getByRole("button", { name: "Add budget" }).click();
  await page.getByLabel("Monthly limit (INR)").fill("1000");
  await page.getByRole("button", { name: "Save budget" }).click();
  await expect(page.getByText("Groceries")).toBeVisible();
  await page.goto("/accounts");
  await page.getByRole("button", { name: "Add account" }).click();
  await page.getByLabel("Account name").fill("Primary savings");
  await page.getByLabel("Opening balance (INR)").fill("1000");
  await page.getByRole("button", { name: "Save account" }).click();
  await expect(page.getByText("Primary savings")).toBeVisible();
  await page.goto("/transactions?new=1");
  await page.getByLabel("Merchant or source").fill("Neighborhood market");
  const amount = page.getByRole("dialog").getByLabel("Amount (INR)");
  await expect(amount).toHaveCount(1);
  await amount.fill("125.50");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.getByText("Neighborhood market")).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText("₹874.50")).toBeVisible();
  const profileButton = page.getByRole("button", { name: "Open profile menu" });
  await profileButton.click();
  const profileMenu = page.getByRole("menu", { name: "Profile menu" });
  await expect(profileMenu).toContainText("Browser Tester");
  await expect(profileMenu).toContainText(email);
  await expect(profileMenu).toContainText("owner");
  await page.keyboard.press("Escape");
  await expect(profileMenu).toHaveCount(0);
  await expect(profileButton).toBeFocused();
  await profileButton.click();
  await page.mouse.click(500, 120);
  await expect(profileMenu).toHaveCount(0);
  await expect(profileButton).toBeFocused();
  await profileButton.click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await expect(page).toHaveURL(/settings/);
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/login/);
});

test("failed sign out clears the local session from the mobile menu", async ({
  page,
}) => {
  const suffix = Date.now();
  const email = `mobile-${suffix}-${randomUUID()}@example.test`;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/register");
  await page.getByLabel("Your name").fill("Mobile Tester");
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Correct horse battery staple 456!");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.getByLabel("Workspace name").fill("Mobile money");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page.getByLabel("Current workspace")).toContainText(
    "Mobile money",
  );
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Open profile menu" }).click();
  const profileMenu = page.getByRole("menu", { name: "Profile menu" });
  await expect(profileMenu).toContainText("Mobile Tester");
  await page.route("**/api/auth/logout", async (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: { message: "Sign out service unavailable." },
      }),
    }),
  );
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/login/);
  await expect(page.getByRole("status")).toContainText(
    "signed out on this device",
  );
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/login/);
});
