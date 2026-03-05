import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers, faClipboardList, faBriefcase, faLayerGroup,
  faSpinner, faCheckCircle, faXmarkCircle, faToggleOn, faToggleOff,
  faSearch, faStar, faLocationDot, faClock, faShieldHalved, faEnvelope,
  faGear, faCubes, faTag, faPlus, faPen, faTrash, faXmark, faPhone,
  faFloppyDisk, faHome, faMagnifyingGlass, faPalette, faFileLines, faEye,
  faBell, faEnvelopeOpenText, faCommentSms, faChartLine, faToggleOn as faToggleOnSolid, faListOl,
  faChevronLeft, faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import { useTheme, themes as themeMap, fontOptions as fontOptionsMap, borderRadiusOptions as borderRadiusOpts } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import RichTextEditor from '../components/RichTextEditor';

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

function Card({ children, dm, style: extra }) {
  return <div style={{ background: dm ? '#111827' : '#fff', border: `1px solid ${dm ? '#1f2937' : '#e2e8f0'}`, borderRadius: 'var(--border-radius)', ...extra }}>{children}</div>;
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
  const [settings, setSettings] = useState([]);
  const [pages, setPages] = useState([]);
  const [searchQ, setSearchQ] = useState('');

  // CRUD editing state
  const [editPlan, setEditPlan] = useState(null);
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

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  useEffect(() => {
    const roleParam = userRoleFilter && userRoleFilter !== 'all' ? `&role=${userRoleFilter}` : '';
    Promise.all([
      api.get(`/users?page=1&limit=${usersLimit}${roleParam}`),
      api.get(`/leads?page=1&limit=${leadsLimit}`),
      api.get('/categories'),
      api.get('/services?all=true'),
      api.get('/subscriptions/plans?all=true'),
      api.get('/settings/all'),
      api.get('/pages?all=true'),
      api.get('/templates'),
      api.get('/admin/how-it-works'),
      api.get('/users?page=1&limit=1&role=pro'),
    ]).then(([u, l, c, s, p, st, pg, tmpl, stepsData, prosResp]) => {
      const userList = u.users || u || [];
      const leadList = l.leads ?? (Array.isArray(l) ? l : []);
      setUsers(userList);
      setUsersTotal(u.total ?? userList.length);
      setLeads(leadList);
      setLeadsTotal(l.total ?? leadList.length);
      setCategories(Array.isArray(c) ? c : []);
      setServices(Array.isArray(s) ? s : []);
      setPlans(Array.isArray(p) ? p : []);
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
  }, []);

  // Refetch users when page or role filter changes (users tab)
  useEffect(() => {
    if (tab !== 'users') return;
    const roleParam = userRoleFilter && userRoleFilter !== 'all' ? `&role=${userRoleFilter}` : '';
    api.get(`/users?page=${usersPage}&limit=${usersLimit}${roleParam}`)
      .then(u => {
        const list = u.users || u || [];
        setUsers(list);
        setUsersTotal(u.total ?? list.length);
      })
      .catch(() => {});
  }, [tab, usersPage, userRoleFilter]);

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

  // Load steps when Pages > Homepage Steps sub-tab is opened
  useEffect(() => {
    if (tab !== 'pages' || pagesSubTab !== 'steps') return;
    if (steps.length > 0) return; // already have data
    setStepsLoading(true);
    api.get('/admin/how-it-works')
      .then((data) => {
        if (Array.isArray(data)) setSteps(data);
        else if (data?.error) flash(data.error);
      })
      .catch(() => flash('Failed to load steps'))
      .finally(() => setStepsLoading(false));
  }, [tab, pagesSubTab]);

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
    await api.put('/settings', { settings: groupSettings.map(s => ({ key: s.setting_key, value: s.setting_value, type: s.setting_type, group: s.setting_group, label: s.label })) });
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
      setPlans(ps => [...ps, { ...editPlan, id: r.id }]);
    }
    setEditPlan(null); setSaving(false); flash('Plan saved!');
  };
  const deletePlan = async (id) => {
    if (!confirm('Delete this plan?')) return;
    await api.del(`/subscriptions/plans/${id}`);
    setPlans(ps => ps.filter(p => p.id !== id));
    flash('Plan deleted');
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
  };
  const deleteCat = async (id) => {
    if (!confirm('Delete this category?')) return;
    const r = await api.del(`/categories/${id}`);
    if (r.error) { flash(r.error); return; }
    setCategories(cs => cs.filter(c => c.id !== id));
    flash('Category deleted');
  };

  // ── Services CRUD ──
  const saveSvc = async () => {
    setSaving(true);
    if (editSvc.id) {
      await api.put(`/services/${editSvc.id}`, editSvc);
      setServices(ss => ss.map(s => s.id === editSvc.id ? { ...s, ...editSvc } : s));
    } else {
      const r = await api.post('/services', editSvc);
      setServices(ss => [...ss, { ...editSvc, id: r.id }]);
    }
    setEditSvc(null); setSaving(false); flash('Service saved!');
  };
  const deleteSvc = async (id) => {
    if (!confirm('Delete this service?')) return;
    await api.del(`/services/${id}`);
    setServices(ss => ss.filter(s => s.id !== id));
    flash('Service deleted');
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
    } catch (e) { flash('Failed to save step'); }
    setSaving(false);
  };

  const border = dm ? '#1f2937' : '#e2e8f0';
  const tp = dm ? '#f1f5f9' : '#1e293b';
  const ts = dm ? '#94a3b8' : '#64748b';

  const tabs = [
    { key: 'overview',   label: 'Overview',    icon: faShieldHalved },
    { key: 'users',      label: 'Users',       icon: faUsers },
    { key: 'leads',      label: 'Leads',       icon: faClipboardList },
    { key: 'packages',   label: 'Packages',    icon: faCubes },
    { key: 'categories', label: 'Categories',  icon: faTag },
    { key: 'services',   label: 'Services',    icon: faLayerGroup },
    { key: 'reviews',    label: 'Reviews',     icon: faStar },
    { key: 'pages',      label: 'Pages',       icon: faFileLines },
    { key: 'templates',  label: 'Templates',   icon: faBell },
    { key: 'settings',   label: 'Settings',    icon: faGear },
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
    { key: 'seo',        label: 'SEO',        icon: faMagnifyingGlass },
    { key: 'analytics',  label: 'Google Analytics', icon: faChartLine },
    { key: 'email',      label: 'Email',      icon: faEnvelope },
    { key: 'appearance', label: 'Appearance', icon: faPalette },
    { key: 'advanced',   label: 'Spam / Security', icon: faShieldHalved },
  ];

  return (
    <div style={{ minHeight: '100vh', background: dm ? '#0a0f1a' : '#f0f4f8', fontFamily: 'var(--font-family)' }}>
      {/* Flash message */}
      {msg && <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 200, background: '#22c55e', color: '#fff', padding: '10px 20px', borderRadius: 'var(--border-radius)', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}><FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: 8 }} />{msg}</div>}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px' }}>
        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <FontAwesomeIcon icon={faShieldHalved} style={{ color: '#ef4444', fontSize: 20 }} />
            <h1 style={{ fontSize: 24, fontWeight: 800, color: tp }}>Admin Dashboard</h1>
          </div>
          <p style={{ fontSize: 14, color: ts }}>Welcome back, {user?.firstName || 'Admin'}.</p>
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

          <Card dm={dm}><Table headers={['ID','Name','Email','Role','Provider','Active','Last Login','Actions']} dm={dm}>
            {filteredUsers.map(u => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${border}` }}>
                <Td dm={dm}>#{u.id}</Td>
                <Td dm={dm} fw={600}>{u.first_name || ''} {u.last_name || ''}</Td>
                <Td dm={dm}>{u.email}</Td>
                <Td dm={dm}><Badge color={u.role==='admin'?'#dc2626':u.role==='pro'?'#2563eb':'#16a34a'} bg={u.role==='admin'?'#fee2e2':u.role==='pro'?'#dbeafe':'#dcfce7'}>{u.role}</Badge></Td>
                <Td dm={dm}>{u.role === 'pro' && u.business_name ? u.business_name : '—'}</Td>
                <Td dm={dm}><FontAwesomeIcon icon={u.is_active ? faCheckCircle : faXmarkCircle} style={{ color: u.is_active ? '#22c55e' : '#ef4444', fontSize: 15 }} /></Td>
                <Td dm={dm}>{u.last_login ? new Date(u.last_login).toLocaleString() : '—'}</Td>
                <Td dm={dm}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <Btn small onClick={() => setEditUser({ id: u.id, email: u.email, role: u.role, firstName: u.first_name, lastName: u.last_name, phone: u.phone, isActive: u.is_active })}><FontAwesomeIcon icon={faPen} />Edit</Btn>
                    <Btn small variant={u.is_active ? 'danger' : 'success'} onClick={() => toggleUser(u.id, u.is_active)} title={u.is_active ? 'Deactivate' : 'Activate'}><FontAwesomeIcon icon={u.is_active ? faToggleOff : faToggleOn} /></Btn>
                    {u.role === 'pro' && <Btn small onClick={() => setCreditAdjust({ proId: u.pro_id || u.id, proName: `${u.first_name||''} ${u.last_name||''}`.trim() || u.email, amount: '', reason: '' })}><FontAwesomeIcon icon={faCubes} />Credits</Btn>}
                    {u.is_active && user?.id !== u.id && <Btn small variant="danger" onClick={() => deleteUser(u.id)}><FontAwesomeIcon icon={faTrash} /></Btn>}
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
          <PaginationBar page={usersPage} total={usersTotal} limit={usersLimit} onPageChange={setUsersPage} dm={dm} />
          </Card>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: tp }}>Subscription Plans ({plans.length})</h3>
            <Btn onClick={() => setEditPlan({ name: '', slug: '', priceMonthly: 0, priceYearly: 0, leadCredits: 0, maxServiceAreas: 5, maxServices: 3, stripePriceId: '', isPopular: false, isActive: true, sortOrder: plans.length + 1 })}><FontAwesomeIcon icon={faPlus} />Add Plan</Btn>
          </div>

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
                  <Btn small onClick={() => setEditPlan({ ...p, priceMonthly: p.price_monthly, priceYearly: p.price_yearly, leadCredits: p.lead_credits, maxServiceAreas: p.max_service_areas, maxServices: p.max_services, stripePriceId: p.stripe_price_id, isPopular: !!p.is_popular, isActive: !!p.is_active, sortOrder: p.sort_order })}><FontAwesomeIcon icon={faPen} />Edit</Btn>
                  <Btn small variant="danger" onClick={() => deletePlan(p.id)}><FontAwesomeIcon icon={faTrash} /></Btn>
                </div>
              </Card>
            ))}
          </div>
        </>}

        {/* ══════════ CATEGORIES ══════════ */}
        {tab === 'categories' && <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: tp }}>Categories ({categories.length})</h3>
            <Btn onClick={() => setEditCat({ name: '', slug: '', iconClass: '', description: '', tags: '', sortOrder: categories.length + 1 })}><FontAwesomeIcon icon={faPlus} />Add Category</Btn>
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
                    <Btn small variant="danger" onClick={() => deleteCat(c.id)}><FontAwesomeIcon icon={faTrash} /></Btn>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: tp }}>Services ({services.length})</h3>
            <Btn onClick={() => setEditSvc({ categoryId: categories[0]?.id, name: '', slug: '', iconClass: '', cardImageUrl: '', minPrice: '', priceUnit: 'per job' })}><FontAwesomeIcon icon={faPlus} />Add Service</Btn>
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
                    <Btn small variant="danger" onClick={() => deleteSvc(s.id)}><FontAwesomeIcon icon={faTrash} /></Btn>
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
          {/* Sub-menu: CMS Pages | Homepage Steps */}
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

          {pagesSubTab === 'list' && <>
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
              }} disabled={saving || !editPage.title || !editPage.slug}><FontAwesomeIcon icon={faFloppyDisk} />{saving ? 'Saving...' : 'Save Page'}</Btn>
              <Btn variant="ghost" onClick={() => setEditPage(null)}><FontAwesomeIcon icon={faXmark} />Cancel</Btn>
            </div>
          </Card>}

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

          {pagesSubTab === 'steps' && <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: tp }}>Homepage “How it works” steps</h3>
              <p style={{ fontSize: 13, color: ts, marginTop: 4 }}>Edit the steps shown for homeowners and for professionals on the homepage. The same content is shown on the main site.</p>
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
        {tab === 'templates' && <>
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
          {settingGroups.map(g => {
            const groupSettings = settings.filter(s => s.setting_group === g.key);
            if (!groupSettings.length) return null;
            return (
              <Card key={g.key} dm={dm} style={{ padding: '20px 22px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: tp }}>
                    <FontAwesomeIcon icon={g.icon} style={{ marginRight: 8, opacity: 0.5, fontSize: 13 }} />
                    {g.label} Settings
                  </h3>
                  <Btn small onClick={() => saveSettings(g.key)} disabled={saving}>
                    <FontAwesomeIcon icon={faFloppyDisk} />{saving ? 'Saving...' : 'Save'}
                  </Btn>
                </div>
                {g.key === 'appearance' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ts, marginBottom: 6 }}>Color theme</label>
                      <select value={getSettingVal('default_theme') || 'blue'} onChange={e => updateSetting('default_theme', e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: `1px solid ${dm?'#334155':'#e2e8f0'}`, borderRadius: 'var(--border-radius)', background: dm?'#1e293b':'#f8fafc', color: tp }}>
                        {Object.entries(themeMap).map(([key, t]) => (
                          <option key={key} value={key}>{t.name}</option>
                        ))}
                      </select>
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
                  {groupSettings.map(s => (
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
                    <p style={{ fontSize: 12, color: ts, marginBottom: 10 }}>Send a test email to verify SMTP settings.</p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input type="email" placeholder="you@example.com" value={testEmailTo} onChange={e => { setTestEmailTo(e.target.value); setTestEmailResult(null); }}
                        style={{ width: 220, padding: '6px 10px', fontSize: 12, border: `1px solid ${dm?'#334155':'#e2e8f0'}`, borderRadius: 'var(--border-radius)', background: dm?'#1e293b':'#f8fafc', color: tp, outline: 'none', boxSizing: 'border-box' }} />
                      <Btn small onClick={async () => {
                        if (!testEmailTo.trim()) return flash('Enter an email address');
                        setTestEmailSending(true); setTestEmailResult(null);
                        try {
                          const r = await api.post('/settings/test-email', { to: testEmailTo.trim() });
                          if (r.error) { flash(r.error); setTestEmailResult({ ok: false, msg: r.error }); }
                          else { setTestEmailResult({ ok: true, msg: r.mock ? 'Sent (mock — SMTP not configured)' : 'Test email sent!' }); flash('Test email sent'); }
                        } catch (e) { setTestEmailResult({ ok: false, msg: 'Request failed' }); flash('Failed to send'); }
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
              </Card>
            );
          })}
        </>}

      </div>
    </div>
  );
}
