import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots, faXmark, faPaperPlane, faSpinner } from '@fortawesome/free-solid-svg-icons';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Floating chat widget for tenant homepage. Similar to AISetupChatWidget:
 * conversation with AI that can suggest a lead; when suggestedLead is returned,
 * user can submit the request through the existing lead flow.
 */
export default function TenantChatWidget({ slug, siteName, label = 'Chat with us', primary = '#2563eb', onOpenRequestModal }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedLead, setSuggestedLead] = useState(null);

  const sendMessage = async () => {
    const text = (input || '').trim();
    if (!text || loading || !slug) return;

    const userMessage = { role: 'user', content: text };
    setMessages((m) => [...m, userMessage]);
    setInput('');
    setLoading(true);
    setSuggestedLead(null);

    try {
      const res = await fetch(`${API}/tenant/${slug}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage].map(({ role, content }) => ({ role, content })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      setMessages((m) => [...m, { role: 'assistant', content: data.reply || '' }]);
      if (data.suggestedLead) setSuggestedLead(data.suggestedLead);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: err.message || 'Sorry, I could not respond. Please try the request form instead.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitLead = () => {
    if (suggestedLead && onOpenRequestModal) {
      onOpenRequestModal({
        service: suggestedLead.service || '',
        zip: suggestedLead.zip || '',
        city: suggestedLead.city || '',
        description: suggestedLead.description || '',
        urgency: suggestedLead.urgency || '',
        name: suggestedLead.name || '',
        email: suggestedLead.email || '',
        phone: suggestedLead.phone || '',
      });
      setSuggestedLead(null);
      setOpen(false);
    }
  };

  const border = '#e2e8f0';
  const textPrimary = '#1e293b';
  const textSecondary = '#64748b';

  return (
    <>
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 80,
            right: 24,
            width: 'min(400px, calc(100vw - 48px))',
            maxHeight: 'min(520px, calc(100vh - 120px))',
            display: 'flex',
            flexDirection: 'column',
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            border: `1px solid ${border}`,
            zIndex: 9999,
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '14px 16px',
            borderBottom: `1px solid ${border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <FontAwesomeIcon icon={faCommentDots} style={{ fontSize: 16 }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: textPrimary }}>{label}</div>
                <div style={{ fontSize: 11, color: textSecondary }}>{siteName}</div>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: textSecondary, cursor: 'pointer', padding: 6 }} aria-label="Close">
              <FontAwesomeIcon icon={faXmark} style={{ fontSize: 18 }} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
            {messages.length === 0 && (
              <p style={{ fontSize: 12, color: textSecondary, margin: 0, lineHeight: 1.5 }}>
                Ask what service you need, your ZIP code, and we'll help you get free quotes from pros.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: textSecondary, marginBottom: 2 }}>{m.role === 'user' ? 'You' : label}</span>
                <div style={{
                  maxWidth: '92%',
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: m.role === 'user' ? '#dbeafe' : '#f1f5f9',
                  fontSize: 13,
                  color: textPrimary,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {m.content?.length > 1500 ? m.content.slice(0, 1500) + '…' : m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: textSecondary, fontSize: 12 }}>
                <FontAwesomeIcon icon={faSpinner} spin /> Thinking…
              </div>
            )}
            {suggestedLead && (
              <div style={{ marginTop: 8, padding: 12, background: '#ecfdf5', borderRadius: 10, border: '1px solid #a7f3d0' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#065f46', marginBottom: 8 }}>Ready to submit your request?</p>
                <p style={{ fontSize: 12, color: '#047857', marginBottom: 10 }}>
                  {suggestedLead.service} · {suggestedLead.zip} · {suggestedLead.email}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={handleSubmitLead} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, background: primary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                    Submit request
                  </button>
                  <button type="button" onClick={() => setSuggestedLead(null)} style={{ padding: '8px 12px', fontSize: 12, fontWeight: 500, background: 'transparent', color: textSecondary, border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: 12, borderTop: `1px solid ${border}`, display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Type a message…"
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 14px',
                fontSize: 13,
                border: `1px solid ${border}`,
                borderRadius: 24,
                background: '#fff',
                color: textPrimary,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={loading || !input?.trim()}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: 'none',
                background: primary,
                color: '#fff',
                cursor: loading || !input?.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !input?.trim() ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FontAwesomeIcon icon={faPaperPlane} style={{ fontSize: 14 }} />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: 'none',
          background: primary,
          color: '#fff',
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9998,
        }}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        <FontAwesomeIcon icon={faCommentDots} style={{ fontSize: 24 }} />
      </button>
    </>
  );
}
