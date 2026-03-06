import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faEye, faEyeSlash, faSpinner, faCheck } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { resetPassword } from '../services/api';

export default function ResetPasswordPage({ token, onNavigate }) {
  const { darkMode } = useTheme();
  const { siteName } = useSettings();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  const bg = darkMode ? '#0a0f1a' : '#f0f4f8';
  const cardBg = darkMode ? '#111827' : '#ffffff';
  const border = darkMode ? '#1f2937' : '#e2e8f0';
  const textPrimary = darkMode ? '#f1f5f9' : '#1e293b';
  const textSecondary = darkMode ? '#94a3b8' : '#64748b';
  const inputBg = darkMode ? '#1e293b' : '#f8fafc';
  const inputBorder = darkMode ? '#334155' : '#e2e8f0';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError('');
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Invalid or expired link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: bg, padding: '24px 16px', fontFamily: 'var(--font-family)',
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <button onClick={() => onNavigate('home')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 'var(--border-radius)', margin: '0 auto 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'var(--color-primary)', color: '#fff',
              fontWeight: 800, fontSize: 22, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}>{(siteName || 'H')[0]}</div>
            <span style={{ fontSize: 24, fontWeight: 800, color: textPrimary }}>{siteName || 'HomePro'}</span>
          </button>
          <p style={{ color: textSecondary, fontSize: 14, marginTop: 8 }}>
            {success ? 'Password reset' : 'Set new password'}
          </p>
        </div>

        <div style={{
          background: cardBg, borderRadius: 'var(--border-radius)',
          border: `1px solid ${border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          padding: '32px 28px',
        }}>
          {success ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <FontAwesomeIcon icon={faCheck} style={{ fontSize: 48, color: '#22c55e', marginBottom: 16 }} />
                <p style={{ color: textPrimary, fontSize: 15 }}>Your password has been reset.</p>
              </div>
              <button onClick={() => onNavigate('login')} style={{
                width: '100%', padding: '12px 0', fontSize: 15, fontWeight: 700,
                background: 'var(--color-primary)', color: '#fff', border: 'none',
                borderRadius: 'var(--border-radius)', cursor: 'pointer',
              }}>Sign In</button>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textPrimary, marginBottom: 6 }}>
                  <FontAwesomeIcon icon={faLock} style={{ marginRight: 6, opacity: 0.5, fontSize: 12 }} />
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" autoComplete="new-password"
                    style={{
                      width: '100%', padding: '10px 42px 10px 14px', fontSize: 14,
                      border: `1px solid ${inputBorder}`, borderRadius: 'var(--border-radius)',
                      background: inputBg, color: textPrimary, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: textSecondary, padding: 4,
                  }}>
                    <FontAwesomeIcon icon={showPw ? faEyeSlash : faEye} style={{ width: 16 }} />
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textPrimary, marginBottom: 6 }}>
                  Confirm Password
                </label>
                <input
                  type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••" autoComplete="new-password"
                  style={{
                    width: '100%', padding: '10px 14px', fontSize: 14,
                    border: `1px solid ${inputBorder}`, borderRadius: 'var(--border-radius)',
                    background: inputBg, color: textPrimary, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              {error && (
                <div style={{
                  background: darkMode ? '#7f1d1d33' : '#fef2f2', color: '#ef4444',
                  padding: '10px 14px', borderRadius: 'var(--border-radius)', fontSize: 13,
                  marginBottom: 16, border: '1px solid #fecaca',
                }}>{error}</div>
              )}
              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '12px 0', fontSize: 15, fontWeight: 700,
                background: 'var(--color-primary)', color: '#fff', border: 'none',
                borderRadius: 'var(--border-radius)', cursor: loading ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: loading ? 0.7 : 1,
              }}>
                {loading ? <><FontAwesomeIcon icon={faSpinner} spin /> Resetting...</> : 'Reset Password'}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: textSecondary }}>
          <button onClick={() => onNavigate('login')} style={{
            background: 'none', border: 'none', color: textSecondary,
            cursor: 'pointer', textDecoration: 'underline',
          }}>← Back to Sign In</button>
        </p>
      </div>
    </div>
  );
}
