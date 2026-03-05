require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'homepro',
  });

  await conn.query(`
    INSERT IGNORE INTO settings (setting_key, setting_value, setting_type, setting_group, label, description, is_public, sort_order) VALUES
      ('spam_rate_limit_window',     '15',    'number',  'advanced', 'Rate Limit Window (min)',  'Time window for rate limiting in minutes',                    TRUE, 1),
      ('spam_rate_limit_max_leads',  '10',    'number',  'advanced', 'Max Lead Submissions',     'Max lead submissions per IP per window',                      TRUE, 2),
      ('spam_rate_limit_max_register','10',   'number',  'advanced', 'Max Registrations',        'Max registrations per IP per window',                         TRUE, 3),
      ('spam_rate_limit_max_login',  '15',    'number',  'advanced', 'Max Login Attempts',       'Max login attempts per IP per window',                        TRUE, 4),
      ('spam_min_submit_time',       '3',     'number',  'advanced', 'Min Submit Time (sec)',     'Minimum seconds before a form can be submitted (bot detection)', TRUE, 5),
      ('spam_honeypot_enabled',      'true',  'boolean', 'advanced', 'Honeypot Enabled',         'Enable honeypot field validation on forms',                    TRUE, 6),
      ('spam_link_check_enabled',    'true',  'boolean', 'advanced', 'Link Spam Check',          'Block submissions with excessive URLs',                        TRUE, 7),
      ('spam_max_links',             '5',     'number',  'advanced', 'Max Links Per Form',       'Maximum number of URLs allowed in a single form submission',   TRUE, 8)
  `);

  console.log('Spam protection settings inserted');
  await conn.end();
}

main().catch(console.error);
