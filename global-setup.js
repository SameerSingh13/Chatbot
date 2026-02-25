const { chromium } = require('@playwright/test');
const path = require('path');
const { loadEnvConfig } = require('./config/envLoader');

module.exports = async () => {
  const envConfig = loadEnvConfig();

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(envConfig.baseURL, { waitUntil: 'networkidle' });

  const acceptButton = page.getByRole('button', { name: 'Accept and continue' });
  const storagePath = path.resolve(__dirname, 'storageState.json');

  try {
    await acceptButton.waitFor({ state: 'visible', timeout: 5000 });
    await acceptButton.click();
    await acceptButton.waitFor({ state: 'hidden', timeout: 5000 });
    await page.waitForLoadState('networkidle');
  } catch (error) {
    console.log('No cookie banner found during global setup.');
  }

  await context.storageState({ path: storagePath });

  await browser.close();
};
