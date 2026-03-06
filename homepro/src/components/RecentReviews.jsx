import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faQuoteLeft } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function RecentReviews() {
  const { darkMode: dm } = useTheme();
  const { siteName } = useSettings();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const tp = dm ? '#f1f5f9' : '#1e293b';
  const ts = dm ? '#94a3b8' : '#64748b';
  const cardBg = dm ? '#111827' : '#fff';
  const border = dm ? '#1f2937' : '#e5e7eb';
  const sectionBg = dm ? '#0b1220' : '#f8fafc';

  const fetchReviews = (showLoading = false) => {
    if (showLoading) setLoading(true);
    fetch(`${BASE}/reviews/recent?limit=6`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setReviews(d); })
      .catch(() => {})
      .finally(() => { if (showLoading) setLoading(false); });
  };

  useEffect(() => {
    fetchReviews(true);
  }, []);

  useEffect(() => {
    const handler = () => fetchReviews(false);
    window.addEventListener('app:data-updated', handler);
    return () => window.removeEventListener('app:data-updated', handler);
  }, []);

  if (loading || reviews.length === 0) return null;

  const renderStars = (count) => (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <FontAwesomeIcon key={n} icon={faStar} style={{ fontSize: 12, color: n <= count ? '#facc15' : (dm ? '#334155' : '#d1d5db') }} />
      ))}
    </span>
  );

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  };

  return (
    <section style={{ background: sectionBg, padding: '64px 20px', borderTop: `1px solid ${border}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <p style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--color-primary)', marginBottom: 8 }}>
            Customer Reviews
          </p>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: tp, margin: 0, lineHeight: 1.2 }}>
            What Homeowners Are Saying
          </h2>
          <p style={{ fontSize: 15, color: ts, marginTop: 8, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
            Real feedback from verified {siteName} customers
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 20,
        }}>
          {reviews.map((r, i) => (
            <div key={i} style={{
              background: cardBg,
              border: `1px solid ${border}`,
              borderRadius: 'var(--border-radius)',
              padding: '24px 22px',
              position: 'relative',
              transition: 'box-shadow 0.2s',
            }}>
              <FontAwesomeIcon icon={faQuoteLeft} style={{
                position: 'absolute', top: 16, right: 18,
                fontSize: 28, color: dm ? '#1e293b' : '#f1f5f9',
              }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: dm ? '#1e293b' : '#e0e7ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 16, color: 'var(--color-primary)',
                }}>
                  {(r.first_name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: tp }}>{r.first_name || 'Customer'}</div>
                  <div style={{ fontSize: 12, color: ts }}>{r.service_name || 'Home Service'}</div>
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                {renderStars(r.rating)}
                <span style={{ fontSize: 11, color: ts, marginLeft: 8 }}>{timeAgo(r.created_at)}</span>
              </div>
              {r.title && (
                <div style={{ fontWeight: 700, fontSize: 14, color: tp, marginBottom: 6 }}>{r.title}</div>
              )}
              {r.body && (
                <p style={{ fontSize: 13, color: ts, lineHeight: 1.6, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                  {r.body}
                </p>
              )}
              <div style={{ marginTop: 10, fontSize: 12, color: ts, fontStyle: 'italic' }}>
                — Service by {r.business_name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
