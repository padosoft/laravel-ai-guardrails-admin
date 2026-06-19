import { expect, test } from '@playwright/test';

const envelope = (schema: string, data: unknown) => ({
  schema_version: 'ai-guardrails.api.v1',
  schema: `ai-guardrails.api.v1.${schema}`,
  data,
});

test.beforeEach(async ({ page }) => {
  // Mock every core API call the shell may make (the Approvals badge calls /approvals).
  await page.route('**/ai-guardrails/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/approvals')) {
      return route.fulfill({ json: envelope('approvals', { pending: [] }) });
    }
    return route.fulfill({ json: envelope('generic', {}) });
  });
});

test('mounts the shell and navigates to the audit screen', async ({ page }) => {
  await page.goto('/admin/ai-guardrails');

  await expect(page.getByTestId('agr-shell')).toBeVisible();
  await expect(page.getByTestId('agr-nav-audit')).toBeVisible();

  await page.getByTestId('agr-nav-audit').click();

  await expect(page).toHaveURL(/\/admin\/ai-guardrails\/audit$/);
  await expect(page.getByRole('heading', { name: 'Injection Audit' })).toBeVisible();
});

test('toggles the theme', async ({ page }) => {
  await page.goto('/admin/ai-guardrails');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByTestId('agr-theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
