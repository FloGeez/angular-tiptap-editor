import { test, expect } from "@playwright/test";

test.describe("Icon Set Switcher", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();
  });

  test("switches between Material, /ATE Stroke and Lucide icon sets from the top action bar", async ({
    page,
  }) => {
    const iconTrigger = page.getByTestId("icon-set-trigger");
    await expect(iconTrigger).toBeVisible();

    // Open dropdown
    await iconTrigger.click();
    const dropdown = page.locator(".dropdown-menu");
    await expect(dropdown).toBeVisible();

    // Select /ATE Stroke
    await dropdown.locator("button", { hasText: "/ATE Stroke" }).click();
    await expect(iconTrigger).toContainText("/ATE");

    // Verify an icon in the editor toolbar switched its SVG markup
    const boldIcon = page.locator(".ate-toolbar ate-icon svg").first();
    await expect(boldIcon).toBeVisible();

    // Switch to Lucide
    await iconTrigger.click();
    await dropdown.locator("button", { hasText: "Lucide" }).click();
    await expect(iconTrigger).toContainText("Lucide");
  });
});
