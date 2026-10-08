import { expect, test } from "@playwright/test";

for (const mode of ["sign-in", "sign-up", "new-password"] as const) {
  test(`${mode}: password visibility preserves the value and never submits the form`, async ({
    page,
  }) => {
    await page.goto(
      mode === "new-password"
        ? "/auth/new-password?token=visibility-test"
        : `/${mode}`,
    );
    if (mode !== "new-password")
      await page
        .getByLabel("Email address", { exact: true })
        .fill("eye@example.test");
    if (mode === "sign-up") {
      await page
        .getByLabel("Your name", { exact: true })
        .fill("Visibility test");
      await page.getByLabel("Accept privacy notice and terms").check();
    }
    const input = page.locator("input[autocomplete$='password']");
    const password = "A long test passphrase";
    await input.fill(password);
    await expect(input).toHaveAttribute("type", "password");
    await expect(input).toHaveAttribute(
      "autocomplete",
      mode === "sign-in" ? "current-password" : "new-password",
    );
    const form = page.locator("form");
    expect(
      await form.evaluate((element) =>
        (element as HTMLFormElement).checkValidity(),
      ),
    ).toBe(true);
    await form.evaluate((element) => {
      element.setAttribute("data-submits", "0");
      element.addEventListener("submit", () => {
        element.setAttribute(
          "data-submits",
          String(Number(element.getAttribute("data-submits")) + 1),
        );
      });
    });

    const show = page.getByRole("button", {
      name: "Show password",
      exact: true,
    });
    await expect(show).toHaveAttribute("type", "button");
    await expect(show).toHaveAttribute("aria-pressed", "false");
    const target = await show.boundingBox();
    expect(target!.width).toBeGreaterThanOrEqual(44);
    expect(target!.height).toBeGreaterThanOrEqual(44);
    await show.focus();
    await expect(show).toBeFocused();
    await show.press("Enter");
    await expect(input).toHaveAttribute("type", "text");
    await expect(input).toHaveValue(password);

    const hide = page.getByRole("button", {
      name: "Hide password",
      exact: true,
    });
    await expect(hide).toHaveAttribute("aria-pressed", "true");
    await hide.click();
    await expect(input).toHaveAttribute("type", "password");
    await expect(input).toHaveValue(password);
    await expect(form).toHaveAttribute("data-submits", "0");
  });
}
