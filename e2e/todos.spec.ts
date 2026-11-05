import { test, expect, failNext } from './fixtures';

const todos = [
  { title: 'Water plants' },
  { title: 'Pay rent', completed: true },
  { title: 'Call mum' }
];

test.describe('empty list', () => {
  test('adds a task with the keyboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Tauri Todo');
    await expect(page.getByText('No tasks yet')).toBeVisible();

    await page.getByLabel('New task').fill('  Buy milk ');
    await page.getByLabel('New task').press('Enter');

    await expect(page.getByRole('list', { name: 'Tasks' }).getByRole('listitem')).toHaveCount(1);
    await expect(page.getByText('Buy milk', { exact: true })).toBeVisible();
    await expect(page.getByLabel('New task')).toHaveValue('');
    await expect(page.getByRole('status').filter({ hasText: 'left' })).toHaveText('1 item left');
  });

  test('keeps Add disabled for blank input', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('New task').fill('   ');
    await expect(page.getByRole('button', { name: 'Add' })).toBeDisabled();
  });
});

test.describe('with tasks', () => {
  test.use({ seed: { todos } });

  test('toggles a task and updates the count', async ({ page }) => {
    await page.goto('/');
    const counter = page.getByRole('status').filter({ hasText: 'left' });
    await expect(counter).toHaveText('2 items left');

    await page.getByRole('checkbox', { name: 'Water plants' }).check();
    await expect(page.getByRole('checkbox', { name: 'Water plants' })).toBeChecked();
    await expect(counter).toHaveText('1 item left');

    await page.getByRole('checkbox', { name: 'Water plants' }).uncheck();
    await expect(counter).toHaveText('2 items left');
  });

  test('edits a title with the edit button and saves on Enter', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Edit Water plants', exact: true }).click();
    const field = page.getByRole('textbox', { name: 'Edit task title' });
    await field.fill('Water the plants');
    await field.press('Enter');
    await expect(page.getByText('Water the plants', { exact: true })).toBeVisible();
    await expect(page.getByText('Water plants', { exact: true })).toHaveCount(0);
  });

  test('Escape cancels an edit', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Edit Call mum', exact: true }).click();
    const field = page.getByRole('textbox', { name: 'Edit task title' });
    await field.fill('Something else');
    await field.press('Escape');
    await expect(page.getByText('Call mum', { exact: true })).toBeVisible();
    await expect(page.getByText('Something else')).toHaveCount(0);
  });

  test('saving an empty title deletes the task', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Edit Call mum', exact: true }).click();
    const field = page.getByRole('textbox', { name: 'Edit task title' });
    await field.fill('');
    await field.press('Enter');
    await expect(page.getByText('Call mum')).toHaveCount(0);
  });

  test('filters active and completed', async ({ page }) => {
    await page.goto('/');
    const list = page.getByRole('list', { name: 'Tasks' });
    await expect(list.getByRole('listitem')).toHaveCount(3);

    await page
      .getByRole('button', { name: 'Active', exact: true })
      .filter({ visible: true })
      .click();
    await expect(list.getByRole('listitem')).toHaveCount(2);
    await expect(page.getByText('Pay rent')).toHaveCount(0);

    await page
      .getByRole('button', { name: 'Completed', exact: true })
      .filter({ visible: true })
      .click();
    await expect(list.getByRole('listitem')).toHaveCount(1);
    await expect(page.getByText('Pay rent', { exact: true })).toBeVisible();
  });

  test('deletes a task', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Delete Water plants', exact: true }).click();
    await expect(page.getByText('Water plants')).toHaveCount(0);
    await expect(page.getByRole('list', { name: 'Tasks' }).getByRole('listitem')).toHaveCount(2);
  });

  test('clears completed tasks', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Clear completed' }).filter({ visible: true }).click();
    await expect(page.getByText('Pay rent')).toHaveCount(0);
    await expect(page.getByRole('list', { name: 'Tasks' }).getByRole('listitem')).toHaveCount(2);
    await expect(
      page.getByRole('button', { name: 'Clear completed' }).filter({ visible: true })
    ).toBeDisabled();
  });

  test('shows a validation error toast and rolls the edit back', async ({ page }) => {
    await page.goto('/');
    // Wait for the initial load so the injected failure hits the toggle, not list_todos.
    await expect(page.getByRole('list', { name: 'Tasks' })).toBeVisible();
    await failNext(page, 'validation', 'Title cannot be empty.');
    await page.getByRole('checkbox', { name: 'Water plants' }).click();

    const toast = page.getByRole('alert');
    await expect(toast).toContainText('Title cannot be empty.');
    await expect(page.getByRole('checkbox', { name: 'Water plants' })).not.toBeChecked();

    await toast.getByRole('button', { name: 'Dismiss' }).click();
    await expect(toast).toHaveCount(0);
  });
});

test.describe('layout', () => {
  test('sidebar shows at desktop width and is hidden below it', async ({ page }) => {
    await page.goto('/');
    const width = page.viewportSize()!.width;
    const sidebar = page.getByTestId('sidebar');
    if (width >= 1024) {
      await expect(sidebar).toBeVisible();
    } else {
      await expect(sidebar).toBeHidden();
      await expect(
        page.getByRole('button', { name: 'Active', exact: true }).filter({ visible: true })
      ).toBeVisible();
    }
  });
});
