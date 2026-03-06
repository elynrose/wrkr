/**
 * Seed tenant_id=1 (Fleetwoody) home page with Wrkr lead-gen platform marketing content.
 * Run: node migrate-wrkr-homepage.js
 * Ensure .env has DB_HOST, DB_USER, DB_PASSWORD, DB_NAME if not using defaults.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const TID = 1;

const SETTINGS = [
  ['site_name', 'Wrkr', 'string', 'general'],
  ['site_tagline', 'Start Your Own Local Home Services Lead-Generation Business', 'string', 'general'],
  ['meta_title', 'Wrkr — Local Home Services Lead-Generation Platform', 'string', 'seo'],
  ['meta_description', 'Launch a branded lead-gen website that connects homeowners with local service providers. Get help with setup, marketing, and generating leads in your area.', 'string', 'seo'],
  ['hero_headline', 'Start Your Own Local Home Services Lead-Generation Business', 'string', 'homepage'],
  ['hero_subheadline', 'Launch a branded website business that connects homeowners with local service providers — and get help setting it up, marketing it, and generating leads in your area.', 'string', 'homepage'],
  ['hero_cta_primary', 'Get Started', 'string', 'homepage'],
  ['hero_cta_secondary', 'Book a Demo', 'string', 'homepage'],
  ['hero_support_text', 'We help entrepreneurs launch and grow a local lead-gen platform for plumbers, electricians, HVAC pros, cleaners, roofers, and more.', 'string', 'homepage'],
  ['section2_headline', 'A Smarter Way to Build a Local Service Business', 'string', 'homepage'],
  ['section2_body', 'Wrkr gives you the system to run your own local home-services lead-generation platform without building the technology from scratch.\n\nInstead of doing the actual service work, you operate the website, attract homeowners who need help, and connect them with service providers in your market.\n\nYour platform can generate revenue through: Provider subscriptions, Lead credits, One-time credit bundles, Exclusive lead access.\n\nThis is a scalable business model built around local demand.', 'string', 'homepage'],
  ['section3_headline', 'How the Business Works', 'string', 'homepage'],
  ['section3_steps', JSON.stringify([
    { title: 'Launch Your Website', description: 'We help you set up your branded lead-generation website for your target city or service niche.' },
    { title: 'Attract Homeowners', description: 'Homeowners visit your site and submit requests for services like plumbing, HVAC, electrical, cleaning, roofing, and more.' },
    { title: 'Match Local Providers', description: 'The platform delivers leads to local service pros who want new customers.' },
    { title: 'Get Paid', description: 'Providers pay for access to exclusive leads through subscriptions or lead credits.' },
  ]), 'json', 'homepage'],
  ['section4_headline', 'We Help You Launch Faster', 'string', 'homepage'],
  ['section4_body', 'You don\'t have to figure everything out alone. We help you set up the platform and show you how to position and grow the business in your market.', 'string', 'homepage'],
  ['section4_list', JSON.stringify([
    'Website setup and branding',
    'Service category configuration',
    'Lead form setup',
    'Provider onboarding structure',
    'Payment setup',
    'Notifications and automations',
    'Marketing guidance',
    'Local lead-generation strategy',
  ]), 'json', 'homepage'],
  ['section5_headline', 'We Show You How to Generate Leads in Your Area', 'string', 'homepage'],
  ['section5_body', 'A lead-generation business only works when leads come in consistently. That\'s why we help you understand how to advertise and attract homeowners in your target market.', 'string', 'homepage'],
  ['section5_list', JSON.stringify([
    'Reach local homeowners searching for help',
    'Position your website around urgent service needs',
    'Create messaging that converts visitors into leads',
    'Build a steady flow of opportunities providers will pay for',
    'Grow market demand in your city or niche',
  ]), 'json', 'homepage'],
  ['section6_headline', 'Why Local Providers Will Want to Join Your Platform', 'string', 'homepage'],
  ['section6_body', 'Service professionals are always looking for more customers. Your platform gives them a simple way to get new opportunities from homeowners already searching for help.', 'string', 'homepage'],
  ['section6_list', JSON.stringify([
    'Exclusive single-claim leads',
    'Local service-area matching',
    'SMS and email notifications',
    'Flexible subscriptions and credit options',
    'Faster access to real customer demand',
  ]), 'json', 'homepage'],
  ['section7_headline', 'Why This Business Model Is Attractive', 'string', 'homepage'],
  ['section7_body', 'This model combines local marketing, recurring revenue, and scalable systems into one business.', 'string', 'homepage'],
  ['section7_list', JSON.stringify([
    'No need to perform the home service work yourself',
    'No need to build a complex platform from scratch',
    'Revenue from subscriptions and lead access',
    'Easy to start in one city or niche',
    'Ability to expand across categories and markets',
    'Automated systems for matching, notifications, and follow-up',
  ]), 'json', 'homepage'],
];

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'homepro',
  });

  console.log('Updating tenant_id=%s (Fleetwoody) homepage marketing settings...', TID);

  for (const [key, value, type, group] of SETTINGS) {
    await conn.query(
      `INSERT INTO settings (tenant_id, setting_key, setting_value, setting_type, setting_group, is_public, sort_order)
       VALUES (?, ?, ?, ?, ?, TRUE, 0)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), setting_type = VALUES(setting_type), setting_group = VALUES(setting_group)`,
      [TID, key, value, type, group]
    );
    console.log('  %s', key);
  }

  await conn.end();
  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
