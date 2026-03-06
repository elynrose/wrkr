import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faSpinner, faExclamationTriangle, faDatabase, faUserShield, faCopy, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function InstallPage({ onNavigate }) {
  const { darkMode: dm } = useTheme();
  const { siteName } = useSettings();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [testing, setTesting] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [db, setDb] = useState({
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: '',
    database: 'homepro',
  });
  const [admin, setAdmin] = useState({
    email: '',
    password: '',
    name: 'Admin',
  });
  const [envContents, setEnvContents] = useState('');

  const tp = dm ? '#f1f5f9' : '#1e293b';
  const ts = dm ? '#94a3b8' : '#64748b';
  const border = dm ? '#334155' : '#e2e8f0';
  const cardBg = dm ? '#1e293b' : '#fff';
  const inputBg = dm ? '#0f172a' : '#f8fafc';

  useEffect(() => {
    fetch(`${BASE}/install/status`)
      .then(r => r.json())
      .then(d => setStatus(d))
      .catch(() => setStatus({ installed: false }))
      .finally(() => setLoading(false));
  }, []);

  const testConnection = async () => {
    setError('');
    setTesting(true);
    try {
      const res = await fetch(`${BASE}/install/check-db`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(db),
      });
      const data = await res.json();
      if (data.ok) {
        setStep(2);
        setError('');
      } else {
        setError(data.error || 'Connection failed');
      }
    } catch (e) {
      setError(e.message || 'Could not reach server');
    } finally {
      setTesting(false);
    }
  };

  const runInstall = async () => {
    if (!admin.email || !admin.password) {
      setError('Admin email and password are required');
      return;
    }
    setError('');
    setInstalling(true);
    try {
      const res = await fetch(`${BASE}/install/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...db,
          adminEmail: admin.email,
          adminPassword: admin.password,
          adminName: admin.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Installation failed');
        return;
      }
      setEnvContents(data.envContents || '');
      setStep(3);
    } catch (e) {
      setError(e.message || 'Installation failed');
    } finally {
      setInstalling(false);
    }
  };

  const copyEnv = () => {
    navigator.clipboard.writeText(envContents).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: dm ? '#0b1220' : '#f1f5f9' }}>
        <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 32, color: 'var(--color-primary)' }} />
      </div>
    );
  }

  if (status?.installed) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: dm ? '#0b1220' : '#f1f5f9', padding: 24 }}>
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 32, maxWidth: 420, textAlign: 'center' }}>
          <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: 48, color: '#22c55e', marginBottom: 16 }} />
          <h2 style={{ fontSize: 22, fontWeight: 800, color: tp, margin: '0 0 8px' }}>Already installed</h2>
          <p style={{ color: ts, marginBottom: 24 }}>{siteName} is set up. Log in to the admin dashboard.</p>
          <button
            onClick={() => onNavigate?.('login')}
            style={{ padding: '12px 24px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 15 }}
          >
            Go to Login <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: 8 }} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: dm ? '#0b1220' : '#f1f5f9', padding: '40px 20px 60px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: tp, margin: '0 0 8px' }}>{siteName} Installer</h1>
          <p style={{ color: ts, fontSize: 15 }}>Set up the database and create your admin account</p>
        </div>

        {error && (
          <div style={{ marginBottom: 20, padding: 14, background: dm ? '#451a1a' : '#fef2f2', border: `1px solid ${dm ? '#7f1d1d' : '#fecaca'}`, borderRadius: 8, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FontAwesomeIcon icon={faExclamationTriangle} />
            <span>{error}</span>
          </div>
        )}

        {step === 1 && (
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 28 }}>
            <h3 style={{ margin: '0 0 20px', color: tp, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FontAwesomeIcon icon={faDatabase} /> Database connection
            </h3>
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>Host</label>
                  <input value={db.host} onChange={e => setDb(d => ({ ...d, host: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, background: inputBg, color: tp, fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>Port</label>
                  <input value={db.port} onChange={e => setDb(d => ({ ...d, port: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, background: inputBg, color: tp, fontSize: 14 }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>User</label>
                <input value={db.user} onChange={e => setDb(d => ({ ...d, user: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, background: inputBg, color: tp, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>Password</label>
                <input type="password" value={db.password} onChange={e => setDb(d => ({ ...d, password: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, background: inputBg, color: tp, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>Database name</label>
                <input value={db.database} onChange={e => setDb(d => ({ ...d, database: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, background: inputBg, color: tp, fontSize: 14 }} />
              </div>
            </div>
            <button onClick={testConnection} disabled={testing} style={{ marginTop: 24, padding: '12px 24px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: testing ? 'not-allowed' : 'pointer', opacity: testing ? 0.7 : 1 }}>
              {testing ? <><FontAwesomeIcon icon={faSpinner} spin /> Testing…</> : <>Test connection & continue</>}
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 28 }}>
            <h3 style={{ margin: '0 0 20px', color: tp, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FontAwesomeIcon icon={faUserShield} /> Admin account
            </h3>
            <p style={{ color: ts, fontSize: 13, marginBottom: 20 }}>Create the first admin user to sign in to the dashboard.</p>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>Email *</label>
                <input type="email" value={admin.email} onChange={e => setAdmin(a => ({ ...a, email: e.target.value }))} placeholder="admin@example.com"
                  style={{ width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, background: inputBg, color: tp, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>Password *</label>
                <input type="password" value={admin.password} onChange={e => setAdmin(a => ({ ...a, password: e.target.value }))} placeholder="Min 6 characters"
                  style={{ width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, background: inputBg, color: tp, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>Name</label>
                <input value={admin.name} onChange={e => setAdmin(a => ({ ...a, name: e.target.value }))} placeholder="Admin"
                  style={{ width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, background: inputBg, color: tp, fontSize: 14 }} />
              </div>
            </div>
            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
              <button onClick={() => setStep(1)} style={{ padding: '12px 20px', background: 'transparent', color: tp, border: `1px solid ${border}`, borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                Back
              </button>
              <button onClick={runInstall} disabled={installing} style={{ padding: '12px 24px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: installing ? 'not-allowed' : 'pointer', opacity: installing ? 0.7 : 1 }}>
                {installing ? <><FontAwesomeIcon icon={faSpinner} spin /> Installing…</> : 'Install'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 28 }}>
            <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: 40, color: '#22c55e', marginBottom: 16 }} />
            <h3 style={{ margin: '0 0 8px', color: tp, fontSize: 20 }}>Installation complete</h3>
            <p style={{ color: ts, marginBottom: 20, lineHeight: 1.5 }}>
              Add the following to your <strong>homepro-server/.env</strong> file (or create it), then restart the server.
            </p>
            <div style={{ position: 'relative' }}>
              <textarea readOnly value={envContents} rows={14} style={{ width: '100%', padding: 14, border: `1px solid ${border}`, borderRadius: 8, background: dm ? '#0f172a' : '#f8fafc', color: tp, fontSize: 12, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }} />
              <button onClick={copyEnv} style={{ position: 'absolute', top: 12, right: 12, padding: '8px 14px', background: copied ? '#22c55e' : (dm ? '#334155' : '#e2e8f0'), color: copied ? '#fff' : tp, border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FontAwesomeIcon icon={copied ? faCheckCircle : faCopy} /> {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p style={{ color: ts, fontSize: 13, marginTop: 20, marginBottom: 24 }}>
              After restarting, come back to this page or go to Login to sign in with your admin account.
            </p>
            <button onClick={() => onNavigate?.('login')} style={{ padding: '12px 24px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
              Go to Login <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: 8 }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
