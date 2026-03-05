-- HomePro Full Database Schema
-- Run: node run-schema.js

CREATE DATABASE IF NOT EXISTS homepro;
USE homepro;

-- ═══════════════════════════════════════════════════════════
-- USERS (unified auth: consumer, pro, admin)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  email           VARCHAR(200)  UNIQUE NOT NULL,
  password_hash   VARCHAR(255)  NOT NULL,
  role            ENUM('consumer','pro','admin') NOT NULL DEFAULT 'consumer',
  first_name      VARCHAR(100),
  last_name       VARCHAR(100),
  phone           VARCHAR(30),
  avatar_url      VARCHAR(500),
  email_verified  BOOLEAN       DEFAULT FALSE,
  is_active       BOOLEAN       DEFAULT TRUE,
  last_login      TIMESTAMP     NULL,
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════
-- CATEGORIES (parent → child hierarchy)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  parent_id   INT           NULL,
  name        VARCHAR(120)  NOT NULL,
  slug        VARCHAR(120)  UNIQUE NOT NULL,
  icon_class  VARCHAR(100),
  description TEXT,
  tags        VARCHAR(500)  NULL COMMENT 'Comma-separated tags for filtering/search',
  sort_order  INT           DEFAULT 0,
  is_active   BOOLEAN       DEFAULT TRUE,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- ═══════════════════════════════════════════════════════════
-- SERVICES (specific service types under categories)
-- ═══════════════════════════════════════════════════════════
DROP TABLE IF EXISTS pro_services;
DROP TABLE IF EXISTS lead_claims;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS services;

CREATE TABLE IF NOT EXISTS services (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  category_id     INT,
  name            VARCHAR(100)   NOT NULL,
  slug            VARCHAR(120)   UNIQUE NOT NULL,
  icon_class      VARCHAR(100)   NOT NULL,
  card_image_url  VARCHAR(500)   NULL COMMENT 'Optional image URL for browse card; if set, shown instead of icon',
  avg_rating      DECIMAL(2,1)   DEFAULT 4.5,
  review_count    INT            DEFAULT 0,
  review_label    VARCHAR(60),
  min_price       VARCHAR(50),
  price_unit      VARCHAR(30)    DEFAULT 'per job',
  is_active       BOOLEAN        DEFAULT TRUE,
  created_at      TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- ═══════════════════════════════════════════════════════════
-- CITIES & ZIP CODES (location management)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS states (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  code   CHAR(2)       UNIQUE NOT NULL,
  name   VARCHAR(60)   NOT NULL
);

CREATE TABLE IF NOT EXISTS cities (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  state_id   INT           NOT NULL,
  name       VARCHAR(120)  NOT NULL,
  slug       VARCHAR(140),
  latitude   DECIMAL(10,7),
  longitude  DECIMAL(10,7),
  population INT           DEFAULT 0,
  is_active  BOOLEAN       DEFAULT TRUE,
  created_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE CASCADE,
  UNIQUE KEY uq_city_state (name, state_id)
);

CREATE TABLE IF NOT EXISTS zip_codes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  zip        VARCHAR(10)   NOT NULL,
  city_id    INT,
  state_id   INT,
  latitude   DECIMAL(10,7),
  longitude  DECIMAL(10,7),
  UNIQUE KEY uq_zip (zip),
  FOREIGN KEY (city_id)  REFERENCES cities(id)  ON DELETE SET NULL,
  FOREIGN KEY (state_id) REFERENCES states(id)  ON DELETE SET NULL
);

-- ═══════════════════════════════════════════════════════════
-- PRO PROFILES
-- ═══════════════════════════════════════════════════════════
DROP TABLE IF EXISTS pro_service_areas;
DROP TABLE IF EXISTS pros;

CREATE TABLE IF NOT EXISTS pros (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT           UNIQUE NOT NULL,
  business_name     VARCHAR(200)  NOT NULL,
  description       TEXT,
  phone             VARCHAR(30),
  website           VARCHAR(300),
  years_in_business VARCHAR(30),
  license_number    VARCHAR(80),
  insurance_info    VARCHAR(200),
  is_verified       BOOLEAN       DEFAULT FALSE,
  is_background_checked BOOLEAN   DEFAULT FALSE,
  avg_rating        DECIMAL(2,1)  DEFAULT 0,
  total_reviews     INT           DEFAULT 0,
  total_jobs        INT           DEFAULT 0,
  profile_complete  TINYINT       DEFAULT 0,
  stripe_customer_id    VARCHAR(100),
  stripe_subscription_id VARCHAR(100),
  subscription_status   ENUM('none','trialing','active','past_due','canceled','unpaid') DEFAULT 'none',
  subscription_plan     ENUM('free','starter','professional','enterprise') DEFAULT 'free',
  lead_credits      INT           DEFAULT 0,
  sms_opt_in        BOOLEAN       DEFAULT TRUE,
  sms_phone         VARCHAR(30),
  response_rate     DECIMAL(5,2)  DEFAULT 0,
  avg_response_time_min INT       DEFAULT 0,
  credit_last_refill DATE         NULL,
  created_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Pro ↔ Services (many-to-many)
CREATE TABLE IF NOT EXISTS pro_services (
  pro_id     INT NOT NULL,
  service_id INT NOT NULL,
  PRIMARY KEY (pro_id, service_id),
  FOREIGN KEY (pro_id)     REFERENCES pros(id)     ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

-- Pro service areas (zip + city + radius)
CREATE TABLE IF NOT EXISTS pro_service_areas (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  pro_id     INT          NOT NULL,
  zip_code   VARCHAR(10),
  city_id    INT,
  state_id   INT,
  radius_miles INT        DEFAULT 25,
  FOREIGN KEY (pro_id)   REFERENCES pros(id)   ON DELETE CASCADE,
  FOREIGN KEY (city_id)  REFERENCES cities(id) ON DELETE SET NULL,
  FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE SET NULL
);

-- ═══════════════════════════════════════════════════════════
-- LEADS (consumer service requests)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS leads (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT,
  service_id   INT,
  service_name VARCHAR(100),
  customer_name VARCHAR(120),
  email        VARCHAR(200),
  phone        VARCHAR(30),
  zip          VARCHAR(10),
  city_id      INT,
  city_name    VARCHAR(120),
  state_code   CHAR(2),
  address      VARCHAR(300),
  description  TEXT,
  urgency      ENUM('emergency','within_24h','this_week','this_month','flexible') DEFAULT 'flexible',
  budget_min   DECIMAL(10,2),
  budget_max   DECIMAL(10,2),
  property_type ENUM('residential','commercial','other') DEFAULT 'residential',
  status       ENUM('new','matching','matched','contacted','quoted','hired','completed','canceled') DEFAULT 'new',
  source       ENUM('website','api','referral','ad') DEFAULT 'website',
  lead_value   DECIMAL(10,2) DEFAULT 0.00,
  is_claimed   BOOLEAN       DEFAULT FALSE,
  max_claims   INT           DEFAULT 4,
  claim_count  INT           DEFAULT 0,
  priority     ENUM('low','normal','high','urgent') DEFAULT 'normal',
  assigned_to  INT           NULL,
  follow_up_date DATE        NULL,
  tags         VARCHAR(500)  DEFAULT '',
  internal_notes TEXT,
  created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE SET NULL,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
  FOREIGN KEY (city_id)    REFERENCES cities(id)   ON DELETE SET NULL
);

-- ═══════════════════════════════════════════════════════════
-- LEAD CLAIMS (pro purchases/claims a lead)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lead_claims (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  lead_id     INT NOT NULL,
  pro_id      INT NOT NULL,
  status      ENUM('claimed','contacted','quoted','hired','completed','refunded') DEFAULT 'claimed',
  price_paid  DECIMAL(10,2) DEFAULT 0.00,
  quoted_price DECIMAL(10,2),
  notes       TEXT,
  claimed_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  contacted_at TIMESTAMP    NULL,
  quoted_at   TIMESTAMP     NULL,
  hired_at    TIMESTAMP     NULL,
  completed_at TIMESTAMP    NULL,
  UNIQUE KEY uq_claim (lead_id, pro_id),
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (pro_id)  REFERENCES pros(id)  ON DELETE CASCADE
);

-- ═══════════════════════════════════════════════════════════
-- SUBSCRIPTION PLANS
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS subscription_plans (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(60)   NOT NULL,
  slug              VARCHAR(60)   UNIQUE NOT NULL,
  stripe_price_id   VARCHAR(100),
  price_monthly     DECIMAL(10,2) NOT NULL,
  price_yearly      DECIMAL(10,2),
  lead_credits      INT           DEFAULT 0,
  max_service_areas INT           DEFAULT 5,
  max_services      INT           DEFAULT 3,
  features          JSON,
  is_popular        BOOLEAN       DEFAULT FALSE,
  is_active         BOOLEAN       DEFAULT TRUE,
  sort_order        INT           DEFAULT 0,
  created_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════
-- PAYMENTS & INVOICES
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS payments (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  user_id             INT           NOT NULL,
  pro_id              INT,
  stripe_payment_id   VARCHAR(100),
  stripe_invoice_id   VARCHAR(100),
  amount              DECIMAL(10,2) NOT NULL,
  currency            CHAR(3)       DEFAULT 'usd',
  payment_type        ENUM('subscription','lead_purchase','lead_bundle','refund','credit') NOT NULL,
  status              ENUM('pending','processing','succeeded','failed','refunded','canceled') DEFAULT 'pending',
  description         VARCHAR(300),
  metadata            JSON,
  paid_at             TIMESTAMP     NULL,
  created_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pro_id)  REFERENCES pros(id)  ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  user_id            INT           NOT NULL,
  pro_id             INT,
  stripe_invoice_id  VARCHAR(100),
  invoice_number     VARCHAR(30)   UNIQUE,
  amount             DECIMAL(10,2) NOT NULL,
  tax                DECIMAL(10,2) DEFAULT 0.00,
  total              DECIMAL(10,2) NOT NULL,
  status             ENUM('draft','open','paid','void','uncollectible') DEFAULT 'draft',
  due_date           DATE,
  paid_at            TIMESTAMP     NULL,
  pdf_url            VARCHAR(500),
  created_at         TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pro_id)  REFERENCES pros(id)  ON DELETE SET NULL
);

-- ═══════════════════════════════════════════════════════════
-- REVIEWS
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS reviews (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  lead_id     INT,
  pro_id      INT           NOT NULL,
  user_id     INT           NOT NULL,
  rating      TINYINT       NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       VARCHAR(200),
  body        TEXT,
  is_verified BOOLEAN       DEFAULT FALSE,
  is_public   BOOLEAN       DEFAULT TRUE,
  response    TEXT,
  responded_at TIMESTAMP    NULL,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
  FOREIGN KEY (pro_id)  REFERENCES pros(id)  ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ═══════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT           NOT NULL,
  type        ENUM('lead_new','lead_claimed','lead_quoted','lead_hired','review_new',
                   'payment_success','payment_failed','subscription_updated',
                   'message_new','system','promo') NOT NULL,
  title       VARCHAR(200)  NOT NULL,
  body        TEXT,
  link        VARCHAR(500),
  is_read     BOOLEAN       DEFAULT FALSE,
  is_emailed  BOOLEAN       DEFAULT FALSE,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ═══════════════════════════════════════════════════════════
-- MESSAGES (consumer ↔ pro)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS conversations (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  lead_id     INT,
  consumer_id INT           NOT NULL,
  pro_id      INT           NOT NULL,
  status      ENUM('active','archived','blocked') DEFAULT 'active',
  last_message_at TIMESTAMP NULL,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_conv (lead_id, consumer_id, pro_id),
  FOREIGN KEY (lead_id)     REFERENCES leads(id) ON DELETE SET NULL,
  FOREIGN KEY (consumer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pro_id)      REFERENCES pros(id)  ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT           NOT NULL,
  sender_id       INT           NOT NULL,
  body            TEXT          NOT NULL,
  attachment_url  VARCHAR(500),
  is_read         BOOLEAN       DEFAULT FALSE,
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id)       REFERENCES users(id)         ON DELETE CASCADE
);

-- ═══════════════════════════════════════════════════════════
-- HOW IT WORKS (CMS-style)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS how_it_works (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  audience     ENUM('consumer','pro') NOT NULL,
  step_number  INT            NOT NULL,
  icon_class   VARCHAR(100)   NOT NULL,
  title        VARCHAR(120)   NOT NULL,
  description  TEXT           NOT NULL
);

-- ═══════════════════════════════════════════════════════════
-- AUDIT LOG
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT,
  action      VARCHAR(60)   NOT NULL,
  entity_type VARCHAR(60),
  entity_id   INT,
  old_values  JSON,
  new_values  JSON,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);


-- ═══════════════════════════════════════════════════════════
-- SETTINGS (site configuration)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS settings (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  setting_key   VARCHAR(120) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type  ENUM('string','number','boolean','json','secret') DEFAULT 'string',
  setting_group ENUM('general','stripe','twilio','homepage','seo','email','appearance','advanced','analytics') DEFAULT 'general',
  label         VARCHAR(200),
  description   TEXT,
  is_public     BOOLEAN DEFAULT TRUE,
  sort_order    INT DEFAULT 0,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════
-- LEAD NOTES & ACTIVITY
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lead_notes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  lead_id     INT NOT NULL,
  user_id     INT,
  note_type   ENUM('note','status_change','call','email','sms','meeting','internal','system') DEFAULT 'note',
  content     TEXT NOT NULL,
  metadata    JSON,
  is_pinned   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lead_activity (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  lead_id     INT NOT NULL,
  user_id     INT,
  action      VARCHAR(100) NOT NULL,
  details     TEXT,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ═══════════════════════════════════════════════════════════
-- CMS PAGES
-- ═══════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════
-- LEAD MATCHES (dynamic matching / SMS notifications)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lead_matches (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  lead_id       INT NOT NULL,
  pro_id        INT NOT NULL,
  user_id       INT NOT NULL,
  match_score   DECIMAL(5,2) DEFAULT 0,
  match_rank    INT DEFAULT 0,
  claim_token   VARCHAR(64) UNIQUE NOT NULL,
  sms_sent      BOOLEAN DEFAULT FALSE,
  sms_sent_at   TIMESTAMP NULL,
  sms_sid       VARCHAR(100),
  status        ENUM('pending','notified','viewed','accepted','declined','expired') DEFAULT 'pending',
  viewed_at     TIMESTAMP NULL,
  responded_at  TIMESTAMP NULL,
  expires_at    TIMESTAMP NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (pro_id)  REFERENCES pros(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_lead_pro (lead_id, pro_id)
);

-- ═══════════════════════════════════════════════════════════
-- CREDIT TRANSACTIONS (lead credit audit trail)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS credit_transactions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  pro_id        INT NOT NULL,
  user_id       INT NOT NULL,
  type          ENUM('signup_bonus','plan_credits','purchase','lead_claim','refund','admin_adjust','monthly_refill','promo','expiry') NOT NULL,
  amount        INT NOT NULL,
  balance_after INT NOT NULL DEFAULT 0,
  description   VARCHAR(500),
  reference_id  VARCHAR(100),
  reference_type VARCHAR(50),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pro_id)  REFERENCES pros(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_pro_created (pro_id, created_at DESC),
  INDEX idx_type (type)
);


-- Notification templates
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


-- ═══════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════

-- States
INSERT INTO states (code, name) VALUES
  ('AL','Alabama'),('AK','Alaska'),('AZ','Arizona'),('AR','Arkansas'),('CA','California'),
  ('CO','Colorado'),('CT','Connecticut'),('DE','Delaware'),('FL','Florida'),('GA','Georgia'),
  ('HI','Hawaii'),('ID','Idaho'),('IL','Illinois'),('IN','Indiana'),('IA','Iowa'),
  ('KS','Kansas'),('KY','Kentucky'),('LA','Louisiana'),('ME','Maine'),('MD','Maryland'),
  ('MA','Massachusetts'),('MI','Michigan'),('MN','Minnesota'),('MS','Mississippi'),('MO','Missouri'),
  ('MT','Montana'),('NE','Nebraska'),('NV','Nevada'),('NH','New Hampshire'),('NJ','New Jersey'),
  ('NM','New Mexico'),('NY','New York'),('NC','North Carolina'),('ND','North Dakota'),('OH','Ohio'),
  ('OK','Oklahoma'),('OR','Oregon'),('PA','Pennsylvania'),('RI','Rhode Island'),('SC','South Carolina'),
  ('SD','South Dakota'),('TN','Tennessee'),('TX','Texas'),('UT','Utah'),('VT','Vermont'),
  ('VA','Virginia'),('WA','Washington'),('WV','West Virginia'),('WI','Wisconsin'),('WY','Wyoming');

-- Cities (sample)
INSERT INTO cities (state_id, name, slug, latitude, longitude, population) VALUES
  (43,'Austin','austin-tx',30.2672,-97.7431,1000000),
  (43,'Houston','houston-tx',29.7604,-95.3698,2300000),
  (43,'Dallas','dallas-tx',32.7767,-96.7970,1300000),
  (43,'San Antonio','san-antonio-tx',29.4241,-98.4936,1500000),
  (43,'Cedar Park','cedar-park-tx',30.5052,-97.8203,80000),
  (43,'Round Rock','round-rock-tx',30.5083,-97.6789,130000),
  (43,'Pflugerville','pflugerville-tx',30.4394,-97.6200,70000),
  (5,'Los Angeles','los-angeles-ca',34.0522,-118.2437,3900000),
  (5,'San Francisco','san-francisco-ca',37.7749,-122.4194,870000),
  (32,'New York City','new-york-city-ny',40.7128,-74.0060,8300000),
  (9,'Miami','miami-fl',25.7617,-80.1918,470000),
  (13,'Chicago','chicago-il',41.8781,-87.6298,2700000),
  (47,'Seattle','seattle-wa',47.6062,-122.3321,740000),
  (10,'Atlanta','atlanta-ga',33.7490,-84.3880,500000),
  (4,'Phoenix','phoenix-az',33.4484,-112.0740,1600000);

-- ZIP codes (sample)
INSERT INTO zip_codes (zip, city_id, state_id, latitude, longitude) VALUES
  ('78701',1,43,30.2729,-97.7444),('78702',1,43,30.2633,-97.7197),
  ('78703',1,43,30.2946,-97.7635),('78704',1,43,30.2413,-97.7584),
  ('78705',1,43,30.2916,-97.7414),('78706',5,43,30.4886,-97.8245),
  ('78707',6,43,30.5111,-97.6839),('78708',7,43,30.4555,-97.6055),
  ('78709',1,43,30.2125,-97.8514),('90210',8,5,34.0901,-118.4065),
  ('10001',10,32,40.7506,-73.9971),('60601',12,13,41.8862,-87.6186),
  ('77001',2,43,29.7543,-95.3535),('33101',11,9,25.7907,-80.2009),
  ('30301',14,10,33.7866,-84.3627),('85001',15,4,33.4486,-112.0773),
  ('98101',13,47,47.6114,-122.3371);

-- Categories
INSERT INTO categories (name, slug, icon_class, description, sort_order) VALUES
  ('Home Repair',        'home-repair',       'faWrench',       'General home repair and maintenance',    1),
  ('Plumbing & Water',   'plumbing-water',    'faFaucetDrip',   'Plumbing, water heaters, and drainage', 2),
  ('Electrical',         'electrical',        'faBolt',         'Electrical work, wiring, and lighting',  3),
  ('HVAC & Climate',     'hvac-climate',      'faFan',          'Heating, cooling, and ventilation',      4),
  ('Outdoor & Landscape','outdoor-landscape', 'faLeaf',         'Landscaping, lawn care, and outdoor',    5),
  ('Roofing & Exterior', 'roofing-exterior',  'faHouseChimney', 'Roofing, siding, and exterior work',     6),
  ('Interior',           'interior',          'faPaintRoller',  'Painting, flooring, and interior design',7),
  ('Cleaning',           'cleaning',          'faBroom',        'House cleaning and deep cleaning',       8),
  ('Pest & Wildlife',    'pest-wildlife',     'faBug',          'Pest control and wildlife removal',      9),
  ('Moving & Storage',   'moving-storage',    'faTruck',        'Moving, packing, and storage',          10);

-- Services
INSERT INTO services (category_id, name, slug, icon_class, avg_rating, review_count, review_label, min_price) VALUES
  (1, 'Handyperson',        'handyperson',        'faWrench',       4.6, 599000, '599k+',  'from $158'),
  (2, 'Plumbing',           'plumbing',           'faFaucetDrip',   4.6, 568000, '568k+',  'from $226'),
  (3, 'Electrical',         'electrical',         'faBolt',         4.7, 412000, '412k+',  'from $189'),
  (4, 'HVAC',               'hvac',               'faFan',          4.7, 306000, '306k+',  'from $350'),
  (5, 'Landscaping',        'landscaping',        'faLeaf',         4.5, 280000, '280k+',  'from $145'),
  (6, 'Roofing',            'roofing',            'faHouseChimney', 4.7, 325000, '325k+',  'from $471'),
  (7, 'Painting',           'painting',           'faPaintRoller',  4.6, 390000, '390k+',  'from $320'),
  (8, 'Cleaning',           'cleaning',           'faBroom',        4.5, 314000, '314k+',  'from $85'),
  (7, 'Remodeling',         'remodeling',         'faHammer',       4.4, 180000, '180k+',  'from $2,500'),
  (9, 'Pest Control',       'pest-control',       'faBug',          4.8, 317000, '317k+',  'from $186'),
  (7, 'Flooring',           'flooring',           'faLayerGroup',   4.6, 210000, '210k+',  'from $890'),
  (1, 'Appliance Repair',   'appliance-repair',   'faBlender',      4.7, 274000, '274k+',  'from $264'),
  (5, 'Fence Installation', 'fence-installation', 'faGrip',         4.2, 48000,  '48k+',   'from $1,200'),
  (5, 'Tree Service',       'tree-service',       'faTree',         4.5, 95000,  '95k+',   'from $350'),
  (5, 'Pool Service',       'pool-service',       'faWater',        4.6, 62000,  '62k+',   'from $150'),
  (10,'Moving',             'moving',             'faTruck',        4.4, 195000, '195k+',  'from $400'),
  (1, 'Garage Door',        'garage-door',        'faWarehouse',    4.6, 95000,  '95k+',   'from $220'),
  (8, 'Window Cleaning',    'window-cleaning',    'faWindowRestore',4.7, 88000,  '88k+',   'from $140');

-- Subscription Plans
INSERT INTO subscription_plans (name, slug, stripe_price_id, price_monthly, price_yearly, lead_credits, max_service_areas, max_services, features, is_popular, sort_order) VALUES
  ('Free',         'free',         NULL,                   0.00,    0.00,   0,  2,  2,  '{"badge": false, "priority_listing": false, "analytics": "basic",   "support": "community"}',     FALSE, 1),
  ('Starter',      'starter',      'price_starter_monthly', 29.00, 290.00,  10, 5,  5,  '{"badge": true,  "priority_listing": false, "analytics": "basic",   "support": "email"}',          FALSE, 2),
  ('Professional', 'professional', 'price_pro_monthly',     79.00, 790.00,  30, 15, 10, '{"badge": true,  "priority_listing": true,  "analytics": "advanced","support": "priority_email"}', TRUE,  3),
  ('Enterprise',   'enterprise',   'price_ent_monthly',    199.00,1990.00, 100, 50, 50, '{"badge": true,  "priority_listing": true,  "analytics": "full",    "support": "dedicated"}',      FALSE, 4);

-- How It Works
INSERT INTO how_it_works (audience, step_number, icon_class, title, description) VALUES
  ('consumer', 1, 'faClipboardList',      'Describe Your Project',   'Tell us what you need — service type, details, and your ZIP code. Takes less than 2 minutes.'),
  ('consumer', 2, 'faMagnifyingGlass',    'Get Matched Instantly',   'We instantly match you with verified local pros in your area who specialize in exactly what you need.'),
  ('consumer', 3, 'faComments',           'Compare & Choose',        'Receive up to 4 quotes. Compare pricing, read real reviews, and pick the pro you trust most.'),
  ('consumer', 4, 'faTrophy',             'Job Done Right',          'Your pro handles the work. Leave a verified review to help your neighbors find great pros too.'),
  ('pro',      1, 'faPenToSquare',        'Create Your Profile',     'Sign up, list your services, add photos of your work, and set up your business profile in minutes.'),
  ('pro',      2, 'faLocationDot',        'Set Your Service Area',   'Choose the ZIP codes and cities you want to serve. Only receive leads from your target area.'),
  ('pro',      3, 'faEnvelopeOpenText',   'Receive Qualified Leads', 'Get notified instantly when a homeowner in your area requests your service. Pay only for leads you want.'),
  ('pro',      4, 'faCircleDollarToSlot', 'Win More Business',       'Respond fast, send a quote, and close the job. Build your reputation with every 5-star review.');

-- Demo users: admin uses "admin123", pro/consumer use "password123"
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, email_verified) VALUES
  ('admin@homepro.com',   '$2b$10$5fqR2RH81lX.hYJX1urt1O.7wyH4odVkVKBnmKRZsot4MKMplHamm', 'admin',    'Admin',  'User',    '555-0000', TRUE),
  ('pro@demo.com',        '$2b$10$jRvwFXcHsT83b.ukTSkWuOF1WtkVc2MSvaGR1shBPmscb/NTqH11y', 'pro',      'Demo',   'Pro',     '555-9999', TRUE),
  ('consumer@demo.com',   '$2b$10$jRvwFXcHsT83b.ukTSkWuOF1WtkVc2MSvaGR1shBPmscb/NTqH11y', 'consumer', 'Jane',   'Smith',   '555-1111', TRUE);

-- Demo pro profile
INSERT INTO pros (user_id, business_name, description, phone, years_in_business, is_verified, avg_rating, total_reviews, subscription_plan, lead_credits) VALUES
  (2, 'Austin ProFix', 'Full-service home repair and plumbing in Austin, TX. Licensed and insured.', '555-9999', '5-10', TRUE, 4.8, 127, 'professional', 25);

INSERT INTO pro_services (pro_id, service_id) VALUES (1,1),(1,2),(1,3);
INSERT INTO pro_service_areas (pro_id, zip_code, city_id, state_id, radius_miles) VALUES
  (1,'78701',1,43,25),(1,'78702',1,43,25),(1,'78703',1,43,25),(1,'78704',1,43,25),(1,'78705',1,43,25);

-- Demo leads
INSERT INTO leads (user_id, service_id, service_name, customer_name, email, phone, zip, city_id, city_name, state_code, description, urgency, status, lead_value, created_at) VALUES
  (3, 2, 'Plumbing',     'Sarah Johnson',  'sarah@email.com',  '555-0101','78701',1,'Austin','TX','Kitchen faucet leaking under the sink, need repair ASAP.',        'within_24h','new',      25.00, NOW() - INTERVAL 2 HOUR),
  (3, 1, 'Handyperson',  'Mike Davis',     'mike@email.com',   '555-0102','78702',1,'Austin','TX','Need to hang 3 shelves and fix a squeaky door.',                  'this_week', 'new',      15.00, NOW() - INTERVAL 5 HOUR),
  (3, 4, 'HVAC',         'Emily Chen',     'emily@email.com',  '555-0103','78703',1,'Austin','TX','AC unit not cooling properly, making loud noise.',                'within_24h','contacted',35.00, NOW() - INTERVAL 1 DAY),
  (3, 5, 'Landscaping',  'Tom Williams',   'tom@email.com',    '555-0104','78704',1,'Austin','TX','Need full backyard landscaping — lawn, plants, edging.',           'this_month','quoted',   20.00, NOW() - INTERVAL 2 DAY),
  (3, 8, 'Cleaning',     'Lisa Brown',     'lisa@email.com',   '555-0105','78701',1,'Austin','TX','Move-out deep clean for 3BR/2BA, needs to be done by Friday.',    'this_week', 'new',      15.00, NOW() - INTERVAL 3 HOUR),
  (3, 3, 'Electrical',   'James Miller',   'james@email.com',  '555-0106','78705',1,'Austin','TX','Add two new outlets in the garage for tools.',                    'this_week', 'new',      25.00, NOW() - INTERVAL 8 HOUR),
  (3, 6, 'Roofing',      'Anna Wilson',    'anna@email.com',   '555-0107','78706',5,'Cedar Park','TX','Several missing shingles after storm, possible leak.',        'within_24h','contacted',45.00, NOW() - INTERVAL 1 DAY),
  (3, 9, 'Remodeling',   'Robert Taylor',  'robert@email.com', '555-0108','78707',6,'Round Rock','TX','Bathroom remodel — new vanity, shower, and tile work.',       'this_month','completed',40.00, NOW() - INTERVAL 5 DAY),
  (3,10, 'Pest Control', 'Jennifer Lee',   'jen@email.com',    '555-0109','78708',7,'Pflugerville','TX','Seeing ants and roaches in kitchen, need full treatment.',   'this_week', 'new',      20.00, NOW() - INTERVAL 4 HOUR),
  (3, 7, 'Painting',     'Chris Martinez', 'chris@email.com',  '555-0110','78709',1,'Austin','TX','Interior painting — living room, dining room, and hallway.',      'this_month','quoted',   25.00, NOW() - INTERVAL 3 DAY);
