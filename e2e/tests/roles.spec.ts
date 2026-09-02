import { test, expect } from '@playwright/test';

const PASSWORD = 'Password123!';

const roles = [
  { email: 'admin@skillforge.co.za', home: '/dashboard' },
  { email: 'learner@skillforge.co.za', home: '/learner-dashboard' },
  { email: 'assessor@skillforge.co.za', home: '/assessor-dashboard' },
  { email: 'moderator@skillforge.co.za', home: '/moderator-dashboard' },
  { email: 'facilitator@skillforge.co.za', home: '/facilitator-dashboard' },
  { email: 'mentor@skillforge.co.za', home: '/workplace-mentor-dashboard' },
  { email: 'qa@skillforge.co.za', home: '/qa-dashboard' },
] as const;

async function login(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 30_000,
  });
}

test.describe('public routes', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /smart lms/i })).toBeVisible();
  });

  test('register requires invite', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByText(/invitation required/i)).toBeVisible();
  });

  test('certificate verify page handles unknown code', async ({ page }) => {
    await page.goto('/certificates/verify/invalid-code-000');
    await expect(page.getByText(/credential verification/i)).toBeVisible();
  });
});

for (const role of roles) {
  test.describe(`${role.email} smoke`, () => {
    test('login and reach home route', async ({ page }) => {
      await login(page, role.email);
      await expect(page).toHaveURL(new RegExp(role.home.replace(/\//g, '\\/')));
    });
  });
}

test.describe('learner assessment flow', () => {
  test('learner can open assessments list', async ({ page }) => {
    await login(page, 'learner@skillforge.co.za');
    await page.goto('/learner-assessments');
    await expect(page.getByRole('heading', { name: /assessment/i })).toBeVisible();
  });
});

test.describe('facilitator attendance', () => {
  test('attendance page loads from API', async ({ page }) => {
    await login(page, 'facilitator@skillforge.co.za');
    await page.goto('/attendance');
    await expect(page.getByText(/attendance/i).first()).toBeVisible();
  });
});
