/**
 * AI-powered setup: generate full site content from chat using OpenAI.
 * Uses OPENAI_API_KEY env or tenant 1's openai_api_key setting (super admin).
 */
const OpenAI = require('openai').default;

const SETUP_JSON_SCHEMA = `You must respond with a single JSON object (no markdown, no code fence) with this exact structure. All string fields required unless noted.

{
  "settings": [
    { "key": "site_name", "value": "string", "type": "string", "group": "general" },
    { "key": "site_tagline", "value": "string", "type": "string", "group": "general" },
    { "key": "meta_title", "value": "string", "type": "string", "group": "seo" },
    { "key": "meta_description", "value": "string", "type": "string", "group": "seo" },
    { "key": "hero_headline", "value": "string", "type": "string", "group": "homepage" },
    { "key": "hero_subheadline", "value": "string", "type": "string", "group": "homepage" },
    { "key": "hero_cta_primary", "value": "string", "type": "string", "group": "homepage" },
    { "key": "hero_cta_secondary", "value": "string", "type": "string", "group": "homepage" },
    { "key": "hero_support_text", "value": "string", "type": "string", "group": "homepage" },
    { "key": "homepage_sections", "value": "[{...}]", "type": "json", "group": "homepage" }
  ],
  "howItWorks": {
    "consumer": [ { "step_number": 1, "icon_class": "faClipboardList", "title": "string", "description": "string" }, ... ],
    "pro": [ { "step_number": 1, "icon_class": "faPenToSquare", "title": "string", "description": "string" }, ... ]
  },
  "subscription_plans": [
    { "name": "string", "slug": "string", "price_monthly": 0, "price_yearly": 0, "lead_credits": 0, "max_service_areas": 5, "max_services": 5, "features": {}, "is_popular": false, "sort_order": 1 }
  ],
  "categories": [ { "name": "string", "slug": "string", "icon_class": "faWrench", "description": "string", "sort_order": 0 } ],
  "services": [ { "name": "string", "slug": "string", "category_slug": "string", "icon_class": "faWrench", "min_price": "from $X", "price_unit": "per job" } ],
  "sample_reviews": [ { "customer_name": "string", "rating": 5, "title": "string", "body": "string", "service_name": "string" } ]
}

homepage_sections: array of objects with id, headline, body (string), list (array of strings), steps (null or array of {title, description}), layout ("default"), visible (true). Use 3-5 sections.
Icon classes: use FontAwesome style like faClipboardList, faMagnifyingGlass, faComments, faTrophy, faPenToSquare, faLocationDot, faEnvelopeOpenText, faCircleDollarToSlot, faWrench, faFaucetDrip, faBolt, faFan, etc.`;

const SYSTEM_PROMPT = `You are a friendly setup assistant for a local home-services lead-generation platform (like a marketplace connecting homeowners with plumbers, electricians, HVAC, etc.). You help the site owner define their business: name, location, which services they offer, pricing tiers for pros, and marketing copy.

Ask short, clear questions to learn: business/site name, city/region, which services (e.g. plumbing, electrical, HVAC, cleaning), tone (professional vs friendly), and any pricing ideas. After 3-6 exchanges, when the user says they are ready, "apply", "generate", or "set up my site", you must output ONLY the JSON object (no other text) that fully defines their site using the schema you were given. The JSON must include: settings (site name, tagline, meta, hero, homepage_sections as a JSON string), howItWorks (consumer and pro steps), subscription_plans (2-4 plans), categories and services that match, and 4-6 sample_reviews. Be specific to their business name, location, and services.`;

/**
 * Get OpenAI API key: env OPENAI_API_KEY or tenant 1 setting openai_api_key.
 * @param {import('../db')} db
 * @returns {Promise<string|null>}
 */
async function getOpenAIKey(db) {
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()) {
    return process.env.OPENAI_API_KEY.trim();
  }
  if (!db) return null;
  try {
    const [rows] = await db.query(
      "SELECT setting_value FROM settings WHERE tenant_id = 1 AND setting_key = 'openai_api_key' AND setting_value != '' LIMIT 1"
    );
    return rows.length ? (rows[0].setting_value || '').trim() : null;
  } catch (_) {
    return null;
  }
}

/**
 * Call OpenAI chat; return assistant message and, if it looks like JSON, parsed object.
 * @param {string} apiKey
 * @param {Array<{role: 'user'|'assistant'|'system', content: string}>} messages
 * @returns {Promise<{ content: string, parsed?: object }>}
 */
async function chat(apiKey, messages) {
  const openai = new OpenAI({ apiKey });
  const allMessages = [
    { role: 'system', content: SYSTEM_PROMPT + '\n\n' + SETUP_JSON_SCHEMA },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: allMessages,
    max_tokens: 4096,
    temperature: 0.4,
  });
  const content = completion.choices?.[0]?.message?.content?.trim() || '';
  let parsed = null;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (_) {}
  }
  return { content, parsed };
}

/**
 * Test that an API key is valid by making a minimal request.
 * @param {string} apiKey
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
async function testKey(apiKey) {
  const openai = new OpenAI({ apiKey: apiKey?.trim() });
  await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Say OK' }],
    max_tokens: 5,
  });
  return { ok: true, message: 'OpenAI API key is valid' };
}

module.exports = { getOpenAIKey, chat, testKey, SYSTEM_PROMPT, SETUP_JSON_SCHEMA };
