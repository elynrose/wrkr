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

  const ddl = `
    CREATE TABLE IF NOT EXISTS pages (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      slug         VARCHAR(200) UNIQUE NOT NULL,
      title        VARCHAR(300) NOT NULL,
      content      LONGTEXT,
      excerpt      TEXT,
      meta_title   VARCHAR(300),
      meta_desc    VARCHAR(500),
      status       ENUM('published','draft','archived') DEFAULT 'published',
      show_in_nav  BOOLEAN DEFAULT FALSE,
      nav_order    INT DEFAULT 0,
      nav_group    ENUM('company','pros','legal','support') DEFAULT 'company',
      created_by   INT,
      updated_by   INT,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `;

  await conn.query(ddl);
  console.log('pages table created');

  const pages = [
    {
      slug: 'about',
      title: 'About Us',
      nav_group: 'company',
      show_in_nav: true,
      nav_order: 1,
      meta_title: 'About HomePro — Our Mission',
      meta_desc: 'Learn about HomePro, the platform connecting homeowners with trusted local service professionals.',
      content: `<h1>About HomePro</h1>
<p>HomePro was founded with a simple mission: <strong>make it easy for homeowners to find trusted local service professionals</strong>, and make it easy for pros to find qualified customers.</p>

<h2>Our Story</h2>
<p>We started in 2020 when our founder, frustrated after a bad experience hiring a contractor, decided there had to be a better way. What began as a small directory in Austin, Texas has grown into a nationwide platform connecting millions of homeowners with over 50,000 verified professionals.</p>

<h2>How We're Different</h2>
<ul>
  <li><strong>Verified Professionals</strong> — Every pro on our platform goes through a verification process including license checks, insurance verification, and background screening.</li>
  <li><strong>Real Reviews</strong> — Our reviews come from verified customers who actually hired the pro. No fake reviews, ever.</li>
  <li><strong>Fair for Pros</strong> — Unlike other platforms that charge outrageous fees, we cap each lead at 4 pros maximum, giving every professional a real chance at winning the job.</li>
  <li><strong>Free for Homeowners</strong> — It's always 100% free for homeowners to submit a request and receive quotes.</li>
</ul>

<h2>Our Values</h2>
<p><strong>Trust.</strong> We believe trust is earned, not bought. That's why we verify every professional and every review.</p>
<p><strong>Fairness.</strong> Fair pricing for pros, free service for homeowners, and transparent practices across the board.</p>
<p><strong>Community.</strong> We're building a community where great work is recognized and rewarded.</p>

<h2>By the Numbers</h2>
<ul>
  <li>50,000+ verified professionals</li>
  <li>2 million+ jobs completed</li>
  <li>4.8 average pro rating</li>
  <li>Available in all 50 states</li>
</ul>

<p>Have questions? Reach out to us at <strong>support@homepro.com</strong> or call <strong>1-800-HOMEPRO</strong>.</p>`
    },
    {
      slug: 'how-it-works',
      title: 'How It Works',
      nav_group: 'company',
      show_in_nav: true,
      nav_order: 2,
      meta_title: 'How HomePro Works — For Homeowners & Pros',
      meta_desc: 'Learn how HomePro connects homeowners with local pros in 4 simple steps.',
      content: `<h1>How HomePro Works</h1>

<h2>For Homeowners</h2>
<p>Getting help for your home project is simple and always free:</p>
<ol>
  <li><strong>Describe Your Project</strong> — Tell us what you need, add details, and enter your ZIP code. Takes less than 2 minutes.</li>
  <li><strong>Get Matched Instantly</strong> — We match you with up to 4 verified local professionals who specialize in your type of project.</li>
  <li><strong>Compare & Choose</strong> — Review profiles, read verified reviews, compare quotes, and choose the pro you trust most.</li>
  <li><strong>Get It Done</strong> — Your pro handles the work. After the job, leave a review to help your community.</li>
</ol>

<h2>For Service Professionals</h2>
<p>Growing your business with HomePro is straightforward:</p>
<ol>
  <li><strong>Create Your Profile</strong> — Sign up, list your services, add photos of your work, and build your online presence.</li>
  <li><strong>Set Your Service Area</strong> — Choose the ZIP codes and cities where you want to work. Only see leads in your target area.</li>
  <li><strong>Receive Qualified Leads</strong> — Get instant notifications when homeowners in your area request your services.</li>
  <li><strong>Win More Jobs</strong> — Respond quickly, send competitive quotes, and build your reputation with 5-star reviews.</li>
</ol>

<p>Ready to get started? <strong>Homeowners</strong> can submit a free request anytime. <strong>Pros</strong> can sign up for free and start receiving leads today.</p>`
    },
    {
      slug: 'careers',
      title: 'Careers',
      nav_group: 'company',
      show_in_nav: true,
      nav_order: 3,
      meta_title: 'Careers at HomePro — Join Our Team',
      meta_desc: 'Explore career opportunities at HomePro. We\'re building the future of home services.',
      content: `<h1>Careers at HomePro</h1>

<p>We're on a mission to transform the home services industry. If you're passionate about building great products and making a real difference for small businesses and homeowners, we'd love to hear from you.</p>

<h2>Why Work at HomePro?</h2>
<ul>
  <li><strong>Impact</strong> — Your work directly helps small business owners grow and homeowners find help they can trust.</li>
  <li><strong>Remote-First</strong> — Work from anywhere. We believe great work happens when you have the freedom to choose your environment.</li>
  <li><strong>Competitive Benefits</strong> — Competitive salary, equity, health insurance, unlimited PTO, and a home office stipend.</li>
  <li><strong>Growth</strong> — We're growing fast and there's plenty of room to take on new challenges and advance your career.</li>
</ul>

<h2>Open Positions</h2>
<p>We're currently hiring for the following roles:</p>
<ul>
  <li><strong>Senior Full-Stack Engineer</strong> — Remote · Full-time</li>
  <li><strong>Product Designer</strong> — Remote · Full-time</li>
  <li><strong>Customer Success Manager</strong> — Austin, TX · Full-time</li>
  <li><strong>Marketing Manager</strong> — Remote · Full-time</li>
  <li><strong>Sales Development Representative</strong> — Remote · Full-time</li>
</ul>

<p>Don't see a role that fits? Send your resume to <strong>careers@homepro.com</strong> and tell us how you'd contribute.</p>`
    },
    {
      slug: 'press',
      title: 'Press & Media',
      nav_group: 'company',
      show_in_nav: true,
      nav_order: 4,
      meta_title: 'HomePro Press & Media',
      meta_desc: 'HomePro in the news. Press releases, media mentions, and company announcements.',
      content: `<h1>Press & Media</h1>

<p>For media inquiries, please contact <strong>press@homepro.com</strong>.</p>

<h2>Recent Coverage</h2>
<ul>
  <li><strong>TechCrunch</strong> — "HomePro raises $25M to expand its home services marketplace nationwide"</li>
  <li><strong>Forbes</strong> — "How HomePro is disrupting the $500B home services industry"</li>
  <li><strong>Inc. Magazine</strong> — "HomePro named one of the fastest-growing startups of 2025"</li>
  <li><strong>The Wall Street Journal</strong> — "The new wave of home service platforms putting homeowners first"</li>
</ul>

<h2>Company Facts</h2>
<ul>
  <li>Founded: 2020</li>
  <li>Headquarters: Austin, Texas</li>
  <li>Employees: 150+</li>
  <li>Pros on platform: 50,000+</li>
  <li>Jobs completed: 2,000,000+</li>
  <li>Available: All 50 US states</li>
</ul>

<h2>Brand Assets</h2>
<p>Need our logo or brand materials? Download our press kit or email <strong>press@homepro.com</strong> for high-resolution assets.</p>`
    },
    {
      slug: 'blog',
      title: 'Blog',
      nav_group: 'company',
      show_in_nav: true,
      nav_order: 5,
      meta_title: 'HomePro Blog — Tips for Homeowners & Pros',
      meta_desc: 'Home improvement tips, industry insights, and updates from the HomePro team.',
      content: `<h1>HomePro Blog</h1>

<h2>Latest Posts</h2>

<h3>10 Questions to Ask Before Hiring a Contractor</h3>
<p>Hiring the right contractor can make or break your home project. Here are the 10 most important questions every homeowner should ask before signing a contract...</p>

<h3>How to Grow Your Home Service Business in 2026</h3>
<p>The home services industry is booming, but competition is fierce. Here are proven strategies that top-performing pros on HomePro use to grow their business...</p>

<h3>Spring Home Maintenance Checklist</h3>
<p>Spring is the perfect time to tackle those home maintenance tasks you've been putting off. From gutter cleaning to HVAC tune-ups, here's your complete checklist...</p>

<h3>Understanding Home Service Pricing</h3>
<p>How much should you expect to pay for common home services? We analyzed thousands of quotes on HomePro to give you real pricing data for plumbing, electrical, HVAC, and more...</p>

<h3>Pro Spotlight: How Mike's Plumbing Grew 300% in One Year</h3>
<p>Mike Rodriguez of MR Plumbing Co. shares how he went from a one-man operation to a team of 8 technicians, largely thanks to consistent lead generation through HomePro...</p>

<p><em>Want to contribute a guest post? Email <strong>blog@homepro.com</strong>.</em></p>`
    },
    {
      slug: 'privacy-policy',
      title: 'Privacy Policy',
      nav_group: 'legal',
      show_in_nav: true,
      nav_order: 1,
      meta_title: 'Privacy Policy — HomePro',
      meta_desc: 'How HomePro collects, uses, and protects your personal information.',
      content: `<h1>Privacy Policy</h1>
<p><em>Last updated: January 1, 2026</em></p>

<h2>1. Information We Collect</h2>
<p>We collect information you provide directly to us, including:</p>
<ul>
  <li>Name, email address, phone number, and mailing address</li>
  <li>Service request details (project descriptions, ZIP code, budget preferences)</li>
  <li>Business information for service professionals (business name, license numbers, insurance details)</li>
  <li>Payment information (processed securely through Stripe)</li>
  <li>Reviews and ratings you provide</li>
</ul>

<h2>2. How We Use Your Information</h2>
<p>We use the information we collect to:</p>
<ul>
  <li>Connect homeowners with qualified service professionals</li>
  <li>Process transactions and send related notifications</li>
  <li>Send you marketing communications (with your consent)</li>
  <li>Improve and personalize your experience</li>
  <li>Ensure the safety and integrity of our platform</li>
</ul>

<h2>3. Information Sharing</h2>
<p>We share your information only in the following circumstances:</p>
<ul>
  <li>With service professionals when you submit a service request</li>
  <li>With payment processors to complete transactions</li>
  <li>When required by law or to protect our rights</li>
  <li>With your explicit consent</li>
</ul>

<h2>4. Data Security</h2>
<p>We implement industry-standard security measures including encryption, secure servers, and regular security audits to protect your personal information.</p>

<h2>5. Your Rights</h2>
<p>You have the right to access, update, or delete your personal information at any time. Contact us at <strong>privacy@homepro.com</strong> to exercise these rights.</p>

<h2>6. Contact Us</h2>
<p>If you have questions about this privacy policy, contact us at <strong>privacy@homepro.com</strong>.</p>`
    },
    {
      slug: 'terms-of-service',
      title: 'Terms of Service',
      nav_group: 'legal',
      show_in_nav: true,
      nav_order: 2,
      meta_title: 'Terms of Service — HomePro',
      meta_desc: 'Terms and conditions for using the HomePro platform.',
      content: `<h1>Terms of Service</h1>
<p><em>Last updated: January 1, 2026</em></p>

<h2>1. Acceptance of Terms</h2>
<p>By accessing or using HomePro ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.</p>

<h2>2. Description of Service</h2>
<p>HomePro is a marketplace that connects homeowners seeking home services with qualified service professionals. HomePro does not itself provide home services and is not a party to any agreement between homeowners and service professionals.</p>

<h2>3. User Accounts</h2>
<p>You must provide accurate, complete information when creating an account. You are responsible for maintaining the security of your account credentials. You must be at least 18 years old to use the Platform.</p>

<h2>4. For Homeowners</h2>
<p>Submitting a service request is free. By submitting a request, you consent to being contacted by matched service professionals. HomePro does not guarantee the quality, timing, or completion of any work performed by service professionals.</p>

<h2>5. For Service Professionals</h2>
<p>By joining as a pro, you represent that you hold all required licenses and insurance for the services you offer. You agree to our lead pricing and payment terms. Professionals are independent contractors, not employees of HomePro.</p>

<h2>6. Payments & Refunds</h2>
<p>All payments are processed securely through Stripe. Subscription fees are billed monthly or annually as selected. Lead credits are non-refundable once used. Refunds for unused credits may be requested within 30 days.</p>

<h2>7. Reviews & Content</h2>
<p>Users may submit reviews, ratings, and other content. You retain ownership of your content but grant HomePro a non-exclusive license to display it on the Platform. Reviews must be honest and based on actual experiences.</p>

<h2>8. Limitation of Liability</h2>
<p>HomePro is provided "as is" without warranties. HomePro is not liable for any damages arising from your use of the Platform or interactions with other users.</p>

<h2>9. Changes to Terms</h2>
<p>We may update these terms at any time. Continued use of the Platform constitutes acceptance of updated terms.</p>

<h2>10. Contact</h2>
<p>Questions about these terms? Contact <strong>legal@homepro.com</strong>.</p>`
    },
    {
      slug: 'lead-pricing',
      title: 'Lead Pricing',
      nav_group: 'pros',
      show_in_nav: true,
      nav_order: 1,
      meta_title: 'Lead Pricing for Pros — HomePro',
      meta_desc: 'Transparent lead pricing for service professionals on HomePro.',
      content: `<h1>Lead Pricing</h1>

<p>At HomePro, we believe in transparent, fair pricing. Here's everything you need to know about how our lead system works.</p>

<h2>How Lead Credits Work</h2>
<ul>
  <li>Each lead costs <strong>1 credit</strong> to claim</li>
  <li>Each lead is shared with a <strong>maximum of 4 pros</strong></li>
  <li>You only use a credit when <strong>you choose to claim</strong> a lead</li>
  <li>Credits never expire on active accounts</li>
</ul>

<h2>Pricing Plans</h2>
<p>Choose the plan that fits your business:</p>
<ul>
  <li><strong>Free</strong> — $0/month, 5 lead credits to get started</li>
  <li><strong>Starter</strong> — $49/month, 15 credits, up to 10 service areas</li>
  <li><strong>Professional</strong> — $149/month, 50 credits, up to 25 service areas (most popular)</li>
  <li><strong>Enterprise</strong> — $399/month, unlimited credits, unlimited areas</li>
</ul>

<h2>Additional Credits</h2>
<p>Need more credits? Purchase bundles at any time:</p>
<ul>
  <li>10 credits — $30 ($3.00 each)</li>
  <li>25 credits — $62.50 ($2.50 each)</li>
  <li>50 credits — $100 ($2.00 each)</li>
  <li>100 credits — $175 ($1.75 each)</li>
</ul>

<h2>Our Fair Lead Promise</h2>
<p>We limit each lead to 4 pros maximum. This means you have a real 25% chance of winning every lead you claim — far better than platforms that sell the same lead to 10+ companies.</p>

<p>Questions about pricing? Contact <strong>pro-support@homepro.com</strong>.</p>`
    },
    {
      slug: 'success-stories',
      title: 'Success Stories',
      nav_group: 'pros',
      show_in_nav: true,
      nav_order: 2,
      meta_title: 'Pro Success Stories — HomePro',
      meta_desc: 'Real stories from service professionals who grew their business with HomePro.',
      content: `<h1>Pro Success Stories</h1>
<p>Don't just take our word for it — hear from real professionals who've grown their business with HomePro.</p>

<h2>MR Plumbing Co. — Austin, TX</h2>
<p><em>"HomePro has been a game-changer for my business. I went from 3 jobs a week to 15+. The leads are qualified, the customers are real, and the platform is easy to use. I've grown my team from just me to 8 technicians in one year."</em></p>
<p>— <strong>Mike Rodriguez</strong>, Owner</p>

<h2>Bright Spark Electric — Denver, CO</h2>
<p><em>"The ZIP code targeting is brilliant. I only see leads in my service area, so I'm not wasting time on jobs 45 minutes away. My close rate on HomePro leads is over 45%, which is double what I get from other platforms."</em></p>
<p>— <strong>Sarah Thompson</strong>, Owner</p>

<h2>LandscapePro LLC — Phoenix, AZ</h2>
<p><em>"I signed up as a free user, got my first lead in 2 hours, and closed a $3,200 landscaping job that same week. Now I'm on the Professional plan and getting 20+ leads a month. Best investment I've made in my business."</em></p>
<p>— <strong>James Lee</strong>, Owner</p>

<h2>Clean & Shine Cleaning — Miami, FL</h2>
<p><em>"As a small cleaning business, I couldn't afford expensive advertising. HomePro's pay-per-lead model is perfect — I only pay when I choose to claim a lead. I've grown my revenue 200% in 6 months."</em></p>
<p>— <strong>Maria Garcia</strong>, Owner</p>

<p><strong>Want to share your success story?</strong> Email us at <strong>stories@homepro.com</strong>.</p>`
    },
    {
      slug: 'partner-program',
      title: 'Partner Program',
      nav_group: 'pros',
      show_in_nav: true,
      nav_order: 3,
      meta_title: 'Partner Program — HomePro',
      meta_desc: 'Join the HomePro Partner Program and earn rewards for growing with us.',
      content: `<h1>Partner Program</h1>

<p>Our Partner Program rewards our best professionals with exclusive benefits, priority features, and business growth tools.</p>

<h2>Partner Tiers</h2>

<h3>Silver Partner</h3>
<p><em>Complete 10+ jobs with 4.5+ rating</em></p>
<ul>
  <li>Silver badge on your profile</li>
  <li>5% discount on lead credits</li>
  <li>Priority customer support</li>
</ul>

<h3>Gold Partner</h3>
<p><em>Complete 50+ jobs with 4.7+ rating</em></p>
<ul>
  <li>Gold badge on your profile</li>
  <li>10% discount on lead credits</li>
  <li>Featured placement in search results</li>
  <li>Dedicated account manager</li>
</ul>

<h3>Platinum Partner</h3>
<p><em>Complete 200+ jobs with 4.8+ rating</em></p>
<ul>
  <li>Platinum badge on your profile</li>
  <li>15% discount on lead credits</li>
  <li>Top placement in search results</li>
  <li>Exclusive leads (shared with max 2 pros)</li>
  <li>Free marketing materials and co-branding</li>
</ul>

<h2>Referral Rewards</h2>
<p>Know a great pro who should be on HomePro? Refer them and earn <strong>10 free lead credits</strong> when they complete their first job.</p>

<p>Learn more at <strong>partners@homepro.com</strong>.</p>`
    },
  ];

  for (const p of pages) {
    try {
      await conn.query(
        `INSERT IGNORE INTO pages (slug, title, content, meta_title, meta_desc, nav_group, show_in_nav, nav_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published')`,
        [p.slug, p.title, p.content, p.meta_title, p.meta_desc, p.nav_group, p.show_in_nav ? 1 : 0, p.nav_order]
      );
      console.log(`  ✓ ${p.slug}`);
    } catch (e) {
      console.log(`  ✗ ${p.slug}: ${e.message}`);
    }
  }

  console.log('Done! Pages seeded.');
  await conn.end();
}

main();
