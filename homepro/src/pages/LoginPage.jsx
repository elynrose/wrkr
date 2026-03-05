import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope, faLock, faEye, faEyeSlash,
  faSpinner, faArrowRight, faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function LoginPage({ onNavigate }) {
  const { darkMode } = useTheme();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (em, pw) => { setEmail(em); setPassword(pw); setError(''); };

  const bg = darkMode ? '#0a0f1a' : '#f0f4f8';
  const cardBg = darkMode ? '#111827' : '#ffffff';
  const border = darkMode ? '#1f2937' : '#e2e8f0';
  const textPrimary = darkMode ? '#f1f5f9' : '#1e293b';
  const textSecondary = darkMode ? '#94a3b8' : '#64748b';
  const inputBg = darkMode ? '#1e293b' : '#f8fafc';
  const inputBorder = darkMode ? '#334155' : '#e2e8f0';

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: bg, padding: '24px 16px',
      fontFamily: 'var(--font-family)',
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <button onClick={() => onNavigate('home')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 'var(--border-radius)', margin: '0 auto 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'var(--color-primary)', color: '#fff',
              fontWeight: 800, fontSize: 22, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}>H</div>
            <span style={{ fontSize: 24, fontWeight: 800, color: textPrimary }}>
              Home<span style={{ color: 'var(--color-primary)' }}>Pro</span>
            </span>
          </button>
          <p style={{ color: textSecondary, fontSize: 14, marginTop: 8 }}>
            Sign in to your account
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: cardBg, borderRadius: 'var(--border-radius)',
          border: `1px solid ${border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          padding: '32px 28px',
        }}>
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textPrimary, marginBottom: 6 }}>
                <FontAwesomeIcon icon={faEnvelope} style={{ marginRight: 6, opacity: 0.5, fontSize: 12 }} />
                Email Address
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" autoComplete="email"
                style={{
                  width: '100%', padding: '10px 14px', fontSize: 14, border: `1px solid ${inputBorder}`,
                  borderRadius: 'var(--border-radius)', background: inputBg, color: textPrimary,
                  outline: 'none', boxSizing: 'border-box', transition: 'border 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={e => e.target.style.borderColor = inputBorder}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textPrimary, marginBottom: 6 }}>
                <FontAwesomeIcon icon={faLock} style={{ marginRight: 6, opacity: 0.5, fontSize: 12 }} />
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password"
                  style={{
                    width: '100%', padding: '10px 42px 10px 14px', fontSize: 14,
                    border: `1px solid ${inputBorder}`, borderRadius: 'var(--border-radius)',
                    background: inputBg, color: textPrimary, outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                  onBlur={e => e.target.style.borderColor = inputBorder}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: textSecondary, padding: 4,
                }}>
                  <FontAwesomeIcon icon={showPw ? faEyeSlash : faEye} style={{ width: 16 }} />
                </button>
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
              opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}>
              {loading
                ? <><FontAwesomeIcon icon={faSpinner} spin /> Signing in...</>
                : <>Sign In <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: 13 }} /></>
              }
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
            <div style={{ flex: 1, height: 1, background: border }} />
            <span style={{ fontSize: 12, color: textSecondary, fontWeight: 500 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: border }} />
          </div>

          {/* Register link */}
          <p style={{ textAlign: 'center', fontSize: 14, color: textSecondary }}>
            Don't have an account?{' '}
            <button onClick={() => onNavigate('register')} style={{
              background: 'none', border: 'none', color: 'var(--color-primary)',
              fontWeight: 600, cursor: 'pointer', textDecoration: 'underline',
            }}>Create one</button>
          </p>
        </div>

        {/* Demo accounts */}
        <div style={{
          marginTop: 20, background: cardBg, border: `1px solid ${border}`,
          borderRadius: 'var(--border-radius)', padding: '16px 20px',
        }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <FontAwesomeIcon icon={faShieldHalved} style={{ marginRight: 6 }} />
            Demo Accounts
          </p>
          {[
            { label: 'Admin', email: 'admin@homepro.com', pw: 'admin123', color: '#ef4444' },
            { label: 'Pro', email: 'pro@demo.com', pw: 'password123', color: 'var(--color-primary)' },
            { label: 'Consumer', email: 'consumer@demo.com', pw: 'password123', color: '#22c55e' },
          ].map(d => (
            <button key={d.email} onClick={() => fillDemo(d.email, d.pw)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px',
              background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              borderRadius: 'var(--border-radius)', transition: 'background 0.15s',
              marginBottom: 2,
            }}
              onMouseEnter={e => e.currentTarget.style.background = darkMode ? '#1e293b' : '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0,
              }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary, minWidth: 70 }}>{d.label}</span>
              <span style={{ fontSize: 12, color: textSecondary, flex: 1 }}>{d.email}</span>
              <span style={{ fontSize: 11, color: textSecondary, fontFamily: 'monospace' }}>{d.pw}</span>
            </button>
          ))}
        </div>

        {/* Back to home */}
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: textSecondary }}>
          <button onClick={() => onNavigate('home')} style={{
            background: 'none', border: 'none', color: textSecondary,
            cursor: 'pointer', textDecoration: 'underline',
          }}>← Back to HomePro</button>
        </p>
      </div>
    </div>
  );
}
