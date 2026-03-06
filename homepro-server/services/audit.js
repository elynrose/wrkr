const db = require('../db');

/**
 * Write an audit log entry for admin/sensitive actions.
 * @param {Object} opts
 * @param {number} [opts.tenantId]
 * @param {number} [opts.userId]
 * @param {string} opts.action - e.g. 'login', 'password_change', 'user_create', 'settings_update'
 * @param {string} [opts.entityType] - e.g. 'user', 'lead', 'settings'
 * @param {number} [opts.entityId]
 * @param {Object} [opts.oldValues]
 * @param {Object} [opts.newValues]
 * @param {string} [opts.ipAddress]
 */
async function audit(opts) {
  const { tenantId, userId, action, entityType, entityId, oldValues, newValues, ipAddress } = opts;
  if (!action) return;
  try {
    await db.query(
      `INSERT INTO audit_log (tenant_id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId || null,
        userId || null,
        action,
        entityType || null,
        entityId || null,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress || null,
      ]
    );
  } catch (err) {
    console.error('[AUDIT] Write failed:', err.message);
  }
}

module.exports = { audit };
