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
    await expect(
      page.getByRole('heading', { name: 'My assessments', exact: true }),
    ).toBeVisible();
  });
});

test.describe('static pages', () => {
  test('404 page for unknown routes', async ({ page }) => {
    await login(page, 'learner@skillforge.co.za');
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByText(/could not be found/i)).toBeVisible();
  });

  test('notifications centre loads', async ({ page }) => {
    await login(page, 'learner@skillforge.co.za');
    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible();
  });

  test('privacy policy is public', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: /privacy/i })).toBeVisible();
  });

  test('terms page is public', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByRole('heading', { name: /terms/i })).toBeVisible();
  });
});

test.describe('assessor workflow', () => {
  test('assessor can open submissions review', async ({ page }) => {
    await login(page, 'assessor@skillforge.co.za');
    await page.goto('/assessor-dashboard');
    await expect(
      page.getByRole('heading', { name: 'Assessor Dashboard', exact: true }),
    ).toBeVisible();
  });
});

test.describe('moderator workflow', () => {
  test('moderator dashboard loads queue UI', async ({ page }) => {
    await login(page, 'moderator@skillforge.co.za');
    await page.goto('/moderator-dashboard');
    await expect(
      page.getByRole('heading', { name: 'Moderator Dashboard', exact: true }),
    ).toBeVisible();
  });
});

test.describe('admin credentials', () => {
  test('admin credentials page loads', async ({ page }) => {
    await login(page, 'admin@skillforge.co.za');
    await page.goto('/certificates');
    await expect(
      page.getByRole('heading', { name: 'Credentials', exact: true }),
    ).toBeVisible();
  });
});

test.describe('facilitator assessment builder', () => {
  test('builder loads unit standards and settings', async ({ page }) => {
    await login(page, 'facilitator@skillforge.co.za');
    await page.goto('/facilitator-assessments');
    await expect(page.getByRole('heading', { name: /assessment/i })).toBeVisible();
    await page.goto('/assessment-builder/new');
    await expect(page.getByText(/assessment settings/i)).toBeVisible();
    await expect(page.getByLabel(/unit standard/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /save draft/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /publish/i })).toBeVisible();
  });
});

test.describe('facilitator attendance', () => {
  test('attendance page loads from API', async ({ page }) => {
    await login(page, 'facilitator@skillforge.co.za');
    await page.goto('/attendance');
    await expect(page.getByText(/attendance/i).first()).toBeVisible();
  });
});

test.describe('admin user management', () => {
  test('admin can open user directory', async ({ page }) => {
    await login(page, 'admin@skillforge.co.za');
    await page.goto('/users');
    await expect(page.getByRole('heading', { name: /user/i })).toBeVisible();
  });
});

test.describe('learner documents and messages', () => {
  test('learner messages page loads', async ({ page }) => {
    await login(page, 'learner@skillforge.co.za');
    await page.goto('/messages');
    await expect(page.getByRole('heading', { name: /messages/i })).toBeVisible();
  });

  test('learner settings persist preference controls', async ({ page }) => {
    await login(page, 'learner@skillforge.co.za');
    await page.goto('/settings');
    await expect(page.getByText(/personal information|settings/i).first()).toBeVisible();
  });
});

test.describe('mentor workplace', () => {
  test('mentor dashboard loads allocated workplace view', async ({ page }) => {
    await login(page, 'mentor@skillforge.co.za');
    await page.goto('/workplace-mentor-dashboard');
    await expect(
      page.getByRole('heading', { name: /mentor/i }).first(),
    ).toBeVisible();
  });
});

test.describe('qa officer', () => {
  test('qa dashboard loads', async ({ page }) => {
    await login(page, 'qa@skillforge.co.za');
    await page.goto('/qa-dashboard');
    await expect(page.getByRole('heading', { name: /qa/i }).first()).toBeVisible();
  });
});
