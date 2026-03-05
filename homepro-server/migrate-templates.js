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

  await conn.query(`
    CREATE TABLE IF NOT EXISTS notification_templates (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      slug          VARCHAR(120) UNIQUE NOT NULL,
      name          VARCHAR(200) NOT NULL,
      channel       ENUM('email','sms') NOT NULL DEFAULT 'email',
      subject       VARCHAR(300),
      body          TEXT NOT NULL,
      description   VARCHAR(500),
      variables     TEXT,
      is_active     BOOLEAN DEFAULT TRUE,
      updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Table created');

  const templates = [
    // ── Email templates ──
    {
      slug: 'welcome_consumer',
      name: 'Welcome Email (Consumer)',
      channel: 'email',
      subject: 'Welcome to HomePro!',
      description: 'Sent to consumers after registration',
      variables: 'firstName, email, role, dashboardUrl',
      body: `<p>Hi {{firstName}},</p>
<p>Thanks for creating your HomePro account. You're all set to find trusted local professionals for your home projects.</p>
<p>Your account details:</p>
<ul>
  <li><strong>Email:</strong> {{email}}</li>
  <li><strong>Account type:</strong> Homeowner</li>
</ul>
<div style="text-align:center;margin:24px 0;">
  <a href="{{dashboardUrl}}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Go to Dashboard</a>
</div>`,
    },
    {
      slug: 'welcome_pro',
      name: 'Welcome Email (Pro)',
      channel: 'email',
      subject: 'Welcome to HomePro, {{businessName}}!',
      description: 'Sent to service professionals after registration',
      variables: 'firstName, businessName, email, credits, dashboardUrl',
      body: `<p>Hi {{firstName}},</p>
<p>Your pro account for <strong>{{businessName}}</strong> is now active! Here's what happens next:</p>
<ol>
  <li>Leads in your service areas will be matched to you automatically</li>
  <li>You'll receive SMS and email notifications for new matches</li>
  <li>Claim leads you're interested in using your lead credits</li>
  <li>Build your reputation with great work and 5-star reviews</li>
</ol>
<p><strong>Your starting credits:</strong> {{credits}}</p>
<div style="text-align:center;margin:24px 0;">
  <a href="{{dashboardUrl}}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;">View Your Dashboard</a>
</div>`,
    },
    {
      slug: 'password_changed',
      name: 'Password Changed',
      channel: 'email',
      subject: 'Your HomePro password was changed',
      description: 'Sent after a user changes their password',
      variables: 'firstName',
      body: `<p>Hi {{firstName}},</p>
<p>Your HomePro password was just changed. If you made this change, no action is needed.</p>
<p style="color:#dc2626;font-weight:600;">If you did not change your password, please contact our support team immediately at {{supportEmail}}.</p>`,
    },
    {
      slug: 'new_lead_submitted',
      name: 'New Lead Submitted',
      channel: 'email',
      subject: 'Your HomePro service request has been received',
      description: 'Sent to consumers when they submit a service request',
      variables: 'serviceName, customerName, zip, urgency, description',
      body: `<p>A new service request has been submitted:</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:8px 0;color:#64748b;width:120px;">Service</td><td style="padding:8px 0;color:#1e293b;font-weight:600;">{{serviceName}}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">Customer</td><td style="padding:8px 0;color:#1e293b;">{{customerName}}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">ZIP Code</td><td style="padding:8px 0;color:#1e293b;">{{zip}}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">Urgency</td><td style="padding:8px 0;color:#1e293b;">{{urgency}}</td></tr>
</table>
{{#description}}<p><strong>Description:</strong> {{description}}</p>{{/description}}`,
    },
    {
      slug: 'lead_claimed_customer',
      name: 'Lead Claimed (Customer)',
      channel: 'email',
      subject: 'A pro has responded to your {{serviceName}} request!',
      description: 'Sent to the customer when a pro claims their lead',
      variables: 'serviceName, businessName, avgRating, totalReviews, proPhone, maxClaims',
      body: `<p>Great news! A verified professional has expressed interest in your {{serviceName}} request.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f8fafc;border-radius:8px;padding:16px;">
  <tr><td style="padding:8px 16px;color:#64748b;">Business</td><td style="padding:8px 16px;color:#1e293b;font-weight:600;">{{businessName}}</td></tr>
  <tr><td style="padding:8px 16px;color:#64748b;">Rating</td><td style="padding:8px 16px;color:#1e293b;">{{avgRating}}</td></tr>
  {{#proPhone}}<tr><td style="padding:8px 16px;color:#64748b;">Phone</td><td style="padding:8px 16px;color:#1e293b;">{{proPhone}}</td></tr>{{/proPhone}}
</table>
<p>The pro may reach out to you shortly. You can expect up to {{maxClaims}} pros total to respond to your request.</p>`,
    },
    {
      slug: 'lead_claimed_pro',
      name: 'Lead Claimed (Pro)',
      channel: 'email',
      subject: 'Lead claimed: {{serviceName}} in {{zip}}',
      description: 'Sent to the pro after they successfully claim a lead',
      variables: 'businessName, serviceName, customerName, customerEmail, customerPhone, zip, description, dashboardUrl',
      body: `<p>Hi {{businessName}},</p>
<p>You've successfully claimed a lead. Here are the customer details:</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:8px 0;color:#64748b;width:120px;">Service</td><td style="padding:8px 0;color:#1e293b;font-weight:600;">{{serviceName}}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">Customer</td><td style="padding:8px 0;color:#1e293b;">{{customerName}}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">Email</td><td style="padding:8px 0;color:#1e293b;">{{customerEmail}}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">Phone</td><td style="padding:8px 0;color:#1e293b;">{{customerPhone}}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">ZIP Code</td><td style="padding:8px 0;color:#1e293b;">{{zip}}</td></tr>
</table>
{{#description}}<p><strong>Description:</strong> {{description}}</p>{{/description}}
<p style="font-weight:600;">Pro tip: Respond within 1 hour for the best chance of winning the job!</p>
<div style="text-align:center;margin:24px 0;">
  <a href="{{dashboardUrl}}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;">View in Dashboard</a>
</div>`,
    },
    {
      slug: 'lead_match_pro',
      name: 'New Lead Match (Pro)',
      channel: 'email',
      subject: 'New lead match: {{serviceName}} in {{zip}}',
      description: 'Sent to pros when they are matched with a new lead',
      variables: 'serviceName, zip, urgency, matchScore, description, claimUrl, expiryHours, maxClaims',
      body: `<p>You've been matched with a new lead based on your services and location!</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:8px 0;color:#64748b;width:120px;">Service</td><td style="padding:8px 0;color:#1e293b;font-weight:600;">{{serviceName}}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">ZIP Code</td><td style="padding:8px 0;color:#1e293b;">{{zip}}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">Urgency</td><td style="padding:8px 0;color:#1e293b;">{{urgency}}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">Match Score</td><td style="padding:8px 0;color:#1e293b;">{{matchScore}}/100</td></tr>
</table>
{{#description}}<p><strong>Description:</strong> {{description}}</p>{{/description}}
<div style="text-align:center;margin:24px 0;">
  <a href="{{claimUrl}}" style="display:inline-block;background:#16a34a;color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">Claim This Lead</a>
</div>
<p style="color:#94a3b8;font-size:13px;text-align:center;">This match expires in {{expiryHours}} hours. First {{maxClaims}} pros to respond get the job.</p>`,
    },

    // ── SMS templates ──
    {
      slug: 'sms_lead_match',
      name: 'Lead Match SMS',
      channel: 'sms',
      subject: null,
      description: 'SMS sent to pros when matched with a new lead',
      variables: 'serviceName, zip, urgencyLabel, description, claimUrl, maxClaims, expiryHours',
      body: `New {{serviceName}} lead in {{zip}}!{{#urgencyLabel}} [{{urgencyLabel}}]{{/urgencyLabel}}
{{description}}

Claim this lead: {{claimUrl}}

First to respond gets exclusive access. Expires in {{expiryHours}}h.
Reply STOP to opt out.`,
    },
    {
      slug: 'sms_followup_customer',
      name: 'Customer Follow-up SMS',
      channel: 'sms',
      subject: null,
      description: 'Follow-up sent to customer after a pro claims their lead',
      variables: 'customerName, serviceName, businessName, siteName',
      body: `Hi {{customerName}}! This is {{siteName}}. Did you get help with your {{serviceName}} request from {{businessName}}?

Reply YES if you got help, NO if you still need assistance, or STOP to opt out.`,
    },
  ];

  let inserted = 0;
  for (const t of templates) {
    try {
      await conn.query(
        `INSERT IGNORE INTO notification_templates (slug, name, channel, subject, body, description, variables, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [t.slug, t.name, t.channel, t.subject, t.body, t.description, t.variables]
      );
      inserted++;
    } catch (err) {
      console.error(`Skipped ${t.slug}:`, err.message);
    }
  }

  console.log(`Inserted ${inserted} templates`);
  await conn.end();
}

main().catch(console.error);
