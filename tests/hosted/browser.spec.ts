import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  clientIP,
  email,
  headers,
  latestMail,
  origin,
  password,
  register,
} from "./helpers";

test("a real account verifies email, creates a workspace, and persists financial records", async ({
  page,
}) => {
  test.setTimeout(120000);
  const address = email();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setExtraHTTPHeaders({ "x-test-forwarded-ip": clientIP() });
  await page.goto("/sign-up");
  await page.getByLabel("Your name").fill("Morgan");
  await page.getByLabel("Email address").fill(address);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByLabel("Accept privacy notice and terms").check();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Check your inbox");
  const mail = await latestMail(page.request, address, "Verify");
  const url = mail.Text.match(
    /http:\/\/localhost:3200\/api\/identity\/verify-email[^\s]+/,
  )![0];
  await page.goto(url);
  await page.getByLabel("Email address").fill(address);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(`${origin}/app`);
  await page
    .getByRole("button", { name: "Create your first workspace" })
    .click();
  await page.getByLabel("Workspace name").fill("Morgan household");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Morgan household" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Accounts", exact: true }).click();
  await page.getByRole("button", { name: "Add your first account" }).click();
  await page.getByLabel("Account name").fill("Household checking");
  await page.getByLabel("Opening balance").fill("2500.00");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("article")).toContainText("₹2,500.00");
  await page.getByRole("button", { name: "Add money move" }).click();
  await page.getByLabel("Merchant or source").fill("Neighborhood Grocer");
  await page.getByLabel("Amount (INR)", { exact: true }).fill("42.50");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.reload();
  await page.getByRole("button", { name: "Transactions", exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Neighborhood Grocer" }),
  ).toContainText("₹42.50");
  await page.getByRole("button", { name: "Budgets", exact: true }).click();
  await page.getByRole("button", { name: "Set budget", exact: true }).click();
  await page.getByLabel("Monthly limit (INR)").fill("300");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("₹257.50 remaining")).toBeVisible();
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await page.getByRole("button", { name: "Create goal", exact: true }).click();
  await page.getByLabel("Goal name").fill("Summer escape");
  await page.getByLabel("Target amount (INR)").fill("1000");
  await page.getByLabel("Target date").fill("2028-06-01");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("button", { name: "Record contribution" }).click();
  await page.getByLabel("Amount (INR)", { exact: true }).fill("100");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("article").filter({ hasText: "Summer escape" }),
  ).toContainText("₹900.00 to go");
  await page.getByRole("button", { name: "Members", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export workspace data" }).click();
  expect((await download).suggestedFilename()).toBe(
    "finsight-hosted-workspace.json",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    page.getByRole("button", { name: "Export workspace data" }),
  ).toBeEnabled();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(
      () =>
        page.evaluate(() => ({
          width: document.documentElement.scrollWidth,
          viewport: innerWidth,
          overflowing: [...document.querySelectorAll("body *")]
            .filter(
              (element) =>
                element.getBoundingClientRect().right > innerWidth + 1 &&
                getComputedStyle(element).position !== "fixed",
            )
            .slice(0, 8)
            .map((element) => ({
              tag: element.tagName,
              className: element.className,
            })),
        })),
      { message: "Hosted workspace should not overflow the mobile viewport" },
    )
    .toMatchObject({ width: 390, viewport: 390 });
  expect(errors).toEqual([]);
});

test("a user-verified passkey registers, signs in and can be removed", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  await page.setExtraHTTPHeaders({ "x-test-forwarded-ip": clientIP() });
  await register(page.request);
  const cdp = await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  const { authenticatorId } = await cdp.send(
    "WebAuthn.addVirtualAuthenticator",
    {
      options: {
        protocol: "ctap2",
        transport: "internal",
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    },
  );
  await page.goto("/app/security");
  await page.getByRole("button", { name: "Add passkey" }).click();
  await expect(
    page.getByText("My FinSight passkey", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/sign-in/);
  await page.getByRole("button", { name: "Passkey", exact: true }).click();
  await expect(page).toHaveURL(`${origin}/app`);
  await page.goto("/app/security");
  await page
    .getByRole("button", { name: "Delete My FinSight passkey" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Remove passkey", exact: true })
    .click();
  await expect(page.getByText("No passkeys registered yet.")).toBeVisible();
  await cdp.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
});
