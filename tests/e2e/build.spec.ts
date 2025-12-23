/**
 * AppForge Zero E2E Tests - Build Workflow
 *
 * Tests the complete build pipeline workflow:
 * - Adding builds to queue
 * - Build progress monitoring
 * - Build completion and artifact access
 * - Build history management
 */

import { test, expect, ElectronApplication, Page } from "@playwright/test";
import { _electron as electron } from "playwright";
import * as path from "path";

let electronApp: ElectronApplication;
let page: Page;

const appPath = path.join(__dirname, "../../dist/main/index.js");

test.describe("Build Queue Management", () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [appPath],
      env: { ...process.env, NODE_ENV: "test" },
    });
    page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");

    // Navigate to builds page
    await page.click('[data-testid="nav-builds"]');
    await page.waitForSelector('[data-testid="page-builds"]');
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test("should display build queue", async () => {
    await expect(page.locator('[data-testid="build-queue"]')).toBeVisible();
  });

  test("should display build history", async () => {
    await expect(page.locator('[data-testid="build-history"]')).toBeVisible();
  });

  test("should show empty state when no builds", async () => {
    const queueItems = await page.locator('[data-testid="queue-item"]').count();

    if (queueItems === 0) {
      await expect(page.locator('[data-testid="empty-queue"]')).toBeVisible();
    }
  });

  test("should open add to queue dialog", async () => {
    await page.click('[data-testid="add-to-queue"]');
    await expect(
      page.locator('[data-testid="add-queue-dialog"]')
    ).toBeVisible();
  });

  test("should list available instances in dialog", async () => {
    // The dialog should already be open from previous test
    const instances = page.locator('[data-testid="queue-instance-option"]');
    // May or may not have instances, just verify the list exists
    await expect(
      page.locator('[data-testid="queue-instance-list"]')
    ).toBeVisible();
  });

  test("should close add to queue dialog", async () => {
    await page.click('[data-testid="close-dialog"]');
    await expect(
      page.locator('[data-testid="add-queue-dialog"]')
    ).not.toBeVisible();
  });
});

test.describe("Build Progress Monitoring", () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [appPath],
      env: { ...process.env, NODE_ENV: "test" },
    });
    page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");
    await page.click('[data-testid="nav-builds"]');
    await page.waitForSelector('[data-testid="page-builds"]');
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test("should show build progress indicator", async () => {
    // This test assumes a build is in progress
    // In real scenarios, we'd trigger a build first
    const progressExists =
      (await page.locator('[data-testid="build-progress"]').count()) > 0;

    if (progressExists) {
      await expect(
        page.locator('[data-testid="build-progress"]')
      ).toBeVisible();
      await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
    }
  });

  test("should display build phases", async () => {
    const progressExists =
      (await page.locator('[data-testid="build-progress"]').count()) > 0;

    if (progressExists) {
      // Check that phase indicators are present
      const phases = page.locator('[data-testid="build-phase"]');
      const count = await phases.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test("should allow canceling a build", async () => {
    const activeBuilds = await page
      .locator('[data-testid="active-build"]')
      .count();

    if (activeBuilds > 0) {
      // Click cancel button
      await page.click('[data-testid="cancel-build"]');

      // Confirm cancellation
      await page.click('[data-testid="confirm-cancel"]');

      // Verify build was cancelled
      await expect(
        page.locator('[data-testid="build-cancelled"]')
      ).toBeVisible();
    }
  });
});

test.describe("Build History", () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [appPath],
      env: { ...process.env, NODE_ENV: "test" },
    });
    page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");
    await page.click('[data-testid="nav-builds"]');
    await page.waitForSelector('[data-testid="page-builds"]');
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test("should filter build history by status", async () => {
    await page.selectOption('[data-testid="history-status-filter"]', "success");
    await page.waitForTimeout(300);

    // Verify filter was applied
    const selectedOption = await page.$eval(
      '[data-testid="history-status-filter"]',
      (el: HTMLSelectElement) => el.value
    );
    expect(selectedOption).toBe("success");
  });

  test("should expand build details", async () => {
    const historyItems = await page
      .locator('[data-testid="history-item"]')
      .count();

    if (historyItems > 0) {
      await page.click('[data-testid="history-item"]:first-child');
      await expect(page.locator('[data-testid="build-details"]')).toBeVisible();
    }
  });

  test("should show build log option", async () => {
    const historyItems = await page
      .locator('[data-testid="history-item"]')
      .count();

    if (historyItems > 0) {
      await page.click('[data-testid="history-item"]:first-child');
      await expect(
        page.locator('[data-testid="view-build-log"]')
      ).toBeVisible();
    }
  });

  test("should allow retrying failed builds", async () => {
    // Filter for failed builds
    await page.selectOption('[data-testid="history-status-filter"]', "failed");
    await page.waitForTimeout(300);

    const failedBuilds = await page
      .locator('[data-testid="history-item"]')
      .count();

    if (failedBuilds > 0) {
      await page.click('[data-testid="history-item"]:first-child');
      await expect(page.locator('[data-testid="retry-build"]')).toBeVisible();
    }
  });

  test("should open APK location for successful builds", async () => {
    // Filter for successful builds
    await page.selectOption('[data-testid="history-status-filter"]', "success");
    await page.waitForTimeout(300);

    const successBuilds = await page
      .locator('[data-testid="history-item"]')
      .count();

    if (successBuilds > 0) {
      await page.click('[data-testid="history-item"]:first-child');
      await expect(
        page.locator('[data-testid="open-apk-location"]')
      ).toBeVisible();
    }
  });
});
