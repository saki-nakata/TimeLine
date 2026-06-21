import { test as base, Page } from '@playwright/test';
import { STORAGE_STATE_PATH, STORAGE_STATE_BOB_PATH } from './constants';

type E2EFixtures = {
  alicePage: Page;
  bobPage: Page;
};

export const test = base.extend<E2EFixtures>({
  alicePage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  bobPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_BOB_PATH });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
