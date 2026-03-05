import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Hook that provides honeypot + timing-based spam protection fields.
 * Returns { spamFields, SpamHoneypot, isSpamLikely }
 *
 * Usage:
 *   const { spamFields, SpamHoneypot } = useSpamProtect();
 *
 *   On submit, spread spamFields() into the payload:
 *     await api.post('/leads', { ...formData, ...spamFields() });
 *
 *   Render <SpamHoneypot /> inside your form (hidden from humans, visible to bots).
 */
export default function useSpamProtect() {
  const [honeypot, setHoneypot] = useState('');
  const loadedAt = useRef(Date.now());

  useEffect(() => {
    loadedAt.current = Date.now();
  }, []);

  const spamFields = useCallback(() => ({
    _hp_website: honeypot,
    _hp_ts: loadedAt.current,
  }), [honeypot]);

  const SpamHoneypot = useCallback(() => (
    <div style={{
      position: 'absolute', left: '-9999px', top: '-9999px',
      width: 0, height: 0, overflow: 'hidden',
      opacity: 0, pointerEvents: 'none',
    }}
      aria-hidden="true"
      tabIndex={-1}
    >
      <label htmlFor="hp_website_field">Website</label>
      <input
        id="hp_website_field"
        type="text"
        name="website"
        autoComplete="off"
        tabIndex={-1}
        value={honeypot}
        onChange={e => setHoneypot(e.target.value)}
      />
    </div>
  ), [honeypot]);

  return { spamFields, SpamHoneypot };
}
