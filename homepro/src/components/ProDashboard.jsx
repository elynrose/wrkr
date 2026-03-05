import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell, faLocationDot, faFilter, faChartLine,
  faEnvelope, faPhone, faClock, faCheckCircle,
  faSpinner, faCircleDollarToSlot, faUser,
  faCoins, faShoppingCart, faHistory, faArrowUp, faArrowDown,
  faStar, faGift, faRotate, faWrench, faChevronRight, faChevronLeft,
  faHourglassEnd, faEye, faBan, faHandshake, faPaperPlane,
  faExclamationTriangle, faDollarSign, faHome, faBriefcase,
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const tok = () => localStorage.getItem('hp_token');
const api = {
  get:  (p) => fetch(`${BASE}${p}`, { headers: { Authorization: `Bearer ${tok()}` } }).then(r => r.json()),
  post: (p, b) => fetch(`${BASE}${p}`, { method: 'POST', headers: { Authorization: `Bearer ${tok()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json()),
};

const MATCH_STATUS = {
  notified: { label: 'New Lead',   color: '#3b82f6', bg: '#dbeafe', icon: faPaperPlane,    actionable: true },
  viewed:   { label: 'Viewed',     color: '#f59e0b', bg: '#fef3c7', icon: faEye,           actionable: true },
  pending:  { label: 'Pending',    color: '#6366f1', bg: '#e0e7ff', icon: faClock,         actionable: true },
  accepted: { label: 'Claimed',    color: '#16a34a', bg: '#dcfce7', icon: faCheckCircle,   actionable: false },
  declined: { label: 'Passed',     color: '#94a3b8', bg: '#f1f5f9', icon: faBan,           actionable: false },
  expired:  { label: 'Expired',    color: '#ef4444', bg: '#fee2e2', icon: faHourglassEnd,  actionable: false },
};

const URGENCY_LABEL = {
  within_24h: 'Urgent — Within 24h', this_week: 'This Week',
  this_month: 'This Month', flexible: 'Flexible',
};

const TX_ICONS = {
  signup_bonus:   { icon: faGift,              color: '#22c55e' },
  plan_credits:   { icon: faStar,              color: '#3b82f6' },
  purchase:       { icon: faShoppingCart,       color: '#8b5cf6' },
  lead_claim:     { icon: faCircleDollarToSlot, color: '#ef4444' },
  refund:         { icon: faRotate,            color: '#22c55e' },
  admin_adjust:   { icon: faWrench,            color: '#f59e0b' },
  monthly_refill: { icon: faRotate,            color: '#06b6d4' },
  promo:          { icon: faGift,              color: '#ec4899' },
  expiry:         { icon: faClock,             color: '#94a3b8' },
};

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const ms = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function timeLeft(expiresAt) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m left`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m left`;
}

export default function ProDashboard({ onProSignup }) {
  const { darkMode: dm } = useTheme();
  const { user } = useAuth();
  const [tab, setTab] = useState('leads');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [claiming, setClaiming] = useState(null);
  const [expandedLead, setExpandedLead] = useState(null);

  const [creditData, setCreditData] = useState(null);
  const [bundles, setBundles] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [purchasing, setPurchasing] = useState(false);
  const [creditMsg, setCreditMsg] = useState('');

  const tp = dm ? '#f1f5f9' : '#1e293b';
  const ts = dm ? '#94a3b8' : '#64748b';
  const cardBg = dm ? '#111827' : '#fff';
  const border = dm ? '#1f2937' : '#e2e8f0';
  const surfaceBg = dm ? '#0a0f1a' : '#f0f4f8';

  const flash = (m) => { setCreditMsg(m); setTimeout(() => setCreditMsg(''), 4000); };

  useEffect(() => {
    api.get('/matching/my-leads')
      .then(d => setLeads(Array.isArray(d) ? d : []))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
    api.get('/credits/balance').then(setCreditData).catch(() => {});
    api.get('/credits/bundles').then(d => setBundles(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'credits') fetchHistory();
  }, [tab, historyPage]);

  const fetchHistory = () => {
    api.get(`/credits/history?page=${historyPage}&limit=20`).then(d => {
      setHistory(d.transactions || []);
      setHistoryTotal(d.total || 0);
    }).catch(() => {});
  };

  const claimLead = async (token) => {
    setClaiming(token);
    try {
      const r = await api.post(`/matching/claim/${token}`);
      if (r.success) {
        flash('Lead claimed! Customer info is now visible.');
        setLeads(ls => ls.map(l => l.claim_token === token ? { ...l, match_status: 'accepted' } : l));
        api.get('/credits/balance').then(setCreditData);
      } else {
        flash(r.error || 'Claim failed');
      }
    } catch { flash('Failed to claim lead'); }
    finally { setClaiming(null); }
  };

  const declineLead = async (token) => {
    try {
      await api.post(`/matching/decline/${token}`);
      setLeads(ls => ls.map(l => l.claim_token === token ? { ...l, match_status: 'declined' } : l));
      flash('Lead passed. No credit deducted.');
    } catch { flash('Failed to decline'); }
  };

  const purchaseBundle = async (bundleId) => {
    setPurchasing(true);
    try {
      const r = await api.post('/credits/purchase', { bundleId });
      if (r.url) { window.location.href = r.url; }
      else if (r.success) { flash(`${r.message} — Balance: ${r.balance}`); api.get('/credits/balance').then(setCreditData); fetchHistory(); }
    } catch { flash('Purchase failed'); }
    finally { setPurchasing(false); }
  };

  // Counts by match status
  const counts = {};
  for (const l of leads) { counts[l.match_status] = (counts[l.match_status] || 0) + 1; }
  const actionable = leads.filter(l => MATCH_STATUS[l.match_status]?.actionable).length;
  const filtered = filter === 'all' ? leads : leads.filter(l => l.match_status === filter);

  const balance = creditData?.balance ?? '—';
  const isUnlimited = creditData?.isUnlimited;

  return (
    <div style={{ background: surfaceBg, minHeight: '100vh', padding: '32px 16px', fontFamily: 'inherit' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: tp, margin: 0 }}>Pro Dashboard</h1>
            <p style={{ fontSize: 13, color: ts, marginTop: 4 }}>Welcome back{user?.firstName ? `, ${user.firstName}` : ''}</p>
          </div>
          {!user?.role && (
            <button onClick={onProSignup} style={{ padding: '10px 18px', fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--color-accent)', border: 'none', borderRadius: 'var(--border-radius)', cursor: 'pointer' }}>
              + Create New Account
            </button>
          )}
        </div>

        {/* Credit Balance Banner */}
        <div style={{
          background: `linear-gradient(135deg, ${dm ? '#1e3a5f' : '#eff6ff'}, ${dm ? '#1e293b' : '#f0fdf4'})`,
          border: `1px solid ${dm ? '#334155' : '#bfdbfe'}`, borderRadius: 'var(--border-radius)', padding: '20px 24px', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: isUnlimited ? '#22c55e' : 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FontAwesomeIcon icon={faCoins} style={{ fontSize: 20 }} />
            </div>
            <div>
              <p style={{ fontSize: 28, fontWeight: 800, color: tp, lineHeight: 1 }}>{isUnlimited ? '∞' : balance}</p>
              <p style={{ fontSize: 12, color: ts, marginTop: 2 }}>
                {isUnlimited ? 'Unlimited Credits (Enterprise)' : 'Lead Credits Available'}
                {creditData?.planName && !isUnlimited && ` · ${creditData.planName} Plan`}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {creditData?.stats && !isUnlimited && (
              <div style={{ display: 'flex', gap: 12 }}>
                <MiniStat label="Earned" value={creditData.stats.totalEarned} icon={faArrowUp} color="#22c55e" dm={dm} />
                <MiniStat label="Spent" value={creditData.stats.totalSpent} icon={faArrowDown} color="#ef4444" dm={dm} />
                <MiniStat label="Claims" value={creditData.stats.leadsClaimed} icon={faCircleDollarToSlot} color="#8b5cf6" dm={dm} />
              </div>
            )}
            {!isUnlimited && (
              <button onClick={() => setTab('credits')} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, border: 'none', borderRadius: 'var(--border-radius)', background: 'var(--color-primary)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FontAwesomeIcon icon={faShoppingCart} /> Buy Credits
              </button>
            )}
          </div>
        </div>

        {creditMsg && (
          <div style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FontAwesomeIcon icon={faCheckCircle} />{creditMsg}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `2px solid ${border}` }}>
          {[
            { key: 'leads', label: `Leads${actionable ? ` (${actionable} new)` : ''}`, icon: faBell },
            { key: 'credits', label: 'Credits', icon: faCoins },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none',
              background: tab === t.key ? 'var(--color-primary)' : 'transparent',
              color: tab === t.key ? '#fff' : ts, borderRadius: '8px 8px 0 0',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <FontAwesomeIcon icon={t.icon} /> {t.label}
            </button>
          ))}
        </div>

        {/* ═══════ LEADS TAB ═══════ */}
        {tab === 'leads' && <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
            <StatCard label="Total Matched" value={leads.length} icon={faBell} color="var(--color-primary)" dm={dm} />
            <StatCard label="Actionable" value={actionable} icon={faPaperPlane} color="#3b82f6" dm={dm} />
            <StatCard label="Claimed" value={counts.accepted || 0} icon={faHandshake} color="#22c55e" dm={dm} />
            <StatCard label="Expired" value={counts.expired || 0} icon={faHourglassEnd} color="#ef4444" dm={dm} />
          </div>

          {/* Filter bar */}
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 'var(--border-radius)', padding: '10px 14px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
            <FontAwesomeIcon icon={faFilter} style={{ color: ts, fontSize: 13 }} />
            {['all', 'notified', 'viewed', 'pending', 'accepted', 'declined', 'expired'].map(s => {
              const ms = MATCH_STATUS[s];
              return (
                <button key={s} onClick={() => setFilter(s)} style={{
                  padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 20, border: 'none', cursor: 'pointer',
                  background: filter === s ? (ms?.color || 'var(--color-primary)') : 'transparent',
                  color: filter === s ? '#fff' : ts,
                }}>
                  {s === 'all' ? 'All' : ms?.label || s} {s !== 'all' && `(${counts[s] || 0})`}
                </button>
              );
            })}
          </div>

          {/* Lead Cards */}
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 24, color: 'var(--color-primary)' }} />
              <p style={{ color: ts, marginTop: 12 }}>Loading matched leads...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 'var(--border-radius)', padding: 60, textAlign: 'center' }}>
              <FontAwesomeIcon icon={faBell} style={{ fontSize: 32, color: ts, opacity: 0.4, marginBottom: 12 }} />
              <p style={{ fontWeight: 700, color: tp, fontSize: 16 }}>No {filter !== 'all' ? MATCH_STATUS[filter]?.label?.toLowerCase() + ' ' : ''}leads</p>
              <p style={{ color: ts, fontSize: 13, marginTop: 4 }}>
                {filter === 'all'
                  ? 'When homeowners in your area request your services, matched leads will appear here.'
                  : 'Try a different filter to see other leads.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map(lead => {
                const ms = MATCH_STATUS[lead.match_status] || MATCH_STATUS.pending;
                const isExpanded = expandedLead === lead.match_id;
                const remaining = timeLeft(lead.expires_at);
                const isUrgent = lead.urgency === 'within_24h';
                const spotsLeft = Math.max(0, (lead.max_claims || 3) - (lead.claim_count || 0));
                const showContact = lead.match_status === 'accepted';

                return (
                  <div key={lead.match_id} style={{
                    background: cardBg,
                    border: `1px solid ${ms.actionable ? ms.color + '44' : border}`,
                    borderRadius: 'var(--border-radius)', overflow: 'hidden',
                    borderLeft: `4px solid ${ms.color}`,
                    transition: 'box-shadow 0.15s',
                  }}
                    onMouseEnter={e => { if (ms.actionable) e.currentTarget.style.boxShadow = `0 4px 16px ${ms.color}18`; }}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                  >
                    {/* Main row */}
                    <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', cursor: 'pointer' }}
                         onClick={() => setExpandedLead(isExpanded ? null : lead.match_id)}>

                      {/* Status icon */}
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: ms.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FontAwesomeIcon icon={ms.icon} style={{ color: ms.color, fontSize: 16 }} />
                      </div>

                      {/* Service + location */}
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <p style={{ fontWeight: 700, color: tp, fontSize: 15, margin: 0 }}>{lead.service_name}</p>
                          {isUrgent && <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', background: '#fee2e2', padding: '2px 8px', borderRadius: 10 }}>URGENT</span>}
                        </div>
                        <p style={{ fontSize: 12, color: ts, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FontAwesomeIcon icon={faLocationDot} style={{ color: 'var(--color-primary)', fontSize: 11 }} />
                          {lead.city_name ? `${lead.city_name}, ` : ''}{lead.zip}
                          <span style={{ margin: '0 4px', opacity: 0.3 }}>·</span>
                          {timeAgo(lead.matched_at)}
                        </p>
                      </div>

                      {/* Meta badges */}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {ms.actionable && remaining && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: remaining === 'Expired' ? '#ef4444' : '#f59e0b', background: remaining === 'Expired' ? '#fee2e2' : '#fef3c7', padding: '3px 10px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <FontAwesomeIcon icon={faClock} style={{ fontSize: 10 }} />{remaining}
                          </span>
                        )}
                        {ms.actionable && spotsLeft <= 2 && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', background: '#fee2e2', padding: '3px 10px', borderRadius: 10 }}>
                            {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
                          </span>
                        )}
                        <span style={{ fontSize: 11, fontWeight: 700, color: ms.color, background: ms.bg, padding: '3px 10px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FontAwesomeIcon icon={ms.icon} style={{ fontSize: 10 }} />{ms.label}
                        </span>
                      </div>

                      {/* Actions (only for actionable) */}
                      {ms.actionable && (
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => claimLead(lead.claim_token)} disabled={claiming === lead.claim_token || spotsLeft === 0}
                            style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, border: 'none', borderRadius: 'var(--border-radius)', background: spotsLeft === 0 ? '#94a3b8' : '#22c55e', color: '#fff', cursor: spotsLeft === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, opacity: claiming === lead.claim_token ? 0.6 : 1 }}>
                            {claiming === lead.claim_token ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faCheckCircle} />}
                            {spotsLeft === 0 ? 'Full' : 'Claim'}
                          </button>
                          <button onClick={() => declineLead(lead.claim_token)}
                            style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600, border: `1px solid ${border}`, borderRadius: 'var(--border-radius)', background: 'transparent', color: ts, cursor: 'pointer' }}>
                            Pass
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${border}` }}>
                        <div style={{ paddingTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                          {lead.description && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <label style={{ fontSize: 11, fontWeight: 700, color: ts, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Project Details</label>
                              <p style={{ fontSize: 13, color: tp, lineHeight: 1.6, marginTop: 4 }}>{lead.description}</p>
                            </div>
                          )}
                          <DetailField label="Urgency" value={URGENCY_LABEL[lead.urgency] || lead.urgency || '—'} icon={faClock} dm={dm} />
                          <DetailField label="Property" value={lead.property_type || 'Residential'} icon={faHome} dm={dm} />
                          {(lead.budget_min || lead.budget_max) && (
                            <DetailField label="Budget" value={`$${lead.budget_min || 0}${lead.budget_max ? ` – $${lead.budget_max}` : '+'}`} icon={faDollarSign} dm={dm} />
                          )}
                          <DetailField label="Match Score" value={`${lead.match_score}/100`} icon={faStar} dm={dm} />
                          <DetailField label="Lead Value" value={`$${lead.lead_value || '—'}`} icon={faCircleDollarToSlot} dm={dm} />
                          <DetailField label="Lead Created" value={new Date(lead.lead_created_at).toLocaleDateString()} icon={faBriefcase} dm={dm} />

                          {/* Customer contact — only show if claimed */}
                          {showContact && (
                            <>
                              <div style={{ gridColumn: '1 / -1', marginTop: 8, padding: '14px 18px', background: dm ? '#0f2e1f' : '#f0fdf4', border: `1px solid ${dm ? '#166534' : '#bbf7d0'}`, borderRadius: 10 }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginBottom: 8 }}>
                                  <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: 6 }} />Customer Contact Info (Claimed)
                                </p>
                                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13 }}>
                                  <span style={{ color: tp }}><FontAwesomeIcon icon={faUser} style={{ marginRight: 6, color: ts }} />{lead.customer_name || 'N/A'}</span>
                                  <span style={{ color: tp }}><FontAwesomeIcon icon={faEnvelope} style={{ marginRight: 6, color: ts }} />{lead.customer_email}</span>
                                  {lead.customer_phone && <span style={{ color: tp }}><FontAwesomeIcon icon={faPhone} style={{ marginRight: 6, color: ts }} />{lead.customer_phone}</span>}
                                </div>
                              </div>
                            </>
                          )}

                          {!showContact && ms.actionable && (
                            <div style={{ gridColumn: '1 / -1', marginTop: 4, padding: '10px 14px', background: dm ? '#1e293b' : '#eff6ff', border: `1px solid ${dm ? '#334155' : '#bfdbfe'}`, borderRadius: 8, fontSize: 12, color: dm ? '#93c5fd' : '#1d4ed8' }}>
                              <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight: 6 }} />
                              Customer contact details will be revealed after you claim this lead.
                            </div>
                          )}

                          {lead.match_status === 'expired' && (
                            <div style={{ gridColumn: '1 / -1', marginTop: 4, padding: '10px 14px', background: dm ? '#2d1b1b' : '#fef2f2', border: `1px solid ${dm ? '#7f1d1d' : '#fecaca'}`, borderRadius: 8, fontSize: 12, color: '#ef4444' }}>
                              <FontAwesomeIcon icon={faHourglassEnd} style={{ marginRight: 6 }} />
                              This lead has expired. {lead.expires_at ? `It expired on ${new Date(lead.expires_at).toLocaleString()}.` : ''} You were not charged.
                            </div>
                          )}

                          {lead.match_status === 'declined' && (
                            <div style={{ gridColumn: '1 / -1', marginTop: 4, padding: '10px 14px', background: dm ? '#1e293b' : '#f1f5f9', border: `1px solid ${border}`, borderRadius: 8, fontSize: 12, color: ts }}>
                              <FontAwesomeIcon icon={faBan} style={{ marginRight: 6 }} />
                              You passed on this lead{lead.responded_at ? ` on ${new Date(lead.responded_at).toLocaleString()}` : ''}. No credit was deducted.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>}

        {/* ═══════ CREDITS TAB ═══════ */}
        {tab === 'credits' && <>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: tp, marginBottom: 12 }}>Buy Lead Credits</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {bundles.map(b => (
                <div key={b.id} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 'var(--border-radius)', padding: 20, display: 'flex', flexDirection: 'column', gap: 10, transition: 'border-color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = border; }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 18, fontWeight: 800, color: tp }}>{b.credits} Credits</p>
                      <p style={{ fontSize: 12, color: ts }}>${b.pricePerCredit.toFixed(2)} per credit</p>
                    </div>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: dm ? '#1e293b' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FontAwesomeIcon icon={faCoins} style={{ color: '#f59e0b', fontSize: 18 }} />
                    </div>
                  </div>
                  <div style={{ borderTop: `1px solid ${border}`, paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-primary)' }}>${b.price.toFixed(2)}</p>
                    <button onClick={() => purchaseBundle(b.id)} disabled={purchasing} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, border: 'none', borderRadius: 'var(--border-radius)', background: 'var(--color-primary)', color: '#fff', cursor: purchasing ? 'not-allowed' : 'pointer', opacity: purchasing ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 5 }}>
                      {purchasing ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faShoppingCart} />} Buy
                    </button>
                  </div>
                  {b.credits >= 50 && (
                    <div style={{ background: dm ? '#1e3a2e' : '#f0fdf4', borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 600, color: '#16a34a', textAlign: 'center' }}>
                      Save {Math.round((1 - b.pricePerCredit / 3) * 100)}% vs single credits
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: tp }}><FontAwesomeIcon icon={faHistory} style={{ marginRight: 6 }} />Credit History</h3>
              <p style={{ fontSize: 12, color: ts }}>{historyTotal} transactions</p>
            </div>
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 'var(--border-radius)', overflow: 'hidden' }}>
              {history.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: ts }}>
                  <FontAwesomeIcon icon={faHistory} style={{ fontSize: 24, marginBottom: 8, opacity: 0.4 }} />
                  <p>No transactions yet</p>
                </div>
              ) : (
                <>
                  {history.map(tx => {
                    const icon = TX_ICONS[tx.type] || TX_ICONS.purchase;
                    const isPositive = tx.amount > 0;
                    return (
                      <div key={tx.id} style={{ padding: '14px 18px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${icon.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FontAwesomeIcon icon={icon.icon} style={{ color: icon.color, fontSize: 14 }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, color: tp, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {tx.description || tx.type.replace(/_/g, ' ')}
                          </p>
                          <p style={{ fontSize: 11, color: ts }}>
                            {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontSize: 16, fontWeight: 800, color: isPositive ? '#22c55e' : '#ef4444' }}>{isPositive ? '+' : ''}{tx.amount}</p>
                          <p style={{ fontSize: 11, color: ts }}>Bal: {tx.balance_after}</p>
                        </div>
                      </div>
                    );
                  })}
                  {historyTotal > 20 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '12px 0' }}>
                      <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage <= 1}
                        style={{ padding: '6px 12px', fontSize: 12, border: `1px solid ${border}`, borderRadius: 6, background: cardBg, color: tp, cursor: historyPage <= 1 ? 'not-allowed' : 'pointer', opacity: historyPage <= 1 ? 0.4 : 1 }}>
                        <FontAwesomeIcon icon={faChevronLeft} /> Prev
                      </button>
                      <span style={{ fontSize: 12, color: ts }}>Page {historyPage} of {Math.ceil(historyTotal / 20)}</span>
                      <button onClick={() => setHistoryPage(p => p + 1)} disabled={historyPage * 20 >= historyTotal}
                        style={{ padding: '6px 12px', fontSize: 12, border: `1px solid ${border}`, borderRadius: 6, background: cardBg, color: tp, cursor: historyPage * 20 >= historyTotal ? 'not-allowed' : 'pointer', opacity: historyPage * 20 >= historyTotal ? 0.4 : 1 }}>
                        Next <FontAwesomeIcon icon={faChevronRight} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, dm }) {
  return (
    <div style={{ background: dm ? '#111827' : '#fff', border: `1px solid ${dm ? '#1f2937' : '#e2e8f0'}`, borderRadius: 'var(--border-radius)', padding: '16px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <FontAwesomeIcon icon={icon} style={{ fontSize: 16 }} />
      </div>
      <div>
        <p style={{ fontSize: 22, fontWeight: 800, color: dm ? '#f1f5f9' : '#1e293b' }}>{value}</p>
        <p style={{ fontSize: 12, color: dm ? '#94a3b8' : '#64748b' }}>{label}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon, color, dm }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: dm ? '#1e293b' : '#fff', border: `1px solid ${dm ? '#334155' : '#e2e8f0'}`, borderRadius: 8, padding: '6px 12px' }}>
      <FontAwesomeIcon icon={icon} style={{ color, fontSize: 12 }} />
      <div>
        <p style={{ fontSize: 14, fontWeight: 700, color: dm ? '#f1f5f9' : '#1e293b' }}>{value}</p>
        <p style={{ fontSize: 10, color: dm ? '#94a3b8' : '#64748b' }}>{label}</p>
      </div>
    </div>
  );
}

function DetailField({ label, value, icon, dm }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: dm ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 4 }}>
        <FontAwesomeIcon icon={icon} style={{ fontSize: 10 }} />{label}
      </label>
      <p style={{ fontSize: 14, fontWeight: 600, color: dm ? '#f1f5f9' : '#1e293b', marginTop: 2 }}>{value}</p>
    </div>
  );
}
