/**
 * AppForge Zero E2E Tests - Main Application
 *
 * End-to-end tests using Playwright for Electron
 * Tests the complete user journey from app launch to APK generation
 */

import { test, expect, ElectronApplication, Page } from "@playwright/test";
import { _electron as electron } from "playwright";
import * as path from "path";

let electronApp: ElectronApplication;
let page: Page;

// Path to the packaged Electron app or main process
const appPath = path.join(__dirname, "../../dist/main/index.js");

test.describe("AppForge Zero - Application Launch", () => {
  test.beforeAll(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: [appPath],
      env: {
        ...process.env,
        NODE_ENV: "test",
      },
    });

    // Get the first window
    page = await electronApp.firstWindow();

    // Wait for the app to be ready
    await page.waitForLoadState("domcontentloaded");
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test("should launch the application successfully", async () => {
    // Check that the window is visible
    const isVisible = await page.isVisible("body");
    expect(isVisible).toBe(true);
  });

  test("should display the application title", async () => {
    const title = await electronApp.evaluate(({ BrowserWindow }) => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      return focusedWindow?.getTitle();
    });
    expect(title).toContain("AppForge");
  });

  test("should show the sidebar navigation", async () => {
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
  });

  test("should show the header component", async () => {
    await expect(page.locator('[data-testid="header"]')).toBeVisible();
  });

  test("should show the main content area", async () => {
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
  });
});

test.describe("AppForge Zero - Navigation", () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [appPath],
      env: { ...process.env, NODE_ENV: "test" },
    });
    page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test("should navigate to Templates page", async () => {
    await page.click('[data-testid="nav-templates"]');
    await expect(page.locator('[data-testid="page-templates"]')).toBeVisible();
  });

  test("should navigate to Trends page", async () => {
    await page.click('[data-testid="nav-trends"]');
    await expect(page.locator('[data-testid="page-trends"]')).toBeVisible();
  });

  test("should navigate to Builds page", async () => {
    await page.click('[data-testid="nav-builds"]');
    await expect(page.locator('[data-testid="page-builds"]')).toBeVisible();
  });

  test("should navigate to Distribution page", async () => {
    await page.click('[data-testid="nav-distribution"]');
    await expect(
      page.locator('[data-testid="page-distribution"]')
    ).toBeVisible();
  });

  test("should navigate to Settings page", async () => {
    await page.click('[data-testid="nav-settings"]');
    await expect(page.locator('[data-testid="page-settings"]')).toBeVisible();
  });

  test("should navigate back to Dashboard", async () => {
    await page.click('[data-testid="nav-dashboard"]');
    await expect(page.locator('[data-testid="page-dashboard"]')).toBeVisible();
  });
});
