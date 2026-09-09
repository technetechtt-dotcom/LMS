import { test, expect } from '@playwright/test';

const PASSWORD = 'Password123!';
const OPS_BASE_URL = process.env.PLAYWRIGHT_OPS_BASE_URL ?? 'http://localhost:5177';

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

  test('Add Question is operable from the keyboard', async ({ page }) => {
    await login(page, 'facilitator@skillforge.co.za');
    await page.goto('/assessment-builder/new');
    const addQuestion = page.getByText('Add Question', { exact: true });
    await addQuestion.focus();
    await addQuestion.press('Enter');
    await expect(page.getByRole('button', { name: 'Multiple Choice' })).toBeVisible();
    await page.getByRole('button', { name: 'Multiple Choice' }).click();
    await expect(page.getByRole('heading', { name: 'Questions (1)' })).toBeVisible();
  });
});

test.describe('independent login sessions', () => {
  test('a second login does not revoke the first browser session', async ({ browser }) => {
    const firstContext = await browser.newContext();
    const secondContext = await browser.newContext();
    const firstPage = await firstContext.newPage();
    const secondPage = await secondContext.newPage();
    try {
      await login(firstPage, 'learner@skillforge.co.za');
      await login(secondPage, 'learner@skillforge.co.za');
      await firstPage.goto('/settings');
      await expect(firstPage).not.toHaveURL(/\/login/);
      await expect(firstPage.getByText(/personal information|settings/i).first()).toBeVisible();
    } finally {
      await firstContext.close();
      await secondContext.close();
    }
  });

  test('an invalid access token is refreshed and the route resumes', async ({ page }) => {
    await login(page, 'learner@skillforge.co.za');
    await page.evaluate(() => {
      const key = 'skillforge_auth_v1';
      const saved = JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, unknown>;
      localStorage.setItem(key, JSON.stringify({ ...saved, accessToken: 'expired-test-token' }));
    });
    await page.reload();
    await expect(page).toHaveURL(/\/learner-dashboard/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('LMS and Ops sessions coexist in one browser profile', async ({ page, context }) => {
    await login(page, 'admin@skillforge.co.za');
    const opsPage = await context.newPage();
    await opsPage.goto(`${OPS_BASE_URL}/login`);
    await opsPage.getByLabel('Operator email').fill('platform@skillforge.co.za');
    await opsPage.getByLabel('Password').fill(PASSWORD);
    await opsPage.getByRole('button', { name: /sign in to ops console/i }).click();
    await opsPage.waitForURL((url) => url.origin === OPS_BASE_URL && url.pathname === '/');
    await expect(opsPage.getByRole('heading', { name: /ops overview/i })).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: /dashboard/i }).first()).toBeVisible();
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
    await page.getByRole('button', { name: 'Notifications' }).click();
    const assessmentPreference = page.getByRole('checkbox', {
      name: 'Assessment submissions',
    });
    const initial = await assessmentPreference.isChecked();
    await assessmentPreference.setChecked(!initial);
    await page.getByRole('button', { name: 'Save Preferences' }).click();
    await expect(page.getByText('Preferences saved')).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'Notifications' }).click();
    await expect(assessmentPreference).toBeChecked({ checked: !initial });
  });
});

test.describe('persisted reporting workflow', () => {
  test('admin generates, downloads and deletes a persisted report', async ({ page }) => {
    await login(page, 'admin@skillforge.co.za');
    await page.goto('/reports');
    await page.getByRole('button', { name: 'Generate New Report' }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Generate Report', exact: true }).click();
    await download;
    const row = page.getByText('SETA operational snapshot').first();
    await expect(row).toBeVisible();
    await page.getByRole('button', { name: /Delete SETA operational snapshot/i }).first().click();
    await expect(row).not.toBeVisible();
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
