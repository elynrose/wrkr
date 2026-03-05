import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass, faLocationDot, faShieldHalved,
  faBan, faStar, faBolt,
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

const SUGGESTIONS = [
  'Handyperson', 'Plumbing', 'Electrical', 'HVAC', 'Landscaping',
  'Roofing', 'Painting', 'Cleaning', 'Remodeling', 'Pest Control',
  'Flooring', 'Appliance Repair', 'Fence Installation', 'Tree Service',
  'Pool Service', 'Moving', 'Garage Door', 'Window Cleaning',
];

const TRUST = [
  { icon: faBan,         text: 'Free to use' },
  { icon: faShieldHalved, text: 'No obligation' },
  { icon: faStar,        text: 'Verified reviews' },
  { icon: faBolt,        text: 'Same-day matching' },
];

export default function Hero({ onConsumerSignup, services = [] }) {
  const { darkMode } = useTheme();
  const [service, setService] = useState('');
  const [zip, setZip] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const allSuggestions = services.length
    ? services.map(s => s.name)
    : SUGGESTIONS;

  const handleInput = (val) => {
    setService(val);
    setSuggestions(
      val.length > 1
        ? allSuggestions.filter(s => s.toLowerCase().includes(val.toLowerCase())).slice(0, 6)
        : []
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (service) onConsumerSignup({ service, zip });
  };

  return (
    <section
      style={{
        background: darkMode
          ? 'linear-gradient(135deg, #111827 0%, #1f2937 50%, #111827 100%)'
          : 'linear-gradient(135deg, var(--color-primary-light) 0%, #ffffff 50%, #eff6ff 100%)',
        padding: '80px 16px',
      }}
    >
      <div style={{ maxWidth: '56rem', margin: '0 auto', textAlign: 'center' }}>

        {/* Badge */}
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 16px', borderRadius: '9999px', fontSize: '14px',
            fontWeight: 600, color: '#fff', marginBottom: '24px',
            backgroundColor: 'var(--color-primary)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#86efac', display: 'inline-block' }} />
          50,000+ vetted pros ready to help
        </div>

        <h1 style={{
          fontSize: 'clamp(2.25rem, 5vw, 3.75rem)', fontWeight: 800,
          color: darkMode ? '#fff' : '#111827', lineHeight: 1.1, marginBottom: '16px',
        }}>
          Find trusted local pros{' '}
          <span style={{ color: 'var(--color-primary)' }}>in minutes</span>
        </h1>
        <p style={{
          fontSize: '1.125rem', color: darkMode ? '#9ca3af' : '#4b5563',
          marginBottom: '40px', maxWidth: '42rem', margin: '0 auto 40px',
        }}>
          Describe your project, enter your ZIP code, and get matched with verified
          professionals who compete for your business.
        </p>

        {/* Search card */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex', flexWrap: 'wrap', gap: '12px',
            maxWidth: '40rem', margin: '0 auto', padding: '16px',
            borderRadius: '16px',
            backgroundColor: darkMode ? '#1f2937' : '#ffffff',
            boxShadow: '0 20px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)',
            border: darkMode ? '1px solid #374151' : '1px solid #e5e7eb',
          }}
        >
          {/* Service */}
          <div style={{ flex: '1 1 200px', position: 'relative' }}>
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', width: 16 }}
            />
            <input
              type="text"
              placeholder="What service do you need?"
              value={service}
              onChange={e => handleInput(e.target.value)}
              style={{
                width: '100%', paddingLeft: 40, paddingRight: 12, paddingTop: 12, paddingBottom: 12,
                border: darkMode ? '1px solid #4b5563' : '1px solid #d1d5db',
                borderRadius: 'var(--border-radius)', fontSize: '14px', fontWeight: 500,
                backgroundColor: darkMode ? '#374151' : '#f9fafb',
                color: darkMode ? '#fff' : '#111827',
                outline: 'none',
              }}
            />
            {suggestions.length > 0 && (
              <ul style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                border: darkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                backgroundColor: darkMode ? '#1f2937' : '#fff', zIndex: 10, overflow: 'hidden',
                listStyle: 'none', padding: 0,
              }}>
                {suggestions.map(s => (
                  <li
                    key={s}
                    onClick={() => { setService(s); setSuggestions([]); }}
                    style={{
                      padding: '10px 16px', fontSize: 14, cursor: 'pointer',
                      color: darkMode ? '#e5e7eb' : '#374151',
                    }}
                    onMouseEnter={e => e.target.style.backgroundColor = darkMode ? '#374151' : '#f3f4f6'}
                    onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ZIP */}
          <div style={{ width: '140px', position: 'relative', flexShrink: 0 }}>
            <FontAwesomeIcon
              icon={faLocationDot}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', width: 14 }}
            />
            <input
              type="text"
              placeholder="ZIP Code"
              value={zip}
              onChange={e => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
              maxLength={5}
              style={{
                width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 12, paddingBottom: 12,
                border: darkMode ? '1px solid #4b5563' : '1px solid #d1d5db',
                borderRadius: 'var(--border-radius)', fontSize: '14px', fontWeight: 500,
                backgroundColor: darkMode ? '#374151' : '#f9fafb',
                color: darkMode ? '#fff' : '#111827', outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              padding: '12px 24px', fontSize: 14, fontWeight: 700, color: '#fff',
              backgroundColor: 'var(--color-primary)', borderRadius: 'var(--border-radius)',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(26,111,219,0.3)',
            }}
          >
            Get Free Quotes
          </button>
        </form>

        {/* Trust row */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '24px',
          marginTop: '32px', fontSize: '14px', color: darkMode ? '#9ca3af' : '#4b5563',
        }}>
          {TRUST.map(t => (
            <div key={t.text} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
              <FontAwesomeIcon icon={t.icon} style={{ width: 14, color: 'var(--color-primary)' }} />
              {t.text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
