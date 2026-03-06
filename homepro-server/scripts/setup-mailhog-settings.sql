-- Run this to configure tenant 1 for MailHog (local Docker email testing)
-- Execute: mysql homepro < scripts/setup-mailhog-settings.sql
-- Or run the UPDATEs manually in your DB client.

UPDATE settings SET setting_value = 'true' WHERE setting_key = 'email_enabled' AND tenant_id = 1;
UPDATE settings SET setting_value = 'localhost' WHERE setting_key = 'smtp_host' AND tenant_id = 1;
UPDATE settings SET setting_value = '1025' WHERE setting_key = 'smtp_port' AND tenant_id = 1;
UPDATE settings SET setting_value = 'false' WHERE setting_key = 'smtp_secure' AND tenant_id = 1;
UPDATE settings SET setting_value = '' WHERE setting_key = 'smtp_user' AND tenant_id = 1;
UPDATE settings SET setting_value = '' WHERE setting_key = 'smtp_password' AND tenant_id = 1;

-- Insert or update (run migrate-settings.js first if settings table is empty)
INSERT INTO settings (tenant_id, setting_key, setting_value, setting_type, setting_group, label, is_public)
VALUES
  (1, 'email_enabled', 'true', 'boolean', 'email', 'Enable Email', FALSE),
  (1, 'smtp_host', 'localhost', 'string', 'email', 'SMTP Host', FALSE),
  (1, 'smtp_port', '1025', 'number', 'email', 'SMTP Port', FALSE),
  (1, 'smtp_secure', 'false', 'boolean', 'email', 'Use SSL', FALSE),
  (1, 'smtp_user', '', 'string', 'email', 'SMTP Username', FALSE),
  (1, 'smtp_password', '', 'secret', 'email', 'SMTP Password', FALSE)
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
