import { expect, test } from '@playwright/test';

test.describe('deployed staging acceptance', () => {
  test.skip(process.env.PLAYWRIGHT_REMOTE !== '1', 'Only runs against staging');

  test('API and both portal login surfaces are healthy and disclose no credentials', async ({
    page,
    request,
  }) => {
    const apiUrl = process.env.PLAYWRIGHT_API_URL;
    const opsUrl = process.env.PLAYWRIGHT_OPS_URL;
    if (!apiUrl || !opsUrl) throw new Error('Staging URLs are required');

    const health = await request.get(`${apiUrl}/health`);
    expect(health.ok()).toBeTruthy();

    await page.goto('/login');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('@skillforge.co.za');
    await expect(page.locator('body')).not.toContainText('Password123!');

    await page.goto(`${opsUrl.replace(/\/$/, '')}/login`);
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('@skillforge.co.za');
    await expect(page.locator('body')).not.toContainText('Password123!');
  });
});
