import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faPhone, faLocationDot, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { useSettings } from '../context/SettingsContext';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const linkStyle = {
  color: '#9ca3af', fontSize: 14, cursor: 'pointer',
  textDecoration: 'none', transition: 'color 0.15s',
  background: 'none', border: 'none', padding: 0, fontFamily: 'inherit',
  textAlign: 'left',
};

export default function Footer({ onNavigate }) {
  const { siteName, supportEmail, supportPhone } = useSettings();
  const [navPages, setNavPages] = useState([]);

  const fetchPages = () => {
    fetch(`${BASE}/pages`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setNavPages(d); })
      .catch(() => {});
  };

  useEffect(() => {
    fetchPages();
  }, []);

  useEffect(() => {
    const handler = () => fetchPages();
    window.addEventListener('app:data-updated', handler);
    return () => window.removeEventListener('app:data-updated', handler);
  }, []);

  const nav = (view) => onNavigate && onNavigate(view);
  const goPage = (slug) => nav(`page:${slug}`);

  const companyPages = navPages.filter(p => p.nav_group === 'company' && p.show_in_nav);
  const proPages     = navPages.filter(p => p.nav_group === 'pros' && p.show_in_nav);
  const legalPages   = navPages.filter(p => p.nav_group === 'legal' && p.show_in_nav);

  return (
    <footer className="px-4 sm:px-6 py-12 sm:py-16 md:py-20" style={{ backgroundColor: '#111827', color: '#fff' }}>
      <div className="max-w-5xl mx-auto lg:max-w-7xl">
        <div className="footer-grid">

          {/* Brand — full width on mobile, span 2 on tablet+ */}
          <div className="footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 'var(--border-radius)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'var(--color-primary)', color: '#fff', fontWeight: 800, fontSize: 18,
              }}>{(siteName || 'H')[0]}</div>
              <span style={{ fontSize: 20, fontWeight: 800 }}>
                {siteName === 'HomePro' ? <>Home<span style={{ color: 'var(--color-primary)' }}>Pro</span></> : siteName}
              </span>
            </div>
            <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.6, maxWidth: 280, marginBottom: 20 }}>
              The easiest way to connect homeowners with trusted local service professionals. Free for homeowners, qualified leads for pros.
            </p>
            {[
              { icon: faPhone, text: supportPhone },
              { icon: faEnvelope, text: supportEmail },
              { icon: faLocationDot, text: 'Austin, TX · Nationwide' },
            ].map(c => (
              <div key={c.text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#9ca3af', marginBottom: 8 }}>
                <FontAwesomeIcon icon={c.icon} style={{ width: 14, color: 'var(--color-primary)', flexShrink: 0 }} />
                {c.text}
              </div>
            ))}
          </div>

          {/* Company */}
          <div>
            <h4 style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', marginBottom: 16 }}>
              Company
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ marginBottom: 10 }}><button onClick={() => nav('home')} style={linkStyle}>Home</button></li>
              <li style={{ marginBottom: 10 }}><button onClick={() => nav('how')} style={linkStyle}>How It Works</button></li>
              {companyPages.map(p => (
                <li key={p.slug} style={{ marginBottom: 10 }}>
                  <button onClick={() => goPage(p.slug)} style={linkStyle}>{p.title}</button>
                </li>
              ))}
            </ul>
          </div>

          {/* For Pros */}
          <div>
            <h4 style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-accent)', marginBottom: 16 }}>
              For Pros
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ marginBottom: 10 }}><button onClick={() => nav('for-pros')} style={linkStyle}>Join as a Pro</button></li>
              {proPages.map(p => (
                <li key={p.slug} style={{ marginBottom: 10 }}>
                  <button onClick={() => goPage(p.slug)} style={linkStyle}>{p.title}</button>
                </li>
              ))}
              <li style={{ marginBottom: 10 }}><button onClick={() => nav('pro-dashboard')} style={linkStyle}>Pro Dashboard</button></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#d1d5db', marginBottom: 16 }}>
              Legal
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {legalPages.map(p => (
                <li key={p.slug} style={{ marginBottom: 10 }}>
                  <button onClick={() => goPage(p.slug)} style={linkStyle}>{p.title}</button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Trust bar */}
        <div style={{ borderTop: '1px solid #374151', paddingTop: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
            {['BBB Accredited Business', '50,000+ Verified Pros', 'A+ Trust Rating', '2M+ Jobs Completed'].map(badge => (
              <div key={badge} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9ca3af' }}>
                <FontAwesomeIcon icon={faShieldHalved} style={{ width: 12, color: 'var(--color-primary)' }} />
                {badge}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — stacks on mobile */}
        <div className="border-t border-gray-700 pt-6 flex flex-col sm:flex-row flex-wrap justify-between items-center gap-3 text-xs text-gray-400">
          <p>© {new Date().getFullYear()} {siteName}, Inc. All rights reserved.</p>
          <p>Made with ❤️ for homeowners and the pros who serve them.</p>
        </div>
      </div>
    </footer>
  );
}
