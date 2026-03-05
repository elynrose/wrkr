import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faSpinner, faUser, faEnvelope, faPhone, faLocationDot,
  faClipboardList, faClock, faDollarSign, faStar, faCheckCircle,
  faXmarkCircle, faTag, faPen, faTrash, faPlus, faFloppyDisk, faXmark,
  faThumbtack, faHistory, faComment, faPhoneVolume, faCalendarDays,
  faFlag, faUserShield, faBriefcase, faCircle, faBuilding, faHouse,
  faExclamationTriangle, faBolt, faNoteSticky, faArrowRightArrowLeft,
  faPaperPlane, faLink, faRobot, faEye,
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const tok = () => localStorage.getItem('hp_token');
const api = {
  get:   (p) => fetch(`${BASE}${p}`, { headers: { Authorization: `Bearer ${tok()}` } }).then(r => r.json()),
  post:  (p, b) => fetch(`${BASE}${p}`, { method: 'POST', headers: { Authorization: `Bearer ${tok()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json()),
  put:   (p, b) => fetch(`${BASE}${p}`, { method: 'PUT', headers: { Authorization: `Bearer ${tok()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json()),
  patch: (p, b) => fetch(`${BASE}${p}`, { method: 'PATCH', headers: { Authorization: `Bearer ${tok()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json()),
  del:   (p) => fetch(`${BASE}${p}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tok()}` } }).then(r => r.json()),
};

const STATUS_FLOW = ['new','matching','contacted','quoted','hired','completed','canceled'];
const STATUS_COLORS = {
  new:       { bg: '#dbeafe', color: '#2563eb', label: 'New' },
  matching:  { bg: '#f3e8ff', color: '#7c3aed', label: 'Matching' },
  contacted: { bg: '#fef9c3', color: '#a16207', label: 'Contacted' },
  quoted:    { bg: '#fed7aa', color: '#c2410c', label: 'Quoted' },
  hired:     { bg: '#bbf7d0', color: '#16a34a', label: 'Hired' },
  completed: { bg: '#dcfce7', color: '#15803d', label: 'Completed' },
  canceled:  { bg: '#fee2e2', color: '#dc2626', label: 'Canceled' },
};
const PRIORITY_MAP = {
  low:    { icon: faCircle,               color: '#94a3b8', label: 'Low' },
  normal: { icon: faFlag,                 color: '#3b82f6', label: 'Normal' },
  high:   { icon: faExclamationTriangle,  color: '#f59e0b', label: 'High' },
  urgent: { icon: faBolt,                 color: '#ef4444', label: 'Urgent' },
};
const NOTE_TYPES = [
  { value: 'note',     label: 'Note',    icon: faNoteSticky },
  { value: 'call',     label: 'Call',     icon: faPhoneVolume },
  { value: 'email',    label: 'Email',    icon: faEnvelope },
  { value: 'sms',      label: 'SMS',      icon: faComment },
  { value: 'meeting',  label: 'Meeting',  icon: faCalendarDays },
  { value: 'internal', label: 'Internal', icon: faUserShield },
];

function Badge({ children, bg, color }) {
  return <span style={{ padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 700, background: bg, color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>{children}</span>;
}

function Btn({ children, onClick, variant = 'primary', small, disabled, style: extra }) {
  const base = { border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 600, borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.15s', opacity: disabled ? 0.5 : 1 };
  const sz = small ? { padding: '5px 12px', fontSize: 12 } : { padding: '9px 18px', fontSize: 13 };
  const vs = {
    primary: { background: 'var(--color-primary)', color: '#fff' },
    danger:  { background: '#ef4444', color: '#fff' },
    ghost:   { background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0' },
    success: { background: '#22c55e', color: '#fff' },
    warning: { background: '#f59e0b', color: '#fff' },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...sz, ...vs[variant], ...extra }}>{children}</button>;
}

export default function LeadDetailsPage({ leadId, onBack }) {
  const { darkMode: dm } = useTheme();
  const { user } = useAuth();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [msg, setMsg] = useState('');

  // Note form
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState('note');
  const [editingNote, setEditingNote] = useState(null);

  // Matches
  const [matches, setMatches] = useState([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [triggeringMatch, setTriggeringMatch] = useState(false);

  // Editable fields
  const [editPriority, setEditPriority] = useState('');
  const [editFollowUp, setEditFollowUp] = useState('');
  const [editTags, setEditTags] = useState('');

  const notesEndRef = useRef(null);

  const tp = dm ? '#f1f5f9' : '#1e293b';
  const ts = dm ? '#94a3b8' : '#64748b';
  const border = dm ? '#1f2937' : '#e2e8f0';
  const cardBg = dm ? '#111827' : '#fff';
  const surfaceBg = dm ? '#0a0f1a' : '#f0f4f8';
  const inputBg = dm ? '#1e293b' : '#f8fafc';

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const fetchLead = async () => {
    try {
      const data = await api.get(`/leads/${leadId}`);
      setLead(data);
      setEditPriority(data.priority || 'normal');
      setEditFollowUp(data.follow_up_date ? data.follow_up_date.split('T')[0] : '');
      setEditTags(data.tags || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLead(); fetchMatches(); }, [leadId]);

  const fetchMatches = async () => {
    setMatchLoading(true);
    try {
      const data = await api.get(`/matching/lead/${leadId}`);
      setMatches(Array.isArray(data) ? data : []);
    } catch { setMatches([]); }
    finally { setMatchLoading(false); }
  };

  const triggerMatch = async () => {
    setTriggeringMatch(true);
    try {
      const r = await api.post(`/matching/run/${leadId}`);
      flash(`Matched ${r.matched} pros!`);
      fetchMatches();
      fetchLead();
    } catch (e) { flash('Matching failed'); }
    finally { setTriggeringMatch(false); }
  };

  // ── Actions ──
  const updateStatus = async (status) => {
    setSaving(true);
    await api.patch(`/leads/${leadId}/status`, { status });
    setLead(prev => ({ ...prev, status }));
    const act = { user_id: user?.id, first_name: user?.firstName, action: 'status_changed', details: `→ ${status}`, created_at: new Date().toISOString() };
    setLead(prev => ({ ...prev, activity: [act, ...(prev.activity || [])] }));
    flash(`Status → ${STATUS_COLORS[status]?.label}`);
    setSaving(false);
  };

  const updateLeadFields = async () => {
    setSaving(true);
    await api.patch(`/leads/${leadId}`, { priority: editPriority, followUpDate: editFollowUp || null, tags: editTags });
    setLead(prev => ({ ...prev, priority: editPriority, follow_up_date: editFollowUp, tags: editTags }));
    flash('Lead updated');
    setSaving(false);
  };

  const addNote = async () => {
    if (!noteContent.trim()) return;
    setSaving(true);
    const note = await api.post(`/leads/${leadId}/notes`, { content: noteContent, noteType });
    if (note.id) {
      setLead(prev => ({ ...prev, notes: [note, ...(prev.notes || [])] }));
      setNoteContent('');
      flash('Note added');
    }
    setSaving(false);
  };

  const togglePin = async (noteId, currentPin) => {
    await api.put(`/leads/${leadId}/notes/${noteId}`, { isPinned: !currentPin });
    setLead(prev => ({
      ...prev,
      notes: prev.notes.map(n => n.id === noteId ? { ...n, is_pinned: !currentPin } : n)
        .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
    }));
  };

  const deleteNote = async (noteId) => {
    if (!confirm('Delete this note?')) return;
    await api.del(`/leads/${leadId}/notes/${noteId}`);
    setLead(prev => ({ ...prev, notes: prev.notes.filter(n => n.id !== noteId) }));
    flash('Note deleted');
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const fmtTime = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
  const timeAgo = (d) => {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: surfaceBg }}>
      <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 32, color: 'var(--color-primary)' }} />
    </div>
  );

  if (!lead) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: surfaceBg, flexDirection: 'column', gap: 12 }}>
      <FontAwesomeIcon icon={faXmarkCircle} style={{ fontSize: 32, color: '#ef4444' }} />
      <p style={{ color: tp }}>Lead not found</p>
      <Btn onClick={onBack}><FontAwesomeIcon icon={faArrowLeft} />Back</Btn>
    </div>
  );

  const sc = STATUS_COLORS[lead.status] || STATUS_COLORS.new;
  const pr = PRIORITY_MAP[lead.priority || 'normal'];
  const notes = lead.notes || [];
  const activity = lead.activity || [];
  const claims = lead.claims || [];

  const tabs = [
    { key: 'details',  label: 'Details' },
    { key: 'notes',    label: `Notes (${notes.length})` },
    { key: 'activity', label: `Activity (${activity.length})` },
    { key: 'matches',  label: `Matches (${matches.length})` },
    { key: 'claims',   label: `Claims (${claims.length})` },
  ];

  return (
    <div style={{ minHeight: '100vh', background: surfaceBg, fontFamily: 'var(--font-family)' }}>
      {/* Flash */}
      {msg && <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 200, background: '#22c55e', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}><FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: 8 }} />{msg}</div>}

      <div style={{ maxWidth: 1050, margin: '0 auto', padding: '28px 16px' }}>

        {/* ── Header bar ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: 0 }}>
              <FontAwesomeIcon icon={faArrowLeft} />Back to Leads
            </button>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: tp, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              Lead #{lead.id} — {lead.service_name || 'Service Request'}
              <Badge bg={sc.bg} color={sc.color}>{sc.label}</Badge>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <FontAwesomeIcon icon={pr.icon} style={{ color: pr.color, fontSize: 13 }} />
                <span style={{ fontSize: 12, color: pr.color, fontWeight: 600 }}>{pr.label}</span>
              </span>
            </h1>
            <p style={{ fontSize: 13, color: ts, marginTop: 2 }}>Created {fmtTime(lead.created_at)} · {timeAgo(lead.created_at)}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {STATUS_FLOW.filter(s => s !== lead.status).map(s => {
              const c = STATUS_COLORS[s];
              return <Btn key={s} small variant="ghost" onClick={() => updateStatus(s)} disabled={saving}
                style={{ background: c.bg, color: c.color, border: 'none', fontSize: 11 }}>
                {c.label}
              </Btn>;
            })}
          </div>
        </div>

        {/* ── Status Progress ── */}
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
          {STATUS_FLOW.map((s, i) => {
            const c = STATUS_COLORS[s];
            const active = s === lead.status;
            const passed = STATUS_FLOW.indexOf(lead.status) >= i;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 70 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: active ? c.color : passed ? c.bg : (dm ? '#1e293b' : '#f1f5f9'),
                  color: active ? '#fff' : passed ? c.color : ts,
                  fontSize: 10, fontWeight: 700, border: active ? 'none' : `2px solid ${passed ? c.color : border}`,
                  cursor: 'pointer', transition: 'all 0.2s',
                }} onClick={() => updateStatus(s)} title={`Set to ${c.label}`}>
                  {passed && !active ? <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: 12 }} /> : (i + 1)}
                </div>
                {i < STATUS_FLOW.length - 1 && <div style={{ flex: 1, height: 2, background: passed ? c.color : border, margin: '0 4px', minWidth: 16 }} />}
              </div>
            );
          })}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: cardBg, borderRadius: 8, padding: 4, border: `1px solid ${border}` }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: '8px 16px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer',
              background: activeTab === t.key ? 'var(--color-primary)' : 'transparent',
              color: activeTab === t.key ? '#fff' : ts, whiteSpace: 'nowrap',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ════════════ DETAILS TAB ════════════ */}
        {activeTab === 'details' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>

            {/* Left – Customer & Request info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Customer Info */}
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: tp, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FontAwesomeIcon icon={faUser} style={{ color: 'var(--color-primary)', fontSize: 13 }} />Customer Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
                  <Field label="Name" value={lead.customer_name || '—'} icon={faUser} dm={dm} />
                  <Field label="Email" value={lead.email} icon={faEnvelope} dm={dm} link={`mailto:${lead.email}`} />
                  <Field label="Phone" value={lead.phone || '—'} icon={faPhone} dm={dm} link={lead.phone ? `tel:${lead.phone}` : null} />
                  <Field label="Property Type" value={lead.property_type === 'residential' ? 'Residential' : lead.property_type === 'commercial' ? 'Commercial' : 'Other'} icon={lead.property_type === 'commercial' ? faBuilding : faHouse} dm={dm} />
                </div>
              </div>

              {/* Location */}
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: tp, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FontAwesomeIcon icon={faLocationDot} style={{ color: '#ef4444', fontSize: 13 }} />Location
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
                  <Field label="Address" value={lead.address || '—'} dm={dm} />
                  <Field label="City" value={lead.city_name || '—'} dm={dm} />
                  <Field label="ZIP Code" value={lead.zip || '—'} dm={dm} />
                  <Field label="State" value={lead.state_code || '—'} dm={dm} />
                </div>
              </div>

              {/* Service Request */}
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: tp, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FontAwesomeIcon icon={faClipboardList} style={{ color: '#8b5cf6', fontSize: 13 }} />Service Request
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
                  <Field label="Service" value={lead.service_name || '—'} icon={faBriefcase} dm={dm} />
                  <Field label="Urgency" value={lead.urgency?.replace('_', ' ') || '—'} icon={faClock} dm={dm} />
                  <Field label="Budget" value={lead.budget_min || lead.budget_max ? `$${lead.budget_min || '?'} – $${lead.budget_max || '?'}` : '—'} icon={faDollarSign} dm={dm} />
                  <Field label="Lead Value" value={`$${lead.lead_value}`} icon={faDollarSign} dm={dm} />
                  <Field label="Source" value={lead.source || 'website'} dm={dm} />
                  <Field label="Claims" value={`${lead.claim_count} / ${lead.max_claims}`} dm={dm} />
                </div>
                {lead.description && (
                  <div style={{ marginTop: 14, padding: 14, borderRadius: 8, background: dm ? '#1e293b' : '#f8fafc', border: `1px solid ${border}` }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: ts, display: 'block', marginBottom: 4 }}>Description</label>
                    <p style={{ fontSize: 13, color: tp, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{lead.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right sidebar – Tracking / Quick actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Priority & Follow-up */}
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: tp, marginBottom: 14 }}>Tracking</h3>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: ts, marginBottom: 4 }}>Priority</label>
                  <select value={editPriority} onChange={e => setEditPriority(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: `1px solid ${border}`, borderRadius: 8, background: inputBg, color: tp }}>
                    <option value="low">Low</option><option value="normal">Normal</option>
                    <option value="high">High</option><option value="urgent">Urgent</option>
                  </select>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: ts, marginBottom: 4 }}>Follow-up Date</label>
                  <input type="date" value={editFollowUp} onChange={e => setEditFollowUp(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: `1px solid ${border}`, borderRadius: 8, background: inputBg, color: tp, boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: ts, marginBottom: 4 }}>Tags</label>
                  <input type="text" value={editTags} onChange={e => setEditTags(e.target.value)} placeholder="e.g. vip, follow-up, hot"
                    style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: `1px solid ${border}`, borderRadius: 8, background: inputBg, color: tp, boxSizing: 'border-box' }} />
                </div>
                <Btn onClick={updateLeadFields} disabled={saving} small>
                  <FontAwesomeIcon icon={faFloppyDisk} />{saving ? 'Saving...' : 'Save Tracking'}
                </Btn>
              </div>

              {/* Quick add note */}
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: tp, marginBottom: 14 }}>Quick Note</h3>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {NOTE_TYPES.map(nt => (
                    <button key={nt.value} onClick={() => setNoteType(nt.value)} style={{
                      padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
                      border: noteType === nt.value ? '2px solid var(--color-primary)' : `1px solid ${border}`,
                      background: noteType === nt.value ? 'var(--color-primary)' : 'transparent',
                      color: noteType === nt.value ? '#fff' : ts, display: 'flex', alignItems: 'center', gap: 4,
                    }}><FontAwesomeIcon icon={nt.icon} style={{ fontSize: 10 }} />{nt.label}</button>
                  ))}
                </div>
                <textarea rows={3} value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Write a note..."
                  style={{ width: '100%', padding: 10, fontSize: 13, border: `1px solid ${border}`, borderRadius: 8, background: inputBg, color: tp, resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                <Btn onClick={addNote} disabled={saving || !noteContent.trim()} small style={{ marginTop: 8 }}>
                  <FontAwesomeIcon icon={faPlus} />Add Note
                </Btn>
              </div>

              {/* Timestamps */}
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: tp, marginBottom: 14 }}>Dates</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Field label="Created" value={fmtTime(lead.created_at)} dm={dm} />
                  <Field label="Last Updated" value={fmtTime(lead.updated_at)} dm={dm} />
                  {lead.follow_up_date && <Field label="Follow-up" value={fmtDate(lead.follow_up_date)} dm={dm} />}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════ NOTES TAB ════════════ */}
        {activeTab === 'notes' && (
          <div>
            {/* Add note form */}
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {NOTE_TYPES.map(nt => (
                  <button key={nt.value} onClick={() => setNoteType(nt.value)} style={{
                    padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
                    border: noteType === nt.value ? '2px solid var(--color-primary)' : `1px solid ${border}`,
                    background: noteType === nt.value ? 'var(--color-primary)' : 'transparent',
                    color: noteType === nt.value ? '#fff' : ts, display: 'flex', alignItems: 'center', gap: 5,
                  }}><FontAwesomeIcon icon={nt.icon} style={{ fontSize: 11 }} />{nt.label}</button>
                ))}
              </div>
              <textarea rows={3} value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Add a note, log a call, or record a follow-up..."
                style={{ width: '100%', padding: 12, fontSize: 13, border: `1px solid ${border}`, borderRadius: 8, background: inputBg, color: tp, resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <Btn onClick={addNote} disabled={saving || !noteContent.trim()}>
                  <FontAwesomeIcon icon={faPlus} />Add {NOTE_TYPES.find(n => n.value === noteType)?.label || 'Note'}
                </Btn>
              </div>
            </div>

            {/* Notes list */}
            {notes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: ts }}>
                <FontAwesomeIcon icon={faNoteSticky} style={{ fontSize: 32, marginBottom: 10, opacity: 0.4 }} />
                <p>No notes yet. Add the first one above.</p>
              </div>
            ) : notes.map(n => {
              const nt = NOTE_TYPES.find(t => t.value === n.note_type) || NOTE_TYPES[0];
              const isStatusChange = n.note_type === 'status_change';
              return (
                <div key={n.id} style={{
                  background: cardBg, border: `1px solid ${n.is_pinned ? 'var(--color-primary)' : border}`,
                  borderRadius: 8, padding: '14px 18px', marginBottom: 10, position: 'relative',
                  borderLeft: isStatusChange ? '4px solid #8b5cf6' : n.is_pinned ? '4px solid var(--color-primary)' : undefined,
                }}>
                  {n.is_pinned && <FontAwesomeIcon icon={faThumbtack} style={{ position: 'absolute', top: 10, right: 12, color: 'var(--color-primary)', fontSize: 11 }} />}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <FontAwesomeIcon icon={isStatusChange ? faArrowRightArrowLeft : nt.icon} style={{ color: isStatusChange ? '#8b5cf6' : 'var(--color-primary)', fontSize: 12 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: tp }}>{n.first_name || 'System'} {n.last_name || ''}</span>
                    {n.user_role && <Badge bg={dm ? '#334155' : '#f1f5f9'} color={ts}>{n.user_role}</Badge>}
                    <Badge bg={isStatusChange ? '#f3e8ff' : (dm ? '#334155' : '#f1f5f9')} color={isStatusChange ? '#8b5cf6' : ts}>
                      {isStatusChange ? 'Status Change' : nt.label}
                    </Badge>
                    <span style={{ fontSize: 11, color: ts, marginLeft: 'auto' }}>{timeAgo(n.created_at)}</span>
                  </div>
                  <p style={{ fontSize: 13, color: tp, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{n.content}</p>
                  {!isStatusChange && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <button onClick={() => togglePin(n.id, n.is_pinned)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: n.is_pinned ? 'var(--color-primary)' : ts, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FontAwesomeIcon icon={faThumbtack} />{n.is_pinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button onClick={() => deleteNote(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FontAwesomeIcon icon={faTrash} />Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ════════════ ACTIVITY TAB ════════════ */}
        {activeTab === 'activity' && (
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: tp, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FontAwesomeIcon icon={faHistory} style={{ color: 'var(--color-primary)', fontSize: 13 }} />Activity Log
            </h3>
            {activity.length === 0 ? (
              <p style={{ color: ts, textAlign: 'center', padding: 20 }}>No activity recorded yet.</p>
            ) : (
              <div style={{ position: 'relative', paddingLeft: 24 }}>
                <div style={{ position: 'absolute', left: 8, top: 4, bottom: 4, width: 2, background: border }} />
                {activity.map((a, i) => (
                  <div key={a.id || i} style={{ position: 'relative', marginBottom: 18, paddingLeft: 16 }}>
                    <div style={{
                      position: 'absolute', left: -20, top: 4, width: 18, height: 18, borderRadius: '50%',
                      background: a.action === 'lead_created' ? '#22c55e' : a.action === 'status_changed' ? '#8b5cf6' : a.action === 'lead_claimed' ? '#f59e0b' : 'var(--color-primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <FontAwesomeIcon icon={
                        a.action === 'lead_created' ? faPlus :
                        a.action === 'status_changed' ? faArrowRightArrowLeft :
                        a.action === 'lead_claimed' ? faStar :
                        a.action === 'note_added' ? faNoteSticky :
                        faCircle
                      } style={{ color: '#fff', fontSize: 8 }} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: tp }}>{a.first_name || 'System'} {a.last_name || ''}</span>
                        <span style={{ fontSize: 11, color: ts }}>{timeAgo(a.created_at)}</span>
                      </div>
                      <p style={{ fontSize: 12, color: ts, margin: '2px 0 0' }}>{a.details || a.action?.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════ MATCHES TAB ════════════ */}
        {activeTab === 'matches' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: 13, color: ts }}>
                {matches.length} pros matched • {matches.filter(m => m.status === 'accepted').length} accepted • {matches.filter(m => m.sms_sent).length} SMS sent
              </p>
              <Btn onClick={triggerMatch} disabled={triggeringMatch} small>
                <FontAwesomeIcon icon={triggeringMatch ? faSpinner : faRobot} spin={triggeringMatch} />
                {triggeringMatch ? 'Matching...' : 'Run Matching'}
              </Btn>
            </div>
            {matchLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}><FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 20, color: 'var(--color-primary)' }} /></div>
            ) : matches.length === 0 ? (
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: 40, textAlign: 'center', color: ts }}>
                <FontAwesomeIcon icon={faRobot} style={{ fontSize: 28, marginBottom: 12, opacity: 0.5 }} />
                <p>No matches yet. Click "Run Matching" to find pros for this lead.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {matches.map(m => {
                  const statusMap = {
                    pending:  { bg: '#e2e8f0', color: '#475569', label: 'Pending' },
                    notified: { bg: '#dbeafe', color: '#2563eb', label: 'SMS Sent' },
                    viewed:   { bg: '#fef9c3', color: '#a16207', label: 'Viewed' },
                    accepted: { bg: '#dcfce7', color: '#16a34a', label: 'Accepted' },
                    declined: { bg: '#fee2e2', color: '#dc2626', label: 'Declined' },
                    expired:  { bg: '#f1f5f9', color: '#94a3b8', label: 'Expired' },
                  };
                  const st = statusMap[m.status] || statusMap.pending;
                  return (
                    <div key={m.id} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                        #{m.match_rank}
                      </div>
                      <div style={{ flex: 1, minWidth: 150 }}>
                        <p style={{ fontWeight: 700, color: tp, fontSize: 14, marginBottom: 2 }}>{m.business_name}</p>
                        <p style={{ fontSize: 12, color: ts }}>{m.first_name} {m.last_name} • {m.email}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: ts }}>Score: <strong style={{ color: tp }}>{m.match_score}</strong></span>
                        {m.avg_rating > 0 && <span style={{ fontSize: 12, color: '#f59e0b' }}><FontAwesomeIcon icon={faStar} /> {m.avg_rating}</span>}
                        {m.sms_sent ? (
                          <Badge bg="#dbeafe" color="#2563eb"><FontAwesomeIcon icon={faPaperPlane} /> SMS</Badge>
                        ) : (
                          <Badge bg="#f1f5f9" color="#94a3b8">No SMS</Badge>
                        )}
                        <Badge bg={st.bg} color={st.color}>{st.label}</Badge>
                      </div>
                      {m.sms_sent_at && <p style={{ fontSize: 11, color: ts, width: '100%', paddingLeft: 50 }}>Sent: {new Date(m.sms_sent_at).toLocaleString()}{m.responded_at ? ` • Responded: ${new Date(m.responded_at).toLocaleString()}` : ''}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════ CLAIMS TAB ════════════ */}
        {activeTab === 'claims' && (
          <div>
            {claims.length === 0 ? (
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: 40, textAlign: 'center', color: ts }}>
                <FontAwesomeIcon icon={faBriefcase} style={{ fontSize: 32, marginBottom: 10, opacity: 0.4 }} />
                <p>No pros have claimed this lead yet.</p>
              </div>
            ) : claims.map(c => (
              <div key={c.id} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: 18, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: tp, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FontAwesomeIcon icon={faBriefcase} style={{ color: 'var(--color-primary)', fontSize: 13 }} />
                    {c.business_name}
                  </h4>
                  <div style={{ display: 'flex', gap: 14, marginTop: 4, fontSize: 12, color: ts }}>
                    <span><FontAwesomeIcon icon={faStar} style={{ color: '#facc15', marginRight: 4 }} />{c.avg_rating} ({c.total_reviews} reviews)</span>
                    <span><FontAwesomeIcon icon={faEnvelope} style={{ marginRight: 4 }} />{c.pro_email}</span>
                    {c.pro_phone && <span><FontAwesomeIcon icon={faPhone} style={{ marginRight: 4 }} />{c.pro_phone}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: tp }}>${c.price_paid}</div>
                  <div style={{ fontSize: 11, color: ts }}>{fmtTime(c.claimed_at)}</div>
                  <Badge bg={c.status === 'active' ? '#dcfce7' : '#fee2e2'} color={c.status === 'active' ? '#16a34a' : '#dc2626'}>{c.status || 'active'}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

function Field({ label, value, icon, dm, link }) {
  const tp = dm ? '#f1f5f9' : '#1e293b';
  const ts = dm ? '#94a3b8' : '#64748b';
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: ts, display: 'block', marginBottom: 2 }}>{label}</label>
      <div style={{ fontSize: 13, fontWeight: 500, color: tp, display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon && <FontAwesomeIcon icon={icon} style={{ color: 'var(--color-primary)', fontSize: 11, opacity: 0.6 }} />}
        {link ? <a href={link} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>{value}</a> : value}
      </div>
    </div>
  );
}
