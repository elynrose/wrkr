import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope, faLock, faEye, faEyeSlash, faUser, faPhone,
  faSpinner, faArrowRight, faHouse, faBriefcase,
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import useSpamProtect from '../hooks/useSpamProtect';

export default function RegisterPage({ onNavigate }) {
  const { darkMode } = useTheme();
  const { register } = useAuth();
  const { siteName } = useSettings();
  const { spamFields, SpamHoneypot } = useSpamProtect();

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '', role: 'consumer',
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.firstName) {
      setError('First name, email, and password are required');
      return;
    }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    setError('');
    try {
      await register({ ...form, ...spamFields() });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const bg = darkMode ? '#0a0f1a' : '#f0f4f8';
  const cardBg = darkMode ? '#111827' : '#ffffff';
  const border = darkMode ? '#1f2937' : '#e2e8f0';
  const textPrimary = darkMode ? '#f1f5f9' : '#1e293b';
  const textSecondary = darkMode ? '#94a3b8' : '#64748b';
  const inputBg = darkMode ? '#1e293b' : '#f8fafc';
  const inputBorder = darkMode ? '#334155' : '#e2e8f0';

  const inputStyle = {
    width: '100%', padding: '10px 14px', fontSize: 14, border: `1px solid ${inputBorder}`,
    borderRadius: 'var(--border-radius)', background: inputBg, color: textPrimary,
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-6 sm:px-6" style={{ background: bg, fontFamily: 'var(--font-family)' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <button onClick={() => onNavigate('home')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 'var(--border-radius)', margin: '0 auto 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'var(--color-primary)', color: '#fff',
              fontWeight: 800, fontSize: 22, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}>{(siteName || 'H')[0]}</div>
            <span style={{ fontSize: 24, fontWeight: 800, color: textPrimary }}>
              {siteName === 'HomePro' ? <>Home<span style={{ color: 'var(--color-primary)' }}>Pro</span></> : siteName}
            </span>
          </button>
          <p style={{ color: textSecondary, fontSize: 14, marginTop: 8 }}>
            Create your free account
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: cardBg, borderRadius: 'var(--border-radius)',
          border: `1px solid ${border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          padding: '28px 24px',
        }}>
          <form onSubmit={handleSubmit}>
            <SpamHoneypot />

            {/* Role picker */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
              {[
                { key: 'consumer', label: 'I need a pro', icon: faHouse },
                { key: 'pro', label: "I'm a pro", icon: faBriefcase },
              ].map(r => (
                <button key={r.key} type="button" onClick={() => update('role', r.key)} style={{
                  flex: 1, padding: '12px 8px', borderRadius: 'var(--border-radius)',
                  border: form.role === r.key ? '2px solid var(--color-primary)' : `1px solid ${border}`,
                  background: form.role === r.key ? (darkMode ? '#1e293b' : 'var(--color-primary-light, #e8f1fd)') : 'transparent',
                  cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                }}>
                  <FontAwesomeIcon icon={r.icon} style={{
                    fontSize: 18, display: 'block', margin: '0 auto 6px',
                    color: form.role === r.key ? 'var(--color-primary)' : textSecondary,
                  }} />
                  <span style={{
                    fontSize: 13, fontWeight: 600,
                    color: form.role === r.key ? 'var(--color-primary)' : textPrimary,
                  }}>{r.label}</span>
                </button>
              ))}
            </div>

            {/* Name row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textPrimary, marginBottom: 5 }}>
                  <FontAwesomeIcon icon={faUser} style={{ marginRight: 5, opacity: 0.5, fontSize: 11 }} />
                  First Name *
                </label>
                <input type="text" value={form.firstName} onChange={e => update('firstName', e.target.value)}
                  placeholder="Jane" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textPrimary, marginBottom: 5 }}>
                  Last Name
                </label>
                <input type="text" value={form.lastName} onChange={e => update('lastName', e.target.value)}
                  placeholder="Smith" style={inputStyle} />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textPrimary, marginBottom: 5 }}>
                <FontAwesomeIcon icon={faEnvelope} style={{ marginRight: 5, opacity: 0.5, fontSize: 11 }} />
                Email *
              </label>
              <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                placeholder="you@example.com" autoComplete="email" style={inputStyle} />
            </div>

            {/* Phone */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textPrimary, marginBottom: 5 }}>
                <FontAwesomeIcon icon={faPhone} style={{ marginRight: 5, opacity: 0.5, fontSize: 11 }} />
                Phone
              </label>
              <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
                placeholder="(555) 000-0000" style={inputStyle} />
            </div>

            {/* Password */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textPrimary, marginBottom: 5 }}>
                  <FontAwesomeIcon icon={faLock} style={{ marginRight: 5, opacity: 0.5, fontSize: 11 }} />
                  Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} value={form.password}
                    onChange={e => update('password', e.target.value)}
                    placeholder="Min 6 chars" autoComplete="new-password"
                    style={{ ...inputStyle, paddingRight: 38 }} />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: textSecondary, padding: 4,
                  }}>
                    <FontAwesomeIcon icon={showPw ? faEyeSlash : faEye} style={{ width: 14 }} />
                  </button>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textPrimary, marginBottom: 5 }}>
                  Confirm *
                </label>
                <input type="password" value={form.confirmPassword}
                  onChange={e => update('confirmPassword', e.target.value)}
                  placeholder="Repeat" autoComplete="new-password" style={inputStyle} />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: darkMode ? '#7f1d1d33' : '#fef2f2', color: '#ef4444',
                padding: '10px 14px', borderRadius: 'var(--border-radius)', fontSize: 13,
                fontWeight: 500, marginBottom: 16, border: '1px solid #fecaca',
              }}>{error}</div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '12px 0', fontSize: 15, fontWeight: 700,
              background: 'var(--color-primary)', color: '#fff', border: 'none',
              borderRadius: 'var(--border-radius)', cursor: loading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: loading ? 0.7 : 1, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}>
              {loading
                ? <><FontAwesomeIcon icon={faSpinner} spin /> Creating account...</>
                : <>Create Account <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: 13 }} /></>
              }
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 14, color: textSecondary, marginTop: 20 }}>
            Already have an account?{' '}
            <button onClick={() => onNavigate('login')} style={{
              background: 'none', border: 'none', color: 'var(--color-primary)',
              fontWeight: 600, cursor: 'pointer', textDecoration: 'underline',
            }}>Sign in</button>
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: textSecondary }}>
          <button onClick={() => onNavigate('home')} style={{
            background: 'none', border: 'none', color: textSecondary,
            cursor: 'pointer', textDecoration: 'underline',
          }}>← Back to {siteName}</button>
        </p>
      </div>
    </div>
  );
}
