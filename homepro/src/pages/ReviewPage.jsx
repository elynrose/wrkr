import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faSpinner, faCheckCircle, faExclamationTriangle, faArrowUpRightFromSquare, faCopy, faClipboardCheck } from '@fortawesome/free-solid-svg-icons';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function ReviewPage({ token, onNavigate }) {
  const { darkMode: dm } = useTheme();
  const { siteName } = useSettings();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const tp = dm ? '#f1f5f9' : '#1e293b';
  const ts = dm ? '#94a3b8' : '#64748b';
  const bg = dm ? '#0b1220' : '#f3f6fb';
  const cardBg = dm ? '#111827' : '#fff';
  const border = dm ? '#1f2937' : '#e5e7eb';

  useEffect(() => {
    fetch(`${BASE}/reviews/by-token/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('Failed to load review page'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/reviews/by-token/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, title, body }),
      });
      const d = await res.json();
      if (!res.ok) setError(d.error || 'Failed to submit');
      else setSubmitted(true);
    } catch {
      setError('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
      <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 32, color: 'var(--color-primary)' }} />
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: bg, gap: 16, padding: 40 }}>
      <FontAwesomeIcon icon={faExclamationTriangle} style={{ fontSize: 40, color: '#f59e0b' }} />
      <h2 style={{ fontSize: 20, fontWeight: 700, color: tp }}>{error}</h2>
      <button onClick={() => onNavigate?.('home')} style={{ padding: '10px 24px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
        Go Home
      </button>
    </div>
  );

  if (data?.already_reviewed || submitted) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: bg, gap: 16, padding: 40 }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: 36, color: '#22c55e' }} />
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: tp }}>
        {submitted ? 'Thank you for your review!' : 'You already left a review'}
      </h2>
      <p style={{ color: ts, maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
        {submitted
          ? 'Your feedback helps other homeowners find great service professionals.'
          : 'We appreciate your time! Your review has already been recorded.'}
      </p>
      {data?.google_review_url && (
        <div style={{ maxWidth: 400, width: '100%', marginTop: 12, padding: '20px 24px', background: dm ? '#1e293b' : '#eff6ff', border: `1px solid ${dm ? '#334155' : '#bfdbfe'}`, borderRadius: 12, textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: tp, margin: '0 0 6px' }}>
            <FontAwesomeIcon icon={faGoogle} style={{ color: '#4285f4', marginRight: 6 }} />
            Help {data.business_name} on Google too!
          </p>
          <p style={{ fontSize: 12, color: ts, margin: '0 0 14px', lineHeight: 1.5 }}>
            Copy your review below, then paste it on Google.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => {
              const text = [title, body].filter(Boolean).join(' — ');
              if (text) navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 3000); });
            }}
              style={{ padding: '10px 20px', fontSize: 13, fontWeight: 700, border: `1px solid ${dm ? '#334155' : '#bfdbfe'}`, borderRadius: 8, background: copied ? '#22c55e' : (dm ? '#0f172a' : '#fff'), color: copied ? '#fff' : tp, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
              <FontAwesomeIcon icon={copied ? faClipboardCheck : faCopy} />
              {copied ? 'Copied!' : 'Copy My Review'}
            </button>
            <a href={data.google_review_url} target="_blank" rel="noopener noreferrer"
              style={{ padding: '10px 20px', fontSize: 13, fontWeight: 700, border: 'none', borderRadius: 8, background: '#4285f4', color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <FontAwesomeIcon icon={faGoogle} /> Open Google Review
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} style={{ fontSize: 10 }} />
            </a>
          </div>
        </div>
      )}
      <button onClick={() => onNavigate?.('home')} style={{ marginTop: 12, padding: '10px 24px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
        Go to {siteName}
      </button>
    </div>
  );

  const starLabels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

  return (
    <div style={{ minHeight: '100vh', background: bg, padding: '40px 16px 80px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: dm ? 'color-mix(in srgb, var(--color-primary) 35%, #0b1220)' : 'color-mix(in srgb, var(--color-primary) 88%, #0f172a)',
          borderRadius: 'var(--border-radius) var(--border-radius) 0 0',
          padding: '32px 28px 24px',
          color: '#fff',
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, margin: 0 }}>How was your experience?</p>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '8px 0 4px', lineHeight: 1.2 }}>
            Rate your {data.service_name} service
          </h1>
          <p style={{ fontSize: 14, opacity: 0.85, margin: 0 }}>
            with <strong>{data.business_name}</strong>
          </p>
        </div>

        {/* Form card */}
        <div style={{
          background: cardBg,
          border: `1px solid ${border}`,
          borderTop: 'none',
          borderRadius: '0 0 var(--border-radius) var(--border-radius)',
          padding: '32px 28px',
          boxShadow: dm ? '0 4px 24px rgba(0,0,0,0.2)' : '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          {/* Star rating */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: tp, marginBottom: 12 }}>
              Tap a star to rate
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    transform: (hoverRating || rating) >= n ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 0.15s',
                  }}
                >
                  <FontAwesomeIcon
                    icon={faStar}
                    style={{
                      fontSize: 36,
                      color: (hoverRating || rating) >= n ? '#facc15' : (dm ? '#334155' : '#d1d5db'),
                      transition: 'color 0.15s',
                    }}
                  />
                </button>
              ))}
            </div>
            {(hoverRating || rating) > 0 && (
              <p style={{ fontSize: 14, fontWeight: 700, color: '#facc15', marginTop: 8 }}>
                {starLabels[hoverRating || rating]}
              </p>
            )}
          </div>

          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 6 }}>Review Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Summarize your experience..."
              maxLength={200}
              style={{
                width: '100%', padding: '10px 14px', fontSize: 14, border: `1px solid ${border}`,
                borderRadius: 8, background: dm ? '#1e293b' : '#f8fafc', color: tp, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Body */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 6 }}>Your Review</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Tell others about your experience with this provider..."
              rows={4}
              style={{
                width: '100%', padding: '10px 14px', fontSize: 14, border: `1px solid ${border}`,
                borderRadius: 8, background: dm ? '#1e293b' : '#f8fafc', color: tp, outline: 'none',
                boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6,
              }}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!rating || submitting}
            style={{
              width: '100%', padding: '14px 24px', fontSize: 15, fontWeight: 700, border: 'none',
              borderRadius: 8, background: !rating ? (dm ? '#334155' : '#d1d5db') : 'var(--color-primary)',
              color: '#fff', cursor: !rating || submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {submitting ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faStar} />}
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>

          {/* Google review link */}
          {data.google_review_url && (
            <div style={{ marginTop: 20, padding: '16px 20px', background: dm ? '#1e293b' : '#eff6ff', border: `1px solid ${dm ? '#334155' : '#bfdbfe'}`, borderRadius: 10, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: tp, marginBottom: 10 }}>
                <FontAwesomeIcon icon={faGoogle} style={{ color: '#4285f4', marginRight: 6 }} />
                Help <strong>{data.business_name}</strong> even more by leaving a Google review!
              </p>
              <p style={{ fontSize: 12, color: ts, margin: '0 0 12px', lineHeight: 1.5 }}>
                After submitting, you can copy your review and paste it on Google.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => {
                  const text = [title, body].filter(Boolean).join(' — ');
                  if (text) navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 3000); });
                }}
                  disabled={!body && !title}
                  style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, border: `1px solid ${dm ? '#334155' : '#bfdbfe'}`, borderRadius: 8, background: copied ? '#22c55e' : (dm ? '#0f172a' : '#fff'), color: copied ? '#fff' : (!body && !title ? ts : tp), cursor: !body && !title ? 'not-allowed' : 'pointer', opacity: !body && !title ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
                  <FontAwesomeIcon icon={copied ? faClipboardCheck : faCopy} />
                  {copied ? 'Copied!' : 'Copy My Review'}
                </button>
                <a href={data.google_review_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#4285f4', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: 12, textDecoration: 'none' }}>
                  <FontAwesomeIcon icon={faGoogle} /> Open Google Review
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} style={{ fontSize: 10 }} />
                </a>
              </div>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: ts, marginTop: 20 }}>
          Powered by {siteName}
        </p>
      </div>
    </div>
  );
}
