/**
 * Seed default "terms" and "copyright" CMS pages for tenant 1 (footer links).
 * Run from repo root: node homepro-server/scripts/seed-legal-pages.js
 * Or on Heroku: heroku run node homepro-server/scripts/seed-legal-pages.js
 */
const db = require('../db');

const TENANT_ID = 1;

const LEGAL_PAGES = [
  {
    slug: 'terms',
    title: 'Terms of Service',
    nav_group: 'legal',
    status: 'published',
    content: `<h1>Terms of Service</h1>
<p><em>Last updated: January 1, 2026</em></p>

<h2>1. Acceptance of Terms</h2>
<p>By accessing or using this platform ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.</p>

<h2>2. Description of Service</h2>
<p>This platform connects homeowners seeking home services with qualified service professionals. The platform does not itself provide home services and is not a party to any agreement between homeowners and service professionals.</p>

<h2>3. User Accounts</h2>
<p>You must provide accurate, complete information when creating an account. You are responsible for maintaining the security of your account credentials. You must be at least 18 years old to use the Platform.</p>

<h2>4. For Homeowners</h2>
<p>Submitting a service request is free. By submitting a request, you consent to being contacted by matched service professionals. The platform does not guarantee the quality, timing, or completion of any work performed by service professionals.</p>

<h2>5. For Service Professionals</h2>
<p>By joining as a pro, you represent that you hold all required licenses and insurance for the services you offer. You agree to the lead pricing and payment terms. Professionals are independent contractors, not employees of the platform.</p>

<h2>6. Payments & Refunds</h2>
<p>All payments are processed securely. Subscription fees are billed as selected. Lead credits are non-refundable once used. Refunds for unused credits may be requested within 30 days.</p>

<h2>7. Limitation of Liability</h2>
<p>The Platform is provided "as is" without warranties. We are not liable for any damages arising from your use of the Platform or interactions with other users.</p>

<h2>8. Contact</h2>
<p>Questions about these terms? Contact support through the platform.</p>`,
  },
  {
    slug: 'copyright',
    title: 'Copyright',
    nav_group: 'legal',
    status: 'published',
    content: `<h1>Copyright</h1>
<p><em>Last updated: January 1, 2026</em></p>

<h2>Copyright Notice</h2>
<p>All content on this site—including text, graphics, logos, images, and software—is the property of the platform or its content suppliers and is protected by copyright and other intellectual property laws.</p>

<h2>Use of Content</h2>
<p>You may not reproduce, distribute, modify, or create derivative works from any content on this site without prior written permission. Personal, non-commercial use (e.g., viewing, sharing links) is permitted.</p>

<h2>User-Generated Content</h2>
<p>By submitting reviews, photos, or other content, you grant the platform a non-exclusive license to display and use that content in connection with the service. You represent that you own or have the right to grant this license.</p>

<h2>DMCA</h2>
<p>If you believe content on this site infringes your copyright, please contact us with the details required under the Digital Millennium Copyright Act. We will respond to valid notices.</p>

<h2>Contact</h2>
<p>For copyright or licensing inquiries, please contact support through the platform.</p>`,
  },
];

async function run() {
  console.log('Seeding legal pages (terms, copyright) for tenant', TENANT_ID, '...');
  for (const p of LEGAL_PAGES) {
    try {
      const [result] = await db.query(
        `INSERT IGNORE INTO pages (tenant_id, slug, title, content, excerpt, meta_title, meta_desc, status, show_in_nav, nav_order, nav_group)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?, FALSE, 0, ?)`,
        [TENANT_ID, p.slug, p.title, p.content, p.title, p.title, p.status, p.nav_group]
      );
      console.log('  ✓', p.slug, result.affectedRows ? '(created)' : '(already exists)');
    } catch (err) {
      console.error('  ✗', p.slug, err.message || err.code || err);
    }
  }
  console.log('Done.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
