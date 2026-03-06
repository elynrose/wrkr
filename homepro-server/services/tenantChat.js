/**
 * Tenant homepage chat: AI assistant that uses tenant-specific personality and reference
 * info, and can suggest a lead (service, zip, description, contact) to route through the system.
 */
const OpenAI = require('openai').default;
const db = require('../db');
const { getOpenAIKey } = require('./openaiSetup');

const DEFAULT_PERSONALITY = 'You are a friendly, helpful assistant for a local home services company. You help visitors describe their project and get matched with qualified service professionals.';

const LEAD_INSTRUCTION = `
When the visitor has provided enough information to create a service request (at minimum: what service they need, their location/ZIP, and a way to contact them), you may output a single JSON object on its own line with this exact structure so the system can create the lead:
\`\`\`json
{"suggestedLead":{"service":"Service Name","zip":"12345","city":"City","description":"...","urgency":"Within 24 hours|This week|This month|Just planning","name":"...","email":"...","phone":"..."}}
\`\`\`
Only output this when the user has clearly agreed to submit a request and you have: service (must match a service the company offers), zip (5 digits), and email. Use "Just planning" for urgency if not specified. After outputting the JSON, you may add a short friendly line like "I've submitted your request!"`;

/**
 * Get tenant chat settings (enabled, personality, reference_info).
 * @param {number} tenantId
 * @returns {Promise<{ enabled: boolean, personality: string, referenceInfo: string }>}
 */
async function getTenantChatSettings(tenantId) {
  const [rows] = await db.query(
    `SELECT setting_key, setting_value FROM settings 
     WHERE tenant_id = ? AND setting_key IN ('tenant_chat_enabled', 'tenant_chat_personality', 'tenant_chat_reference_info')`,
    [tenantId]
  );
  const map = {};
  for (const r of rows) map[r.setting_key] = r.setting_value;
  return {
    enabled: map.tenant_chat_enabled === 'true' || map.tenant_chat_enabled === '1',
    personality: (map.tenant_chat_personality || '').trim() || DEFAULT_PERSONALITY,
    referenceInfo: (map.tenant_chat_reference_info || '').trim(),
  };
}

/**
 * Call OpenAI for tenant chat. Uses personality + reference in system prompt.
 * Parses optional suggestedLead from assistant response.
 * @param {string} apiKey
 * @param {string} personality
 * @param {string} referenceInfo
 * @param {string} siteName
 * @param {Array<{ role: 'user'|'assistant', content: string }>} messages
 * @returns {Promise<{ reply: string, suggestedLead?: object }>}
 */
async function chat(apiKey, personality, referenceInfo, siteName, messages) {
  const openai = new OpenAI({ apiKey });
  const referenceBlock = referenceInfo
    ? `\n\nReference information about this business (use this to answer accurately):\n${referenceInfo}`
    : '';
  const systemContent =
    `${personality}\n\nYou are on the website of "${siteName}". Your goal is to help the visitor request a service quote. Ask what service they need, their ZIP code or location, and how soon they need it. Be concise. When they're ready, collect their name, email, and optionally phone.${referenceBlock}\n${LEAD_INSTRUCTION}`;

  const allMessages = [
    { role: 'system', content: systemContent },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: allMessages,
    max_tokens: 1024,
    temperature: 0.5,
  });

  const content = completion.choices?.[0]?.message?.content?.trim() || '';
  let suggestedLead = null;
  const jsonMatch = content.match(/\{\s*"suggestedLead"\s*:\s*\{[\s\S]*?\}\s*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.suggestedLead && typeof parsed.suggestedLead === 'object') {
        suggestedLead = parsed.suggestedLead;
      }
    } catch (_) {}
  }
  // Strip the JSON block from the reply so the user sees only the friendly message
  const reply = jsonMatch ? content.replace(jsonMatch[0], '').replace(/```json\s*|\s*```/g, '').trim() : content;

  return { reply, suggestedLead: suggestedLead || undefined };
}

module.exports = { getTenantChatSettings, chat, DEFAULT_PERSONALITY };
