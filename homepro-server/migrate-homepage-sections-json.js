/**
 * Add homepage_sections (JSON array) for add/remove/layout per section.
 * Tenant 1: populated from existing section2–7. Others: empty array.
 * Run: node migrate-homepage-sections-json.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const DEFAULT_SECTIONS_TENANT_1 = [
  { id: 's2', headline: 'A Smarter Way to Build a Local Service Business', body: 'Wrkr gives you the system to run your own local home-services lead-generation platform without building the technology from scratch.\n\nInstead of doing the actual service work, you operate the website, attract homeowners who need help, and connect them with service providers in your market.\n\nYour platform can generate revenue through: Provider subscriptions, Lead credits, One-time credit bundles, Exclusive lead access.\n\nThis is a scalable business model built around local demand.', list: [], steps: null, layout: 'default', visible: true },
  { id: 's3', headline: 'How the Business Works', body: '', list: [], steps: [
    { title: 'Launch Your Website', description: 'We help you set up your branded lead-generation website for your target city or service niche.' },
    { title: 'Attract Homeowners', description: 'Homeowners visit your site and submit requests for services like plumbing, HVAC, electrical, cleaning, roofing, and more.' },
    { title: 'Match Local Providers', description: 'The platform delivers leads to local service pros who want new customers.' },
    { title: 'Get Paid', description: 'Providers pay for access to exclusive leads through subscriptions or lead credits.' },
  ], layout: 'default', visible: true },
  { id: 's4', headline: 'We Help You Launch Faster', body: "You don't have to figure everything out alone. We help you set up the platform and show you how to position and grow the business in your market.", list: ['Website setup and branding', 'Service category configuration', 'Lead form setup', 'Provider onboarding structure', 'Payment setup', 'Notifications and automations', 'Marketing guidance', 'Local lead-generation strategy'], steps: null, layout: 'default', visible: true },
  { id: 's5', headline: 'We Show You How to Generate Leads in Your Area', body: "A lead-generation business only works when leads come in consistently. That's why we help you understand how to advertise and attract homeowners in your target market.", list: ['Reach local homeowners searching for help', 'Position your website around urgent service needs', 'Create messaging that converts visitors into leads', 'Build a steady flow of opportunities providers will pay for', 'Grow market demand in your city or niche'], steps: null, layout: 'default', visible: true },
  { id: 's6', headline: 'Why Local Providers Will Want to Join Your Platform', body: 'Service professionals are always looking for more customers. Your platform gives them a simple way to get new opportunities from homeowners already searching for help.', list: ['Exclusive single-claim leads', 'Local service-area matching', 'SMS and email notifications', 'Flexible subscriptions and credit options', 'Faster access to real customer demand'], steps: null, layout: 'default', visible: true },
  { id: 's7', headline: 'Why This Business Model Is Attractive', body: 'This model combines local marketing, recurring revenue, and scalable systems into one business.', list: ['No need to perform the home service work yourself', 'No need to build a complex platform from scratch', 'Revenue from subscriptions and lead access', 'Easy to start in one city or niche', 'Ability to expand across categories and markets', 'Automated systems for matching, notifications, and follow-up'], steps: null, layout: 'default', visible: true },
];

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'homepro',
  });

  const [tenants] = await conn.query('SELECT id FROM tenants');
  console.log('Adding homepage_sections for %s tenant(s)...', tenants.length);

  for (const t of tenants) {
    const tid = t.id;
    let sections = tid === 1 ? DEFAULT_SECTIONS_TENANT_1 : [];
    const value = JSON.stringify(sections);
    await conn.query(
      `INSERT INTO settings (tenant_id, setting_key, setting_value, setting_type, setting_group, label, description, is_public, sort_order)
       VALUES (?, 'homepage_sections', ?, 'json', 'homepage', 'Homepage sections', 'Add, remove, and arrange content sections. Each section can have a different layout.', TRUE, 0)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), setting_type = 'json'`,
      [tid, value]
    );
    console.log('  tenant_id=%s (%s sections)', tid, tid === 1 ? sections.length : 0);
  }

  await conn.end();
  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
