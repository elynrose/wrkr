import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser, faEnvelope, faPhone, faSave, faSpinner, faCheckCircle, faKey,
  faBuilding, faGlobe, faIdCard, faBriefcase, faClock, faListCheck,
  faCreditCard, faArrowUpRightFromSquare, faCoins, faBan, faRotateRight,
  faChevronLeft, faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  changePassword, getMyLeads, updateProProfile,
  getCurrentSubscription, createCheckout, cancelSubscription,
  resumeSubscription, openBillingPortal, getPlans,
} from '../services/api';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function authGet(path) {
  const token = localStorage.getItem('hp_token');
  return fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
}

export default function ProfilePage() {
  const { darkMode } = useTheme();
  const { user, updateProfile } = useAuth();

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [myLeads, setMyLeads] = useState([]);
  const [myLeadsTotal, setMyLeadsTotal] = useState(0);
  const [myLeadsPage, setMyLeadsPage] = useState(1);
  const myLeadsLimit = 10;
  const [adminStats, setAdminStats] = useState(null);
  const [sub, setSub] = useState(null);
  const [plans, setPlans] = useState([]);
  const [subLoading, setSubLoading] = useState(false);

  const [account, setAccount] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    avatarUrl: '',
  });
  const [pw, setPw] = useState({ current: '', next: '' });
  const [proForm, setProForm] = useState({
    businessName: '',
    description: '',
    phone: '',
    website: '',
    yearsInBusiness: '',
    licenseNumber: '',
    insuranceInfo: '',
  });

  useEffect(() => {
    if (!user) return;
    setAccount({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      avatarUrl: user.avatarUrl || '',
    });
    if (user.role === 'pro' && user.pro) {
      setProForm({
        businessName: user.pro.business_name || '',
        description: user.pro.description || '',
        phone: user.pro.phone || user.phone || '',
        website: user.pro.website || '',
        yearsInBusiness: user.pro.years_in_business || '',
        licenseNumber: user.pro.license_number || '',
        insuranceInfo: user.pro.insurance_info || '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'pro') {
      getCurrentSubscription().then(setSub).catch(() => {});
      getPlans().then(d => setPlans(Array.isArray(d) ? d : [])).catch(() => {});
    }
    if (user.role === 'admin') {
      Promise.all([
        authGet('/users?page=1&limit=1'),
        authGet('/leads?page=1&limit=1'),
        authGet('/services?all=true'),
      ]).then(([usersRes, leadsRes, servicesRes]) => {
        setAdminStats({
          users: usersRes.total ?? (usersRes.users || []).length ?? 0,
          leads: leadsRes.total ?? (leadsRes.leads || []).length ?? 0,
          services: Array.isArray(servicesRes) ? servicesRes.length : 0,
        });
      }).catch(() => setAdminStats({ users: 0, leads: 0, services: 0 }));
    }
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== 'consumer') return;
    getMyLeads(myLeadsPage, myLeadsLimit).then(d => {
      setMyLeads(d.leads ?? []);
      setMyLeadsTotal(d.total ?? 0);
    }).catch(() => { setMyLeads([]); setMyLeadsTotal(0); });
  }, [user, myLeadsPage]);

  const memberSince = useMemo(() => {
    if (!user?.createdAt) return '-';
    return new Date(user.createdAt).toLocaleDateString();
  }, [user]);

  const panelStyle = {
    background: darkMode ? '#111827' : '#fff',
    border: `1px solid ${darkMode ? '#1f2937' : '#e5e7eb'}`,
    borderRadius: 'var(--border-radius)',
    padding: '24px 28px',
    boxShadow: darkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 'var(--border-radius)',
    border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
    background: darkMode ? '#0f172a' : '#fff',
    color: darkMode ? '#f3f4f6' : '#111827',
    outline: 'none',
    fontSize: 14,
    boxSizing: 'border-box',
  };

  const labelStyle = {
    fontSize: 12,
    fontWeight: 600,
    color: darkMode ? '#9ca3af' : '#6b7280',
    marginBottom: 6,
    display: 'block',
  };

  const saveAccount = async () => {
    setSaving(true);
    try {
      await updateProfile(account);
      setMessage('Account profile updated.');
    } catch (e) {
      setMessage(e.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (!pw.current || !pw.next) return setMessage('Enter current and new password.');
    setSaving(true);
    try {
      await changePassword(pw.current, pw.next);
      setPw({ current: '', next: '' });
      setMessage('Password updated.');
    } catch (e) {
      setMessage(e.message || 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  const saveProProfile = async () => {
    if (!user?.pro?.id) return;
    setSaving(true);
    try {
      await updateProProfile(user.pro.id, proForm);
      setMessage('Business profile updated.');
    } catch (e) {
      setMessage(e.message || 'Failed to update business profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FontAwesomeIcon icon={faSpinner} spin />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: darkMode ? '#0b1220' : '#f3f6fb', padding: '32px 20px 48px' }}>
      <div style={{ maxWidth: 1050, margin: '0 auto', display: 'grid', gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, color: darkMode ? '#f3f4f6' : '#111827' }}>My Profile</h1>
            <p style={{ margin: '8px 0 0', fontSize: 14, color: darkMode ? '#9ca3af' : '#6b7280' }}>
              Role: <strong style={{ textTransform: 'capitalize' }}>{user.role}</strong> · Member since {memberSince}
            </p>
          </div>
          {message && (
            <div style={{ fontSize: 13, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FontAwesomeIcon icon={faCheckCircle} /> {message}
            </div>
          )}
        </div>

        <div style={panelStyle}>
          <h3 style={{ margin: '0 0 16px', color: darkMode ? '#f3f4f6' : '#111827', fontSize: 18 }}>Account Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginBottom: 20 }}>
            <Field label="First Name" icon={faUser} style={labelStyle} input={inputStyle} value={account.firstName}
              onChange={(v) => setAccount(s => ({ ...s, firstName: v }))} />
            <Field label="Last Name" icon={faUser} style={labelStyle} input={inputStyle} value={account.lastName}
              onChange={(v) => setAccount(s => ({ ...s, lastName: v }))} />
            <Field label="Phone" icon={faPhone} style={labelStyle} input={inputStyle} value={account.phone}
              onChange={(v) => setAccount(s => ({ ...s, phone: v }))} />
            <Field label="Avatar URL" icon={faUser} style={labelStyle} input={inputStyle} value={account.avatarUrl}
              onChange={(v) => setAccount(s => ({ ...s, avatarUrl: v }))} />
            <Field label="Email" icon={faEnvelope} style={labelStyle} input={{ ...inputStyle, opacity: 0.7 }} value={user.email} disabled />
          </div>
          <button onClick={saveAccount} disabled={saving} style={{ ...btnPrimary, marginTop: 4 }}>
            <FontAwesomeIcon icon={saving ? faSpinner : faSave} spin={saving} /> Save Account
          </button>
        </div>

        <div style={panelStyle}>
          <h3 style={{ margin: '0 0 16px', color: darkMode ? '#f3f4f6' : '#111827', fontSize: 18 }}>Security</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginBottom: 20 }}>
            <Field label="Current Password" icon={faKey} style={labelStyle} input={inputStyle} type="password"
              value={pw.current} onChange={(v) => setPw(s => ({ ...s, current: v }))} />
            <Field label="New Password" icon={faKey} style={labelStyle} input={inputStyle} type="password"
              value={pw.next} onChange={(v) => setPw(s => ({ ...s, next: v }))} />
          </div>
          <button onClick={savePassword} disabled={saving} style={{ ...btnGhost, marginTop: 4 }}>
            <FontAwesomeIcon icon={saving ? faSpinner : faKey} spin={saving} /> Update Password
          </button>
        </div>

        {user.role === 'consumer' && (
          <div style={panelStyle}>
            <h3 style={{ margin: '0 0 16px', color: darkMode ? '#f3f4f6' : '#111827', fontSize: 18 }}>
              <FontAwesomeIcon icon={faListCheck} style={{ marginRight: 8 }} />
              My Service Requests
            </h3>
            {myLeads.length === 0 ? (
              <p style={{ color: darkMode ? '#9ca3af' : '#6b7280', margin: 0 }}>No requests submitted yet.</p>
            ) : (
              <>
                <div style={{ display: 'grid', gap: 12 }}>
                  {myLeads.map((lead) => (
                    <div key={lead.id} style={{ border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`, borderRadius: 8, padding: 14 }}>
                      <div style={{ fontWeight: 700, color: darkMode ? '#f3f4f6' : '#111827' }}>{lead.service_name}</div>
                      <div style={{ fontSize: 13, color: darkMode ? '#9ca3af' : '#6b7280' }}>
                        #{lead.id} · {lead.city_name || lead.zip} · Status: {lead.status}
                      </div>
                    </div>
                  ))}
                </div>
                {myLeadsTotal > myLeadsLimit && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}` }}>
                    <span style={{ fontSize: 12, color: darkMode ? '#9ca3af' : '#6b7280' }}>
                      Showing {(myLeadsPage - 1) * myLeadsLimit + 1}–{Math.min(myLeadsPage * myLeadsLimit, myLeadsTotal)} of {myLeadsTotal}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => setMyLeadsPage(p => Math.max(1, p - 1))} disabled={myLeadsPage <= 1}
                        style={{ padding: '6px 12px', fontSize: 12, border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`, borderRadius: 8, background: darkMode ? '#1f2937' : '#fff', color: darkMode ? '#f3f4f6' : '#111827', cursor: myLeadsPage <= 1 ? 'not-allowed' : 'pointer', opacity: myLeadsPage <= 1 ? 0.5 : 1 }}>
                        <FontAwesomeIcon icon={faChevronLeft} /> Prev
                      </button>
                      <span style={{ fontSize: 12, color: darkMode ? '#9ca3af' : '#6b7280' }}>Page {myLeadsPage} of {Math.ceil(myLeadsTotal / myLeadsLimit)}</span>
                      <button onClick={() => setMyLeadsPage(p => p + 1)} disabled={myLeadsPage * myLeadsLimit >= myLeadsTotal}
                        style={{ padding: '6px 12px', fontSize: 12, border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`, borderRadius: 8, background: darkMode ? '#1f2937' : '#fff', color: darkMode ? '#f3f4f6' : '#111827', cursor: myLeadsPage * myLeadsLimit >= myLeadsTotal ? 'not-allowed' : 'pointer', opacity: myLeadsPage * myLeadsLimit >= myLeadsTotal ? 0.5 : 1 }}>
                        Next <FontAwesomeIcon icon={faChevronRight} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {user.role === 'pro' && (
          <div style={panelStyle}>
            <h3 style={{ margin: '0 0 16px', color: darkMode ? '#f3f4f6' : '#111827', fontSize: 18 }}>
              <FontAwesomeIcon icon={faBuilding} style={{ marginRight: 8 }} />
              Business Profile
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginBottom: 16 }}>
              <Field label="Business Name" icon={faBuilding} style={labelStyle} input={inputStyle} value={proForm.businessName}
                onChange={(v) => setProForm(s => ({ ...s, businessName: v }))} />
              <Field label="Business Phone" icon={faPhone} style={labelStyle} input={inputStyle} value={proForm.phone}
                onChange={(v) => setProForm(s => ({ ...s, phone: v }))} />
              <Field label="Website" icon={faGlobe} style={labelStyle} input={inputStyle} value={proForm.website}
                onChange={(v) => setProForm(s => ({ ...s, website: v }))} />
              <Field label="Years in Business" icon={faClock} style={labelStyle} input={inputStyle} value={proForm.yearsInBusiness}
                onChange={(v) => setProForm(s => ({ ...s, yearsInBusiness: v }))} />
              <Field label="License Number" icon={faIdCard} style={labelStyle} input={inputStyle} value={proForm.licenseNumber}
                onChange={(v) => setProForm(s => ({ ...s, licenseNumber: v }))} />
              <Field label="Insurance Info" icon={faBriefcase} style={labelStyle} input={inputStyle} value={proForm.insuranceInfo}
                onChange={(v) => setProForm(s => ({ ...s, insuranceInfo: v }))} />
            </div>
            <label style={{ ...labelStyle, marginTop: 4 }}>Description</label>
            <textarea value={proForm.description} onChange={(e) => setProForm(s => ({ ...s, description: e.target.value }))}
              style={{ ...inputStyle, minHeight: 100, marginTop: 6, marginBottom: 20 }} />
            <button onClick={saveProProfile} disabled={saving} style={btnPrimary}>
              <FontAwesomeIcon icon={saving ? faSpinner : faSave} spin={saving} /> Save Business Profile
            </button>
          </div>
        )}

        {user.role === 'pro' && (
          <div style={panelStyle}>
            <h3 style={{ margin: '0 0 16px', color: darkMode ? '#f3f4f6' : '#111827', fontSize: 18 }}>
              <FontAwesomeIcon icon={faCreditCard} style={{ marginRight: 8 }} />
              Subscription & Billing
            </h3>
            {sub ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16, marginBottom: 20 }}>
                  <Stat label="Current Plan" value={sub.planName || sub.plan || 'Free'} darkMode={darkMode} />
                  <Stat label="Status" value={sub.status || 'none'} darkMode={darkMode} />
                  <Stat label="Lead Credits" value={sub.leadCredits ?? 0} darkMode={darkMode} />
                  <Stat label="Monthly Credits" value={sub.planCredits || 0} darkMode={darkMode} />
                </div>
                {sub.stripe?.cancelAtPeriodEnd && (
                  <div style={{ background: darkMode ? '#422006' : '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: '12px 16px', fontSize: 13, marginBottom: 16, color: darkMode ? '#fbbf24' : '#92400e' }}>
                    Your subscription will cancel at the end of the current billing period.
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                  {sub.plan !== 'free' && sub.status === 'active' && !sub.stripe?.cancelAtPeriodEnd && (
                    <button onClick={async () => {
                      setSubLoading(true);
                      try {
                        await cancelSubscription();
                        setMessage('Subscription will cancel at period end.');
                        getCurrentSubscription().then(setSub);
                      } catch (e) { setMessage(e.message); }
                      finally { setSubLoading(false); }
                    }} disabled={subLoading} style={{ ...btnGhost, color: '#ef4444', borderColor: '#ef4444' }}>
                      <FontAwesomeIcon icon={faBan} /> Cancel Subscription
                    </button>
                  )}
                  {sub.stripe?.cancelAtPeriodEnd && (
                    <button onClick={async () => {
                      setSubLoading(true);
                      try {
                        await resumeSubscription();
                        setMessage('Subscription resumed!');
                        getCurrentSubscription().then(setSub);
                      } catch (e) { setMessage(e.message); }
                      finally { setSubLoading(false); }
                    }} disabled={subLoading} style={btnPrimary}>
                      <FontAwesomeIcon icon={faRotateRight} /> Resume Subscription
                    </button>
                  )}
                  <button onClick={async () => {
                    setSubLoading(true);
                    try {
                      const r = await openBillingPortal();
                      if (r.url) window.location.href = r.url;
                      else setMessage(r.error || 'Could not open billing portal.');
                    } catch (e) { setMessage(e.message); }
                    finally { setSubLoading(false); }
                  }} disabled={subLoading} style={btnGhost}>
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} /> Billing Portal
                  </button>
                </div>
                {plans.length > 0 && (sub.plan === 'free' || sub.plan === 'starter') && (
                  <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}` }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: darkMode ? '#f3f4f6' : '#111827', marginBottom: 12 }}>
                      <FontAwesomeIcon icon={faCoins} style={{ marginRight: 6 }} /> Upgrade Your Plan
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
                      {plans.filter(p => p.price_monthly > 0 && p.slug !== sub.plan).map(p => (
                        <div key={p.id} style={{
                          border: `1px solid ${p.is_popular ? 'var(--color-primary)' : (darkMode ? '#374151' : '#e5e7eb')}`,
                          borderRadius: 8, padding: 16,
                          background: p.is_popular ? (darkMode ? '#1e3a5f' : '#eff6ff') : 'transparent',
                        }}>
                          <div style={{ fontWeight: 700, color: darkMode ? '#f3f4f6' : '#111827' }}>{p.name}</div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-primary)', margin: '4px 0' }}>
                            ${p.price_monthly}<span style={{ fontSize: 13, fontWeight: 400 }}>/mo</span>
                          </div>
                          <div style={{ fontSize: 12, color: darkMode ? '#9ca3af' : '#6b7280', marginBottom: 8 }}>
                            {p.lead_credits} credits/month
                          </div>
                          <button onClick={async () => {
                            setSubLoading(true);
                            try {
                              const r = await createCheckout(p.slug);
                              if (r.url) window.location.href = r.url;
                              else setMessage(r.error || 'Could not start checkout.');
                            } catch (e) { setMessage(e.message); }
                            finally { setSubLoading(false); }
                          }} disabled={subLoading} style={{ ...btnPrimary, width: '100%', justifyContent: 'center', fontSize: 13 }}>
                            {subLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Upgrade'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: darkMode ? '#9ca3af' : '#6b7280', margin: 0 }}>Loading subscription info...</p>
            )}
          </div>
        )}

        {user.role === 'admin' && (
          <div style={panelStyle}>
            <h3 style={{ margin: '0 0 16px', color: darkMode ? '#f3f4f6' : '#111827', fontSize: 18 }}>Admin Overview</h3>
            {!adminStats ? (
              <p style={{ color: darkMode ? '#9ca3af' : '#6b7280', margin: 0 }}>Loading stats...</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
                <Stat label="Total Users" value={adminStats.users} darkMode={darkMode} />
                <Stat label="Total Leads" value={adminStats.leads} darkMode={darkMode} />
                <Stat label="Total Services" value={adminStats.services} darkMode={darkMode} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, icon, style, input, value, onChange, type = 'text', disabled = false }) {
  return (
    <div style={{ marginBottom: 2 }}>
      <label style={style}>
        <FontAwesomeIcon icon={icon} style={{ marginRight: 6 }} />
        {label}
      </label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        style={input}
        disabled={disabled}
      />
    </div>
  );
}

function Stat({ label, value, darkMode }) {
  return (
    <div style={{
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: 8,
      padding: 14,
      background: darkMode ? '#0f172a' : '#fafafa',
    }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: darkMode ? '#f3f4f6' : '#111827' }}>{value}</div>
      <div style={{ fontSize: 13, color: darkMode ? '#9ca3af' : '#6b7280' }}>{label}</div>
    </div>
  );
}

const btnPrimary = {
  border: 'none',
  padding: '10px 16px',
  borderRadius: 'var(--border-radius)',
  background: 'var(--color-primary)',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
};

const btnGhost = {
  border: '1px solid #9ca3af',
  padding: '10px 16px',
  borderRadius: 'var(--border-radius)',
  background: 'transparent',
  color: '#374151',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
};
