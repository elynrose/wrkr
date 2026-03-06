# Wrkr — What It Is & How the App Works

## What the Website Is

**Wrkr** (branded as **HomePro** by default) is a **lead-generation platform for home services**. It connects:

- **Homeowners** who need a service (plumbing, electrical, HVAC, cleaning, etc.) with  
- **Service professionals** (pros) who want qualified leads in their area.

The site is similar in concept to Angi/HomeAdvisor: consumers submit a request; the platform matches them with local pros; pros pay for access to leads (via credits or subscription). The business name, support contact, and theme are configurable in the admin so you can rebrand the product.

---

## User Types

| Role       | Who they are                         | What they do |
|-----------|--------------------------------------|--------------|
| **Consumer** | Homeowner requesting a service       | Submits a lead (service, ZIP, description). Gets matched with pros; can receive follow-up SMS. |
| **Pro**      | Service business (plumber, electrician, etc.) | Signs up, sets service areas (ZIPs) and services. Receives SMS when a matching lead arrives. Claims leads with credits. |
| **Admin**    | Platform operator                   | Manages users, leads, categories, plans, site settings, CMS, templates, and matching. |

---

## How the App Works

### 1. Consumer Flow (Homeowners)

1. **Land on the site** — Home page shows a hero, popular service cards (scrollable), and “How it works” steps.
2. **Start a request** — User clicks “Get Started” or a service card and opens the **consumer signup modal**.
3. **Submit a lead** — They enter:
   - Service type (from your categories/services)
   - ZIP code (and optional city, address)
   - Description, urgency, name, email, phone
   - Optional: budget, property type
4. **Spam protection** — Form uses honeypot, timing checks, and rate limiting (configurable in admin).
5. **After submit** — They see a confirmation. The system:
   - Sends a confirmation email (if email is configured).
   - **Runs matching** (see below) and notifies matched pros via SMS (and email).
6. **Follow-up** — After a pro claims the lead, the customer may receive SMS follow-ups: “Did you get help?” They can reply **YES**, **NO**, or **STOP** (see Follow-up & Re-match).

---

### 2. Matching & Single-Claim (Pros)

- When a **new lead** is created, the backend runs **dynamic matching**:
  - Finds pros whose **service areas** include the lead’s ZIP and who offer that **service**.
  - Scores pros (ZIP match, service match, rating, reviews, verification, credits, etc.).
  - Takes the top N (configurable, e.g. 8) and creates **lead_matches** with unique claim links.
- Each matched pro gets an **SMS** (and email) with a **claim link** (e.g. `yoursite.com/#claim/TOKEN`).
- **Only one pro can claim each lead.** The first to click the link and confirm gets **exclusive** access:
  - One credit is deducted.
  - A **lead_claim** record is created.
  - All other pending matches for that lead are marked **expired**.
- If a pro’s link has already been used by someone else, they see a message that the lead was claimed.
- **Claim link expiry** is configurable (e.g. 4 hours); after that the link no longer works.

---

### 3. Pro Flow (Service Professionals)

1. **Sign up** — From “For Pros” or the pro CTA on the home page, they open the **pro signup modal** (or register page). They create an account and a **pro profile**: business name, services offered, **service areas** (ZIP codes/cities they serve), phone for SMS, etc.
2. **Credits** — Pros need **lead credits** to claim leads (or an “enterprise” plan with unlimited credits). They can:
   - Get credits from a **subscription plan** (monthly credits).
   - **Buy credit bundles** (Stripe Checkout).
3. **Receive matches** — When a matching lead is created, they get SMS + email with the claim link.
4. **Claim or pass** — On the **Claim page** (`/#claim/TOKEN`) they can:
   - **Claim** — Deducts 1 credit, gives exclusive access to the lead; customer contact info is visible in the **Pro Dashboard**.
   - **Pass** — No charge; they decline the lead.
5. **Pro Dashboard** — Shows only **their** matched leads (by status: notified, viewed, accepted, declined, expired). They can claim from the dashboard or from the SMS link. After claiming, they see customer details and can update lead status (contacted, quoted, hired, completed).
6. **Profile** — Pros can update profile (including **Google Review URL**), change password, and manage **subscription** (upgrade, cancel, billing portal).

---

### 4. Follow-Up & Re-match (Customer SMS Replies)

After a lead is **claimed**:

- The system schedules a **follow-up SMS** to the customer (delay and max attempts configurable in admin).
- A **cron** (e.g. every 15 minutes) sends the next batch of due follow-ups. The message asks: “Did you get help from [Provider]? Reply YES, NO, or STOP.”
- **Inbound SMS** are handled by the **Twilio webhook** (`POST /api/sms/inbound`):
  - **YES** — Lead marked as “got help” (e.g. status → hired); no more follow-ups.
  - **NO** — Lead is **re-opened**: claim is cleared, lead goes back to “new” and **matching runs again** so other pros get a chance.
  - **STOP** — Customer opts out of SMS; `sms_opt_out` is set; no more messages.
- Replies are logged in `sms_inbound`; follow-up state is stored on the lead (`follow_up_status`, `follow_up_count`, etc.).

---

### 4b. Rating & Review System

When a lead is marked as **completed** (by the pro or admin), the system automatically:

1. Generates a unique **review token** and stores it on the lead.
2. Sends a **review request SMS** and **email** to the customer with a link to `/#review/TOKEN`.
3. The customer opens the **Review Page** (no login required) where they can:
   - Rate the provider (1–5 stars).
   - Leave a written review (title + body).
   - See a prominent link to leave a **Google Review** for the provider (if the pro has set their Google Review URL in their profile).
4. After submitting, the review is saved as **verified** (linked to a real lead) and the pro's aggregate rating is recalculated.
5. **Recent verified reviews** are displayed on the homepage in a "Customer Reviews" section.

Providers can add their **Google Review URL** on their Profile page, so every review request also funnels customers to their Google listing.

---

### 5. Admin

Admins sign in and use the **Admin Dashboard** (overview, users, leads, packages, categories, services, pages, templates, settings).

- **Users** — List/filter by role (consumer, pro, admin). Paginated. Create, edit, deactivate users. Adjust pro **credits**.
- **Leads** — List all leads with filters; paginated. **Claimed by** and **follow-up status** are shown. Open a **lead details** page: customer info, notes, activity, matches, claims, status, priority. Manually **re-run matching** for a lead. **Run follow-ups** to send due follow-up SMS immediately.
- **Packages** — Subscription plans (Stripe price IDs, credits, features).
- **Categories & Services** — What consumers can choose; services can have icons or card images.
- **Pages** — CMS: create/edit static pages (WYSIWYG), footer links, meta. **Sub-tab: Homepage Steps** — Edit the “How it works” steps for homeowners and pros.
- **Templates** — Edit **email and SMS templates** (welcome, lead match, follow-up, etc.) and variables.
- **Settings** — General (site name, support email/phone), Stripe, Twilio (SMS + inbound webhook URL), Email (SMTP), Homepage, SEO, **Google Analytics**, Appearance (theme, font, dark mode), Spam/Security. **Test** buttons for SMS, email, and Stripe.

---

## Main Features (Summary)

- **Single-claim leads** — First pro to claim gets exclusive access; others’ links expire.
- **Dynamic matching** — By ZIP, service, score; configurable notify count and expiry.
- **SMS + Email** — Match notifications and follow-up; Twilio + Nodemailer; templates in DB.
- **Credits & subscriptions** — Stripe for one-time credit purchases and recurring plans.
- **Follow-up and re-match** — Automated “Did you get help?” SMS; YES/NO/STOP; re-match if NO.
- **Spam protection** — Honeypot, timing, rate limits, link checks (configurable).
- **CMS** — Editable static pages and footer content.
- **Theme** — Admin-only: color theme, font, border radius, dark mode (saved in settings).
- **Google Analytics** — Optional; enable and set measurement ID in settings.

---

## Tech Stack

- **Frontend:** React (Vite), Tailwind CSS, Font Awesome, client-side routing (hash/view state).
- **Backend:** Node.js, Express, MySQL.
- **Auth:** JWT (login, register, role-based routes).
- **Payments:** Stripe (Checkout, webhooks, customer portal).
- **SMS:** Twilio (outbound + inbound webhook).
- **Email:** Nodemailer (SMTP from settings).

---

## Key URLs / Routes

- **Home** — `/` or `#` (view: home)
- **For pros landing** — view: `for-pros`
- **Pro dashboard** — view: `pro-dashboard` (requires pro)
- **Claim page** — `/#claim/TOKEN` (from SMS link)
- **Login / Register** — view: `login` / `register`
- **Profile** — view: `profile` (requires auth)
- **Admin** — view: `admin` (requires admin)
- **CMS page** — `/#page/slug`

API is under `/api/` (e.g. `/api/leads`, `/api/matching/claim/:token`, `/api/sms/inbound`).

---

## Configuration Notes

- **Twilio inbound** — Set your Twilio phone number’s “A message comes in” webhook to:  
  `https://your-domain.com/api/sms/inbound` (POST, application/x-www-form-urlencoded).
- **Stripe webhooks** — Point to `/api/payments/webhook` for subscription and payment events.
- **Environment** — Backend uses `.env` (DB, Stripe, Twilio, SMTP, etc.); frontend uses `VITE_API_URL` for the API base.
- **Site name / contact** — Configured in Admin → Settings → General; used in emails, SMS, and footer.

This document reflects the app as built: single-claim model, follow-up SMS with YES/NO/STOP, re-match when the customer says no, and admin control over templates, settings, and content.

---

## Multi-Tenant Architecture

The platform supports **multi-tenancy** — a single server installation hosts multiple independent sites (tenants), each on their own custom domain with isolated data, settings, branding, and credentials.

### How It Works

- Every database table has a `tenant_id` column; all queries are scoped to the active tenant.
- A `tenants` table stores: name, slug, custom domain, status, and plan.
- The **tenant resolution middleware** reads the `Host` HTTP header on every request and matches it against `custom_domain` in the tenants table (or `localhost` → default tenant).
- Each tenant gets its own: Stripe keys, Twilio credentials, SMTP settings, theme, site name, categories, services, pages, and users.
- The default tenant (id=1) is the primary installation; existing data is unaffected.

### Setting Up a New Tenant

1. Log in as a **superadmin** user (role: `superadmin`).
2. Navigate to **Admin → Tenants** tab.
3. Click **New Tenant**, fill in name, slug, custom domain, plan, and admin credentials.
4. The platform provisions the tenant with default settings, templates, categories, and plans (copied from tenant 1).
5. Point the tenant's domain DNS A-record to this server's IP.
6. The tenant's admin logs into their branded site and customizes settings.

Alternatively, new tenants can self-sign-up at `/join` (the `TenantSignupPage`).

### Running the Migration (Existing Installs)

If upgrading from a single-tenant installation:

```bash
cd homepro-server
node migrate-multitenancy.js
```

This adds `tenant_id` to all tables and updates unique constraints safely, with no data loss.
