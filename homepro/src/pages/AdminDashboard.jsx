import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers, faClipboardList, faBriefcase, faLayerGroup,
  faSpinner, faCheckCircle, faXmarkCircle, faToggleOn, faToggleOff,
  faSearch, faStar, faLocationDot, faClock, faShieldHalved, faEnvelope,
  faGear, faCubes, faTag, faPlus, faPen, faTrash, faXmark, faPhone,
  faFloppyDisk, faHome, faMagnifyingGlass, faPalette, faFileLines, faEye,
  faBell, faEnvelopeOpenText, faCommentSms, faChartLine, faToggleOn as faToggleOnSolid, faListOl,
  faChevronLeft, faChevronRight, faBolt, faCommentDots, faCopy,
} from '@fortawesome/free-solid-svg-icons';
import { useTheme, themes as themeMap, fontOptions as fontOptionsMap, borderRadiusOptions as borderRadiusOpts } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import RichTextEditor from '../components/RichTextEditor';
import AISetupChatWidget from '../components/AISetupChatWidget';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const getToken = () => localStorage.getItem('hp_token');

const api = {
  get:    (p) => fetch(`${BASE}${p}`, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.json()),
  post:   (p, b) => fetch(`${BASE}${p}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json()),
  put:    (p, b) => fetch(`${BASE}${p}`, { method: 'PUT', headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json()),
  patch:  (p, b) => fetch(`${BASE}${p}`, { method: 'PATCH', headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json()),
  del:    (p) => fetch(`${BASE}${p}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.json()),
};

// ── Shared UI helpers ──────────────────────────────────────
function StatCard({ label, value, icon, color, dm }) {
  return (
    <div style={{ background: dm ? '#1e293b' : '#fff', borderRadius: 'var(--border-radius)', border: `1px solid ${dm ? '#334155' : '#e2e8f0'}`, padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 'var(--border-radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: color, color: '#fff', flexShrink: 0 }}>
        <FontAwesomeIcon icon={icon} style={{ fontSize: 18 }} />
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color: dm ? '#f1f5f9' : '#1e293b' }}>{value}</div>
        <div style={{ fontSize: 13, color: dm ? '#94a3b8' : '#64748b' }}>{label}</div>
      </div>
    </div>
  );
}

function Badge({ children, color = '#3b82f6', bg = '#dbeafe' }) {
  return <span style={{ padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: bg, color }}>{children}</span>;
}

function Btn({ children, onClick, variant = 'primary', small, disabled, style: extra }) {
  const base = { border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 600, borderRadius: 'var(--border-radius)', display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'opacity 0.15s', opacity: disabled ? 0.5 : 1 };
  const sizes = small ? { padding: '3px 8px', fontSize: 11 } : { padding: '6px 14px', fontSize: 12 };
  const variants = {
    primary: { background: 'var(--color-primary)', color: '#fff' },
    danger:  { background: '#ef4444', color: '#fff' },
    ghost:   { background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0' },
    success: { background: '#22c55e', color: '#fff' },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...sizes, ...variants[variant], ...extra }}>{children}</button>;
}

function Input({ label, value, onChange, type = 'text', placeholder, dm, multiline, disabled }) {
  const s = { width: '100%', padding: multiline ? '10px 12px' : '8px 12px', fontSize: 13, border: `1px solid ${dm ? '#334155' : '#e2e8f0'}`, borderRadius: 'var(--border-radius)', background: dm ? '#1e293b' : '#f8fafc', color: dm ? '#f1f5f9' : '#1e293b', outline: 'none', boxSizing: 'border-box', resize: multiline ? 'vertical' : undefined, fontFamily: 'inherit' };
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: dm ? '#94a3b8' : '#64748b', marginBottom: 4 }}>{label}</label>}
      {multiline
        ? <textarea rows={3} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={s} disabled={disabled} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={s} disabled={disabled} />
      }
    </div>
  );
}

function Card({ children, dm, style: extra, id }) {
  return <div id={id} style={{ background: dm ? '#111827' : '#fff', border: `1px solid ${dm ? '#1f2937' : '#e2e8f0'}`, borderRadius: 'var(--border-radius)', ...extra }}>{children}</div>;
}

function Table({ headers, children, dm }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${dm ? '#1f2937' : '#e2e8f0'}` }}>
            {headers.map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: dm ? '#94a3b8' : '#64748b', textTransform: 'uppercase' }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Td({ children, dm, fw }) { return <td style={{ padding: '10px 14px', color: dm ? '#f1f5f9' : '#1e293b', fontWeight: fw }}>{children}</td>; }

function PaginationBar({ page, total, limit, onPageChange, dm }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const tp = dm ? '#f1f5f9' : '#1e293b';
  const ts = dm ? '#94a3b8' : '#64748b';
  const border = dm ? '#1f2937' : '#e2e8f0';
  if (totalPages <= 1 && total <= limit) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, padding: '12px 14px', borderTop: `1px solid ${border}`, background: dm ? '#0f172a' : '#f8fafc' }}>
      <span style={{ fontSize: 12, color: ts }}>Showing {start}–{end} of {total}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}
          style={{ padding: '6px 12px', fontSize: 12, border: `1px solid ${border}`, borderRadius: 'var(--border-radius)', background: dm ? '#1e293b' : '#fff', color: tp, cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}>
          <FontAwesomeIcon icon={faChevronLeft} /> Prev
        </button>
        <span style={{ fontSize: 12, color: ts }}>Page {page} of {totalPages}</span>
        <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
          style={{ padding: '6px 12px', fontSize: 12, border: `1px solid ${border}`, borderRadius: 'var(--border-radius)', background: dm ? '#1e293b' : '#fff', color: tp, cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1 }}>
          Next <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────
export default function AdminDashboard({ onShowLead }) {
  const { darkMode: dm } = useTheme();
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLimit] = useState(25);
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsLimit] = useState(25);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [plans, setPlans] = useState([]);
  const [creditBundles, setCreditBundles] = useState([]);
  const [settings, setSettings] = useState([]);
  const [pages, setPages] = useState([]);
  const [searchQ, setSearchQ] = useState('');

  // CRUD editing state
  const [editPlan, setEditPlan] = useState(null);
  const [editCreditBundle, setEditCreditBundle] = useState(null);
  const [editCat, setEditCat] = useState(null);
  const [editSvc, setEditSvc] = useState(null);
  const [editPage, setEditPage] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [creditAdjust, setCreditAdjust] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [editTmpl, setEditTmpl] = useState(null);
  const [tmplPreview, setTmplPreview] = useState(null);
  const [steps, setSteps] = useState([]);
  const [stepsLoading, setStepsLoading] = useState(false);
  const [editStep, setEditStep] = useState(null);
  const [pagesPage, setPagesPage] = useState(1);
  const pagesLimit = 10;
  const [pagesSubTab, setPagesSubTab] = useState('list');
  const [reviews, setReviews] = useState([]);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsLimit] = useState(25);
  const [reviewFilter, setReviewFilter] = useState('');
  const [testSmsTo, setTestSmsTo] = useState('');
  const [testSmsSending, setTestSmsSending] = useState(false);
  const [testSmsResult, setTestSmsResult] = useState(null);
  const [testEmailTo, setTestEmailTo] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState(null);
  const [testStripeSending, setTestStripeSending] = useState(false);
  const [testStripeResult, setTestStripeResult] = useState(null);
  const [testOpenaiSending, setTestOpenaiSending] = useState(false);
  const [testOpenaiResult, setTestOpenaiResult] = useState(null);

  // One-click setup templates
  const [setupTemplates, setSetupTemplates] = useState([]);
  const [setupTemplateId, setSetupTemplateId] = useState('');
  const [setupCustomService, setSetupCustomService] = useState('');
  const [setupApplying, setSetupApplying] = useState(false);
  // AI setup chat
  const [setupChatMessages, setSetupChatMessages] = useState([]);
  const [setupChatInput, setSetupChatInput] = useState('');
  const [setupChatLoading, setSetupChatLoading] = useState(false);
  const [setupChatApplying, setSetupChatApplying] = useState(false);

  // Settings sub-tab (Quick setup, General, Homepage, etc.)
  const [settingsSubTab, setSettingsSubTab] = useState('setup');

  // Users sub-tab (superadmin gets a Tenants sub-tab)
  const [usersSubTab, setUsersSubTab] = useState('list');
  // Superadmin: which tenant's users to show in the list (0 = current/default)
  const [usersTenantFilter, setUsersTenantFilter] = useState(0);

  // Tenant management state (superadmin only)
  const [tenants, setTenants] = useState([]);
  const [tenantsTotal, setTenantsTotal] = useState(0);
  const [tenantsPage, setTenantsPage] = useState(1);
  const tenantsLimit = 20;
  const [editTenant, setEditTenant] = useState(null);
  const [newTenant, setNewTenant] = useState(null);
  const [showDomainHelp, setShowDomainHelp] = useState(false);
  const [tenantSlug, setTenantSlug] = useState('default');
  const [tenantId, setTenantId] = useState(null);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };
  const isSuperAdmin = user?.role === 'superadmin';

  useEffect(() => {
    const roleParam = userRoleFilter && userRoleFilter !== 'all' ? `&role=${userRoleFilter}` : '';
    Promise.all([
      api.get(`/users?page=1&limit=${usersLimit}${roleParam}`),
      api.get(`/leads?page=1&limit=${leadsLimit}`),
      api.get('/categories/admin-list'),
      api.get('/services/admin-list?all=true'),
      api.get('/subscriptions/admin-plans?all=true'),
      api.get('/credits/admin/bundles').catch(() => []),
      api.get('/settings/all'),
      api.get('/pages?all=true'),
      api.get('/templates'),
      api.get('/admin/how-it-works'),
      api.get('/users?page=1&limit=1&role=pro'),
    ]).then(([u, l, c, s, p, creditBundlesData, st, pg, tmpl, stepsData, prosResp]) => {
      const userList = u.users || u || [];
      const leadList = l.leads ?? (Array.isArray(l) ? l : []);
      setUsers(userList);
      setUsersTotal(u.total ?? userList.length);
      setLeads(leadList);
      setLeadsTotal(l.total ?? leadList.length);
      setCategories(Array.isArray(c) ? c : []);
      setServices(Array.isArray(s) ? s : []);
      setPlans(Array.isArray(p) ? p : []);
      setCreditBundles(Array.isArray(creditBundlesData) ? creditBundlesData : []);
      setSettings(Array.isArray(st) ? st : []);
      setPages(Array.isArray(pg) ? pg : []);
      setTemplates(Array.isArray(tmpl) ? tmpl : []);
      setSteps(Array.isArray(stepsData) ? stepsData : []);
      setStats({
        users: u.total ?? userList.length,
        leads: l.total ?? leadList.length,
        pros: prosResp?.total ?? 0,
        services: (Array.isArray(s) ? s : []).length,
      });
    }).catch(console.error).finally(() => setLoading(false));

    // Superadmin: preload tenant list for the user-filter dropdown
    if (user?.role === 'superadmin') {
      api.get('/superadmin/tenants?page=1&limit=100')
        .then(d => setTenants(d.tenants ?? []))
        .catch(() => {});
    }
  }, []);

  // Tenant slug and id (for Preview link and default-tenant delete restrictions)
  useEffect(() => {
    api.get('/tenant/config')
      .then(d => {
        setTenantSlug(d.tenant?.slug || 'default');
        setTenantId(d.tenant?.id ?? null);
      })
      .catch(() => {});
  }, []);

  // Refetch users when page, role filter, or tenant filter changes (users tab)
  useEffect(() => {
    if (tab !== 'users') return;
    const roleParam = userRoleFilter && userRoleFilter !== 'all' ? `&role=${userRoleFilter}` : '';
    const tenantParam = user?.role === 'superadmin' ? `&tenantId=${usersTenantFilter}` : '';
    api.get(`/users?page=${usersPage}&limit=${usersLimit}${roleParam}${tenantParam}`)
      .then(u => {
        const list = u.users || u || [];
        setUsers(list);
        setUsersTotal(u.total ?? list.length);
      })
      .catch(() => {});
  }, [tab, usersPage, userRoleFilter, usersTenantFilter]);

  // Reset tab if non-superadmin has a superadmin-only tab selected (Categories, Templates)
  useEffect(() => {
    if (user?.role !== 'superadmin' && ['categories', 'templates'].includes(tab)) {
      setTab('overview');
    }
  }, [user?.role, tab]);

  // Refetch leads when page changes (leads tab)
  useEffect(() => {
    if (tab !== 'leads') return;
    api.get(`/leads?page=${leadsPage}&limit=${leadsLimit}`)
      .then(l => {
        const list = l.leads ?? (Array.isArray(l) ? l : []);
        setLeads(list);
        setLeadsTotal(l.total ?? list.length);
      })
      .catch(() => {});
  }, [tab, leadsPage]);

  // Load reviews when Reviews tab is open
  useEffect(() => {
    if (tab !== 'reviews') return;
    const q = reviewFilter ? `&is_public=${reviewFilter}` : '';
    api.get(`/reviews/admin?page=${reviewsPage}&limit=${reviewsLimit}${q}`)
      .then(d => {
        setReviews(d.reviews ?? []);
        setReviewsTotal(d.total ?? 0);
      })
      .catch(() => {});
  }, [tab, reviewsPage, reviewFilter]);

  // Load tenants when Tenants sub-tab is open under Users (superadmin)
  useEffect(() => {
    if (tab !== 'users' || usersSubTab !== 'tenants') return;
    api.get(`/superadmin/tenants?page=${tenantsPage}&limit=${tenantsLimit}`)
      .then(d => {
        setTenants(d.tenants ?? []);
        setTenantsTotal(d.total ?? 0);
      })
      .catch(() => {});
  }, [tab, usersSubTab, tenantsPage]);

  // Load steps when Pages tab is opened (for superadmin: only when Steps sub-tab; for tenant admin: always)
  useEffect(() => {
    if (tab !== 'pages') return;
    if (isSuperAdmin && pagesSubTab !== 'steps') return;
    if (steps.length > 0) return; // already have data
    setStepsLoading(true);
    api.get('/admin/how-it-works')
      .then((data) => {
        if (Array.isArray(data)) setSteps(data);
        else if (data?.error) flash(data.error);
      })
      .catch(() => flash('Failed to load steps'))
      .finally(() => setStepsLoading(false));
  }, [tab, pagesSubTab, isSuperAdmin]);

  // Load setup templates when Settings tab is opened
  useEffect(() => {
    if (tab !== 'settings') return;
    api.get('/settings/setup-templates')
      .then((data) => {
        if (Array.isArray(data)) {
          setSetupTemplates(data);
          if (data.length && !setupTemplateId) setSetupTemplateId(data[0].id ?? '');
        } else if (data?.error) {
          setSetupTemplates([]);
          flash('Templates: ' + (data.error || 'failed to load'));
        }
      })
      .catch(() => { setSetupTemplates([]); });
  }, [tab]);

  // Ensure tenant chat settings exist in state when Chat tab is selected (so we can edit/save them)
  useEffect(() => {
    if (tab !== 'settings' || settingsSubTab !== 'chat') return;
    const chatKeys = ['tenant_chat_enabled', 'tenant_chat_personality', 'tenant_chat_reference_info'];
    const missing = chatKeys.filter(k => !settings.some(s => s.setting_key === k));
    if (missing.length === 0) return;
    const defaults = [
      { setting_key: 'tenant_chat_enabled', setting_value: 'false', setting_type: 'boolean', setting_group: 'chat', label: 'Enable tenant homepage chat' },
      { setting_key: 'tenant_chat_personality', setting_value: '', setting_type: 'string', setting_group: 'chat', label: 'Chat personality' },
      { setting_key: 'tenant_chat_reference_info', setting_value: '', setting_type: 'string', setting_group: 'chat', label: 'Reference information' },
    ];
    setSettings(ss => [...ss, ...defaults.filter(d => missing.includes(d.setting_key))]);
  }, [tab, settingsSubTab]);

  // Ensure cookie notice (legal) settings exist in state when Legal tab is selected
  useEffect(() => {
    if (tab !== 'settings' || settingsSubTab !== 'legal') return;
    const legalKeys = ['cookie_notice_enabled', 'cookie_notice_message'];
    const missing = legalKeys.filter(k => !settings.some(s => s.setting_key === k));
    if (missing.length === 0) return;
    const defaults = [
      { setting_key: 'cookie_notice_enabled', setting_value: 'true', setting_type: 'boolean', setting_group: 'legal', label: 'Show cookie notice bar' },
      { setting_key: 'cookie_notice_message', setting_value: '', setting_type: 'string', setting_group: 'legal', label: 'Cookie notice message (leave blank for default)' },
    ];
    setSettings(ss => [...ss, ...defaults.filter(d => missing.includes(d.setting_key))]);
  }, [tab, settingsSubTab]);

  const loadSteps = () => {
    setStepsLoading(true);
    api.get('/admin/how-it-works')
      .then((data) => { if (Array.isArray(data)) setSteps(data); })
      .catch(() => flash('Failed to load steps'))
      .finally(() => setStepsLoading(false));
  };

  const toggleUser = async (id, active) => {
    const r = await api.patch(`/users/${id}/status`, { isActive: !active });
    if (r.error) { flash(r.error); return; }
    setUsers(us => us.map(u => u.id === id ? { ...u, is_active: !active } : u));
  };

  const saveUser = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      if (editUser.id) {
        const payload = { email: editUser.email, role: editUser.role, firstName: editUser.firstName, lastName: editUser.lastName, phone: editUser.phone, isActive: editUser.isActive };
        if (editUser.newPassword && editUser.newPassword.length >= 6) payload.newPassword = editUser.newPassword;
        const r = await api.put(`/users/${editUser.id}`, payload);
        if (r.error) { flash(r.error); setSaving(false); return; }
        setUsers(us => us.map(u => u.id === editUser.id ? { ...u, email: editUser.email, role: editUser.role, first_name: editUser.firstName, last_name: editUser.lastName, phone: editUser.phone, is_active: editUser.isActive } : u));
      } else {
        const r = await api.post('/users', { email: editUser.email, password: editUser.password, role: editUser.role, firstName: editUser.firstName, lastName: editUser.lastName, phone: editUser.phone });
        if (r.error) { flash(r.error); setSaving(false); return; }
        setUsers(us => [...us, { id: r.id, email: r.email, role: r.role, first_name: editUser.firstName, last_name: editUser.lastName, phone: editUser.phone, is_active: true }]);
      }
      setEditUser(null);
      flash('User saved');
    } catch (e) { flash('Failed to save user'); }
    setSaving(false);
  };

  const deleteUser = async (id) => {
    if (!confirm('Deactivate this user? They will no longer be able to log in.')) return;
    setSaving(true);
    try {
      const r = await api.del(`/users/${id}`);
      if (r.error) { flash(r.error); setSaving(false); return; }
      setUsers(us => us.map(u => u.id === id ? { ...u, is_active: false } : u));
      setEditUser(null);
      flash('User deactivated');
    } catch (e) { flash('Failed to deactivate'); }
    setSaving(false);
  };

  const { setColorKey, setDarkMode, setFontKey, setBorderRadius } = useTheme();

  // ── Settings save ──
  const saveSettings = async (group) => {
    setSaving(true);
    const groupSettings = settings.filter(s => s.setting_group === group);
    await api.put('/settings', { settings: groupSettings.map(s => ({ key: s.setting_key, value: s.setting_value, type: s.setting_type, group: s.setting_group, label: s.label, ...(s.setting_group === 'legal' ? { isPublic: true } : {}) })) });
    if (group === 'appearance') {
      const themeVal = groupSettings.find(s => s.setting_key === 'default_theme')?.setting_value || 'blue';
      const darkVal = groupSettings.find(s => s.setting_key === 'default_dark_mode')?.setting_value;
      const fontVal = groupSettings.find(s => s.setting_key === 'default_font')?.setting_value || 'inter';
      const radiusVal = groupSettings.find(s => s.setting_key === 'default_border_radius')?.setting_value || 'md';
      setColorKey(themeVal);
      setDarkMode(darkVal === 'true' || darkVal === '1');
      setFontKey(fontVal);
      setBorderRadius(radiusVal);
    }
    setSaving(false);
    flash(`${group} settings saved!`);
    window.dispatchEvent(new CustomEvent('app:settings-updated'));
  };
  const updateSetting = (key, val) => setSettings(ss => ss.map(s => s.setting_key === key ? { ...s, setting_value: val } : s));
  const getSettingVal = (key) => settings.find(s => s.setting_key === key)?.setting_value || '';

  // ── Plans CRUD ──
  const savePlan = async () => {
    setSaving(true);
    if (editPlan.id) {
      await api.put(`/subscriptions/plans/${editPlan.id}`, editPlan);
      setPlans(ps => ps.map(p => p.id === editPlan.id ? { ...p, ...editPlan } : p));
    } else {
      const r = await api.post('/subscriptions/plans', editPlan);
      setPlans(ps => [...ps, {
        ...editPlan, id: r.id,
        price_monthly: editPlan.priceMonthly || 0,
        price_yearly: editPlan.priceYearly || 0,
        lead_credits: editPlan.leadCredits || 0,
        max_service_areas: editPlan.maxServiceAreas || 5,
        max_services: editPlan.maxServices || 3,
        stripe_price_id: editPlan.stripePriceId || null,
        is_popular: editPlan.isPopular ? 1 : 0,
        is_active: editPlan.isActive !== false ? 1 : 0,
        sort_order: editPlan.sortOrder || 0,
      }]);
    }
    setEditPlan(null); setSaving(false); flash('Plan saved!');
    window.dispatchEvent(new CustomEvent('app:data-updated'));
  };
  const deletePlan = async (id) => {
    if (!confirm('Delete this plan?')) return;
    await api.del(`/subscriptions/plans/${id}`);
    setPlans(ps => ps.filter(p => p.id !== id));
    flash('Plan deleted');
  };

  // ── Credit bundles (top-up) CRUD — these are the packages shown in Pro Dashboard Credits tab ──
  const saveCreditBundle = async () => {
    if (!editCreditBundle) return;
    setSaving(true);
    const payload = {
      label: editCreditBundle.label,
      credits: editCreditBundle.credits,
      price: editCreditBundle.price,
      pricePerCredit: editCreditBundle.price_per_credit != null ? editCreditBundle.price_per_credit : (editCreditBundle.price / (editCreditBundle.credits || 1)),
      stripePriceId: editCreditBundle.stripe_price_id || null,
      isActive: editCreditBundle.is_active !== false,
      sortOrder: editCreditBundle.sort_order ?? 0,
    };
    try {
      if (editCreditBundle.id) {
        await api.put(`/credits/admin/bundles/${editCreditBundle.id}`, payload);
        setCreditBundles(cb => cb.map(b => b.id === editCreditBundle.id ? { ...b, ...editCreditBundle, ...payload } : b));
      } else {
        const r = await api.post('/credits/admin/bundles', payload);
        setCreditBundles(cb => [...cb, { id: r.id, ...payload, label: payload.label, credits: payload.credits, price: payload.price, price_per_credit: payload.pricePerCredit, is_active: payload.isActive, sort_order: payload.sortOrder }]);
      }
      setEditCreditBundle(null);
      flash('Credit bundle saved');
      window.dispatchEvent(new CustomEvent('app:data-updated'));
    } catch (e) {
      flash(e?.message || e?.error || 'Failed to save bundle');
    }
    setSaving(false);
  };
  const deleteCreditBundle = async (id) => {
    if (!confirm('Delete this credit bundle? Pros will no longer see it in the Credits tab.')) return;
    await api.del(`/credits/admin/bundles/${id}`);
    setCreditBundles(cb => cb.filter(b => b.id !== id));
    setEditCreditBundle(null);
    flash('Credit bundle deleted');
  };

  // ── Categories CRUD ──
  const saveCat = async () => {
    setSaving(true);
    if (editCat.id) {
      await api.put(`/categories/${editCat.id}`, editCat);
      setCategories(cs => cs.map(c => c.id === editCat.id ? { ...c, ...editCat } : c));
    } else {
      const r = await api.post('/categories', editCat);
      setCategories(cs => [...cs, { ...editCat, id: r.id, services: [] }]);
    }
    setEditCat(null); setSaving(false); flash('Category saved!');
    window.dispatchEvent(new CustomEvent('app:data-updated'));
  };
  const deleteCat = async (id) => {
    if (!confirm('Delete this category?')) return;
    try {
      const r = await api.del(`/categories/${id}`);
      if (r?.error) { flash(r.error); return; }
      setCategories(cs => cs.filter(c => c.id !== id));
      flash('Category deleted');
    } catch (e) {
      flash(e?.message || 'Could not delete category');
    }
  };

  // ── Services CRUD ──
  const saveSvc = async () => {
    setSaving(true);
    if (editSvc.id) {
      await api.put(`/services/${editSvc.id}`, editSvc);
      setServices(ss => ss.map(s => s.id === editSvc.id ? { ...s, ...editSvc } : s));
    } else {
      const r = await api.post('/services', editSvc);
      const cat = categories.find(c => c.id === (editSvc.categoryId || editSvc.category_id));
      setServices(ss => [...ss, {
        ...editSvc,
        id: r.id,
        category_id: editSvc.categoryId || editSvc.category_id || null,
        category_name: cat?.name || '',
        category_slug: cat?.slug || '',
        icon_class: editSvc.iconClass || editSvc.icon_class || 'faWrench',
        card_image_url: editSvc.cardImageUrl || editSvc.card_image_url || null,
        min_price: editSvc.minPrice || editSvc.min_price || null,
        price_unit: editSvc.priceUnit || editSvc.price_unit || 'per job',
        avg_rating: editSvc.avgRating || 4.5,
        review_count: editSvc.reviewCount || 0,
        is_active: 1,
      }]);
    }
    setEditSvc(null); setSaving(false); flash('Service saved!');
    window.dispatchEvent(new CustomEvent('app:data-updated'));
  };
  const deleteSvc = async (id) => {
    if (!confirm('Delete this service?')) return;
    try {
      await api.del(`/services/${id}`);
      setServices(ss => ss.filter(s => s.id !== id));
      flash('Service deleted');
    } catch (e) {
      flash(e?.message || 'Could not delete service');
    }
  };

  const [copying, setCopying] = useState('');
  const copyCategoriesFromDefault = async () => {
    if (tenantId === 1 || copying) return;
    setCopying('categories');
    try {
      const r = await api.post('/categories/copy-from-default', {});
      if (r?.error) { flash(r.error); return; }
      flash(r?.message || 'Categories copied from default.');
      const c = await api.get('/categories/admin-list');
      setCategories(Array.isArray(c) ? c : []);
      window.dispatchEvent(new CustomEvent('app:data-updated'));
    } catch (e) {
      flash(e?.message || 'Copy failed');
    } finally {
      setCopying('');
    }
  };
  const copyServicesFromDefault = async () => {
    if (tenantId === 1 || copying) return;
    setCopying('services');
    try {
      const r = await api.post('/services/copy-from-default', {});
      if (r?.error) { flash(r.error); return; }
      flash(r?.message || 'Services copied from default.');
      const s = await api.get('/services/admin-list?all=true');
      setServices(Array.isArray(s) ? s : []);
      window.dispatchEvent(new CustomEvent('app:data-updated'));
    } catch (e) {
      flash(e?.message || 'Copy failed');
    } finally {
      setCopying('');
    }
  };

  // ── Homepage steps (how it works) ──
  const saveStep = async () => {
    if (!editStep?.id) return;
    setSaving(true);
    try {
      await api.put(`/services/how-it-works/${editStep.id}`, {
        step_number: editStep.step_number,
        icon_class: editStep.icon_class,
        title: editStep.title,
        description: editStep.description,
      });
      setSteps(ss => ss.map(s => s.id === editStep.id ? { ...s, ...editStep } : s));
      setEditStep(null);
      flash('Step saved');
      window.dispatchEvent(new CustomEvent('app:data-updated'));
    } catch (e) { flash('Failed to save step'); }
    setSaving(false);
  };

  const border = dm ? '#1f2937' : '#e2e8f0';
  const tp = dm ? '#f1f5f9' : '#1e293b';
  const ts = dm ? '#94a3b8' : '#64748b';

  const tabs = [
    { key: 'overview',    label: 'Overview',    icon: faShieldHalved },
    { key: 'users',       label: 'Users',       icon: faUsers },
    { key: 'leads',       label: 'Leads',       icon: faClipboardList },
    { key: 'packages',    label: 'Packages',    icon: faCubes },
    { key: 'categories',  label: 'Categories',  icon: faTag },
    { key: 'services',    label: 'Services',    icon: faLayerGroup },
    { key: 'reviews',     label: 'Reviews',     icon: faStar },
    { key: 'pages',       label: 'Pages',       icon: faFileLines },
    ...(isSuperAdmin ? [{ key: 'templates',   label: 'Templates',   icon: faBell }] : []),
    { key: 'settings',    label: 'Settings',    icon: faGear },
  ];

  const pagesSubTabs = [
    { key: 'list',  label: 'CMS Pages',        icon: faFileLines },
    { key: 'steps', label: 'Homepage Steps',    icon: faListOl },
  ];

  const filteredUsers = users.filter(u => {
    const matchSearch = !searchQ || u.email?.toLowerCase().includes(searchQ.toLowerCase()) || u.first_name?.toLowerCase().includes(searchQ.toLowerCase()) || u.last_name?.toLowerCase().includes(searchQ.toLowerCase()) || (u.business_name && u.business_name.toLowerCase().includes(searchQ.toLowerCase()));
    const matchRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    return matchSearch && matchRole;
  });

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: dm ? '#0a0f1a' : '#f0f4f8' }}><FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 32, color: 'var(--color-primary)' }} /></div>;

  const settingGroups = [
    { key: 'general',    label: 'General',    icon: faGear },
    { key: 'stripe',     label: 'Stripe',     icon: faGear },
    { key: 'twilio',     label: 'Twilio SMS', icon: faPhone },
    { key: 'homepage',   label: 'Homepage',   icon: faHome },
    { key: 'sections',   label: 'Content sections', icon: faListOl },
    { key: 'chat',       label: 'Tenant homepage chat', icon: faCommentDots },
    { key: 'legal',      label: 'Cookie notice & Legal', icon: faFileLines },
    { key: 'seo',        label: 'SEO',        icon: faMagnifyingGlass },
    { key: 'analytics',  label: 'Google Analytics', icon: faChartLine },
    { key: 'email',      label: 'Email',      icon: faEnvelope },
    { key: 'appearance', label: 'Appearance', icon: faPalette },
    { key: 'advanced',   label: 'Spam / Security', icon: faShieldHalved },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: dm ? '#0a0f1a' : '#f0f4f8', fontFamily: 'var(--font-family)' }}>
      {/* Flash message */}
      {msg && <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 200, background: '#22c55e', color: '#fff', padding: '10px 20px', borderRadius: 'var(--border-radius)', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}><FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: 8 }} />{msg}</div>}

      <div className="max-w-[1100px] mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <FontAwesomeIcon icon={faShieldHalved} style={{ color: '#ef4444', fontSize: 20 }} />
            <h1 style={{ fontSize: 24, fontWeight: 800, color: tp }}>
              {user?.role === 'superadmin' ? 'Super Admin Dashboard' : 'Admin Dashboard'}
            </h1>
            {user?.role === 'superadmin' && (
              <span style={{ background: '#7c3aed', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, textTransform: 'uppercase', letterSpacing: 1 }}>Super Admin</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 14, color: ts, margin: 0 }}>Welcome back, {user?.firstName || user?.first_name || 'Admin'}.</p>
            <a href={`/#t/${tenantSlug}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <FontAwesomeIcon icon={faEye} style={{ fontSize: 10 }} />
              Preview website
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: dm ? '#111827' : '#fff', borderRadius: 'var(--border-radius)', padding: 4, border: `1px solid ${border}`, overflowX: 'auto' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '8px 16px', fontSize: 12, fontWeight: 600, borderRadius: 'var(--border-radius)',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
              background: tab === t.key ? 'var(--color-primary)' : 'transparent',
              color: tab === t.key ? '#fff' : ts,
            }}><FontAwesomeIcon icon={t.icon} style={{ fontSize: 11 }} />{t.label}</button>
          ))}
        </div>

        {/* ══════════ OVERVIEW ══════════ */}
        {tab === 'overview' && <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
            <StatCard label="Total Users" value={stats.users} icon={faUsers} color="#3b82f6" dm={dm} />
            <StatCard label="Total Leads" value={stats.leads} icon={faClipboardList} color="#8b5cf6" dm={dm} />
            <StatCard label="Active Pros" value={stats.pros} icon={faBriefcase} color="#22c55e" dm={dm} />
            <StatCard label="Services" value={stats.services} icon={faLayerGroup} color="#f59e0b" dm={dm} />
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: tp, marginBottom: 12 }}>Recent Leads</h3>
          <Card dm={dm}><Table headers={['Customer','Service','Location','Status','Date']} dm={dm}>
            {leads.slice(0, 8).map(l => (
              <tr key={l.id} onClick={() => onShowLead && onShowLead(l.id)} style={{ borderBottom: `1px solid ${border}`, cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = dm ? '#1e293b' : '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <Td dm={dm} fw={600}>{l.customer_name || 'Anon'}</Td>
                <Td dm={dm}>{l.service_name}</Td>
                <Td dm={dm}><FontAwesomeIcon icon={faLocationDot} style={{ marginRight: 4, fontSize: 11, color: 'var(--color-primary)' }} />{l.zip} {l.city_name && `· ${l.city_name}`}</Td>
                <Td dm={dm}><Badge color={l.status==='new'?'#2563eb':l.status==='completed'?'#16a34a':'#7c3aed'} bg={l.status==='new'?'#dbeafe':l.status==='completed'?'#dcfce7':'#f3e8ff'}>{l.status}</Badge></Td>
                <Td dm={dm}>{new Date(l.created_at).toLocaleDateString()}</Td>
              </tr>
            ))}
          </Table></Card>
        </>}

        {/* ══════════ USERS ══════════ */}
        {tab === 'users' && <>
          {/* Users sub-tabs (superadmin sees Tenants here) */}
          {user?.role === 'superadmin' && (
            <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: dm ? '#111827' : '#f8fafc', borderRadius: 'var(--border-radius)', padding: 3, border: `1px solid ${border}`, alignSelf: 'flex-start', width: 'fit-content' }}>
              {[
                { key: 'list', label: 'All Users', icon: faUsers },
                { key: 'tenants', label: 'Tenants', icon: faLayerGroup },
              ].map(st => (
                <button key={st.key} onClick={() => setUsersSubTab(st.key)} style={{
                  padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 'var(--border-radius)',
                  border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
                  background: usersSubTab === st.key ? (st.key === 'tenants' ? '#7c3aed' : 'var(--color-primary)') : 'transparent',
                  color: usersSubTab === st.key ? '#fff' : (st.key === 'tenants' ? '#7c3aed' : ts),
                }}><FontAwesomeIcon icon={st.icon} style={{ fontSize: 11 }} />{st.label}</button>
              ))}
            </div>
          )}

          {usersSubTab === 'list' && <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 340 }}>
              <FontAwesomeIcon icon={faSearch} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: ts, fontSize: 13 }} />
              <input type="text" placeholder="Search users..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                style={{ width: '100%', padding: '9px 14px 9px 34px', fontSize: 13, border: `1px solid ${border}`, borderRadius: 'var(--border-radius)', background: dm ? '#1e293b' : '#f8fafc', color: tp, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <select value={userRoleFilter} onChange={e => { setUserRoleFilter(e.target.value); setUsersPage(1); }}
              style={{ padding: '9px 12px', fontSize: 13, border: `1px solid ${border}`, borderRadius: 'var(--border-radius)', background: dm ? '#1e293b' : '#f8fafc', color: tp }}>
              <option value="all">All (Users &amp; Providers)</option>
              <option value="consumer">Consumers only</option>
              <option value="pro">Providers only</option>
              <option value="admin">Admins only</option>
            </select>
            {user?.role === 'superadmin' && tenants.length > 0 && (
              <select value={usersTenantFilter} onChange={e => { setUsersTenantFilter(parseInt(e.target.value) || 0); setUsersPage(1); }}
                style={{ padding: '9px 12px', fontSize: 13, border: `1px solid #7c3aed`, borderRadius: 'var(--border-radius)', background: dm ? '#2d1b69' : '#ede9fe', color: '#7c3aed', fontWeight: 600 }}>
                <option value={0}>All Tenants</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                ))}
              </select>
            )}
            <Btn onClick={() => setEditUser({ email: '', password: '', role: 'consumer', firstName: '', lastName: '', phone: '' })}><FontAwesomeIcon icon={faPlus} />Add User</Btn>
            <span style={{ fontSize: 13, color: ts }}>Showing {filteredUsers.length} of {usersTotal} users</span>
          </div>

          {editUser && <Card dm={dm} style={{ padding: 20, marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: tp, marginBottom: 12 }}>{editUser.id ? 'Edit User' : 'New User'}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Input label="Email" value={editUser.email||''} onChange={v => setEditUser({...editUser, email: v})} dm={dm} type="email" />
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>Role</label>
                <select value={editUser.role||'consumer'} onChange={e => setEditUser({...editUser, role: e.target.value})}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: `1px solid ${dm?'#334155':'#e2e8f0'}`, borderRadius: 'var(--border-radius)', background: dm?'#1e293b':'#f8fafc', color: tp }}>
                  <option value="consumer">Consumer</option>
                  <option value="pro">Provider (Pro)</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <Input label="First name" value={editUser.firstName??editUser.first_name??''} onChange={v => setEditUser({...editUser, firstName: v})} dm={dm} />
              <Input label="Last name" value={editUser.lastName??editUser.last_name??''} onChange={v => setEditUser({...editUser, lastName: v})} dm={dm} />
              <Input label="Phone" value={editUser.phone||''} onChange={v => setEditUser({...editUser, phone: v})} dm={dm} />
              {editUser.id ? (
                <Input label="New password (leave blank to keep)" value={editUser.newPassword||''} onChange={v => setEditUser({...editUser, newPassword: v})} dm={dm} type="password" placeholder="Optional" />
              ) : (
                <Input label="Password" value={editUser.password||''} onChange={v => setEditUser({...editUser, password: v})} dm={dm} type="password" />
              )}
              {editUser.id && (
                <label style={{ fontSize: 13, color: tp, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 14 }}>
                  <input type="checkbox" checked={editUser.isActive !== false} onChange={e => setEditUser({...editUser, isActive: e.target.checked})} />
                  Active (can log in)
                </label>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <Btn onClick={saveUser} disabled={saving || !editUser.email || (!editUser.id && !editUser.password)}><FontAwesomeIcon icon={faFloppyDisk} />{saving ? 'Saving...' : 'Save'}</Btn>
              <Btn variant="ghost" onClick={() => setEditUser(null)}><FontAwesomeIcon icon={faXmark} />Cancel</Btn>
            </div>
          </Card>}

          {/* Credit Adjust Modal */}
          {creditAdjust && <Card dm={dm} style={{ padding: 20, marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: tp, marginBottom: 12 }}>Adjust Credits — {creditAdjust.proName}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0 16px' }}>
              <Input label="Amount (+/-)" value={creditAdjust.amount||''} onChange={v => setCreditAdjust({...creditAdjust, amount: v})} dm={dm} type="number" placeholder="e.g. 10 or -5" />
              <Input label="Reason" value={creditAdjust.reason||''} onChange={v => setCreditAdjust({...creditAdjust, reason: v})} dm={dm} placeholder="e.g. Compensation for bad lead" />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <Btn onClick={async () => {
                const amt = parseInt(creditAdjust.amount);
                if (!amt || !creditAdjust.reason) return flash('Amount and reason required');
                setSaving(true);
                try {
                  const r = await api.post('/credits/admin/adjust', { proId: creditAdjust.proId, amount: amt, reason: creditAdjust.reason });
                  flash(`Credits adjusted: ${r.message}. New balance: ${r.balance}`);
                  setCreditAdjust(null);
                } catch (e) { flash('Failed to adjust credits'); }
                setSaving(false);
              }} disabled={saving}><FontAwesomeIcon icon={faFloppyDisk} />{saving ? 'Saving...' : 'Apply'}</Btn>
              <Btn variant="ghost" onClick={() => setCreditAdjust(null)}><FontAwesomeIcon icon={faXmark} />Cancel</Btn>
            </div>
          </Card>}

          <Card dm={dm}><Table headers={[
            'ID','Name','Email','Role',
            ...(user?.role === 'superadmin' && usersTenantFilter === 0 ? ['Tenant'] : []),
            'Provider','Active','Last Login','Actions'
          ]} dm={dm}>
            {filteredUsers.map(u => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${border}` }}>
                <Td dm={dm}>#{u.id}</Td>
                <Td dm={dm} fw={600}>{u.first_name || ''} {u.last_name || ''}</Td>
                <Td dm={dm}>{u.email}</Td>
                <Td dm={dm}><Badge color={u.role==='admin'?'#dc2626':u.role==='superadmin'?'#7c3aed':u.role==='pro'?'#2563eb':'#16a34a'} bg={u.role==='admin'?'#fee2e2':u.role==='superadmin'?'#ede9fe':u.role==='pro'?'#dbeafe':'#dcfce7'}>{u.role}</Badge></Td>
                {user?.role === 'superadmin' && usersTenantFilter === 0 && (
                  <Td dm={dm}><Badge color="#7c3aed" bg="#ede9fe">{u.tenant_name || `#${u.tenant_id}`}</Badge></Td>
                )}
                <Td dm={dm}>{u.role === 'pro' && u.business_name ? u.business_name : '—'}</Td>
                <Td dm={dm}><FontAwesomeIcon icon={u.is_active ? faCheckCircle : faXmarkCircle} style={{ color: u.is_active ? '#22c55e' : '#ef4444', fontSize: 15 }} /></Td>
                <Td dm={dm}>{u.last_login ? new Date(u.last_login).toLocaleString() : '—'}</Td>
                <Td dm={dm}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <Btn small onClick={() => setEditUser({ id: u.id, email: u.email, role: u.role, firstName: u.first_name, lastName: u.last_name, phone: u.phone, isActive: u.is_active })} title="Edit"><FontAwesomeIcon icon={faPen} /></Btn>
                    <Btn small variant={u.is_active ? 'danger' : 'success'} onClick={() => toggleUser(u.id, u.is_active)} title={u.is_active ? 'Deactivate' : 'Activate'}><FontAwesomeIcon icon={u.is_active ? faToggleOff : faToggleOn} /></Btn>
                    {u.role === 'pro' && <Btn small onClick={() => setCreditAdjust({ proId: u.pro_id || u.id, proName: `${u.first_name||''} ${u.last_name||''}`.trim() || u.email, amount: '', reason: '' })} title="Credits"><FontAwesomeIcon icon={faCubes} /></Btn>}
                    {u.is_active && user?.id !== u.id && <Btn small variant="danger" onClick={() => deleteUser(u.id)}><FontAwesomeIcon icon={faTrash} /></Btn>}
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
          <PaginationBar page={usersPage} total={usersTotal} limit={usersLimit} onPageChange={setUsersPage} dm={dm} />
          </Card>
          </>}

          {/* ── Tenants sub-tab (superadmin only) ── */}
          {usersSubTab === 'tenants' && user?.role === 'superadmin' && <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: tp }}>Tenants ({tenantsTotal})</h3>
            <Btn onClick={() => setNewTenant({ name: '', slug: '', customDomain: '', plan: 'starter', adminEmail: '', adminPassword: '', adminFirstName: '', adminLastName: '' })}>
              <FontAwesomeIcon icon={faPlus} /> New Tenant
            </Btn>
          </div>

          {newTenant && <Card dm={dm} style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: tp, margin: 0 }}>Create New Tenant</h4>
              <Btn small variant="ghost" onClick={() => setShowDomainHelp(true)}>
                Domain Setup Instructions
              </Btn>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Input label="Tenant Name" value={newTenant.name} onChange={v => setNewTenant({...newTenant, name: v})} dm={dm} placeholder="Acme Home Services" />
              <Input label="Slug (unique ID)" value={newTenant.slug} onChange={v => setNewTenant({...newTenant, slug: v.toLowerCase().replace(/\s/g,'-')})} dm={dm} placeholder="acme-home" />
              <Input label="Custom Domain (optional)" value={newTenant.customDomain} onChange={v => setNewTenant({...newTenant, customDomain: v})} dm={dm} placeholder="acmehome.com" />
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>Plan</label>
                <select value={newTenant.plan} onChange={e => setNewTenant({...newTenant, plan: e.target.value})} style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: `1px solid ${dm?'#334155':'#e2e8f0'}`, borderRadius: 'var(--border-radius)', background: dm?'#1e293b':'#f8fafc', color: tp }}>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <Input label="Admin Email" value={newTenant.adminEmail} onChange={v => setNewTenant({...newTenant, adminEmail: v})} dm={dm} type="email" placeholder="admin@acmehome.com" />
              <Input label="Admin Password" value={newTenant.adminPassword} onChange={v => setNewTenant({...newTenant, adminPassword: v})} dm={dm} type="password" />
              <Input label="Admin First Name" value={newTenant.adminFirstName} onChange={v => setNewTenant({...newTenant, adminFirstName: v})} dm={dm} />
              <Input label="Admin Last Name" value={newTenant.adminLastName} onChange={v => setNewTenant({...newTenant, adminLastName: v})} dm={dm} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <Btn onClick={async () => {
                if (!newTenant.name || !newTenant.slug) return flash('Name and slug are required');
                setSaving(true);
                try {
                  const r = await api.post('/superadmin/tenants', { name: newTenant.name, slug: newTenant.slug, customDomain: newTenant.customDomain || undefined, plan: newTenant.plan, adminEmail: newTenant.adminEmail || undefined, adminPassword: newTenant.adminPassword || undefined, adminFirstName: newTenant.adminFirstName, adminLastName: newTenant.adminLastName });
                  if (r.error) { flash(r.error); setSaving(false); return; }
                  flash(`Tenant "${newTenant.name}" created! View page: /#t/${newTenant.slug}`);
                  setNewTenant(null);
                  const d = await api.get(`/superadmin/tenants?page=1&limit=${tenantsLimit}`);
                  setTenants(d.tenants ?? []);
                  setTenantsTotal(d.total ?? 0);
                } catch (e) { flash('Failed to create tenant'); }
                setSaving(false);
              }} disabled={saving}><FontAwesomeIcon icon={faFloppyDisk} />{saving ? 'Creating...' : 'Create Tenant'}</Btn>
              <Btn variant="ghost" onClick={() => setNewTenant(null)}><FontAwesomeIcon icon={faXmark} />Cancel</Btn>
            </div>
          </Card>}

          {editTenant && <Card dm={dm} style={{ padding: 20, marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: tp, marginBottom: 12 }}>Edit Tenant: {editTenant.name}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Input label="Tenant Name" value={editTenant.name||''} onChange={v => setEditTenant({...editTenant, name: v})} dm={dm} />
              <Input label="Custom Domain" value={editTenant.custom_domain||''} onChange={v => setEditTenant({...editTenant, custom_domain: v})} dm={dm} placeholder="client.com" />
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>Status</label>
                <select value={editTenant.status||'active'} onChange={e => setEditTenant({...editTenant, status: e.target.value})} style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: `1px solid ${dm?'#334155':'#e2e8f0'}`, borderRadius: 'var(--border-radius)', background: dm?'#1e293b':'#f8fafc', color: tp }}>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>Plan</label>
                <select value={editTenant.plan||'starter'} onChange={e => setEditTenant({...editTenant, plan: e.target.value})} style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: `1px solid ${dm?'#334155':'#e2e8f0'}`, borderRadius: 'var(--border-radius)', background: dm?'#1e293b':'#f8fafc', color: tp }}>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <Btn onClick={async () => {
                setSaving(true);
                try {
                  await api.patch(`/superadmin/tenants/${editTenant.id}`, { name: editTenant.name, customDomain: editTenant.custom_domain || null, status: editTenant.status, plan: editTenant.plan });
                  setTenants(ts => ts.map(t => t.id === editTenant.id ? { ...t, ...editTenant, custom_domain: editTenant.custom_domain || null } : t));
                  setEditTenant(null);
                  flash('Tenant updated');
                } catch (e) { flash('Failed to update'); }
                setSaving(false);
              }} disabled={saving}><FontAwesomeIcon icon={faFloppyDisk} />{saving ? 'Saving...' : 'Save'}</Btn>
              <Btn variant="ghost" onClick={() => setEditTenant(null)}><FontAwesomeIcon icon={faXmark} />Cancel</Btn>
            </div>
          </Card>}

          <Card dm={dm}>
            <Table headers={['ID','Name','Slug','Domain','Plan','Status','Users','Leads','Created','Actions']} dm={dm}>
              {tenants.map(t => (
                <tr key={t.id} style={{ borderBottom: `1px solid ${border}` }}>
                  <Td dm={dm}>{t.id}</Td>
                  <Td dm={dm} fw={600}>{t.name}</Td>
                  <Td dm={dm}><a href={`/#t/${t.slug}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}><code style={{ fontSize: 11, background: dm?'#1e293b':'#f1f5f9', padding: '2px 6px', borderRadius: 4, color: '#3b82f6', cursor: 'pointer' }}>{t.slug}</code></a></Td>
                  <Td dm={dm}>{t.custom_domain || <span style={{ color: ts, fontSize: 11 }}>none</span>}</Td>
                  <Td dm={dm}><Badge color="#7c3aed" bg="#ede9fe">{t.plan}</Badge></Td>
                  <Td dm={dm}><Badge color={t.status === 'active' ? '#16a34a' : t.status === 'suspended' ? '#dc2626' : '#d97706'} bg={t.status === 'active' ? '#dcfce7' : t.status === 'suspended' ? '#fee2e2' : '#fef9c3'}>{t.status}</Badge></Td>
                  <Td dm={dm}>{t.user_count ?? '—'}</Td>
                  <Td dm={dm}>{t.lead_count ?? '—'}</Td>
                  <Td dm={dm}>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</Td>
                  <Td dm={dm}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Btn small variant="ghost" onClick={() => window.open(`/#t/${t.slug}`, '_blank')} title="View tenant page"><FontAwesomeIcon icon={faEye} /></Btn>
                      <Btn small onClick={() => setEditTenant({...t})}><FontAwesomeIcon icon={faPen} /></Btn>
                      {t.id !== 1 && <Btn small variant="danger" onClick={async () => {
                        if (!confirm(`Suspend tenant "${t.name}"?`)) return;
                        await api.del(`/superadmin/tenants/${t.id}`);
                        setTenants(ts => ts.map(x => x.id === t.id ? {...x, status: 'suspended'} : x));
                        flash('Tenant suspended');
                      }}><FontAwesomeIcon icon={faTrash} /></Btn>}
                    </div>
                  </Td>
                </tr>
              ))}
              {!tenants.length && <tr><td colSpan={10} style={{ padding: 20, textAlign: 'center', color: ts, fontSize: 13 }}>No tenants found</td></tr>}
            </Table>
            <PaginationBar page={tenantsPage} total={tenantsTotal} limit={tenantsLimit} onPageChange={setTenantsPage} dm={dm} />
          </Card>
          </>}
        </>}

        {/* ══════════ LEADS ══════════ */}
        {tab === 'leads' && <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: tp }}>Leads ({leadsTotal})</h3>
            <Btn small variant="ghost" onClick={async () => {
              setSaving(true);
              try {
                const r = await api.post('/admin/run-followups');
                flash(`Follow-ups processed: ${r.processed || 0}`);
              } catch { flash('Follow-up run failed'); }
              setSaving(false);
            }} disabled={saving}>Run Follow-ups</Btn>
          </div>
          <Card dm={dm}><Table headers={['ID','Customer','Service','ZIP','Status','Claimed By','Follow-up','Value','Created','']} dm={dm}>
          {leads.map(l => {
            const fuColors = { none: { bg: '#f1f5f9', color: '#64748b' }, pending: { bg: '#fef9c3', color: '#a16207' }, sent: { bg: '#dbeafe', color: '#2563eb' }, customer_yes: { bg: '#dcfce7', color: '#16a34a' }, customer_no: { bg: '#fee2e2', color: '#dc2626' }, stopped: { bg: '#f1f5f9', color: '#94a3b8' } };
            const fu = fuColors[l.follow_up_status] || fuColors.none;
            return (
            <tr key={l.id} onClick={() => onShowLead && onShowLead(l.id)} style={{ borderBottom: `1px solid ${border}`, cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = dm ? '#1e293b' : '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Td dm={dm}>#{l.id}</Td><Td dm={dm} fw={600}>{l.customer_name||'—'}</Td>
              <Td dm={dm}>{l.service_name}</Td><Td dm={dm}>{l.zip}</Td>
              <Td dm={dm}><Badge color={l.status==='new'?'#2563eb':l.status==='completed'||l.status==='hired'?'#16a34a':l.status==='matched'?'#7c3aed':'#a16207'} bg={l.status==='new'?'#dbeafe':l.status==='completed'||l.status==='hired'?'#dcfce7':l.status==='matched'?'#f3e8ff':'#fef9c3'}>{l.status}</Badge></Td>
              <Td dm={dm}>{l.claimed_by_business ? <span style={{ fontWeight: 600, fontSize: 12 }}>{l.claimed_by_business}</span> : <span style={{ color: ts, fontSize: 12 }}>—</span>}</Td>
              <Td dm={dm}>{l.follow_up_status && l.follow_up_status !== 'none' ? <Badge color={fu.color} bg={fu.bg}>{l.follow_up_status.replace('_', ' ')}</Badge> : '—'}</Td>
              <Td dm={dm} fw={600}>${l.lead_value}</Td>
              <Td dm={dm}>{new Date(l.created_at).toLocaleDateString()}</Td>
              <Td dm={dm}><Btn small variant="ghost" onClick={e => { e.stopPropagation(); onShowLead && onShowLead(l.id); }}>View →</Btn></Td>
            </tr>
            );
          })}
        </Table>
          <PaginationBar page={leadsPage} total={leadsTotal} limit={leadsLimit} onPageChange={setLeadsPage} dm={dm} />
          </Card>
        </>}

        {/* ══════════ PACKAGES ══════════ */}
        {tab === 'packages' && <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: tp }}>Subscription Plans ({plans.length})</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Btn variant="ghost" onClick={async () => {
                setSaving(true);
                try {
                  const r = await api.post('/subscriptions/copy-from-default', {});
                  if (r.error) { flash(r.error); setSaving(false); return; }
                  flash(r.message || (r.copied ? `Copied ${r.copied} plan(s). Add your Stripe Price ID for each.` : 'Done.'));
                  if (r.copied > 0) {
                    const updated = await api.get('/subscriptions/admin-plans?all=true');
                    setPlans(Array.isArray(updated) ? updated : []);
                  }
                } catch (e) { flash(e?.message || 'Copy failed'); }
                setSaving(false);
              }} disabled={saving} title="Other tenants: copy plan structure from default so you only set your own Stripe Price ID. Default tenant: just Edit each plan to set Stripe Price ID.">
                Copy plans from default
              </Btn>
              <Btn onClick={() => setEditPlan({ name: '', slug: '', priceMonthly: 0, priceYearly: 0, leadCredits: 0, maxServiceAreas: 5, maxServices: 3, stripePriceId: '', isPopular: false, isActive: true, sortOrder: plans.length + 1 })}><FontAwesomeIcon icon={faPlus} />Add Plan</Btn>
            </div>
          </div>
          <p style={{ fontSize: 12, color: ts, marginBottom: 14 }}>On the default tenant (e.g. main site): edit each plan to set Stripe Price ID. Other tenants: use &quot;Copy plans from default&quot; then set your Stripe Price ID per plan.</p>

          {editPlan && <Card dm={dm} style={{ padding: 20, marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: tp, marginBottom: 12 }}>{editPlan.id ? 'Edit Plan' : 'New Plan'}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Input label="Name" value={editPlan.name||''} onChange={v => setEditPlan({...editPlan, name: v})} dm={dm} />
              <Input label="Slug" value={editPlan.slug||''} onChange={v => setEditPlan({...editPlan, slug: v})} dm={dm} placeholder="e.g. starter" />
              <Input label="Monthly Price ($)" value={editPlan.priceMonthly||''} onChange={v => setEditPlan({...editPlan, priceMonthly: v})} dm={dm} type="number" />
              <Input label="Yearly Price ($)" value={editPlan.priceYearly||''} onChange={v => setEditPlan({...editPlan, priceYearly: v})} dm={dm} type="number" />
              <Input label="Lead Credits / mo" value={editPlan.leadCredits||''} onChange={v => setEditPlan({...editPlan, leadCredits: v})} dm={dm} type="number" />
              <Input label="Max Service Areas" value={editPlan.maxServiceAreas||''} onChange={v => setEditPlan({...editPlan, maxServiceAreas: v})} dm={dm} type="number" />
              <Input label="Max Services" value={editPlan.maxServices||''} onChange={v => setEditPlan({...editPlan, maxServices: v})} dm={dm} type="number" />
              <Input label="Stripe Price ID" value={editPlan.stripePriceId||''} onChange={v => setEditPlan({...editPlan, stripePriceId: v})} dm={dm} placeholder="price_..." />
              <Input label="Sort Order" value={editPlan.sortOrder||''} onChange={v => setEditPlan({...editPlan, sortOrder: v})} dm={dm} type="number" />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <label style={{ fontSize: 13, color: tp, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!editPlan.isPopular} onChange={e => setEditPlan({...editPlan, isPopular: e.target.checked})} /> Popular badge
              </label>
              <label style={{ fontSize: 13, color: tp, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={editPlan.isActive !== false} onChange={e => setEditPlan({...editPlan, isActive: e.target.checked})} /> Active
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <Btn onClick={savePlan} disabled={saving || !editPlan.name}><FontAwesomeIcon icon={faFloppyDisk} />{saving ? 'Saving...' : 'Save Plan'}</Btn>
              <Btn variant="ghost" onClick={() => setEditPlan(null)}><FontAwesomeIcon icon={faXmark} />Cancel</Btn>
            </div>
          </Card>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            {plans.map(p => (
              <Card key={p.id} dm={dm} style={{ padding: '20px 18px', position: 'relative', border: p.is_popular ? '2px solid var(--color-primary)' : undefined }}>
                {p.is_popular && <span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'var(--color-primary)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 9999, textTransform: 'uppercase' }}>Popular</span>}
                {!p.is_active && <span style={{ position: 'absolute', top: 8, right: 8 }}><Badge color="#ef4444" bg="#fee2e2">Inactive</Badge></span>}
                <h4 style={{ fontSize: 18, fontWeight: 700, color: tp }}>{p.name}</h4>
                <div style={{ fontSize: 26, fontWeight: 800, color: tp, margin: '4px 0' }}>${p.price_monthly}<span style={{ fontSize: 13, fontWeight: 500, color: ts }}>/mo</span></div>
                <div style={{ fontSize: 12, color: ts, marginBottom: 10 }}>{p.price_yearly > 0 ? `$${p.price_yearly}/yr` : 'Free'} · {p.lead_credits} credits · {p.max_service_areas} areas</div>
                <div style={{ fontSize: 11, color: ts, marginBottom: 12 }}>Stripe: {p.stripe_price_id || '—'}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Btn small onClick={() => setEditPlan({ ...p, priceMonthly: p.price_monthly, priceYearly: p.price_yearly, leadCredits: p.lead_credits, maxServiceAreas: p.max_service_areas, maxServices: p.max_services, stripePriceId: p.stripe_price_id, isPopular: !!p.is_popular, isActive: !!p.is_active, sortOrder: p.sort_order })} title="Edit"><FontAwesomeIcon icon={faPen} /></Btn>
                  <Btn small variant="danger" onClick={() => deletePlan(p.id)}><FontAwesomeIcon icon={faTrash} /></Btn>
                </div>
              </Card>
            ))}
          </div>

          {/* Credit bundles (top-up) — same packages shown in Pro Dashboard → Credits tab; Stripe used for payment */}
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${dm ? '#334155' : '#e2e8f0'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: tp }}>Credit bundles (top-up) ({creditBundles.length})</h3>
              <Btn onClick={() => setEditCreditBundle({ label: '', credits: 10, price: 30, price_per_credit: 3, is_active: true, sort_order: creditBundles.length })}><FontAwesomeIcon icon={faPlus} />Add bundle</Btn>
            </div>
            <p style={{ fontSize: 12, color: ts, marginBottom: 14 }}>These are the one-time credit packages Pros see in Dashboard → Credits. Payment is via Stripe when configured.</p>
            {editCreditBundle && (
              <Card dm={dm} style={{ padding: 20, marginBottom: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: tp, marginBottom: 12 }}>{editCreditBundle.id ? 'Edit bundle' : 'New bundle'}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }} className="admin-form-grid-2">
                  <Input label="Label" value={editCreditBundle.label||''} onChange={v => setEditCreditBundle({...editCreditBundle, label: v})} dm={dm} placeholder="e.g. 10 Credits" />
                  <Input label="Credits" value={editCreditBundle.credits??''} onChange={v => setEditCreditBundle({...editCreditBundle, credits: parseInt(v,10)||0})} dm={dm} type="number" />
                  <Input label="Price ($)" value={editCreditBundle.price??''} onChange={v => setEditCreditBundle({...editCreditBundle, price: parseFloat(v)||0})} dm={dm} type="number" />
                  <Input label="Price per credit ($)" value={editCreditBundle.price_per_credit??''} onChange={v => setEditCreditBundle({...editCreditBundle, price_per_credit: parseFloat(v)||0})} dm={dm} type="number" placeholder="Auto from price/credits" />
                  <Input label="Sort order" value={editCreditBundle.sort_order??''} onChange={v => setEditCreditBundle({...editCreditBundle, sort_order: parseInt(v,10)||0})} dm={dm} type="number" />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <Btn onClick={saveCreditBundle} disabled={saving || !editCreditBundle.label}><FontAwesomeIcon icon={faFloppyDisk} />{saving ? 'Saving...' : 'Save'}</Btn>
                  <Btn variant="ghost" onClick={() => setEditCreditBundle(null)}><FontAwesomeIcon icon={faXmark} />Cancel</Btn>
                </div>
              </Card>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {creditBundles.map(b => (
                <Card key={b.id} dm={dm} style={{ padding: '16px 18px' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: tp }}>{b.label}</div>
                  <div style={{ fontSize: 12, color: ts }}>{b.credits} credits · ${Number(b.price).toFixed(2)}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <Btn small onClick={() => setEditCreditBundle({ ...b })} title="Edit"><FontAwesomeIcon icon={faPen} /></Btn>
                    <Btn small variant="danger" onClick={() => deleteCreditBundle(b.id)}><FontAwesomeIcon icon={faTrash} /></Btn>
                  </div>
                </Card>
              ))}
            </div>
            {creditBundles.length === 0 && !editCreditBundle && (
              <p style={{ fontSize: 13, color: ts }}>No credit bundles. Add one above, or run <code style={{ background: dm ? '#334155' : '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>node migrate-credit-bundles.js</code> to seed defaults.</p>
            )}
          </div>
        </>}

        {/* ══════════ CATEGORIES ══════════ */}
        {tab === 'categories' && <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: tp }}>Categories ({categories.length})</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              {tenantId !== 1 && (
                <Btn variant="ghost" onClick={copyCategoriesFromDefault} disabled={copying} title="Copy default account's categories into yours">
                  {copying === 'categories' ? <><FontAwesomeIcon icon={faSpinner} spin /> Copying…</> : <><FontAwesomeIcon icon={faCopy} /> Copy from default</>}
                </Btn>
              )}
              <Btn onClick={() => setEditCat({ name: '', slug: '', iconClass: '', description: '', tags: '', sortOrder: categories.length + 1 })}><FontAwesomeIcon icon={faPlus} />Add Category</Btn>
            </div>
          </div>
          {editCat && <Card dm={dm} style={{ padding: 20, marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: tp, marginBottom: 12 }}>{editCat.id ? 'Edit Category' : 'New Category'}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Input label="Name" value={editCat.name||''} onChange={v => setEditCat({...editCat, name: v})} dm={dm} />
              <Input label="Slug" value={editCat.slug||''} onChange={v => setEditCat({...editCat, slug: v})} dm={dm} />
              <Input label="Icon Class" value={editCat.iconClass||editCat.icon_class||''} onChange={v => setEditCat({...editCat, iconClass: v})} dm={dm} placeholder="e.g. faWrench" />
              <Input label="Sort Order" value={editCat.sortOrder||editCat.sort_order||''} onChange={v => setEditCat({...editCat, sortOrder: v})} dm={dm} type="number" />
              <div style={{ gridColumn: '1 / -1' }}>
              <Input label="Tags" value={editCat.tags||''} onChange={v => setEditCat({...editCat, tags: v})} dm={dm} placeholder="Comma-separated, e.g. plumbing, repair" />
            </div>
            </div>
            <Input label="Description" value={editCat.description||''} onChange={v => setEditCat({...editCat, description: v})} dm={dm} multiline />
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={saveCat} disabled={saving || !editCat.name}><FontAwesomeIcon icon={faFloppyDisk} />Save</Btn>
              <Btn variant="ghost" onClick={() => setEditCat(null)}><FontAwesomeIcon icon={faXmark} />Cancel</Btn>
            </div>
          </Card>}
          <div style={{ display: 'grid', gap: 12 }}>
            {categories.map(c => (
              <Card key={c.id} dm={dm} style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: tp }}>{c.name}</h4>
                    <p style={{ fontSize: 12, color: ts }}>/{c.slug} · {c.icon_class} · {c.services?.length || 0} services {c.tags ? `· ${c.tags}` : ''}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Btn small onClick={() => setEditCat({ ...c, iconClass: c.icon_class, sortOrder: c.sort_order, tags: c.tags || '' })}><FontAwesomeIcon icon={faPen} /></Btn>
                    {tenantId !== 1 && <Btn small variant="danger" onClick={() => deleteCat(c.id)}><FontAwesomeIcon icon={faTrash} /></Btn>}
                  </div>
                </div>
                {c.services?.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {c.services.map(s => <span key={s.id} style={{ padding: '3px 10px', borderRadius: 9999, fontSize: 11, background: dm ? '#334155' : '#f1f5f9', color: tp }}>{s.name}</span>)}
                </div>}
              </Card>
            ))}
          </div>
        </>}

        {/* ══════════ SERVICES ══════════ */}
        {tab === 'services' && <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: tp }}>Services ({services.length})</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              {tenantId !== 1 && (
                <Btn variant="ghost" onClick={copyServicesFromDefault} disabled={copying} title="Copy default account's services into yours (copy categories first to match)">
                  {copying === 'services' ? <><FontAwesomeIcon icon={faSpinner} spin /> Copying…</> : <><FontAwesomeIcon icon={faCopy} /> Copy from default</>}
                </Btn>
              )}
              <Btn onClick={() => setEditSvc({ categoryId: categories[0]?.id, name: '', slug: '', iconClass: '', cardImageUrl: '', minPrice: '', priceUnit: 'per job' })}><FontAwesomeIcon icon={faPlus} />Add Service</Btn>
            </div>
          </div>
          {editSvc && <Card dm={dm} style={{ padding: 20, marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: tp, marginBottom: 12 }}>{editSvc.id ? 'Edit Service' : 'New Service'}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Input label="Name" value={editSvc.name||''} onChange={v => setEditSvc({...editSvc, name: v})} dm={dm} />
              <Input label="Slug" value={editSvc.slug||''} onChange={v => setEditSvc({...editSvc, slug: v})} dm={dm} />
              <Input label="Icon Class" value={editSvc.iconClass||editSvc.icon_class||''} onChange={v => setEditSvc({...editSvc, iconClass: v})} dm={dm} placeholder="faWrench (used when no card image)" />
              <Input label="Card image URL" value={editSvc.cardImageUrl||editSvc.card_image_url||''} onChange={v => setEditSvc({...editSvc, cardImageUrl: v})} dm={dm} placeholder="https://... (optional; overrides icon on browse cards)" />
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>Category</label>
                <select value={editSvc.categoryId||editSvc.category_id||''} onChange={e => setEditSvc({...editSvc, categoryId: parseInt(e.target.value)})}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: `1px solid ${dm?'#334155':'#e2e8f0'}`, borderRadius: 'var(--border-radius)', background: dm?'#1e293b':'#f8fafc', color: tp }}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <Input label="Min Price" value={editSvc.minPrice||editSvc.min_price||''} onChange={v => setEditSvc({...editSvc, minPrice: v})} dm={dm} placeholder="from $150" />
              <Input label="Price Unit" value={editSvc.priceUnit||editSvc.price_unit||'per job'} onChange={v => setEditSvc({...editSvc, priceUnit: v})} dm={dm} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={saveSvc} disabled={saving || !editSvc.name || !editSvc.slug}><FontAwesomeIcon icon={faFloppyDisk} />Save</Btn>
              <Btn variant="ghost" onClick={() => setEditSvc(null)}><FontAwesomeIcon icon={faXmark} />Cancel</Btn>
            </div>
          </Card>}
          <Card dm={dm}><Table headers={['ID','Name','Slug','Icon / Image','Category','Rating','Reviews','Price','Active','Actions']} dm={dm}>
            {services.map(s => (
              <tr key={s.id} style={{ borderBottom: `1px solid ${border}` }}>
                <Td dm={dm}>#{s.id}</Td>
                <Td dm={dm} fw={600}>{s.name}</Td>
                <Td dm={dm}>{s.slug}</Td>
                <Td dm={dm}>{s.card_image_url ? <span title={s.card_image_url}>Image</span> : s.icon_class}</Td>
                <Td dm={dm}>{s.category_name||'—'}</Td>
                <Td dm={dm}><FontAwesomeIcon icon={faStar} style={{ color: '#facc15', marginRight: 4, fontSize: 11 }} />{s.avg_rating}</Td>
                <Td dm={dm}>{s.review_label || s.review_count}</Td>
                <Td dm={dm}>{s.min_price}</Td>
                <Td dm={dm}><FontAwesomeIcon icon={s.is_active ? faCheckCircle : faXmarkCircle} style={{ color: s.is_active ? '#22c55e' : '#ef4444' }} /></Td>
                <Td dm={dm}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Btn small onClick={() => setEditSvc({ ...s, categoryId: s.category_id, iconClass: s.icon_class, minPrice: s.min_price, priceUnit: s.price_unit })}><FontAwesomeIcon icon={faPen} /></Btn>
                    {tenantId !== 1 && <Btn small variant="danger" onClick={() => deleteSvc(s.id)}><FontAwesomeIcon icon={faTrash} /></Btn>}
                  </div>
                </Td>
              </tr>
            ))}
          </Table></Card>
        </>}

        {/* ══════════ REVIEWS ══════════ */}
        {tab === 'reviews' && <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: tp, fontSize: 18 }}>
              <FontAwesomeIcon icon={faStar} style={{ marginRight: 8, color: '#facc15' }} />
              Reviews ({reviewsTotal})
            </h3>
            <select value={reviewFilter} onChange={e => { setReviewFilter(e.target.value); setReviewsPage(1); }}
              style={{ padding: '6px 12px', fontSize: 12, borderRadius: 'var(--border-radius)', border: `1px solid ${border}`, background: dm ? '#1e293b' : '#fff', color: tp }}>
              <option value="">All Reviews</option>
              <option value="true">Public</option>
              <option value="false">Hidden</option>
            </select>
          </div>
          <Card dm={dm}><Table headers={['ID','Customer','Provider','Service','Rating','Title','Public','Verified','Date','Actions']} dm={dm}>
            {reviews.map(r => (
              <tr key={r.id}>
                <Td dm={dm}>{r.id}</Td>
                <Td dm={dm}>{r.customer_name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.reviewer_email || '—'}</Td>
                <Td dm={dm}>{r.business_name || '—'}</Td>
                <Td dm={dm}>{r.service_name || '—'}</Td>
                <Td dm={dm}>
                  <span style={{ display: 'inline-flex', gap: 1 }}>
                    {[1,2,3,4,5].map(n => <FontAwesomeIcon key={n} icon={faStar} style={{ fontSize: 10, color: n <= r.rating ? '#facc15' : (dm ? '#334155' : '#d1d5db') }} />)}
                  </span>
                </Td>
                <Td dm={dm}>
                  <div style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.body || ''}>
                    {r.title || (r.body ? r.body.slice(0, 60) + (r.body.length > 60 ? '…' : '') : '—')}
                  </div>
                </Td>
                <Td dm={dm}>
                  <button onClick={async () => {
                    await api.patch(`/reviews/${r.id}`, { is_public: !r.is_public });
                    setReviews(prev => prev.map(rv => rv.id === r.id ? { ...rv, is_public: !rv.is_public } : rv));
                    flash(r.is_public ? 'Review hidden' : 'Review published');
                    window.dispatchEvent(new CustomEvent('app:data-updated'));
                  }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: r.is_public ? '#22c55e' : '#ef4444', fontSize: 16 }} title={r.is_public ? 'Click to hide' : 'Click to publish'}>
                    <FontAwesomeIcon icon={r.is_public ? faToggleOn : faToggleOff} />
                  </button>
                </Td>
                <Td dm={dm}>
                  {r.is_verified ? <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#22c55e' }} /> : <FontAwesomeIcon icon={faXmarkCircle} style={{ color: ts }} />}
                </Td>
                <Td dm={dm}>{new Date(r.created_at).toLocaleDateString()}</Td>
                <Td dm={dm}>
                  <Btn small variant="danger" onClick={async () => {
                    if (!confirm('Delete this review permanently?')) return;
                    await api.del(`/reviews/${r.id}`);
                    setReviews(prev => prev.filter(rv => rv.id !== r.id));
                    setReviewsTotal(t => t - 1);
                    flash('Review deleted');
                  }}><FontAwesomeIcon icon={faTrash} /></Btn>
                </Td>
              </tr>
            ))}
          </Table>
          <PaginationBar page={reviewsPage} total={reviewsTotal} limit={reviewsLimit} onPageChange={setReviewsPage} dm={dm} />
          </Card>
        </>}

        {/* ══════════ PAGES (CMS + Homepage Steps) ══════════ */}
        {tab === 'pages' && <>
          {/* Sub-menu: CMS Pages | Homepage Steps (superadmin only); tenant admins see only Steps */}
          {isSuperAdmin && (
          <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: dm ? '#111827' : '#e2e8f0', borderRadius: 'var(--border-radius)', padding: 4, border: `1px solid ${border}` }}>
            {pagesSubTabs.map(st => (
              <button key={st.key} onClick={() => setPagesSubTab(st.key)} style={{
                padding: '8px 16px', fontSize: 12, fontWeight: 600, borderRadius: 'var(--border-radius)',
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
                background: pagesSubTab === st.key ? 'var(--color-primary)' : 'transparent',
                color: pagesSubTab === st.key ? '#fff' : ts,
              }}><FontAwesomeIcon icon={st.icon} style={{ fontSize: 11 }} />{st.label}</button>
            ))}
          </div>
          )}

          {isSuperAdmin && pagesSubTab === 'list' && <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: tp }}>CMS Pages ({pages.length})</h3>
            <Btn onClick={() => setEditPage({ slug: '', title: '', content: '', metaTitle: '', metaDesc: '', status: 'draft', showInNav: true, navOrder: pages.length + 1, navGroup: 'company' })}><FontAwesomeIcon icon={faPlus} />New Page</Btn>
          </div>

          {editPage && <Card dm={dm} style={{ padding: 20, marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: tp, marginBottom: 12 }}>{editPage.id ? `Edit: ${editPage.title}` : 'New Page'}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Input label="Title" value={editPage.title||''} onChange={v => setEditPage({...editPage, title: v})} dm={dm} />
              <Input label="Slug" value={editPage.slug||''} onChange={v => setEditPage({...editPage, slug: v})} dm={dm} placeholder="e.g. about-us" />
              <Input label="Meta Title" value={editPage.metaTitle||editPage.meta_title||''} onChange={v => setEditPage({...editPage, metaTitle: v})} dm={dm} />
              <Input label="Meta Description" value={editPage.metaDesc||editPage.meta_desc||''} onChange={v => setEditPage({...editPage, metaDesc: v})} dm={dm} />
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: dm ? '#94a3b8' : '#64748b', marginBottom: 4 }}>Status</label>
                <select value={editPage.status||'draft'} onChange={e => setEditPage({...editPage, status: e.target.value})} style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: `1px solid ${dm?'#334155':'#e2e8f0'}`, borderRadius: 'var(--border-radius)', background: dm?'#1e293b':'#f8fafc', color: tp }}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: dm ? '#94a3b8' : '#64748b', marginBottom: 4 }}>Nav Group</label>
                <select value={editPage.navGroup||editPage.nav_group||'company'} onChange={e => setEditPage({...editPage, navGroup: e.target.value})} style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: `1px solid ${dm?'#334155':'#e2e8f0'}`, borderRadius: 'var(--border-radius)', background: dm?'#1e293b':'#f8fafc', color: tp }}>
                  <option value="company">Company</option>
                  <option value="pros">For Pros</option>
                  <option value="legal">Legal</option>
                  <option value="support">Support</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: tp, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={editPage.showInNav ?? editPage.show_in_nav ?? true} onChange={e => setEditPage({...editPage, showInNav: e.target.checked})} /> Show in footer nav
              </label>
              <Input label="Nav Order" value={editPage.navOrder||editPage.nav_order||''} onChange={v => setEditPage({...editPage, navOrder: parseInt(v)||0})} dm={dm} type="number" />
            </div>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: dm ? '#94a3b8' : '#64748b', marginBottom: 6 }}>Content</label>
            <RichTextEditor value={editPage.content||''} onChange={v => setEditPage({...editPage, content: v})} darkMode={dm} minHeight={320} />

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <Btn onClick={async () => {
                setSaving(true);
                const payload = { slug: editPage.slug, title: editPage.title, content: editPage.content, metaTitle: editPage.metaTitle || editPage.meta_title, metaDesc: editPage.metaDesc || editPage.meta_desc, status: editPage.status, showInNav: editPage.showInNav ?? editPage.show_in_nav, navOrder: editPage.navOrder || editPage.nav_order || 0, navGroup: editPage.navGroup || editPage.nav_group };
                if (editPage.id) {
                  await api.put(`/pages/${editPage.id}`, payload);
                  setPages(ps => ps.map(p => p.id === editPage.id ? { ...p, ...payload, show_in_nav: payload.showInNav, nav_order: payload.navOrder, nav_group: payload.navGroup, meta_title: payload.metaTitle, meta_desc: payload.metaDesc } : p));
                } else {
                  const r = await api.post('/pages', payload);
                  setPages(ps => [...ps, { ...payload, id: r.id, show_in_nav: payload.showInNav, nav_order: payload.navOrder, nav_group: payload.navGroup, updated_at: new Date().toISOString() }]);
                }
                setEditPage(null); setSaving(false); flash('Page saved!');
                window.dispatchEvent(new CustomEvent('app:data-updated'));
              }} disabled={saving || !editPage.title || !editPage.slug}><FontAwesomeIcon icon={faFloppyDisk} />{saving ? 'Saving...' : 'Save Page'}</Btn>
              <Btn variant="ghost" onClick={() => setEditPage(null)}><FontAwesomeIcon icon={faXmark} />Cancel</Btn>
            </div>
          </Card>}

          <p style={{ fontSize: 12, color: ts, marginBottom: 12 }}>
            Terms of Service and Copyright are linked from the site footer. Create pages with slugs <code style={{ background: dm ? '#334155' : '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>terms</code> and <code style={{ background: dm ? '#334155' : '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>copyright</code> (Legal group) to edit them.
          </p>
          <Card dm={dm}><Table headers={['','Title','Slug','Group','Status','Updated','Actions']} dm={dm}>
            {pages.slice((pagesPage - 1) * pagesLimit, pagesPage * pagesLimit).map(p => (
              <tr key={p.id} style={{ borderBottom: `1px solid ${border}` }}>
                <Td dm={dm}><FontAwesomeIcon icon={faFileLines} style={{ color: p.status === 'published' ? '#22c55e' : p.status === 'draft' ? '#f59e0b' : '#94a3b8', fontSize: 14 }} /></Td>
                <Td dm={dm} fw={600}>{p.title}</Td>
                <Td dm={dm}>/{p.slug}</Td>
                <Td dm={dm}><Badge color={p.nav_group==='legal'?'#dc2626':p.nav_group==='pros'?'#f59e0b':'#3b82f6'} bg={p.nav_group==='legal'?'#fee2e2':p.nav_group==='pros'?'#fef3c7':'#dbeafe'}>{p.nav_group}</Badge></Td>
                <Td dm={dm}><Badge color={p.status==='published'?'#16a34a':p.status==='draft'?'#a16207':'#6b7280'} bg={p.status==='published'?'#dcfce7':p.status==='draft'?'#fef9c3':'#f1f5f9'}>{p.status}</Badge></Td>
                <Td dm={dm}>{p.updated_at ? new Date(p.updated_at).toLocaleDateString() : '—'}</Td>
                <Td dm={dm}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Btn small onClick={async () => {
                      const full = await api.get(`/pages/${p.slug}`);
                      setEditPage({ ...full, metaTitle: full.meta_title, metaDesc: full.meta_desc, navGroup: full.nav_group, navOrder: full.nav_order, showInNav: !!full.show_in_nav });
                    }}><FontAwesomeIcon icon={faPen} /></Btn>
                    <Btn small variant="ghost" onClick={() => window.open(`/#page/${p.slug}`, '_blank')}><FontAwesomeIcon icon={faEye} /></Btn>
                    <Btn small variant="danger" onClick={async () => {
                      if (!confirm(`Delete "${p.title}"?`)) return;
                      await api.del(`/pages/${p.id}`);
                      setPages(ps => ps.filter(x => x.id !== p.id));
                      flash('Page deleted');
                    }}><FontAwesomeIcon icon={faTrash} /></Btn>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
          <PaginationBar page={pagesPage} total={pages.length} limit={pagesLimit} onPageChange={setPagesPage} dm={dm} />
          </Card>
          </>}

          {(pagesSubTab === 'steps' || !isSuperAdmin) && <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: tp }}>Homepage “How it works” steps</h3>
              <p style={{ fontSize: 13, color: ts, marginTop: 4 }}>Edit the steps shown for homeowners and for professionals on your tenant homepage.</p>
            </div>
            <Btn onClick={loadSteps} disabled={stepsLoading} variant="ghost" small>
              {stepsLoading ? <><FontAwesomeIcon icon={faSpinner} spin /> Loading…</> : <>Refresh</>}
            </Btn>
          </div>
          {stepsLoading && steps.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: ts }}><FontAwesomeIcon icon={faSpinner} spin /> Loading steps…</div>
          )}
          {editStep && <Card dm={dm} style={{ padding: 20, marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: tp, marginBottom: 12 }}>Edit step — {editStep.audience === 'pro' ? 'For professionals' : 'For homeowners'}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Input label="Step number" value={String(editStep.step_number ?? '')} onChange={v => setEditStep({ ...editStep, step_number: parseInt(v) || 1 })} dm={dm} type="number" />
              <Input label="Icon class" value={editStep.icon_class ?? ''} onChange={v => setEditStep({ ...editStep, icon_class: v })} dm={dm} placeholder="e.g. faClipboardList" />
            </div>
            <Input label="Title" value={editStep.title ?? ''} onChange={v => setEditStep({ ...editStep, title: v })} dm={dm} />
            <Input label="Description" value={editStep.description ?? ''} onChange={v => setEditStep({ ...editStep, description: v })} dm={dm} multiline />
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={saveStep} disabled={saving || !editStep.title}><FontAwesomeIcon icon={faFloppyDisk} />Save</Btn>
              <Btn variant="ghost" onClick={() => setEditStep(null)}><FontAwesomeIcon icon={faXmark} />Cancel</Btn>
            </div>
          </Card>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <Card dm={dm} style={{ padding: 18 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: ts, marginBottom: 12, textTransform: 'uppercase' }}>For homeowners</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {steps.filter(s => s.audience === 'consumer').map(step => (
                  <div key={step.id} style={{ padding: 12, background: dm ? '#1e293b' : '#f8fafc', borderRadius: 'var(--border-radius)', border: `1px solid ${border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: ts }}>Step {step.step_number}</span>
                        <div style={{ fontWeight: 600, color: tp, marginTop: 2 }}>{step.title}</div>
                        <p style={{ fontSize: 12, color: ts, marginTop: 4, marginBottom: 0 }}>{step.description?.slice(0, 80)}{step.description?.length > 80 ? '…' : ''}</p>
                      </div>
                      <Btn small onClick={() => setEditStep({ ...step })}><FontAwesomeIcon icon={faPen} /></Btn>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card dm={dm} style={{ padding: 18 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: ts, marginBottom: 12, textTransform: 'uppercase' }}>For professionals</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {steps.filter(s => s.audience === 'pro').map(step => (
                  <div key={step.id} style={{ padding: 12, background: dm ? '#1e293b' : '#f8fafc', borderRadius: 'var(--border-radius)', border: `1px solid ${border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: ts }}>Step {step.step_number}</span>
                        <div style={{ fontWeight: 600, color: tp, marginTop: 2 }}>{step.title}</div>
                        <p style={{ fontSize: 12, color: ts, marginTop: 4, marginBottom: 0 }}>{step.description?.slice(0, 80)}{step.description?.length > 80 ? '…' : ''}</p>
                      </div>
                      <Btn small onClick={() => setEditStep({ ...step })}><FontAwesomeIcon icon={faPen} /></Btn>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          </>}
        </>}

        {/* ══════════ TEMPLATES ══════════ */}
        {tab === 'templates' && isSuperAdmin && <>
          {editTmpl ? (
            <Card dm={dm} style={{ padding: '24px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: tp, margin: 0 }}>
                  <FontAwesomeIcon icon={editTmpl.channel === 'sms' ? faCommentSms : faEnvelopeOpenText} style={{ marginRight: 8 }} />
                  Edit: {editTmpl.name}
                </h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn small variant="ghost" onClick={() => { setEditTmpl(null); setTmplPreview(null); }}>
                    <FontAwesomeIcon icon={faXmark} /> Cancel
                  </Btn>
                </div>
              </div>

              <div style={{ marginBottom: 14, padding: '10px 14px', background: dm ? '#1e293b' : '#f0f4f8', borderRadius: 8, fontSize: 12, color: ts }}>
                <strong>Channel:</strong> {editTmpl.channel.toUpperCase()} &nbsp;|&nbsp;
                <strong>Slug:</strong> <code style={{ background: dm ? '#334155' : '#e2e8f0', padding: '1px 6px', borderRadius: 4 }}>{editTmpl.slug}</code> &nbsp;|&nbsp;
                <strong>Variables:</strong> {editTmpl.variables || 'none'}
              </div>

              <div style={{ display: 'grid', gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>Template Name</label>
                  <input value={editTmpl.name || ''} onChange={e => setEditTmpl({ ...editTmpl, name: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: `1px solid ${dm ? '#334155' : '#e2e8f0'}`, borderRadius: 'var(--border-radius)', background: dm ? '#1e293b' : '#f8fafc', color: tp, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                {editTmpl.channel === 'email' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>Subject Line</label>
                    <input value={editTmpl.subject || ''} onChange={e => setEditTmpl({ ...editTmpl, subject: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: `1px solid ${dm ? '#334155' : '#e2e8f0'}`, borderRadius: 'var(--border-radius)', background: dm ? '#1e293b' : '#f8fafc', color: tp, outline: 'none', boxSizing: 'border-box' }}
                      placeholder="Use {{variable}} for dynamic values" />
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>
                    {editTmpl.channel === 'email' ? 'HTML Body' : 'SMS Body'}
                  </label>
                  <textarea value={editTmpl.body || ''} onChange={e => setEditTmpl({ ...editTmpl, body: e.target.value })}
                    rows={editTmpl.channel === 'sms' ? 8 : 16}
                    style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: `1px solid ${dm ? '#334155' : '#e2e8f0'}`, borderRadius: 'var(--border-radius)', background: dm ? '#0f172a' : '#fff', color: tp, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace', resize: 'vertical', lineHeight: 1.6 }}
                    placeholder="Use {{variable}} for dynamic values, {{#var}}...{{/var}} for conditionals" />
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: tp }}>
                    <input type="checkbox" checked={editTmpl.is_active !== false && editTmpl.is_active !== 0}
                      onChange={e => setEditTmpl({ ...editTmpl, is_active: e.target.checked })} />
                    Active — {editTmpl.is_active ? 'This notification will be sent' : 'This notification is disabled'}
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Btn onClick={async () => {
                  setSaving(true);
                  await api.put(`/templates/${editTmpl.slug}`, {
                    name: editTmpl.name, subject: editTmpl.subject,
                    body: editTmpl.body, is_active: editTmpl.is_active,
                  });
                  setTemplates(ts => ts.map(t => t.slug === editTmpl.slug ? { ...t, ...editTmpl } : t));
                  setSaving(false); setEditTmpl(null); setTmplPreview(null); flash('Template saved!');
                  window.dispatchEvent(new CustomEvent('app:data-updated'));
                }} disabled={saving}>
                  <FontAwesomeIcon icon={faFloppyDisk} /> {saving ? 'Saving...' : 'Save Template'}
                </Btn>
                <Btn variant="ghost" onClick={async () => {
                  const r = await api.post(`/templates/${editTmpl.slug}/preview`, { variables: {} });
                  setTmplPreview(r);
                }}>
                  <FontAwesomeIcon icon={faEye} /> Preview
                </Btn>
              </div>

              {tmplPreview && (
                <div style={{ marginTop: 16, border: `1px solid ${dm ? '#334155' : '#e2e8f0'}`, borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ padding: '8px 14px', background: dm ? '#1e293b' : '#f0f4f8', fontSize: 12, fontWeight: 600, color: ts, borderBottom: `1px solid ${dm ? '#334155' : '#e2e8f0'}` }}>
                    Preview ({tmplPreview.channel?.toUpperCase()})
                    {tmplPreview.subject && <span style={{ fontWeight: 400, marginLeft: 8 }}>Subject: {tmplPreview.subject}</span>}
                  </div>
                  {tmplPreview.channel === 'sms' ? (
                    <div style={{ padding: 16, background: dm ? '#0f172a' : '#fff', whiteSpace: 'pre-wrap', fontSize: 14, color: tp, lineHeight: 1.6 }}>
                      {tmplPreview.body}
                    </div>
                  ) : (
                    <div style={{ padding: 0, background: '#fff' }}>
                      <iframe srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;font-family:-apple-system,sans-serif;}</style></head><body>${tmplPreview.body}</body></html>`}
                        style={{ width: '100%', height: 400, border: 'none' }} title="Email Preview" />
                    </div>
                  )}
                </div>
              )}
            </Card>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: tp, margin: 0 }}>Notification Templates ({templates.length})</h3>
              </div>

              {['email', 'sms'].map(channel => {
                const channelTmpls = templates.filter(t => t.channel === channel);
                if (!channelTmpls.length) return null;
                return (
                  <Card key={channel} dm={dm} style={{ padding: '20px 22px', marginBottom: 16 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: tp, marginTop: 0, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FontAwesomeIcon icon={channel === 'sms' ? faCommentSms : faEnvelopeOpenText} style={{ opacity: 0.5 }} />
                      {channel === 'sms' ? 'SMS Templates' : 'Email Templates'}
                      <Badge color={channel === 'sms' ? '#16a34a' : '#3b82f6'} bg={channel === 'sms' ? '#dcfce7' : '#dbeafe'}>{channelTmpls.length}</Badge>
                    </h4>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {channelTmpls.map(t => (
                        <div key={t.slug} style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                          border: `1px solid ${dm ? '#334155' : '#e2e8f0'}`, borderRadius: 8,
                          background: dm ? '#0f172a' : '#fafafa',
                          opacity: t.is_active ? 1 : 0.5,
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: tp, marginBottom: 2 }}>{t.name}</div>
                            <div style={{ fontSize: 12, color: ts }}>
                              {t.description || ''}
                              {t.subject && <span style={{ marginLeft: 8, opacity: 0.7 }}>Subject: {t.subject}</span>}
                            </div>
                            <div style={{ fontSize: 11, color: ts, marginTop: 2, opacity: 0.6 }}>
                              Variables: {t.variables || 'none'} &nbsp;|&nbsp;
                              {t.is_active ? '✓ Active' : '✗ Inactive'}
                            </div>
                          </div>
                          <Btn small onClick={() => { setEditTmpl({ ...t }); setTmplPreview(null); }}>
                            <FontAwesomeIcon icon={faPen} /> Edit
                          </Btn>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </>
          )}
        </>}

        {/* ══════════ SETTINGS ══════════ */}
        {tab === 'settings' && <>
          {/* Settings section tabs */}
          {(() => {
            const hasDynamicSections = (() => {
              try {
                const v = settings.find(s => s.setting_key === 'homepage_sections')?.setting_value;
                if (v == null) return false;
                const arr = typeof v === 'string' ? JSON.parse(v) : v;
                return Array.isArray(arr) && arr.length > 0;
              } catch { return false; }
            })();
            const visibleGroups = settingGroups.filter(g => {
              if (g.key === 'chat' || g.key === 'legal') return true;
              if (g.key === 'sections') return settings.some(s => s.setting_key === 'homepage_sections');
              const groupSettings = settings.filter(s => s.setting_group === g.key);
              const displaySettings = g.key === 'homepage'
                ? groupSettings.filter(s => {
                    if (s.setting_key === 'homepage_sections') return false;
                    if (!hasDynamicSections) return true;
                    if (/^show_section[2-7]$/.test(s.setting_key)) return false;
                    if (/^section[2-7]_(headline|body|list|steps)$/.test(s.setting_key)) return false;
                    return true;
                  })
                : g.key === 'advanced' && !isSuperAdmin
                  ? groupSettings.filter(s => s.setting_key !== 'openai_api_key')
                  : groupSettings;
              return displaySettings.length > 0;
            });
            const settingsTabs = [{ key: 'setup', label: 'Quick setup', icon: faBolt }, ...visibleGroups];
            return (
              <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: dm ? '#111827' : '#f8fafc', borderRadius: 'var(--border-radius)', padding: 4, border: `1px solid ${border}`, overflowX: 'auto', flexWrap: 'wrap' }}>
                {settingsTabs.map(st => (
                  <button key={st.key} onClick={() => setSettingsSubTab(st.key)} style={{
                    padding: '8px 14px', fontSize: 12, fontWeight: 600, borderRadius: 'var(--border-radius)',
                    border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
                    background: settingsSubTab === st.key ? 'var(--color-primary)' : 'transparent',
                    color: settingsSubTab === st.key ? '#fff' : ts,
                  }}>
                    <FontAwesomeIcon icon={st.icon} style={{ fontSize: 11 }} />{st.label}
                  </button>
                ))}
              </div>
            );
          })()}

          {settingsSubTab === 'setup' && (
          <Card dm={dm} id="settings-section-setup" style={{ padding: '20px 22px', marginBottom: 16, scrollMarginTop: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: tp, marginBottom: 8 }}>
              Quick setup
            </h3>
            <p style={{ fontSize: 13, color: ts, marginBottom: 16 }}>
              Apply a template to populate your homepage content and How it works steps in one click.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ minWidth: 180 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>Template</label>
                <select
                  value={setupTemplates.length ? setupTemplateId : ''}
                  onChange={(e) => setSetupTemplateId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: 13,
                    border: `1px solid ${dm ? '#334155' : '#e2e8f0'}`,
                    borderRadius: 'var(--border-radius)',
                    background: dm ? '#1e293b' : '#fff',
                    color: tp,
                    outline: 'none',
                  }}
                >
                  {!setupTemplates.length && (
                    <option value="">Loading templates…</option>
                  )}
                  {setupTemplates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              {setupTemplateId === 'custom' && (
                <div style={{ minWidth: 180 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>Your service name</label>
                  <input
                    type="text"
                    value={setupCustomService}
                    onChange={(e) => setSetupCustomService(e.target.value)}
                    placeholder="e.g. Landscaping, Pool repair"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: 13,
                      border: `1px solid ${dm ? '#334155' : '#e2e8f0'}`,
                      borderRadius: 'var(--border-radius)',
                      background: dm ? '#1e293b' : '#fff',
                      color: tp,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}
              <Btn
                onClick={async () => {
                  if (setupTemplateId === 'custom' && !setupCustomService.trim()) {
                    flash('Enter a service name for Custom template');
                    return;
                  }
                  if (!confirm('This will replace your current homepage content and How it works steps. Continue?')) return;
                  setSetupApplying(true);
                  try {
                    const body = setupTemplateId === 'custom'
                      ? { templateId: 'custom', customService: setupCustomService.trim() }
                      : { templateId: setupTemplateId };
                    const res = await api.post('/settings/apply-setup-template', body);
                    flash(res?.message || 'Template applied');
                    window.dispatchEvent(new CustomEvent('app:settings-updated'));
                    api.get('/settings/all').then((st) => { if (Array.isArray(st)) setSettings(st); }).catch(() => {});
                    if (tab === 'pages' || steps.length >= 0) {
                      api.get('/admin/how-it-works').then((data) => { if (Array.isArray(data)) setSteps(data); }).catch(() => {});
                    }
                  } catch (err) {
                    flash(err?.error || err?.message || 'Failed to apply template');
                  } finally {
                    setSetupApplying(false);
                  }
                }}
                disabled={setupApplying || (setupTemplateId === 'custom' && !setupCustomService.trim())}
              >
                {setupApplying ? <><FontAwesomeIcon icon={faSpinner} spin /> Applying…</> : 'Apply template'}
              </Btn>
            </div>
          </Card>
          )}

          {settingGroups.map(g => {
            const groupSettings = settings.filter(s => s.setting_group === g.key);
            const hasDynamicSections = (() => {
              try {
                const v = settings.find(s => s.setting_key === 'homepage_sections')?.setting_value;
                if (v == null) return false;
                const arr = typeof v === 'string' ? JSON.parse(v) : v;
                return Array.isArray(arr) && arr.length > 0;
              } catch { return false; }
            })();
            const displaySettings = g.key === 'homepage'
              ? groupSettings.filter(s => {
                  if (s.setting_key === 'homepage_sections') return false;
                  if (!hasDynamicSections) return true;
                  if (/^show_section[2-7]$/.test(s.setting_key)) return false;
                  if (/^section[2-7]_(headline|body|list|steps)$/.test(s.setting_key)) return false;
                  return true;
                })
              : g.key === 'advanced' && !isSuperAdmin
                ? groupSettings.filter(s => s.setting_key !== 'openai_api_key')
                : groupSettings;
            const showCard = g.key === 'chat' || (g.key === 'sections' ? settings.some(s => s.setting_key === 'homepage_sections') : displaySettings.length > 0);
            if (!showCard || g.key !== settingsSubTab) return null;
            const border = dm ? '#334155' : '#e2e8f0';
            const inputStyle = { width: '100%', padding: '10px 12px', fontSize: 13, border: `1px solid ${border}`, borderRadius: 8, background: dm ? '#1e293b' : '#fff', color: tp, outline: 'none', boxSizing: 'border-box' };
            return (
              <Card key={g.key} id={`settings-section-${g.key}`} dm={dm} style={{ padding: '20px 22px', marginBottom: 16, scrollMarginTop: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: tp }}>
                    <FontAwesomeIcon icon={g.icon} style={{ marginRight: 8, opacity: 0.5, fontSize: 13 }} />
                    {g.label} Settings
                  </h3>
                  <Btn small onClick={async () => {
                    if (g.key === 'chat') {
                      setSaving(true);
                      const chatSettings = [
                        { key: 'tenant_chat_enabled', value: getSettingVal('tenant_chat_enabled') || 'false', type: 'boolean', group: 'chat', label: 'Enable tenant homepage chat' },
                        { key: 'tenant_chat_personality', value: getSettingVal('tenant_chat_personality') || '', type: 'string', group: 'chat', label: 'Chat personality' },
                        { key: 'tenant_chat_reference_info', value: getSettingVal('tenant_chat_reference_info') || '', type: 'string', group: 'chat', label: 'Reference information' },
                      ];
                      await api.put('/settings', { settings: chatSettings });
                      setSaving(false);
                      flash('Chat settings saved!');
                      window.dispatchEvent(new CustomEvent('app:settings-updated'));
                    } else if (g.key === 'sections') {
                      const sec = settings.find(s => s.setting_key === 'homepage_sections');
                      if (sec) {
                        setSaving(true);
                        await api.put('/settings', { settings: [{ key: 'homepage_sections', value: sec.setting_value, type: 'json', group: 'sections', label: 'Homepage sections' }] });
                        setSaving(false);
                        flash('Content sections saved!');
                        window.dispatchEvent(new CustomEvent('app:settings-updated'));
                      }
                    } else {
                      await saveSettings(g.key);
                    }
                  }} disabled={saving}>
                    <FontAwesomeIcon icon={faFloppyDisk} />{saving ? 'Saving...' : 'Save'}
                  </Btn>
                </div>
                {g.key === 'chat' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <p style={{ fontSize: 13, color: ts, margin: 0 }}>
                      Show a floating chat on your tenant homepage. The AI uses the personality and reference info below to help visitors and can collect a service request that routes as a lead.
                    </p>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={getSettingVal('tenant_chat_enabled') === 'true' || getSettingVal('tenant_chat_enabled') === '1'}
                        onChange={(e) => updateSetting('tenant_chat_enabled', e.target.checked ? 'true' : 'false')}
                      />
                      <span style={{ fontSize: 14, fontWeight: 600, color: tp }}>Enable chat on tenant homepage</span>
                    </label>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 6 }}>Personality</label>
                      <textarea
                        rows={4}
                        placeholder="e.g. You are a friendly assistant for [Company]. You help visitors request quotes for plumbing, HVAC, and electrical. Keep replies short and warm."
                        value={getSettingVal('tenant_chat_personality') || ''}
                        onChange={(e) => updateSetting('tenant_chat_personality', e.target.value)}
                        style={{ ...inputStyle, resize: 'vertical', minHeight: 90 }}
                      />
                      <p style={{ fontSize: 11, color: ts, marginTop: 4 }}>First line can be used as the chat label on the widget.</p>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 6 }}>Reference information</label>
                      <textarea
                        rows={5}
                        placeholder="e.g. We serve Austin, Round Rock, Cedar Park. We offer 24/7 emergency service. Our pros are licensed and insured. Pricing starts at $X for..."
                        value={getSettingVal('tenant_chat_reference_info') || ''}
                        onChange={(e) => updateSetting('tenant_chat_reference_info', e.target.value)}
                        style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }}
                      />
                      <p style={{ fontSize: 11, color: ts, marginTop: 4 }}>Facts the AI can use when answering (not shown to visitors).</p>
                    </div>
                  </div>
                ) : g.key === 'sections' ? (
                  (() => {
                    const s = settings.find(x => x.setting_key === 'homepage_sections');
                    if (!s) return null;
                    let sections = [];
                    try { const v = s.setting_value; if (v) sections = typeof v === 'string' ? JSON.parse(v) : (Array.isArray(v) ? v : []); } catch (_) {}
                    const LAYOUTS = [
                      { value: 'default', label: 'Default', desc: 'Centered block', preview: 'default' },
                      { value: 'full', label: 'Full width', desc: 'Edge to edge', preview: 'full' },
                      { value: 'two-column', label: 'Two column', desc: 'Body + list side by side', preview: 'two-col' },
                      { value: 'cards', label: 'Cards', desc: 'Steps as cards', preview: 'cards' },
                      { value: 'narrow', label: 'Narrow', desc: 'Narrow centered', preview: 'narrow' },
                    ];
                    const updateSections = (next) => updateSetting('homepage_sections', JSON.stringify(next));
                    const updateOne = (idx, patch) => { const next = [...sections]; next[idx] = { ...(next[idx] || {}), ...patch }; updateSections(next); };
                    const removeSection = (idx) => updateSections(sections.filter((_, i) => i !== idx));
                    const addSection = () => updateSections([...sections, { id: 'sec_' + Date.now(), headline: '', body: '', list: [], steps: null, layout: 'default', visible: true, image: '', imageOverlay: 'black', carousel: false }]);
                    const border = dm ? '#334155' : '#e2e8f0';
                    const inputStyle = { width: '100%', padding: '10px 12px', fontSize: 13, border: `1px solid ${border}`, borderRadius: 8, background: dm ? '#1e293b' : '#fff', color: tp, outline: 'none', boxSizing: 'border-box' };
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <p style={{ fontSize: 13, color: ts, margin: 0 }}>Add, remove, and reorder content sections on your homepage. Toggle visibility and choose a layout per section.</p>
                        {sections.map((sec, idx) => (
                          <div key={sec.id || idx} style={{ border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden', background: dm ? '#0f172a' : '#fff' }}>
                            <div style={{ padding: '14px 18px', background: dm ? 'rgba(51,65,85,0.4)' : 'rgba(0,0,0,0.04)', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: tp }}>{sec.headline || `Section ${idx + 1}`}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: ts }}>
                                  <input type="checkbox" checked={sec.visible !== false} onChange={e => updateOne(idx, { visible: e.target.checked })} />
                                  Visible
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: ts }}>
                                  <input type="checkbox" checked={sec.carousel === true} onChange={e => updateOne(idx, { carousel: e.target.checked })} />
                                  Include in carousel
                                </label>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                  {LAYOUTS.map(o => {
                                    const active = (sec.layout || 'default') === o.value;
                                    return (
                                      <button key={o.value} type="button" title={o.desc} onClick={() => updateOne(idx, { layout: o.value })}
                                        style={{ padding: '8px 10px', border: active ? '2px solid var(--color-primary)' : `1px solid ${border}`, borderRadius: 8, background: active ? (dm ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)') : (dm ? '#1e293b' : '#f8fafc'), color: tp, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                          {o.preview === 'two-col' && <><span style={{ width: 12, height: 14, background: 'var(--color-primary)', opacity: 0.8, borderRadius: 2 }} /><span style={{ width: 12, height: 14, background: 'var(--color-primary)', opacity: 0.5, borderRadius: 2 }} /></>}
                                          {o.preview === 'cards' && <><span style={{ width: 8, height: 10, background: 'var(--color-primary)', opacity: 0.7, borderRadius: 2 }} /><span style={{ width: 8, height: 10, background: 'var(--color-primary)', opacity: 0.7, borderRadius: 2 }} /><span style={{ width: 8, height: 10, background: 'var(--color-primary)', opacity: 0.7, borderRadius: 2 }} /></>}
                                          {o.preview === 'narrow' && <span style={{ width: 8, height: 14, background: 'var(--color-primary)', opacity: 0.8, borderRadius: 2 }} />}
                                          {o.preview === 'full' && <span style={{ width: 28, height: 10, background: 'var(--color-primary)', opacity: 0.8, borderRadius: 2 }} />}
                                          {o.preview === 'default' && <span style={{ width: 20, height: 12, background: 'var(--color-primary)', opacity: 0.8, borderRadius: 2 }} />}
                                        </span>
                                        <span style={{ fontSize: 11, fontWeight: 600 }}>{o.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                                <Btn small variant="danger" onClick={() => removeSection(idx)}><FontAwesomeIcon icon={faTrash} /> Remove</Btn>
                              </div>
                            </div>
                            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                              <input placeholder="Headline" value={sec.headline || ''} onChange={e => updateOne(idx, { headline: e.target.value })} style={inputStyle} />
                              <textarea placeholder="Body text" rows={3} value={sec.body || ''} onChange={e => updateOne(idx, { body: e.target.value })} style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} />
                              <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: ts, marginBottom: 6, display: 'block' }}>Background image URL (optional)</label>
                                <input placeholder="https://images.pexels.com/photos/..." value={sec.image || ''} onChange={e => updateOne(idx, { image: e.target.value })} style={inputStyle} />
                                <p style={{ fontSize: 11, color: ts, marginTop: 4 }}>Image is used as section background with an overlay. Choose overlay color so text is readable.</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: ts }}>Overlay:</span>
                                  {['black', 'white'].map(ov => (
                                    <label key={ov} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12, color: ts, textTransform: 'capitalize' }}>
                                      <input type="radio" name={`img-overlay-${idx}`} checked={(sec.imageOverlay || 'black') === ov} onChange={() => updateOne(idx, { imageOverlay: ov })} />
                                      {ov} ({(ov === 'black' ? 'light' : 'dark')} text)
                                    </label>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: ts, marginBottom: 6, display: 'block' }}>List items (one per line)</label>
                                <textarea placeholder="Item 1&#10;Item 2&#10;..." rows={2} value={Array.isArray(sec.list) ? sec.list.join('\n') : ''} onChange={e => updateOne(idx, { list: e.target.value.split('\n').map(x => x.trim()).filter(Boolean) })} style={{ ...inputStyle, resize: 'vertical', marginTop: 4 }} />
                              </div>
                            </div>
                          </div>
                        ))}
                        <Btn onClick={addSection}><FontAwesomeIcon icon={faPlus} /> Add section</Btn>
                      </div>
                    );
                  })()
                ) : g.key === 'appearance' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 6 }}>Color theme</label>
                      <div style={{ border: `1px solid ${dm ? '#334155' : '#e2e8f0'}`, borderRadius: 'var(--border-radius)', padding: 10, background: dm ? '#1e293b' : '#f8fafc' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
                          {Object.entries(themeMap).map(([key, t]) => {
                            const active = (getSettingVal('default_theme') || 'blue') === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => updateSetting('default_theme', key)}
                                title={t.name}
                                style={{
                                  border: active ? `2px solid ${t.primary}` : `1px solid ${dm ? '#334155' : '#cbd5e1'}`,
                                  background: dm ? '#0f172a' : '#ffffff',
                                  borderRadius: 'var(--border-radius)',
                                  padding: '6px 7px',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                              >
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 6 }}>
                                  <span style={{ height: 16, borderRadius: 6, background: t.primary, border: '1px solid rgba(255,255,255,0.15)' }} />
                                  <span style={{ height: 16, borderRadius: 6, background: t.accent, border: '1px solid rgba(255,255,255,0.15)' }} />
                                  <span style={{ height: 16, borderRadius: 6, background: t.primaryLight, border: `1px solid ${dm ? '#475569' : '#d1d5db'}` }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 11, color: tp, fontWeight: active ? 700 : 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {t.name}
                                  </span>
                                  {active && <span style={{ fontSize: 10, fontWeight: 700, color: t.primary }}>Selected</span>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 6 }}>Font</label>
                      <select value={getSettingVal('default_font') || 'inter'} onChange={e => updateSetting('default_font', e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: `1px solid ${dm?'#334155':'#e2e8f0'}`, borderRadius: 'var(--border-radius)', background: dm?'#1e293b':'#f8fafc', color: tp }}>
                        {Object.entries(fontOptionsMap).map(([key, f]) => (
                          <option key={key} value={key}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 6 }}>Border radius</label>
                      <select value={getSettingVal('default_border_radius') || 'md'} onChange={e => updateSetting('default_border_radius', e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: `1px solid ${dm?'#334155':'#e2e8f0'}`, borderRadius: 'var(--border-radius)', background: dm?'#1e293b':'#f8fafc', color: tp }}>
                        {borderRadiusOpts.map(r => (
                          <option key={r.key} value={r.key}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: tp }}>
                        <input type="checkbox" checked={getSettingVal('default_dark_mode') === 'true' || getSettingVal('default_dark_mode') === '1'} onChange={e => updateSetting('default_dark_mode', e.target.checked ? 'true' : 'false')} />
                        Default dark mode
                      </label>
                    </div>
                  </div>
                ) : (
                <div style={{ display: 'grid', gridTemplateColumns: g.key === 'homepage' ? '1fr' : '1fr 1fr', gap: '0 16px' }}>
                  {displaySettings.map(s => (
                    <div key={s.setting_key} style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 4 }}>
                        {s.label || s.setting_key}
                        {s.setting_type === 'secret' && <span style={{ marginLeft: 6, fontSize: 10, color: '#ef4444' }}>SECRET</span>}
                      </label>
                      {s.description && <p style={{ fontSize: 11, color: ts, marginBottom: 4, opacity: 0.7 }}>{s.description}</p>}
                      {s.setting_type === 'boolean' ? (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: tp }}>
                          <input type="checkbox" checked={s.setting_value === 'true' || s.setting_value === '1'} onChange={e => updateSetting(s.setting_key, e.target.checked ? 'true' : 'false')} />
                          {s.setting_value === 'true' ? 'Enabled' : 'Disabled'}
                        </label>
                      ) : s.setting_key === 'home_page_category_ids' ? (
                        <div style={{ border: `1px solid ${dm ? '#334155' : '#e2e8f0'}`, borderRadius: 'var(--border-radius)', padding: 12, background: dm ? '#1e293b' : '#f8fafc', maxHeight: 200, overflowY: 'auto' }}>
                          <p style={{ fontSize: 11, color: ts, marginBottom: 10 }}>Only services in selected categories appear on the tenant public home page. Leave all unchecked to show all.</p>
                          {categories.length === 0 ? (
                            <p style={{ fontSize: 12, color: ts }}>No categories yet. Add categories under Packages → Categories first.</p>
                          ) : (
                            categories.map(cat => {
                              let ids = [];
                              try { ids = JSON.parse(s.setting_value || '[]'); } catch (_) {}
                              const checked = Array.isArray(ids) && ids.includes(cat.id);
                              return (
                                <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: tp, marginBottom: 6 }}>
                                  <input type="checkbox" checked={checked} onChange={() => {
                                    const next = checked ? ids.filter(id => id !== cat.id) : [...(Array.isArray(ids) ? ids : []), cat.id];
                                    updateSetting('home_page_category_ids', JSON.stringify(next));
                                  }} />
                                  {cat.name}
                                </label>
                              );
                            })
                          )}
                        </div>
                      ) : s.setting_key === 'featured_services' ? (
                        <div style={{ border: `1px solid ${dm ? '#334155' : '#e2e8f0'}`, borderRadius: 'var(--border-radius)', padding: 12, background: dm ? '#1e293b' : '#f8fafc', maxHeight: 200, overflowY: 'auto' }}>
                          <p style={{ fontSize: 11, color: ts, marginBottom: 10 }}>Select services to feature on the homepage. Leave all unchecked to show none.</p>
                          {services.length === 0 ? (
                            <p style={{ fontSize: 12, color: ts }}>No services yet. Add services under Packages → Services first.</p>
                          ) : (
                            services.map(svc => {
                              let ids = [];
                              try { ids = JSON.parse(s.setting_value || '[]'); } catch (_) {}
                              const checked = Array.isArray(ids) && ids.includes(svc.id);
                              return (
                                <label key={svc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: tp, marginBottom: 6 }}>
                                  <input type="checkbox" checked={checked} onChange={() => {
                                    const next = checked ? ids.filter(id => id !== svc.id) : [...(Array.isArray(ids) ? ids : []), svc.id];
                                    updateSetting('featured_services', JSON.stringify(next));
                                  }} />
                                  {svc.name}
                                </label>
                              );
                            })
                          )}
                        </div>
                      ) : s.setting_key.includes('description') || s.setting_key.includes('subtitle') ? (
                        <textarea rows={2} value={s.setting_value||''} onChange={e => updateSetting(s.setting_key, e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: `1px solid ${dm?'#334155':'#e2e8f0'}`, borderRadius: 'var(--border-radius)', background: dm?'#1e293b':'#f8fafc', color: tp, outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
                      ) : (
                        <input type={s.setting_type === 'secret' ? 'password' : s.setting_type === 'number' ? 'number' : 'text'}
                          value={s.setting_value||''} onChange={e => updateSetting(s.setting_key, e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: `1px solid ${dm?'#334155':'#e2e8f0'}`, borderRadius: 'var(--border-radius)', background: dm?'#1e293b':'#f8fafc', color: tp, outline: 'none', boxSizing: 'border-box' }} />
                      )}
                    </div>
                  ))}
                </div>
                )}
                {g.key === 'twilio' && (
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${dm ? '#334155' : '#e2e8f0'}` }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: tp, marginBottom: 8 }}>Test SMS</h4>
                    <p style={{ fontSize: 12, color: ts, marginBottom: 10 }}>Send a test message to a verified number (e.g. your Twilio trial verified number).</p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input type="tel" placeholder="+15551234567" value={testSmsTo} onChange={e => { setTestSmsTo(e.target.value); setTestSmsResult(null); }}
                        style={{ width: 180, padding: '6px 10px', fontSize: 12, border: `1px solid ${dm?'#334155':'#e2e8f0'}`, borderRadius: 'var(--border-radius)', background: dm?'#1e293b':'#f8fafc', color: tp, outline: 'none', boxSizing: 'border-box' }} />
                      <Btn small onClick={async () => {
                        if (!testSmsTo.trim()) return flash('Enter a phone number');
                        setTestSmsSending(true); setTestSmsResult(null);
                        try {
                          const r = await api.post('/settings/test-sms', { to: testSmsTo.trim() });
                          if (r.error) { flash(r.error); setTestSmsResult({ ok: false, msg: r.error }); }
                          else { setTestSmsResult({ ok: true, msg: r.mock ? 'Sent (mock — SMS not configured)' : 'Test SMS sent!' }); flash('Test SMS sent'); }
                        } catch (e) { setTestSmsResult({ ok: false, msg: 'Request failed' }); flash('Failed to send'); }
                        setTestSmsSending(false);
                      }} disabled={testSmsSending}>{(testSmsSending ? 'Sending...' : 'Send test SMS')}</Btn>
                    </div>
                    {testSmsResult && <p style={{ fontSize: 12, marginTop: 8, color: testSmsResult.ok ? '#16a34a' : '#ef4444' }}>{testSmsResult.msg}</p>}
                  </div>
                )}
                {g.key === 'email' && (
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${dm ? '#334155' : '#e2e8f0'}` }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: tp, marginBottom: 8 }}>Test Email</h4>
                    <p style={{ fontSize: 12, color: ts, marginBottom: 10 }}>Send a test email to verify SMTP settings. <strong>Save first</strong> before testing.</p>
                    <p style={{ fontSize: 11, color: ts, marginBottom: 10, opacity: 0.8 }}>
                      For MailHog (Docker): Host = localhost, Port = 1025, leave User/Password empty.{' '}
                      <button type="button" onClick={async () => {
                        try {
                          const r = await api.post('/settings/apply-mailhog', {});
                          if (r.success) { flash(r.message); setTestEmailResult(null); }
                          else flash(r.error || 'Failed');
                        } catch (e) { flash(e.message || 'Failed'); }
                      }} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 11, textDecoration: 'underline', fontWeight: 600 }}>Apply MailHog config</button>
                    </p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input type="email" placeholder="you@example.com" value={testEmailTo} onChange={e => { setTestEmailTo(e.target.value); setTestEmailResult(null); }}
                        style={{ width: 220, padding: '6px 10px', fontSize: 12, border: `1px solid ${dm?'#334155':'#e2e8f0'}`, borderRadius: 'var(--border-radius)', background: dm?'#1e293b':'#f8fafc', color: tp, outline: 'none', boxSizing: 'border-box' }} />
                      <Btn small onClick={async () => {
                        if (!testEmailTo.trim()) return flash('Enter an email address');
                        setTestEmailSending(true); setTestEmailResult(null);
                        try {
                          const r = await api.post('/settings/test-email', { to: testEmailTo.trim() });
                          const ok = r.success !== false && !r.mock;
                          const msg = r.error || r.message || (ok ? 'Test email sent!' : 'Check settings');
                          setTestEmailResult({ ok, msg });
                          if (ok) flash('Test email sent'); else flash(msg);
                        } catch (e) { setTestEmailResult({ ok: false, msg: e.message || 'Request failed' }); flash('Failed to send'); }
                        setTestEmailSending(false);
                      }} disabled={testEmailSending}>{(testEmailSending ? 'Sending...' : 'Send test email')}</Btn>
                    </div>
                    {testEmailResult && <p style={{ fontSize: 12, marginTop: 8, color: testEmailResult.ok ? '#16a34a' : '#ef4444' }}>{testEmailResult.msg}</p>}
                  </div>
                )}
                {g.key === 'stripe' && (
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${dm ? '#334155' : '#e2e8f0'}` }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: tp, marginBottom: 8 }}>Test Stripe</h4>
                    <p style={{ fontSize: 12, color: ts, marginBottom: 10 }}>Verify your Stripe secret key can connect to the API.</p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Btn small onClick={async () => {
                        setTestStripeSending(true); setTestStripeResult(null);
                        try {
                          const r = await api.post('/settings/test-stripe', {});
                          if (r.error) { flash(r.error); setTestStripeResult({ ok: false, msg: r.error }); }
                          else { setTestStripeResult({ ok: true, msg: 'Stripe connection OK' }); flash('Stripe connection OK'); }
                        } catch (e) { setTestStripeResult({ ok: false, msg: 'Request failed' }); flash('Failed'); }
                        setTestStripeSending(false);
                      }} disabled={testStripeSending}>{(testStripeSending ? 'Testing...' : 'Test Stripe connection')}</Btn>
                    </div>
                    {testStripeResult && <p style={{ fontSize: 12, marginTop: 8, color: testStripeResult.ok ? '#16a34a' : '#ef4444' }}>{testStripeResult.msg}</p>}
                  </div>
                )}
                {g.key === 'advanced' && isSuperAdmin && (
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${dm ? '#334155' : '#e2e8f0'}` }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: tp, marginBottom: 8 }}>Test OpenAI API key</h4>
                    <p style={{ fontSize: 12, color: ts, marginBottom: 10 }}>Verify the key used by the AI Setup Assistant. Save the key first if you just updated it.</p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Btn small onClick={async () => {
                        setTestOpenaiSending(true); setTestOpenaiResult(null);
                        try {
                          const r = await api.post('/settings/test-openai', {});
                          if (r.error) { setTestOpenaiResult({ ok: false, msg: r.error }); flash(r.error); }
                          else { setTestOpenaiResult({ ok: true, msg: r.message || 'OpenAI API key is valid' }); flash('OpenAI key OK'); }
                        } catch (e) { setTestOpenaiResult({ ok: false, msg: e?.error || e?.message || 'Request failed' }); flash('Test failed'); }
                        setTestOpenaiSending(false);
                      }} disabled={testOpenaiSending}>{(testOpenaiSending ? 'Testing...' : 'Test OpenAI key')}</Btn>
                    </div>
                    {testOpenaiResult && <p style={{ fontSize: 12, marginTop: 8, color: testOpenaiResult.ok ? '#16a34a' : '#ef4444' }}>{testOpenaiResult.msg}</p>}
                  </div>
                )}
              </Card>
            );
          })}
        </>}


      {showDomainHelp && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2, 6, 23, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          zIndex: 250,
        }}>
          <div style={{
            width: '100%',
            maxWidth: 760,
            maxHeight: '85vh',
            overflowY: 'auto',
            background: dm ? '#0f172a' : '#ffffff',
            border: `1px solid ${dm ? '#334155' : '#e2e8f0'}`,
            borderRadius: 'var(--border-radius)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
            padding: 18,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: tp }}>Domain Configuration Instructions</h3>
              <Btn small variant="ghost" onClick={() => setShowDomainHelp(false)}><FontAwesomeIcon icon={faXmark} />Close</Btn>
            </div>
            <p style={{ marginTop: 0, marginBottom: 14, fontSize: 13, color: ts }}>
              Use this checklist when assigning a custom domain to a tenant.
            </p>

            <Card dm={dm} style={{ padding: 14, marginBottom: 12 }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 700, color: tp }}>1) In Wrkr (Super Admin)</h4>
              <ul style={{ margin: 0, paddingLeft: 18, color: ts, fontSize: 13, lineHeight: 1.5 }}>
                <li>Open Admin - Users - Tenants.</li>
                <li>Create or edit a tenant and set <b>Custom Domain</b> (example: <code>acmehome.com</code>).</li>
                <li>Save tenant changes.</li>
              </ul>
            </Card>

            <Card dm={dm} style={{ padding: 14, marginBottom: 12 }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 700, color: tp }}>2) DNS Records (minimum)</h4>
              <ul style={{ margin: 0, paddingLeft: 18, color: ts, fontSize: 13, lineHeight: 1.5 }}>
                <li><b>A</b> record: <code>@</code> &rarr; <code>YOUR_SERVER_PUBLIC_IP</code></li>
                <li><b>CNAME</b> record: <code>www</code> &rarr; <code>@</code> (or root domain)</li>
              </ul>
              <p style={{ margin: '8px 0 0 0', color: ts, fontSize: 12 }}>
                Optional: wildcard subdomains with <code>*</code> &rarr; <code>YOUR_SERVER_PUBLIC_IP</code>
              </p>
            </Card>

            <Card dm={dm} style={{ padding: 14, marginBottom: 12 }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 700, color: tp }}>3) Server / SSL</h4>
              <ul style={{ margin: 0, paddingLeft: 18, color: ts, fontSize: 13, lineHeight: 1.5 }}>
                <li>Add the tenant domain to your reverse proxy (Nginx/Apache).</li>
                <li>Route traffic to this app and preserve the original <code>Host</code> header.</li>
                <li>Issue SSL certificate for the tenant domain (and <code>www</code> if used).</li>
                <li>Force HTTPS redirects.</li>
              </ul>
            </Card>

            <Card dm={dm} style={{ padding: 14, marginBottom: 12 }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 700, color: tp }}>4) Verify</h4>
              <ul style={{ margin: 0, paddingLeft: 18, color: ts, fontSize: 13, lineHeight: 1.5 }}>
                <li>Open <code>https://tenant-domain.com</code>.</li>
                <li>Confirm tenant branding/settings and data isolation.</li>
                <li>If wrong tenant loads, check DNS, custom domain value, and proxy host forwarding.</li>
              </ul>
            </Card>

            <p style={{ margin: 0, color: ts, fontSize: 12 }}>
              Note: on <code>localhost</code>, tenant middleware always resolves to default tenant.
            </p>
          </div>
        </div>
      )}

      </div>

      {/* AI Setup Assistant — floating chat at bottom right (Facebook style) */}
      <AISetupChatWidget
        dm={dm}
        tp={tp}
        ts={ts}
        border={border}
        messages={setupChatMessages}
        setMessages={setSetupChatMessages}
        input={setupChatInput}
        setInput={setSetupChatInput}
        loading={setupChatLoading}
        applying={setupChatApplying}
        onSend={async () => {
          const text = setupChatInput.trim();
          if (!text || setupChatLoading || setupChatApplying) return;
          const userMsg = { role: 'user', content: text };
          setSetupChatMessages(prev => [...prev, userMsg]);
          setSetupChatInput('');
          setSetupChatLoading(true);
          try {
            const messages = [...setupChatMessages, userMsg].map(({ role, content }) => ({ role, content }));
            const res = await api.post('/settings/setup-chat', { messages, action: 'generate' });
            if (res.error) { flash(res.error); return; }
            if (res.content) setSetupChatMessages(prev => [...prev, { role: 'assistant', content: res.content }]);
            if (res.applied) flash('Content applied to your site.');
          } catch (err) {
            flash(err?.error || err?.message || 'Chat failed');
          } finally {
            setSetupChatLoading(false);
          }
        }}
        onApply={async () => {
          if (setupChatMessages.length === 0) { flash('Chat first, then apply.'); return; }
          if (!confirm('This will replace your homepage, packages, services, categories, how it works, and sample reviews. Continue?')) return;
          setSetupChatApplying(true);
          try {
            const messagesForApply = [...setupChatMessages.map(({ role, content }) => ({ role, content })), { role: 'user', content: 'Please output the full JSON for my site now so I can apply it.' }];
            const res = await api.post('/settings/setup-chat', { messages: messagesForApply, action: 'apply' });
            if (res.error) { flash(res.error); return; }
            flash(res.message || 'Site content applied.');
            window.dispatchEvent(new CustomEvent('app:settings-updated'));
            window.dispatchEvent(new CustomEvent('app:data-updated'));
            api.get('/settings/all').then((st) => { if (Array.isArray(st)) setSettings(st); }).catch(() => {});
            api.get('/admin/how-it-works').then((d) => { if (Array.isArray(d)) setSteps(d); }).catch(() => {});
            if (res.content) setSetupChatMessages(prev => [...prev, { role: 'assistant', content: res.content }]);
          } catch (err) {
            flash(err?.error || err?.message || 'Apply failed');
          } finally {
            setSetupChatApplying(false);
          }
        }}
      />
    </div>
  );
}
