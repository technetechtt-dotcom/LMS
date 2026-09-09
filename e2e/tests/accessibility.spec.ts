import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const PASSWORD = 'Password123!';

async function assertNoBlockingViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = results.violations.filter(
    ({ impact }) => impact === 'serious' || impact === 'critical',
  );

  expect(
    blocking,
    blocking
      .map(
        ({ id, help, nodes }) =>
          `${id}: ${help}\n${nodes.map(({ target }) => `  ${target.join(' ')}`).join('\n')}`,
      )
      .join('\n\n'),
  ).toEqual([]);
}

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'));
}

test.describe('automated accessibility checks', () => {
  test('public authentication and policy pages have no serious WCAG violations', async ({
    page,
  }) => {
    for (const route of ['/login', '/forgot-password', '/privacy', '/terms']) {
      await page.goto(route);
      await assertNoBlockingViolations(page);
    }
  });

  test('learner dashboard and settings have no serious WCAG violations', async ({ page }) => {
    await login(page, 'learner@skillforge.co.za');
    await assertNoBlockingViolations(page);
    await page.goto('/settings');
    await assertNoBlockingViolations(page);
  });

  test('admin materials overflow menu is keyboard operable', async ({ page }) => {
    await login(page, 'admin@skillforge.co.za');
    await page.goto('/materials');
    const firstMenu = page.getByLabel(/actions for/i).first();
    await firstMenu.focus();
    await firstMenu.press('Enter');
    await expect(page.getByRole('button', { name: 'View Material' }).first()).toBeVisible();
    await assertNoBlockingViolations(page);
  });
});
