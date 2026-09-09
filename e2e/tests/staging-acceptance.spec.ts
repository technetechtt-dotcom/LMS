import { expect, test } from '@playwright/test';

test.describe('deployed staging acceptance', () => {
  test.skip(process.env.PLAYWRIGHT_REMOTE !== '1', 'Only runs against staging');

  test('API and both portal login surfaces are healthy and disclose no credentials', async ({
    page,
    request,
  }) => {
    const apiUrl = process.env.PLAYWRIGHT_API_URL;
    const opsUrl = process.env.PLAYWRIGHT_OPS_URL;
    const expectedSha = process.env.EXPECTED_SHA;
    if (!apiUrl || !opsUrl || !expectedSha) {
      throw new Error('Staging URLs and EXPECTED_SHA are required');
    }

    const health = await request.get(`${apiUrl}/health/ready`);
    expect(health.ok()).toBeTruthy();
    expect((await health.json()).revision).toBe(expectedSha);

    const webVersion = await request.get('/version.json');
    expect(webVersion.ok()).toBeTruthy();
    expect((await webVersion.json()).revision).toBe(expectedSha);

    const opsVersion = await request.get(`${opsUrl.replace(/\/$/, '')}/version.json`);
    expect(opsVersion.ok()).toBeTruthy();
    expect((await opsVersion.json()).revision).toBe(expectedSha);

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
