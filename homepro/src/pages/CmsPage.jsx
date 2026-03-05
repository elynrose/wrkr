import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function CmsPage({ slug }) {
  const { darkMode } = useTheme();
  const { metaTitle } = useSettings();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`${BASE}/pages/${slug}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setPage)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (page?.meta_title) document.title = page.meta_title;
    return () => { document.title = metaTitle; };
  }, [page, metaTitle]);

  const tp = darkMode ? '#f1f5f9' : '#1e293b';
  const ts = darkMode ? '#94a3b8' : '#64748b';
  const bg = darkMode ? '#0b1220' : '#f3f6fb';
  const cardBg = darkMode ? '#111827' : '#fff';
  const border = darkMode ? '#1f2937' : '#e5e7eb';

  const pageGradient = darkMode
    ? 'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 14%, #0f172a) 0%, #0b1220 45%, #0a0f1a 100%)'
    : 'linear-gradient(180deg, var(--color-primary-light) 0%, #f3f6fb 45%, #f1f5f9 100%)';
  const bannerBg = darkMode
    ? 'color-mix(in srgb, var(--color-primary) 35%, #0b1220)'
    : 'color-mix(in srgb, var(--color-primary) 88%, #0f172a)';

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: pageGradient }}>
      <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 28, color: 'var(--color-primary)' }} />
    </div>
  );

  if (error || !page) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: pageGradient, gap: 12 }}>
      <FontAwesomeIcon icon={faExclamationTriangle} style={{ fontSize: 32, color: '#f59e0b' }} />
      <p style={{ color: tp, fontSize: 16, fontWeight: 600 }}>Page not found</p>
      <p style={{ color: ts, fontSize: 13 }}>The page "{slug}" doesn't exist or has been removed.</p>
    </div>
  );

  return (
    <div style={{ background: pageGradient, minHeight: '60vh', paddingBottom: 64 }}>
      {/* Banner section */}
      <div style={{
        background: bannerBg,
        borderBottom: `1px solid ${border}`,
        padding: '48px 20px 40px',
        marginBottom: 32,
      }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <h1 style={{
            margin: 0,
            fontSize: 32,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}>
            {page.title}
          </h1>
          {page.excerpt && (
            <p style={{ margin: '12px 0 0', fontSize: 16, color: 'rgba(255,255,255,0.88)', lineHeight: 1.5, maxWidth: 560 }}>
              {page.excerpt}
            </p>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 16px' }}>
      <article style={{
        background: cardBg,
        border: `1px solid ${border}`,
        borderRadius: 'var(--border-radius)',
        padding: '40px 36px',
        boxShadow: darkMode ? '0 4px 24px rgba(0,0,0,0.2)' : '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        <div
          className="cms-content"
          dangerouslySetInnerHTML={{ __html: page.content }}
          style={{ color: tp, fontSize: 15, lineHeight: 1.8 }}
        />
        <div style={{ marginTop: 32, paddingTop: 16, borderTop: `1px solid ${border}`, fontSize: 12, color: ts }}>
          Last updated: {new Date(page.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </article>
      </div>

      <style>{`
        .cms-content h1:first-of-type { display: none; }
        .cms-content h1 { font-size: 30px; font-weight: 800; margin: 0 0 16px; color: ${tp}; }
        .cms-content h2 { font-size: 22px; font-weight: 700; margin: 28px 0 12px; color: ${tp}; }
        .cms-content h3 { font-size: 18px; font-weight: 700; margin: 20px 0 8px; color: ${tp}; }
        .cms-content h4 { font-size: 16px; font-weight: 600; margin: 16px 0 6px; color: ${tp}; }
        .cms-content p { margin: 10px 0; }
        .cms-content ul, .cms-content ol { margin: 10px 0; padding-left: 24px; }
        .cms-content li { margin: 6px 0; }
        .cms-content blockquote { border-left: 4px solid var(--color-primary); padding: 12px 20px; margin: 16px 0; background: ${darkMode ? '#1e293b' : '#f8fafc'}; border-radius: 0 8px 8px 0; font-style: italic; }
        .cms-content pre { background: ${darkMode ? '#1e293b' : '#f1f5f9'}; padding: 14px; border-radius: 8px; font-family: monospace; font-size: 13px; overflow-x: auto; }
        .cms-content a { color: var(--color-primary); text-decoration: underline; }
        .cms-content strong { font-weight: 700; }
        .cms-content em { font-style: italic; }
        .cms-content img { max-width: 100%; border-radius: 8px; margin: 12px 0; }
      `}</style>
    </div>
  );
}
