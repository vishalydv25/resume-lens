import { test, expect } from "@playwright/test";
test("sample review, evidence expansion, export, and reset", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", {name:/A clearer resume/})).toBeVisible();
  await page.getByRole("button", {name:"Explore the sample report"}).click();
  await expect(page.getByText("Estimated evidence coverage", {exact:true})).toBeVisible();
  await expect(page.locator(".score-number")).toContainText("73");
  await page.locator(".requirement summary").first().click();
  await expect(page.locator(".requirement-detail").first()).toContainText("directly describes");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", {name:"Download report JSON"}).click();
  expect((await downloadPromise).suggestedFilename()).toBe("resume-lens-report.json");
  await page.getByRole("button", {name:"Try a sample"}).click();
  await expect(page.getByText("Less guesswork.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("analysis failure is actionable", async ({page}) => {
  await page.route("**/api/analyse", route => route.fulfill({status:503, contentType:"application/json", body:JSON.stringify({error:"Service unavailable. Please try again."})}));
  await page.goto("/");
  await page.getByRole("button", {name:"Explore the sample report"}).click();
  await expect(page.getByRole("alert")).toContainText("Please try again");
  await expect(page.getByRole("button", {name:"Explore the sample report"})).toBeEnabled();
});
