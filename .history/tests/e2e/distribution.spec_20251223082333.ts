/**
 * AppForge Zero E2E Tests - Distribution Workflow
 *
 * Tests the app distribution and publishing workflow:
 * - Distribution channel configuration
 * - Publishing wizard
 * - Sales tracking
 */

import { test, expect, ElectronApplication, Page } from "@playwright/test";
import { _electron as electron } from "playwright";
import * as path from "path";

let electronApp: ElectronApplication;
let page: Page;

const appPath = path.join(__dirname, "../../dist/main/index.js");

test.describe("Distribution Channels", () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [appPath],
      env: { ...process.env, NODE_ENV: "test" },
    });
    page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");

    // Navigate to distribution page
    await page.click('[data-testid="nav-distribution"]');
    await page.waitForSelector('[data-testid="page-distribution"]');
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test("should display distribution page", async () => {
    await expect(
      page.locator('[data-testid="page-distribution"]')
    ).toBeVisible();
  });

  test("should show channel configuration section", async () => {
    await expect(page.locator('[data-testid="channel-config"]')).toBeVisible();
  });

  test("should list available channels", async () => {
    const channels = page.locator('[data-testid="channel-item"]');
    const count = await channels.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should show Gumroad channel option", async () => {
    await expect(page.locator('[data-testid="channel-gumroad"]')).toBeVisible();
  });

  test("should show Ko-fi channel option", async () => {
    await expect(page.locator('[data-testid="channel-kofi"]')).toBeVisible();
  });

  test("should show Itch.io channel option", async () => {
    await expect(page.locator('[data-testid="channel-itchio"]')).toBeVisible();
  });

  test("should open channel settings", async () => {
    await page.click(
      '[data-testid="channel-gumroad"] [data-testid="channel-settings"]'
    );
    await expect(
      page.locator('[data-testid="channel-settings-dialog"]')
    ).toBeVisible();
  });

  test("should save API key for channel", async () => {
    // Dialog should be open from previous test
    await page.fill('[data-testid="api-key-input"]', "test-api-key-12345");
    await page.click('[data-testid="save-channel-settings"]');

    // Should show success or close dialog
    await expect(
      page.locator('[data-testid="channel-settings-dialog"]')
    ).not.toBeVisible();
  });
});

test.describe("Publishing Wizard", () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [appPath],
      env: { ...process.env, NODE_ENV: "test" },
    });
    page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");
    await page.click('[data-testid="nav-distribution"]');
    await page.waitForSelector('[data-testid="page-distribution"]');
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test("should show publish button", async () => {
    await expect(page.locator('[data-testid="start-publish"]')).toBeVisible();
  });

  test("should open publish wizard", async () => {
    await page.click('[data-testid="start-publish"]');
    await expect(page.locator('[data-testid="publish-wizard"]')).toBeVisible();
  });

  test("should show app selection step", async () => {
    await expect(page.locator('[data-testid="wizard-step-app"]')).toBeVisible();
  });

  test("should list publishable apps", async () => {
    const apps = page.locator('[data-testid="publishable-app"]');
    // May or may not have apps, just check the list exists
    await expect(
      page.locator('[data-testid="publishable-apps-list"]')
    ).toBeVisible();
  });

  test("should proceed to channel selection", async () => {
    const apps = await page.locator('[data-testid="publishable-app"]').count();

    if (apps > 0) {
      await page.click('[data-testid="publishable-app"]:first-child');
      await page.click('[data-testid="wizard-next"]');
      await expect(
        page.locator('[data-testid="wizard-step-channels"]')
      ).toBeVisible();
    }
  });

  test("should select channels for publishing", async () => {
    const onChannelStep = await page
      .locator('[data-testid="wizard-step-channels"]')
      .isVisible();

    if (onChannelStep) {
      await page.click('[data-testid="select-channel-gumroad"]');

      const isSelected = await page.$eval(
        '[data-testid="select-channel-gumroad"]',
        (el: HTMLInputElement) => el.checked
      );
      expect(isSelected).toBe(true);
    }
  });

  test("should show pricing configuration", async () => {
    const onChannelStep = await page
      .locator('[data-testid="wizard-step-channels"]')
      .isVisible();

    if (onChannelStep) {
      await page.click('[data-testid="wizard-next"]');
      await expect(
        page.locator('[data-testid="wizard-step-pricing"]')
      ).toBeVisible();
    }
  });

  test("should set app price", async () => {
    const onPricingStep = await page
      .locator('[data-testid="wizard-step-pricing"]')
      .isVisible();

    if (onPricingStep) {
      await page.fill('[data-testid="price-input"]', "1.99");

      const priceValue = await page.$eval(
        '[data-testid="price-input"]',
        (el: HTMLInputElement) => el.value
      );
      expect(priceValue).toBe("1.99");
    }
  });

  test("should close wizard on cancel", async () => {
    await page.click('[data-testid="wizard-cancel"]');
    await expect(
      page.locator('[data-testid="publish-wizard"]')
    ).not.toBeVisible();
  });
});

test.describe("Publications List", () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [appPath],
      env: { ...process.env, NODE_ENV: "test" },
    });
    page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");
    await page.click('[data-testid="nav-distribution"]');
    await page.waitForSelector('[data-testid="page-distribution"]');
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test("should show publications section", async () => {
    await expect(
      page.locator('[data-testid="publications-section"]')
    ).toBeVisible();
  });

  test("should display publications list", async () => {
    await expect(
      page.locator('[data-testid="publications-list"]')
    ).toBeVisible();
  });

  test("should show sales summary", async () => {
    await expect(page.locator('[data-testid="sales-summary"]')).toBeVisible();
  });

  test("should filter publications by status", async () => {
    await page.selectOption(
      '[data-testid="publication-status-filter"]',
      "live"
    );

    const selectedValue = await page.$eval(
      '[data-testid="publication-status-filter"]',
      (el: HTMLSelectElement) => el.value
    );
    expect(selectedValue).toBe("live");
  });

  test("should open publication details", async () => {
    const publications = await page
      .locator('[data-testid="publication-item"]')
      .count();

    if (publications > 0) {
      await page.click('[data-testid="publication-item"]:first-child');
      await expect(
        page.locator('[data-testid="publication-details"]')
      ).toBeVisible();
    }
  });
});
