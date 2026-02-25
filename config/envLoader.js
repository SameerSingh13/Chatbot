const fs = require('fs');
const path = require('path');

// Load .env file if it exists
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
} catch {
  // dotenv not required if .env.local doesn't exist
}

function loadEnvConfig() {
  const env = process.env.TEST_ENV || 'qa';
  const filePath = path.resolve(__dirname, `${env}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Environment config file not found: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

module.exports = { loadEnvConfig };
