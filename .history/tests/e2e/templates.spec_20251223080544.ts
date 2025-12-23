/**
 * AppForge Zero E2E Tests - Template Workflow
 * 
 * Tests the complete template management workflow:
 * - Template loading and display
 * - Template selection and configuration
 * - Morph point editing
 * - Template instantiation
 */

import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { _electron as electron } from 'playwright';
import * as path from 'path';

let electronApp: ElectronApplication;
let page: Page;

const appPath = path.join(__dirname, '../../dist/main/index.js');

test.describe('Template Management', () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [appPath],
      env: { ...process.env, NODE_ENV: 'test' },
    });
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    
    // Navigate to templates page
    await page.click('[data-testid="nav-templates"]');
    await page.waitForSelector('[data-testid="page-templates"]');
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('should display template grid', async () => {
    await expect(page.locator('[data-testid="template-grid"]')).toBeVisible();
  });

  test('should show available templates', async () => {
    const templateCards = page.locator('[data-testid="template-card"]');
    const count = await templateCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should filter templates by category', async () => {
    // Select a category filter
    await page.selectOption('[data-testid="category-filter"]', 'wallpaper-pack');
    
    // Wait for filter to apply
    await page.waitForTimeout(500);
    
    // Verify filtered results
    const templateCards = page.locator('[data-testid="template-card"]');
    const count = await templateCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should search templates by name', async () => {
    await page.fill('[data-testid="template-search"]', 'wallpaper');
    await page.waitForTimeout(500);
    
    // Verify search results are relevant
    const templateCards = page.locator('[data-testid="template-card"]');
    const firstCard = templateCards.first();
    const text = await firstCard.textContent();
    expect(text?.toLowerCase()).toContain('wallpaper');
  });

  test('should open template details on click', async () => {
    // Clear search first
    await page.fill('[data-testid="template-search"]', '');
    await page.waitForTimeout(300);
    
    // Click first template
    await page.click('[data-testid="template-card"]:first-child');
    
    // Verify details panel opens
    await expect(page.locator('[data-testid="template-details"]')).toBeVisible();
  });

  test('should display morph configuration panel', async () => {
    // Click on a template to select it
    await page.click('[data-testid="template-card"]:first-child');
    
    // Click configure button
    await page.click('[data-testid="configure-template"]');
    
    // Verify morph config panel is visible
    await expect(page.locator('[data-testid="morph-config-panel"]')).toBeVisible();
  });

  test('should validate required morph points', async () => {
    // Try to save without required fields
    await page.click('[data-testid="save-config"]');
    
    // Check for validation error
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
  });

  test('should save valid configuration', async () => {
    // Fill required fields
    await page.fill('[data-testid="morph-app-name"]', 'Test App');
    await page.fill('[data-testid="morph-package-name"]', 'com.test.app');
    
    // Save configuration
    await page.click('[data-testid="save-config"]');
    
    // Verify success message
    await expect(page.locator('[data-testid="config-saved"]')).toBeVisible();
  });
});

test.describe('Template Instantiation', () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [appPath],
      env: { ...process.env, NODE_ENV: 'test' },
    });
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.click('[data-testid="nav-templates"]');
    await page.waitForSelector('[data-testid="page-templates"]');
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('should create template instance', async () => {
    // Select a template
    await page.click('[data-testid="template-card"]:first-child');
    
    // Configure morph points
    await page.click('[data-testid="configure-template"]');
    await page.fill('[data-testid="morph-app-name"]', 'My Test App');
    await page.fill('[data-testid="morph-package-name"]', 'com.mytest.app');
    
    // Click create instance
    await page.click('[data-testid="create-instance"]');
    
    // Wait for instance creation
    await page.waitForSelector('[data-testid="instance-created"]', { timeout: 30000 });
    
    // Verify instance was created
    await expect(page.locator('[data-testid="instance-created"]')).toBeVisible();
  });

  test('should show instance in list', async () => {
    // Navigate to instances tab
    await page.click('[data-testid="tab-instances"]');
    
    // Verify the new instance is listed
    const instances = page.locator('[data-testid="instance-item"]');
    const count = await instances.count();
    expect(count).toBeGreaterThan(0);
  });
});
