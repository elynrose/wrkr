import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle, faTimesCircle, faSpinner, faExclamationTriangle,
  faMapMarkerAlt, faClock, faDollarSign, faHome, faBriefcase,
  faShieldHalved, faStar, faArrowRight, faBan,
} from '@fortawesome/free-solid-svg-icons';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function ClaimPage({ token, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch(`${BASE}/matching/claim/${token}`)
      .then(async r => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || 'Invalid link');
        return json;
      })
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const r = await fetch(`${BASE}/matching/claim/${token}`, { method: 'POST' });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || 'Claim failed');
      setResult({ type: 'success', msg: json.message || 'Lead claimed! The customer info will be shared with you.' });
    } catch (e) {
      setResult({ type: 'error', msg: e.message });
    } finally {
      setClaiming(false);
    }
  };

  const handleDecline = async () => {
    setDeclining(true);
    try {
      await fetch(`${BASE}/matching/decline/${token}`, { method: 'POST' });
      setResult({ type: 'declined', msg: 'You\'ve passed on this lead. You won\'t be charged.' });
    } catch {
      setResult({ type: 'error', msg: 'Failed to decline' });
    } finally {
      setDeclining(false);
    }
  };

  const bg = '#f0f4f8';
  const card = '#fff';

  if (loading) return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 36, color: 'var(--color-primary)', marginBottom: 16 }} />
        <p style={{ color: '#64748b', fontSize: 15 }}>Loading lead details...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: card, borderRadius: 16, padding: '48px 32px', maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <FontAwesomeIcon icon={faExclamationTriangle} style={{ fontSize: 28, color: '#ef4444' }} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Link Not Available</h2>
        <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>{error}</p>
        <button onClick={() => onNavigate?.('home')} style={{ ...btnStyle, background: 'var(--color-primary)', color: '#fff', marginTop: 24 }}>
          Go to HomePro <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: 6 }} />
        </button>
      </div>
    </div>
  );

  if (result) return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: card, borderRadius: 16, padding: '48px 32px', maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
          background: result.type === 'success' ? '#dcfce7' : result.type === 'declined' ? '#fef3c7' : '#fef2f2',
        }}>
          <FontAwesomeIcon
            icon={result.type === 'success' ? faCheckCircle : result.type === 'declined' ? faBan : faTimesCircle}
            style={{ fontSize: 32, color: result.type === 'success' ? '#16a34a' : result.type === 'declined' ? '#d97706' : '#ef4444' }}
          />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>
          {result.type === 'success' ? 'Lead Claimed!' : result.type === 'declined' ? 'Lead Declined' : 'Something Went Wrong'}
        </h2>
        <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>{result.msg}</p>
        {result.type === 'success' && (
          <p style={{ color: '#475569', fontSize: 13, marginTop: 16, background: '#f0fdf4', padding: '12px 16px', borderRadius: 8, lineHeight: 1.5 }}>
            The customer's full contact info is now available in your Pro Dashboard. Reach out quickly — pros who respond within 1 hour close 3x more jobs.
          </p>
        )}
        <button onClick={() => onNavigate?.('home')} style={{ ...btnStyle, background: 'var(--color-primary)', color: '#fff', marginTop: 24 }}>
          Go to HomePro <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: 6 }} />
        </button>
      </div>
    </div>
  );

  const m = data.match;
  const spotsLeft = Math.max(0, m.maxClaims - m.claimCount);
  const urgencyMap = { within_24h: 'Within 24 Hours', this_week: 'This Week', this_month: 'This Month', flexible: 'Flexible' };

  return (
    <div style={{ minHeight: '100vh', background: bg, padding: '24px 16px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>H</div>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>Home<span style={{ color: 'var(--color-primary)' }}>Pro</span></span>
          </div>
          <p style={{ fontSize: 13, color: '#64748b' }}>Hi {m.proFirstName}! You have a new lead waiting.</p>
        </div>

        {/* Lead card */}
        <div style={{ background: card, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', marginBottom: 16 }}>
          {/* Service name header */}
          <div style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark, #1d4ed8))', padding: '24px 24px 20px', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <FontAwesomeIcon icon={faBriefcase} style={{ fontSize: 18 }} />
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{m.serviceName}</h2>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, opacity: 0.9 }}>
              <span><FontAwesomeIcon icon={faMapMarkerAlt} style={{ marginRight: 4 }} />{m.cityName ? `${m.cityName}, ` : ''}{m.zip}</span>
              {m.urgency && <span><FontAwesomeIcon icon={faClock} style={{ marginRight: 4 }} />{urgencyMap[m.urgency] || m.urgency}</span>}
            </div>
          </div>

          {/* Details */}
          <div style={{ padding: 24 }}>
            {m.description && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project Details</label>
                <p style={{ color: '#334155', fontSize: 14, lineHeight: 1.6, marginTop: 6 }}>{m.description}</p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {m.budgetMin && (
                <InfoBox icon={faDollarSign} label="Budget" value={`$${m.budgetMin}${m.budgetMax ? ` – $${m.budgetMax}` : '+'}`} />
              )}
              <InfoBox icon={faHome} label="Property" value={m.propertyType || 'Residential'} />
              <InfoBox icon={faStar} label="Match Score" value={`${m.matchScore}/100`} />
              <InfoBox icon={faShieldHalved} label="Spots Left" value={`${spotsLeft} of ${m.maxClaims}`} accent={spotsLeft <= 1} />
            </div>

            {m.leadValue && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FontAwesomeIcon icon={faDollarSign} />
                <span>This lead costs <strong>1 credit</strong> (value: ${m.leadValue})</span>
              </div>
            )}

            {/* Urgency warning */}
            {spotsLeft <= 1 && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <span><strong>Hurry!</strong> Only {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} remaining for this lead.</span>
              </div>
            )}

            {/* Expiry */}
            {m.expiresAt && (
              <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginBottom: 20 }}>
                Link expires: {new Date(m.expiresAt).toLocaleString()}
              </p>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleClaim} disabled={claiming || spotsLeft === 0} style={{
                ...btnStyle, flex: 2,
                background: spotsLeft === 0 ? '#94a3b8' : 'var(--color-primary)',
                color: '#fff', fontSize: 16, padding: '14px 20px', fontWeight: 700,
                cursor: spotsLeft === 0 ? 'not-allowed' : 'pointer',
              }}>
                {claiming ? <><FontAwesomeIcon icon={faSpinner} spin /> Claiming...</>
                  : spotsLeft === 0 ? 'No Spots Left'
                  : <><FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: 6 }} />Claim This Lead</>}
              </button>
              <button onClick={handleDecline} disabled={declining} style={{
                ...btnStyle, flex: 1,
                background: '#f1f5f9', color: '#64748b', fontSize: 14, padding: '14px 16px',
              }}>
                {declining ? '...' : 'Pass'}
              </button>
            </div>
          </div>
        </div>

        {/* Trust footer */}
        <div style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
          <p>You're receiving this because you opted in to SMS lead notifications on HomePro.</p>
          <p>Reply STOP to any SMS to unsubscribe.</p>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ icon, label, value, accent }) {
  return (
    <div style={{
      background: accent ? '#fef2f2' : '#f8fafc', borderRadius: 10, padding: '10px 14px',
      border: `1px solid ${accent ? '#fecaca' : '#e2e8f0'}`,
    }}>
      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
        <FontAwesomeIcon icon={icon} style={{ marginRight: 4 }} />{label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: accent ? '#dc2626' : '#1e293b' }}>{value}</div>
    </div>
  );
}

const btnStyle = {
  border: 'none', borderRadius: 10, cursor: 'pointer',
  fontFamily: 'inherit', transition: 'all 0.15s',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
};
