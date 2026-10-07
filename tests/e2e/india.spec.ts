import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("planning calculators work in INR and local fonts supply the rupee glyph", async ({
  page,
}) => {
  await page.goto("/calculators");
  await page.getByRole("button", { name: "Calculate estimate" }).click();
  await expect(
    page.getByRole("definition").filter({ hasText: "₹10,379.18" }),
  ).toBeVisible();
  const file = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download schedule CSV" }).click();
  expect((await file).suggestedFilename()).toBe("finsight-emi-estimate.csv");
  await page.getByRole("button", { name: "SIP", exact: true }).click();
  await page.getByRole("button", { name: "Calculate estimate" }).click();
  await expect(page.getByText("₹6,00,000.00", { exact: true })).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.evaluate(async () => {
    for (const [id, family] of [
      ["geist-rupee", "Geist Variable"],
      ["fraunces-rupee", "Fraunces Variable"],
    ]) {
      const span = document.createElement("span");
      span.id = id;
      span.textContent = "₹";
      span.style.fontFamily = `"${family}"`;
      document.body.append(span);
      await document.fonts.load(`20px "${family}"`, "₹");
    }
    await document.fonts.ready;
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument");
  for (const [selector, family] of [
    ["#geist-rupee", "Geist"],
    ["#fraunces-rupee", "Fraunces"],
  ]) {
    const { nodeId } = await cdp.send("DOM.querySelector", {
      nodeId: root.nodeId,
      selector,
    });
    const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
    expect(
      fonts.some(
        (font) =>
          font.isCustomFont &&
          font.familyName.includes(family) &&
          font.glyphCount > 0,
      ),
      JSON.stringify(fonts),
    ).toBe(true);
  }
});

test("credit card due date survives reload and can be cleared after payment", async ({
  page,
}) => {
  await page.goto("/accounts");
  await page.getByLabel("Payment due for ICICI credit card").fill("2026-10-05");
  await page.reload();
  await expect(
    page.getByLabel("Payment due for ICICI credit card"),
  ).toHaveValue("2026-10-05");
  await page
    .getByRole("button", { name: "Clear reminder after payment" })
    .click();
  await expect(
    page.getByLabel("Payment due for ICICI credit card"),
  ).toHaveValue("");
});
