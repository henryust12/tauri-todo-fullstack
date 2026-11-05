import { browser, expect, $, $$ } from '@wdio/globals';

const taskTitles = async () => $$('ul[aria-label="Tasks"] li .text').map((el) => el.getText());

// Filter and footer controls are rendered twice (sidebar and inline); only one is visible.
async function clickVisible(selector, text) {
  for (const button of await $$(selector)) {
    if ((await button.getText()).startsWith(text) && (await button.isDisplayed())) {
      await button.click();
      return;
    }
  }
  throw new Error(`No visible button "${text}"`);
}

async function addTask(title) {
  await $('#new-todo').setValue(title);
  await $('button=Add').click();
  await browser.waitUntil(async () => (await taskTitles()).includes(title), {
    timeoutMsg: `"${title}" was not listed`
  });
  // Rows are optimistic and locked until the backend confirms them.
  await browser.waitUntil(async () => (await $$('li.pending')).length === 0);
}

// The checkbox itself is visually hidden; click its label.
const toggle = async (title) => $(`input[aria-label="${title}"]`).$('..').click();

describe('Tauri Todo (native)', () => {
  it('starts with an empty list', async () => {
    await $('#new-todo').waitForExist();
    expect(await taskTitles()).toEqual([]);
  });

  it('adds, toggles, renames, filters, deletes and clears tasks', async () => {
    await addTask('Water plants');
    await addTask('Pay rent');
    await addTask('Call mum');
    expect(await taskTitles()).toHaveLength(3);

    await toggle('Pay rent');
    await expect($('input[aria-label="Pay rent"]')).toBeSelected();

    await $('button[aria-label="Edit Call mum"]').click();
    await $('input[aria-label="Edit task title"]').waitForExist();
    // The field autofocuses; setValue would blur it and close the editor, so type instead.
    // Avoid doubled letters in the new title: browser.keys drops repeated characters.
    await browser.keys(['Control', 'a']);
    await browser.keys([...'Ring dad']);
    await browser.keys('Enter');
    await browser.waitUntil(async () => (await taskTitles()).includes('Ring dad'));
    expect(await taskTitles()).not.toContain('Call mum');

    await clickVisible('[aria-label="Filter tasks"] button', 'Active');
    await browser.waitUntil(async () => (await taskTitles()).length === 2);
    expect(await taskTitles()).not.toContain('Pay rent');

    await clickVisible('[aria-label="Filter tasks"] button', 'Completed');
    await browser.waitUntil(async () => (await taskTitles()).length === 1);
    expect(await taskTitles()).toEqual(['Pay rent']);

    await clickVisible('[aria-label="Filter tasks"] button', 'All');
    await browser.waitUntil(async () => (await taskTitles()).length === 3);

    await $('button[aria-label="Delete Water plants"]').click();
    await browser.waitUntil(async () => !(await taskTitles()).includes('Water plants'));

    await clickVisible('button', 'Clear completed');
    await browser.waitUntil(async () => !(await taskTitles()).includes('Pay rent'));
    expect(await taskTitles()).toEqual(['Ring dad']);
  });

  it('keeps the remaining tasks after the app restarts (SQLite persistence)', async () => {
    await addTask('Persist me');
    await browser.reloadSession();

    await browser.waitUntil(async () => (await taskTitles()).length === 2, {
      timeoutMsg: 'tasks were not loaded after restart'
    });
    expect(await taskTitles()).toEqual(['Ring dad', 'Persist me']);
  });
});
