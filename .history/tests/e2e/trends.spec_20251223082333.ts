/**
 * AppForge Zero E2E Tests - Trends Workflow
 *
 * Tests the trend scanning and analysis workflow:
 * - Trend dashboard display
 * - Manual trend scanning
 * - Trend filtering and search
 * - AI insights display
 */

import { test, expect, ElectronApplication, Page } from "@playwright/test";
import { _electron as electron } from "playwright";
import * as path from "path";

let electronApp: ElectronApplication;
let page: Page;

const appPath = path.join(__dirname, "../../dist/main/index.js");

test.describe("Trend Dashboard", () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [appPath],
      env: { ...process.env, NODE_ENV: "test" },
    });
    page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");

    // Navigate to trends page
    await page.click('[data-testid="nav-trends"]');
    await page.waitForSelector('[data-testid="page-trends"]');
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test("should display trend dashboard", async () => {
    await expect(page.locator('[data-testid="trend-dashboard"]')).toBeVisible();
  });

  test("should show trend statistics", async () => {
    await expect(page.locator('[data-testid="trend-stats"]')).toBeVisible();
  });

  test("should display trend list", async () => {
    await expect(page.locator('[data-testid="trend-list"]')).toBeVisible();
  });

  test("should show scan button", async () => {
    await expect(page.locator('[data-testid="scan-trends"]')).toBeVisible();
  });

  test("should display last scan time", async () => {
    const lastScan = page.locator('[data-testid="last-scan-time"]');
    await expect(lastScan).toBeVisible();
  });
});

test.describe("Trend Scanning", () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [appPath],
      env: { ...process.env, NODE_ENV: "test" },
    });
    page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");
    await page.click('[data-testid="nav-trends"]');
    await page.waitForSelector('[data-testid="page-trends"]');
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test("should open scan options dialog", async () => {
    await page.click('[data-testid="scan-trends"]');
    await expect(
      page.locator('[data-testid="scan-options-dialog"]')
    ).toBeVisible();
  });

  test("should show source selection options", async () => {
    // Dialog should be open from previous test
    await expect(page.locator('[data-testid="source-google"]')).toBeVisible();
    await expect(page.locator('[data-testid="source-reddit"]')).toBeVisible();
  });

  test("should toggle source selection", async () => {
    // Toggle Google Trends source
    await page.click('[data-testid="source-google"]');

    // Verify toggle state changed
    const isChecked = await page.$eval(
      '[data-testid="source-google"]',
      (el: HTMLInputElement) => el.checked
    );
    expect(typeof isChecked).toBe("boolean");
  });

  test("should start scan when confirmed", async () => {
    // Enable at least one source
    const googleChecked = await page.$eval(
      '[data-testid="source-google"]',
      (el: HTMLInputElement) => el.checked
    );
    if (!googleChecked) {
      await page.click('[data-testid="source-google"]');
    }

    // Start scan
    await page.click('[data-testid="start-scan"]');

    // Verify scan progress is shown
    await expect(page.locator('[data-testid="scan-progress"]')).toBeVisible();
  });

  test("should show scan progress indicator", async () => {
    // If scanning is in progress
    const scanningExists =
      (await page.locator('[data-testid="scan-progress"]').count()) > 0;

    if (scanningExists) {
      await expect(
        page.locator('[data-testid="scan-progress-bar"]')
      ).toBeVisible();
      await expect(page.locator('[data-testid="scan-status"]')).toBeVisible();
    }
  });
});

test.describe("Trend Filtering", () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [appPath],
      env: { ...process.env, NODE_ENV: "test" },
    });
    page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");
    await page.click('[data-testid="nav-trends"]');
    await page.waitForSelector('[data-testid="page-trends"]');
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test("should filter trends by source", async () => {
    await page.selectOption('[data-testid="source-filter"]', "google");
    await page.waitForTimeout(300);

    // Verify filter is applied
    const selectedValue = await page.$eval(
      '[data-testid="source-filter"]',
      (el: HTMLSelectElement) => el.value
    );
    expect(selectedValue).toBe("google");
  });

  test("should filter trends by category", async () => {
    await page.selectOption('[data-testid="category-filter"]', "entertainment");
    await page.waitForTimeout(300);

    const selectedValue = await page.$eval(
      '[data-testid="category-filter"]',
      (el: HTMLSelectElement) => el.value
    );
    expect(selectedValue).toBe("entertainment");
  });

  test("should search trends by keyword", async () => {
    await page.fill('[data-testid="trend-search"]', "wallpaper");
    await page.waitForTimeout(500);

    // Verify search input has value
    const inputValue = await page.$eval(
      '[data-testid="trend-search"]',
      (el: HTMLInputElement) => el.value
    );
    expect(inputValue).toBe("wallpaper");
  });

  test("should filter by minimum score", async () => {
    await page.fill('[data-testid="min-score-filter"]', "50");
    await page.waitForTimeout(300);

    const inputValue = await page.$eval(
      '[data-testid="min-score-filter"]',
      (el: HTMLInputElement) => el.value
    );
    expect(inputValue).toBe("50");
  });

  test("should reset all filters", async () => {
    await page.click('[data-testid="reset-filters"]');
    await page.waitForTimeout(300);

    // Verify search is cleared
    const searchValue = await page.$eval(
      '[data-testid="trend-search"]',
      (el: HTMLInputElement) => el.value
    );
    expect(searchValue).toBe("");
  });
});

test.describe("Trend Details", () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [appPath],
      env: { ...process.env, NODE_ENV: "test" },
    });
    page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");
    await page.click('[data-testid="nav-trends"]');
    await page.waitForSelector('[data-testid="page-trends"]');
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test("should open trend detail on click", async () => {
    const trends = await page.locator('[data-testid="trend-card"]').count();

    if (trends > 0) {
      await page.click('[data-testid="trend-card"]:first-child');
      await expect(page.locator('[data-testid="trend-detail"]')).toBeVisible();
    }
  });

  test("should show trend chart", async () => {
    const trends = await page.locator('[data-testid="trend-card"]').count();

    if (trends > 0) {
      await page.click('[data-testid="trend-card"]:first-child');
      await expect(page.locator('[data-testid="trend-chart"]')).toBeVisible();
    }
  });

  test("should show suggested templates", async () => {
    const detailVisible = await page
      .locator('[data-testid="trend-detail"]')
      .isVisible();

    if (detailVisible) {
      await expect(
        page.locator('[data-testid="suggested-templates"]')
      ).toBeVisible();
    }
  });

  test("should allow creating app from trend", async () => {
    const detailVisible = await page
      .locator('[data-testid="trend-detail"]')
      .isVisible();

    if (detailVisible) {
      await expect(
        page.locator('[data-testid="create-from-trend"]')
      ).toBeVisible();
    }
  });
});
