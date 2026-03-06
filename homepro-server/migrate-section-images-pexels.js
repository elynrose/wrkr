/**
 * Add Pexels placeholder image URLs to existing homepage_sections for tenant 1.
 * Replace with your own URLs later in Content sections Settings.
 * Run: node migrate-section-images-pexels.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const PEXELS_URLS = [
  'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/265087/pexels-photo-265087.jpeg?auto=compress&cs=tinysrgb&w=800',
];

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'homepro',
  });

  const [rows] = await conn.query(
    "SELECT setting_value FROM settings WHERE tenant_id = 1 AND setting_key = 'homepage_sections' LIMIT 1"
  );
  if (!rows.length) {
    console.log('No homepage_sections for tenant 1. Skip.');
    await conn.end();
    return;
  }

  let sections = [];
  try {
    sections = JSON.parse(rows[0].setting_value || '[]');
  } catch (_) {}

  if (!sections.length) {
    console.log('homepage_sections empty. Skip.');
    await conn.end();
    return;
  }

  sections = sections.map((sec, i) => ({
    ...sec,
    image: sec.image || PEXELS_URLS[i % PEXELS_URLS.length],
    imageOverlay: sec.imageOverlay || 'black',
  }));

  await conn.query(
    "UPDATE settings SET setting_value = ? WHERE tenant_id = 1 AND setting_key = 'homepage_sections'",
    [JSON.stringify(sections)]
  );
  console.log('Added Pexels placeholder images to %s section(s) for tenant 1.', sections.length);
  await conn.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
