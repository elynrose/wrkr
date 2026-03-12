/**
 * Restore default categories and services for tenant 1 (e.g. after accidental delete).
 * Run from repo root: node homepro-server/scripts/restore-default-services.js
 */
const db = require('../db');

const TENANT_ID = 1;

const DEFAULT_CATEGORIES = [
  { name: 'Home Repair',        slug: 'home-repair',       icon_class: 'faWrench',       description: 'General home repair and maintenance',    sort_order: 1 },
  { name: 'Plumbing & Water',   slug: 'plumbing-water',    icon_class: 'faFaucetDrip',  description: 'Plumbing, water heaters, and drainage', sort_order: 2 },
  { name: 'Electrical',         slug: 'electrical',        icon_class: 'faBolt',        description: 'Electrical work, wiring, and lighting',  sort_order: 3 },
  { name: 'HVAC & Climate',     slug: 'hvac-climate',      icon_class: 'faFan',         description: 'Heating, cooling, and ventilation',      sort_order: 4 },
  { name: 'Outdoor & Landscape', slug: 'outdoor-landscape', icon_class: 'faLeaf',       description: 'Landscaping, lawn care, and outdoor',   sort_order: 5 },
  { name: 'Roofing & Exterior', slug: 'roofing-exterior',  icon_class: 'faHouseChimney', description: 'Roofing, siding, and exterior work',     sort_order: 6 },
  { name: 'Interior',           slug: 'interior',          icon_class: 'faPaintRoller', description: 'Painting, flooring, and interior design', sort_order: 7 },
  { name: 'Cleaning',           slug: 'cleaning',          icon_class: 'faBroom',       description: 'House cleaning and deep cleaning',      sort_order: 8 },
  { name: 'Pest & Wildlife',    slug: 'pest-wildlife',     icon_class: 'faBug',         description: 'Pest control and wildlife removal',     sort_order: 9 },
  { name: 'Moving & Storage',   slug: 'moving-storage',    icon_class: 'faTruck',       description: 'Moving, packing, and storage',           sort_order: 10 },
];

const DEFAULT_SERVICES = [
  { category_slug: 'home-repair',       name: 'Handyperson',        slug: 'handyperson',        icon_class: 'faWrench',       avg_rating: 4.6, review_count: 599000, review_label: '599k+', min_price: 'from $158' },
  { category_slug: 'plumbing-water',    name: 'Plumbing',           slug: 'plumbing',           icon_class: 'faFaucetDrip',  avg_rating: 4.6, review_count: 568000, review_label: '568k+', min_price: 'from $226' },
  { category_slug: 'electrical',        name: 'Electrical',         slug: 'electrical',         icon_class: 'faBolt',         avg_rating: 4.7, review_count: 412000, review_label: '412k+', min_price: 'from $189' },
  { category_slug: 'hvac-climate',      name: 'HVAC',               slug: 'hvac',               icon_class: 'faFan',          avg_rating: 4.7, review_count: 306000, review_label: '306k+', min_price: 'from $350' },
  { category_slug: 'outdoor-landscape', name: 'Landscaping',        slug: 'landscaping',         icon_class: 'faLeaf',        avg_rating: 4.5, review_count: 280000, review_label: '280k+', min_price: 'from $145' },
  { category_slug: 'roofing-exterior',  name: 'Roofing',            slug: 'roofing',            icon_class: 'faHouseChimney', avg_rating: 4.7, review_count: 325000, review_label: '325k+', min_price: 'from $471' },
  { category_slug: 'interior',          name: 'Painting',           slug: 'painting',           icon_class: 'faPaintRoller',  avg_rating: 4.6, review_count: 390000, review_label: '390k+', min_price: 'from $320' },
  { category_slug: 'cleaning',          name: 'Cleaning',            slug: 'cleaning',           icon_class: 'faBroom',        avg_rating: 4.5, review_count: 314000, review_label: '314k+', min_price: 'from $85' },
  { category_slug: 'interior',          name: 'Remodeling',         slug: 'remodeling',         icon_class: 'faHammer',       avg_rating: 4.4, review_count: 180000, review_label: '180k+', min_price: 'from $2,500' },
  { category_slug: 'pest-wildlife',     name: 'Pest Control',       slug: 'pest-control',       icon_class: 'faBug',         avg_rating: 4.8, review_count: 317000, review_label: '317k+', min_price: 'from $186' },
  { category_slug: 'interior',          name: 'Flooring',           slug: 'flooring',           icon_class: 'faLayerGroup',   avg_rating: 4.6, review_count: 210000, review_label: '210k+', min_price: 'from $890' },
  { category_slug: 'home-repair',       name: 'Appliance Repair',  slug: 'appliance-repair',   icon_class: 'faBlender',      avg_rating: 4.7, review_count: 274000, review_label: '274k+', min_price: 'from $264' },
  { category_slug: 'outdoor-landscape', name: 'Fence Installation', slug: 'fence-installation', icon_class: 'faGrip',        avg_rating: 4.2, review_count: 48000,  review_label: '48k+',  min_price: 'from $1,200' },
  { category_slug: 'outdoor-landscape', name: 'Tree Service',       slug: 'tree-service',       icon_class: 'faTree',        avg_rating: 4.5, review_count: 95000,  review_label: '95k+',  min_price: 'from $350' },
  { category_slug: 'outdoor-landscape', name: 'Pool Service',       slug: 'pool-service',       icon_class: 'faWater',       avg_rating: 4.6, review_count: 62000,  review_label: '62k+',  min_price: 'from $150' },
  { category_slug: 'moving-storage',    name: 'Moving',             slug: 'moving',             icon_class: 'faTruck',       avg_rating: 4.4, review_count: 195000, review_label: '195k+', min_price: 'from $400' },
  { category_slug: 'home-repair',       name: 'Garage Door',        slug: 'garage-door',        icon_class: 'faWarehouse',   avg_rating: 4.6, review_count: 95000,  review_label: '95k+',  min_price: 'from $220' },
  { category_slug: 'cleaning',         name: 'Window Cleaning',    slug: 'window-cleaning',    icon_class: 'faWindowRestore', avg_rating: 4.7, review_count: 88000, review_label: '88k+', min_price: 'from $140' },
];

async function run() {
  console.log('Restoring default categories and services for tenant', TENANT_ID, '...');

  // 1. Ensure categories exist
  for (const c of DEFAULT_CATEGORIES) {
    const [existing] = await db.query(
      'SELECT id FROM categories WHERE tenant_id = ? AND slug = ?',
      [TENANT_ID, c.slug]
    );
    if (existing.length === 0) {
      await db.query(
        `INSERT INTO categories (tenant_id, name, slug, icon_class, description, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [TENANT_ID, c.name, c.slug, c.icon_class, c.description, c.sort_order]
      );
      console.log('  Added category:', c.name);
    }
  }

  // 2. Build slug -> category_id map
  const [catRows] = await db.query(
    'SELECT id, slug FROM categories WHERE tenant_id = ?',
    [TENANT_ID]
  );
  const slugToId = {};
  for (const r of catRows) slugToId[r.slug] = r.id;

  // 3. Insert services that don't exist
  let added = 0;
  for (const s of DEFAULT_SERVICES) {
    const categoryId = slugToId[s.category_slug] || null;
    const [existing] = await db.query(
      'SELECT id FROM services WHERE tenant_id = ? AND slug = ?',
      [TENANT_ID, s.slug]
    );
    if (existing.length === 0) {
      await db.query(
        `INSERT INTO services (tenant_id, category_id, name, slug, icon_class, avg_rating, review_count, review_label, min_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [TENANT_ID, categoryId, s.name, s.slug, s.icon_class, s.avg_rating, s.review_count, s.review_label, s.min_price]
      );
      added++;
      console.log('  Added service:', s.name);
    }
  }

  console.log('Done. Categories:', catRows.length, '| New services added:', added);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
