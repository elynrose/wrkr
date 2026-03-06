import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faGlobe, faUser, faEnvelope, faLock, faCheckCircle, faSpinner, faArrowRight, faTag } from '@fortawesome/free-solid-svg-icons';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const PLANS = [
  {
    slug: 'starter',
    name: 'Starter',
    price: '$49/mo',
    description: 'Perfect for small local marketplaces.',
    features: ['Up to 500 leads/mo', 'Basic matching', 'Email support', 'Custom domain'],
  },
  {
    slug: 'pro',
    name: 'Pro',
    price: '$149/mo',
    description: 'For growing platforms with higher volume.',
    features: ['Unlimited leads', 'SMS + Email matching', 'Priority support', 'White-label branding', 'Analytics'],
    popular: true,
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    description: 'Full white-label deployment for large operations.',
    features: ['Everything in Pro', 'Dedicated onboarding', 'SLA guarantee', 'Multi-admin', 'Custom integrations'],
  },
];

const STEPS = [
  { id: 'plan',     label: 'Choose Plan' },
  { id: 'business', label: 'Business Info' },
  { id: 'account',  label: 'Admin Account' },
  { id: 'done',     label: 'Launch' },
];

export default function TenantSignupPage({ onNavigate }) {
  const [step, setStep] = useState('plan');
  const [plan, setPlan] = useState('pro');
  const [form, setForm] = useState({
    name: '',
    slug: '',
    customDomain: '',
    adminEmail: '',
    adminPassword: '',
    adminFirstName: '',
    adminLastName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const autoSlug = (name) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    set('slug', slug);
    set('name', name);
  };

  const submit = async () => {
    setError('');
    if (!form.name || !form.slug) return setError('Business name and slug are required');
    if (!form.adminEmail || !form.adminPassword) return setError('Admin email and password are required');
    if (form.adminPassword.length < 6) return setError('Password must be at least 6 characters');

    setLoading(true);
    try {
      const res = await fetch(`${BASE}/superadmin/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create tenant');
      setResult(data);
      setStep('done');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const tp = '#1e293b';
  const ts = '#64748b';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4f8 0%, #e2eaf4 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', fontFamily: 'var(--font-family, system-ui)' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: tp, marginBottom: 8 }}>
          Start Your Platform
        </h1>
        <p style={{ fontSize: 16, color: ts }}>
          Create your own branded home-services marketplace in minutes.
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 36, flexWrap: 'wrap', justifyContent: 'center' }}>
        {STEPS.map((s, i) => {
          const done = STEPS.findIndex(x => x.id === step) > i;
          const active = s.id === step;
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, background: done || active ? 'var(--color-primary, #2563eb)' : '#e2e8f0', color: done || active ? '#fff' : '#64748b', transition: 'all 0.2s' }}>
                  {done ? <FontAwesomeIcon icon={faCheckCircle} /> : i + 1}
                </div>
                <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? 'var(--color-primary, #2563eb)' : ts, whiteSpace: 'nowrap' }}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div style={{ width: 40, height: 2, background: done ? 'var(--color-primary, #2563eb)' : '#e2e8f0', margin: '0 4px', marginBottom: 20 }} />}
            </div>
          );
        })}
      </div>

      <div style={{ width: '100%', maxWidth: step === 'plan' ? 780 : 480 }}>
        {error && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{error}</div>}

        {/* Step: Choose Plan */}
        {step === 'plan' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
              {PLANS.map(p => (
                <div key={p.slug} onClick={() => setPlan(p.slug)}
                  style={{ background: '#fff', borderRadius: 12, padding: 24, cursor: 'pointer', border: `2px solid ${plan === p.slug ? 'var(--color-primary, #2563eb)' : '#e2e8f0'}`, transition: 'all 0.2s', position: 'relative', boxShadow: plan === p.slug ? '0 0 0 4px rgba(37,99,235,0.12)' : 'none' }}>
                  {p.popular && <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'var(--color-primary, #2563eb)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 9999 }}>POPULAR</div>}
                  <div style={{ fontSize: 18, fontWeight: 800, color: tp, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-primary, #2563eb)', marginBottom: 8 }}>{p.price}</div>
                  <div style={{ fontSize: 12, color: ts, marginBottom: 16 }}>{p.description}</div>
                  <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                    {p.features.map(f => (
                      <li key={f} style={{ fontSize: 12, color: ts, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#22c55e', fontSize: 12, flexShrink: 0 }} />{f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => setStep('business')} style={{ padding: '12px 32px', background: 'var(--color-primary, #2563eb)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                Continue with {PLANS.find(p2 => p2.slug === plan)?.name} <FontAwesomeIcon icon={faArrowRight} />
              </button>
            </div>
          </div>
        )}

        {/* Step: Business Info */}
        {step === 'business' && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: tp, marginBottom: 8 }}>Tell us about your business</h2>
            <p style={{ fontSize: 13, color: ts, marginBottom: 24 }}>This will be your platform's identity.</p>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>
              <FontAwesomeIcon icon={faBuilding} style={{ marginRight: 6 }} />Business / Platform Name
            </label>
            <input value={form.name} onChange={e => autoSlug(e.target.value)} placeholder="e.g. Austin Home Pros"
              style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', color: tp, outline: 'none', marginBottom: 16, boxSizing: 'border-box' }} />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>
              <FontAwesomeIcon icon={faTag} style={{ marginRight: 6 }} />Platform Slug (URL identifier)
            </label>
            <input value={form.slug} onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="austin-home-pros"
              style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', color: tp, outline: 'none', marginBottom: 4, boxSizing: 'border-box' }} />
            <p style={{ fontSize: 11, color: ts, marginBottom: 16 }}>Used to identify your tenant. Can't be changed later.</p>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>
              <FontAwesomeIcon icon={faGlobe} style={{ marginRight: 6 }} />Custom Domain (optional)
            </label>
            <input value={form.customDomain} onChange={e => set('customDomain', e.target.value)} placeholder="austinhomepros.com"
              style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', color: tp, outline: 'none', marginBottom: 4, boxSizing: 'border-box' }} />
            <p style={{ fontSize: 11, color: ts, marginBottom: 24 }}>Point your domain's DNS to this server after setup.</p>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep('plan')} style={{ padding: '10px 20px', background: 'transparent', color: ts, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Back</button>
              <button onClick={() => { if (!form.name || !form.slug) return setError('Name and slug required'); setError(''); setStep('account'); }} style={{ flex: 1, padding: '10px 20px', background: 'var(--color-primary, #2563eb)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                Continue <FontAwesomeIcon icon={faArrowRight} />
              </button>
            </div>
          </div>
        )}

        {/* Step: Admin Account */}
        {step === 'account' && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: tp, marginBottom: 8 }}>Create your admin account</h2>
            <p style={{ fontSize: 13, color: ts, marginBottom: 24 }}>This will be the admin login for your platform.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>First Name</label>
                <input value={form.adminFirstName} onChange={e => set('adminFirstName', e.target.value)} placeholder="Jane"
                  style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', color: tp, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>Last Name</label>
                <input value={form.adminLastName} onChange={e => set('adminLastName', e.target.value)} placeholder="Smith"
                  style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', color: tp, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>
              <FontAwesomeIcon icon={faEnvelope} style={{ marginRight: 6 }} />Admin Email
            </label>
            <input type="email" value={form.adminEmail} onChange={e => set('adminEmail', e.target.value)} placeholder="admin@yourplatform.com"
              style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', color: tp, outline: 'none', marginBottom: 16, boxSizing: 'border-box' }} />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>
              <FontAwesomeIcon icon={faLock} style={{ marginRight: 6 }} />Password
            </label>
            <input type="password" value={form.adminPassword} onChange={e => set('adminPassword', e.target.value)} placeholder="Min. 6 characters"
              style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', color: tp, outline: 'none', marginBottom: 24, boxSizing: 'border-box' }} />

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep('business')} style={{ padding: '10px 20px', background: 'transparent', color: ts, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Back</button>
              <button onClick={submit} disabled={loading} style={{ flex: 1, padding: '10px 20px', background: 'var(--color-primary, #2563eb)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? <><FontAwesomeIcon icon={faSpinner} spin /> Creating platform...</> : <>Launch Platform <FontAwesomeIcon icon={faArrowRight} /></>}
              </button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && result && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 40, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: 32, color: '#16a34a' }} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: tp, marginBottom: 8 }}>Your platform is live!</h2>
            <p style={{ fontSize: 14, color: ts, marginBottom: 24 }}>Tenant ID <strong>#{result.id}</strong> has been created and provisioned with default settings, templates, and data.</p>

            {form.customDomain && (
              <div style={{ background: '#f0f4f8', borderRadius: 8, padding: 16, marginBottom: 20, textAlign: 'left' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: tp, marginBottom: 4 }}>Next: Point your domain</p>
                <p style={{ fontSize: 12, color: ts }}>Set your domain <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: 4 }}>{form.customDomain}</code> DNS A-record to this server's IP address. Once propagated, your platform will be live at that domain.</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => onNavigate?.('login')} style={{ padding: '12px 24px', background: 'var(--color-primary, #2563eb)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Go to Login
              </button>
              {onNavigate && (
                <button onClick={() => onNavigate('home')} style={{ padding: '12px 24px', background: 'transparent', color: ts, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Back to Home
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
