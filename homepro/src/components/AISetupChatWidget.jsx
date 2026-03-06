import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots, faXmark, faPaperPlane, faWandMagicSparkles, faSpinner } from '@fortawesome/free-solid-svg-icons';

/**
 * Floating AI Setup Assistant chat at bottom-right (Facebook messenger style).
 * Toggle open/close via FAB; panel shows messages, input, Send, and Apply.
 */
export default function AISetupChatWidget({
  dm,
  tp,
  ts,
  border,
  messages,
  setMessages,
  input,
  setInput,
  loading,
  applying,
  onSend,
  onApply,
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating chat panel */}
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
            background: dm ? '#1e293b' : '#fff',
            borderRadius: 16,
            boxShadow: dm ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.15)',
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
            background: dm ? '#0f172a' : '#f8fafc',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <FontAwesomeIcon icon={faWandMagicSparkles} style={{ fontSize: 16 }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: tp }}>AI Setup Assistant</div>
                <div style={{ fontSize: 11, color: ts }}>Generate your full site from chat</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: ts, cursor: 'pointer', padding: 6 }}
              aria-label="Close"
            >
              <FontAwesomeIcon icon={faXmark} style={{ fontSize: 18 }} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
            {messages.length === 0 && (
              <p style={{ fontSize: 12, color: ts, margin: 0, lineHeight: 1.5 }}>
                Describe your business (name, location, services). The assistant will ask a few questions, then you can apply to generate homepage, packages, services, and more.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: ts, marginBottom: 2 }}>{m.role === 'user' ? 'You' : 'Assistant'}</span>
                <div style={{
                  maxWidth: '92%',
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: m.role === 'user' ? (dm ? '#1e3a5f' : '#dbeafe') : (dm ? '#334155' : '#f1f5f9'),
                  fontSize: 13,
                  color: tp,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {m.content?.length > 1500 ? m.content.slice(0, 1500) + '…' : m.content}
                </div>
              </div>
            ))}
            {(loading || applying) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: ts, fontSize: 12 }}>
                <FontAwesomeIcon icon={faSpinner} spin /> {applying ? 'Applying…' : 'Thinking…'}
              </div>
            )}
          </div>

          <div style={{ padding: 12, borderTop: `1px solid ${border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend?.(); } }}
                placeholder="Type a message…"
                disabled={loading || applying}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  fontSize: 13,
                  border: `1px solid ${border}`,
                  borderRadius: 24,
                  background: dm ? '#0f172a' : '#fff',
                  color: tp,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={onSend}
                disabled={loading || applying || !input?.trim()}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  cursor: loading || applying || !input?.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || applying || !input?.trim() ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FontAwesomeIcon icon={faPaperPlane} style={{ fontSize: 14 }} />
              </button>
            </div>
            <button
              type="button"
              onClick={onApply}
              disabled={loading || applying || messages.length === 0}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                borderRadius: 10,
                background: messages.length > 0 ? 'var(--color-primary)' : (dm ? '#334155' : '#e2e8f0'),
                color: '#fff',
                cursor: loading || applying || messages.length === 0 ? 'not-allowed' : 'pointer',
                opacity: loading || applying || messages.length === 0 ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <FontAwesomeIcon icon={faWandMagicSparkles} /> Apply to my site
            </button>
          </div>
        </div>
      )}

      {/* FAB — above dashboard bottom nav */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'fixed',
          bottom: 72,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: 'none',
          background: 'var(--color-primary)',
          color: '#fff',
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9998,
        }}
        aria-label={open ? 'Close AI Assistant' : 'Open AI Assistant'}
      >
        <FontAwesomeIcon icon={faCommentDots} style={{ fontSize: 24 }} />
      </button>
    </>
  );
}
