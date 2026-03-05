const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/messages/conversations — list user's conversations
router.get('/conversations', authenticate, async (req, res) => {
  try {
    let query;
    const params = [];

    if (req.user.role === 'pro') {
      const [pros] = await db.query('SELECT id FROM pros WHERE user_id = ?', [req.user.id]);
      if (!pros.length) return res.json([]);
      query = `
        SELECT conv.*, u.first_name as consumer_first, u.last_name as consumer_last,
               p.business_name, l.service_name,
               (SELECT body FROM messages m WHERE m.conversation_id = conv.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
               (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = conv.id AND m.is_read = FALSE AND m.sender_id != ?) as unread
        FROM conversations conv
        JOIN users u ON conv.consumer_id = u.id
        JOIN pros p ON conv.pro_id = p.id
        LEFT JOIN leads l ON conv.lead_id = l.id
        WHERE conv.pro_id = ? AND conv.status = 'active'
        ORDER BY conv.last_message_at DESC`;
      params.push(req.user.id, pros[0].id);
    } else {
      query = `
        SELECT conv.*, u.first_name as consumer_first, u.last_name as consumer_last,
               p.business_name, l.service_name,
               (SELECT body FROM messages m WHERE m.conversation_id = conv.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
               (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = conv.id AND m.is_read = FALSE AND m.sender_id != ?) as unread
        FROM conversations conv
        JOIN users u ON conv.consumer_id = u.id
        JOIN pros p ON conv.pro_id = p.id
        LEFT JOIN leads l ON conv.lead_id = l.id
        WHERE conv.consumer_id = ? AND conv.status = 'active'
        ORDER BY conv.last_message_at DESC`;
      params.push(req.user.id, req.user.id);
    }

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Conversations error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/messages/start — start a new conversation (MUST be before /:conversationId)
router.post('/start', authenticate, async (req, res) => {
  const { proId, leadId, body } = req.body;
  if (!proId || !body?.trim()) return res.status(400).json({ error: 'proId and message body required' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query(
      'SELECT id FROM conversations WHERE consumer_id = ? AND pro_id = ? AND (lead_id = ? OR (lead_id IS NULL AND ? IS NULL))',
      [req.user.id, proId, leadId || null, leadId || null]
    );

    let convId;
    if (existing.length) {
      convId = existing[0].id;
    } else {
      const [result] = await conn.query(
        'INSERT INTO conversations (consumer_id, pro_id, lead_id, last_message_at) VALUES (?,?,?,NOW())',
        [req.user.id, proId, leadId || null]
      );
      convId = result.insertId;
    }

    await conn.query(
      'INSERT INTO messages (conversation_id, sender_id, body) VALUES (?,?,?)',
      [convId, req.user.id, body.trim()]
    );

    await conn.query('UPDATE conversations SET last_message_at = NOW() WHERE id = ?', [convId]);

    await conn.commit();
    res.status(201).json({ conversationId: convId, message: 'Conversation started' });
  } catch (err) {
    await conn.rollback();
    console.error('Start conversation error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// GET /api/messages/:conversationId — messages in a conversation
router.get('/:conversationId', authenticate, async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    const [conv] = await db.query('SELECT * FROM conversations WHERE id = ?', [req.params.conversationId]);
    if (!conv.length) return res.status(404).json({ error: 'Conversation not found' });

    const [msgs] = await db.query(
      `SELECT m.*, u.first_name, u.last_name, u.avatar_url, u.role
       FROM messages m JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at ASC LIMIT ? OFFSET ?`,
      [req.params.conversationId, parseInt(limit), offset]
    );

    await db.query(
      'UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE',
      [req.params.conversationId, req.user.id]
    );

    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/messages/:conversationId — send a message
router.post('/:conversationId', authenticate, async (req, res) => {
  const { body, attachmentUrl } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'Message body required' });

  try {
    const [conv] = await db.query('SELECT * FROM conversations WHERE id = ?', [req.params.conversationId]);
    if (!conv.length) return res.status(404).json({ error: 'Conversation not found' });

    await db.query(
      'INSERT INTO messages (conversation_id, sender_id, body, attachment_url) VALUES (?,?,?,?)',
      [req.params.conversationId, req.user.id, body.trim(), attachmentUrl]
    );

    await db.query('UPDATE conversations SET last_message_at = NOW() WHERE id = ?', [req.params.conversationId]);

    res.status(201).json({ message: 'Message sent' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
