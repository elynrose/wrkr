/**
 * Send a test SMS to a verified number.
 * Usage: node scripts/test-sms.js +15551234567
 * Uses Twilio settings from the database (run from server root).
 */
require('dotenv').config();
const path = require('path');
process.chdir(path.join(__dirname, '..'));

const { sendSMS, isConfigured } = require('../services/sms');
const { getSiteConfig } = require('../services/siteConfig');

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.log('Usage: node scripts/test-sms.js +15551234567');
    console.log('Use your Twilio verified caller number (e.g. +1xxxxxxxxxx).');
    process.exit(1);
  }

  const configured = await isConfigured();
  if (!configured) {
    console.error('Twilio is not configured. Set Account SID, Auth Token, and Phone Number in Admin > Settings > Twilio.');
    process.exit(1);
  }

  const site = await getSiteConfig();
  const body = `Test SMS from ${site.site_name}. Twilio is connected and working.`;
  console.log('Sending to:', to);
  console.log('Body:', body);

  try {
    const result = await sendSMS(to.trim(), body);
    console.log(result.mock ? '[MOCK] SMS not sent (Twilio disabled or not configured).' : 'Sent! SID:', result.sid);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
