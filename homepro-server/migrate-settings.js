require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'homepro',
    multipleStatements: true,
  });

  console.log('Connected to MySQL');

  const sql = `
    CREATE TABLE IF NOT EXISTS settings (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      setting_key   VARCHAR(120) UNIQUE NOT NULL,
      setting_value TEXT,
      setting_type  ENUM('string','number','boolean','json','secret') DEFAULT 'string',
      setting_group ENUM('general','stripe','twilio','homepage','seo','email','appearance','advanced') DEFAULT 'general',
      label         VARCHAR(200),
      description   TEXT,
      is_public     BOOLEAN DEFAULT TRUE,
      sort_order    INT DEFAULT 0,
      updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

    -- Seed default settings
    INSERT IGNORE INTO settings (setting_key, setting_value, setting_type, setting_group, label, description, is_public, sort_order) VALUES
      -- General
      ('site_name',           'HomePro',                              'string',  'general',    'Site Name',              'Name shown in header and emails',                  TRUE,  1),
      ('site_tagline',        'Find Trusted Local Service Professionals', 'string', 'general', 'Tagline',                'Shown below logo on some pages',                   TRUE,  2),
      ('support_email',       'support@homepro.com',                  'string',  'general',    'Support Email',          'Contact email for customers',                      TRUE,  3),
      ('support_phone',       '1-800-HOMEPRO',                        'string',  'general',    'Support Phone',          'Contact phone number',                             TRUE,  4),
      ('max_lead_claims',     '4',                                    'number',  'general',    'Max Lead Claims',        'Maximum pros that can claim a single lead',         TRUE,  5),
      ('lead_credit_price',   '3.00',                                 'number',  'general',    'Lead Credit Price ($)',   'Price per individual lead credit',                  TRUE,  6),

      -- Stripe
      ('stripe_public_key',   '',                                     'string',  'stripe',     'Stripe Publishable Key', 'pk_live_... or pk_test_...',                        TRUE,  1),
      ('stripe_secret_key',   '',                                     'secret',  'stripe',     'Stripe Secret Key',      'sk_live_... or sk_test_... (never shared publicly)', FALSE, 2),
      ('stripe_webhook_secret','',                                    'secret',  'stripe',     'Webhook Secret',         'whsec_... from Stripe dashboard',                  FALSE, 3),
      ('stripe_mode',         'test',                                 'string',  'stripe',     'Stripe Mode',            'test or live',                                     TRUE,  4),

      -- Homepage
      ('hero_title',          'Find Trusted Local Pros\\nFor Any Home Project', 'string', 'homepage', 'Hero Title',      'Main heading on the homepage hero (use \\\\n for line break)', TRUE, 1),
      ('hero_subtitle',       'Connect with verified, reviewed professionals in your area. Get free quotes in minutes — not hours.', 'string', 'homepage', 'Hero Subtitle', 'Text below the hero heading', TRUE, 2),
      ('hero_cta_text',       'Get Started Free',                     'string',  'homepage',   'Hero CTA Button',        'Text on the main call-to-action button',            TRUE,  3),
      ('hero_trust_text',     '50,000+ projects completed',           'string',  'homepage',   'Trust Badge Text',       'Social proof text in the hero area',                TRUE,  4),
      ('show_how_it_works',   'true',                                 'boolean', 'homepage',   'Show How It Works',      'Toggle the How It Works section on/off',            TRUE,  5),
      ('show_service_scroll', 'true',                                 'boolean', 'homepage',   'Show Service Scroller',  'Toggle the popular services scroller on/off',       TRUE,  6),
      ('featured_services',   '[]',                                   'json',    'homepage',   'Featured Service IDs',   'JSON array of service IDs to feature',              TRUE,  7),

      -- SEO
      ('meta_title',          'HomePro — Find Trusted Local Service Professionals', 'string', 'seo', 'Meta Title',       'Browser tab / search engine title',                 TRUE,  1),
      ('meta_description',    'Connect with verified local pros for plumbing, electrical, HVAC, roofing, and more. Free quotes in minutes.', 'string', 'seo', 'Meta Description', 'Search engine description', TRUE, 2),
      ('meta_keywords',       'home services, plumber, electrician, HVAC, handyman, contractor', 'string', 'seo', 'Meta Keywords', 'Comma-separated keywords', TRUE, 3),

      -- Email
      ('email_from_name',     'HomePro',                              'string',  'email',      'From Name',              'Sender name on outgoing emails',                    FALSE, 1),
      ('email_from_address',  'noreply@homepro.com',                  'string',  'email',      'From Address',           'Sender email address',                              FALSE, 2),
      ('smtp_host',           '',                                     'string',  'email',      'SMTP Host',              'SMTP server hostname (e.g. smtp.gmail.com)',          FALSE, 3),
      ('smtp_port',           '587',                                  'number',  'email',      'SMTP Port',              'SMTP port (587 for TLS, 465 for SSL, 25 for plain)',  FALSE, 4),
      ('smtp_secure',         'false',                                'boolean', 'email',      'Use SSL',                'Use SSL/TLS (true for port 465, false for STARTTLS on 587)', FALSE, 5),
      ('smtp_user',           '',                                     'string',  'email',      'SMTP Username',          'SMTP authentication username',                        FALSE, 6),
      ('smtp_password',       '',                                     'secret',  'email',      'SMTP Password',          'SMTP authentication password or app password',         FALSE, 7),
      ('email_enabled',       'false',                                'boolean', 'email',      'Email Enabled',          'Enable sending emails (disable to use mock/log mode)', TRUE,  8),

      -- Twilio
      ('twilio_account_sid',  '',                                     'secret',  'twilio',     'Account SID',            'Your Twilio Account SID (ACxxxxxxx)',                 FALSE, 1),
      ('twilio_auth_token',   '',                                     'secret',  'twilio',     'Auth Token',             'Your Twilio Auth Token',                              FALSE, 2),
      ('twilio_phone_number', '',                                     'string',  'twilio',     'Phone Number',           'Twilio phone number to send SMS from (e.g. +15551234567)', FALSE, 3),
      ('twilio_enabled',      'false',                                'boolean', 'twilio',     'SMS Enabled',            'Enable Twilio SMS notifications for lead matching',    TRUE, 4),
      ('match_notify_count',  '8',                                    'number',  'twilio',     'Match Notify Count',     'Number of top-scoring pros to notify per lead',        TRUE, 5),
      ('match_expiry_hours',  '4',                                    'number',  'twilio',     'Match Expiry (hours)',    'Hours before a lead match expires for a pro',          TRUE, 6),

      -- Appearance
      ('default_theme',       'blue',                                 'string',  'appearance', 'Default Theme',          'Default color theme: blue, green, purple, red, teal', TRUE, 1),
      ('default_dark_mode',   'false',                                'boolean', 'appearance', 'Default Dark Mode',      'Enable dark mode by default',                       TRUE,  2),
      ('default_font',        'inter',                                'string',  'appearance', 'Default Font',           'Default font family: inter, poppins, roboto',        TRUE,  3),

      -- Spam / Security
      ('spam_rate_limit_window',     '15',    'number',  'advanced', 'Rate Limit Window (min)',   'Time window for rate limiting in minutes',                         TRUE, 1),
      ('spam_rate_limit_max_leads',  '10',    'number',  'advanced', 'Max Lead Submissions',      'Max lead submissions per IP per window',                           TRUE, 2),
      ('spam_rate_limit_max_register','10',   'number',  'advanced', 'Max Registrations',         'Max registrations per IP per window',                              TRUE, 3),
      ('spam_rate_limit_max_login',  '15',    'number',  'advanced', 'Max Login Attempts',        'Max login attempts per IP per window',                             TRUE, 4),
      ('spam_min_submit_time',       '3',     'number',  'advanced', 'Min Submit Time (sec)',      'Minimum seconds before a form can be submitted (bot detection)',   TRUE, 5),
      ('spam_honeypot_enabled',      'true',  'boolean', 'advanced', 'Honeypot Enabled',          'Enable honeypot field validation on forms',                        TRUE, 6),
      ('spam_link_check_enabled',    'true',  'boolean', 'advanced', 'Link Spam Check',           'Block submissions with excessive URLs',                            TRUE, 7),
      ('spam_max_links',             '5',     'number',  'advanced', 'Max Links Per Form',        'Maximum number of URLs allowed in a single form submission',       TRUE, 8);
  `;

  try {
    await conn.query(sql);
    console.log('Settings table created and seeded!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await conn.end();
  }
}

main();
