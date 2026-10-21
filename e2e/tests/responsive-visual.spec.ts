import { expect, test } from '@playwright/test';

const PASSWORD = 'Password123!';

async function login(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 30_000,
  });
  const consent = page.locator('[data-consent-state]');
  await consent.waitFor({ state: 'attached' });
  await expect(consent).not.toHaveAttribute('data-consent-state', 'loading');
  const notice = page.getByRole('heading', { name: 'Data Protection Consent' });
  if ((await consent.getAttribute('data-consent-state')) === 'required') {
    await expect(notice).toBeVisible();
    await page.getByRole('checkbox', { name: /processing consent/i }).check();
    await page.getByRole('checkbox', { name: /your rights/i }).check();
    await page.getByRole('checkbox', { name: /third-party sharing/i }).check();
    await page.getByRole('button', { name: /accept & continue/i }).click();
    await expect(consent).toHaveAttribute('data-consent-state', 'clear');
    await expect(notice).not.toBeVisible();
  }
}

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`facilitator dashboard renders on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await login(page, 'facilitator@skillforge.co.za');
    await page.goto('/facilitator-dashboard');
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(page.locator('body')).not.toHaveText(/Something went wrong/i);
  });
}
