const { defineConfig, devices } = require('@playwright/test');
const { loadEnvConfig } = require('./config/envLoader');

const envConfig = loadEnvConfig();


const timeZone = 'Asia/Kolkata';
const timeParts = new Intl.DateTimeFormat('en-CA', {
  timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
}).formatToParts(new Date());
const timePartMap = Object.fromEntries(timeParts.map((part) => [part.type, part.value]));
const timestamp = `${timePartMap.year}-${timePartMap.month}-${timePartMap.day}_${timePartMap.hour}-${timePartMap.minute}-${timePartMap.second}`;
const reportDir = `reports/html-report-${timestamp}`;



module.exports = defineConfig({

globalSetup: require.resolve('./global-setup'),

  testDir: './tests',
  retries : 1,
  workers: 1,
  timeout: 60000,

  use: {
    baseURL: envConfig.baseURL,
    storageState: 'storageState.json',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure'
  },

  reporter: [
    ['html', { outputFolder: reportDir, open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }]
  ],

  projects: [
    {
      name: 'Desktop-Chrome',
      use: { browserName: 'chromium' }
    },
    {
      name: 'Mobile-Chrome',
      use: {
        ...devices['iPhone 13'],
      }
    },
  ]

});
