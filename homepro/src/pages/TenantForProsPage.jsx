import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRocket, faShieldHalved, faChartLine, faCreditCard, faCircleCheck,
  faArrowRight, faStar, faLocationDot, faBolt, faHeadset,
  faPenToSquare, faEnvelopeOpenText, faCircleDollarToSlot,
  faUsers, faAward, faHandshake, faQuoteLeft, faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { getIcon } from '../lib/icons';
import ProSignupModal from '../components/ProSignupModal';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const PRO_STEPS_FALLBACK = [
  { step_number: 1, icon_class: 'faPenToSquare',        title: 'Create Your Profile',     description: 'Sign up, list your services, add photos of your work, and set up your business profile in minutes.' },
  { step_number: 2, icon_class: 'faLocationDot',      title: 'Set Your Service Area',   description: 'Choose the ZIP codes and cities you want to serve. Only receive leads from your target area.' },
  { step_number: 3, icon_class: 'faEnvelopeOpenText',  title: 'Receive Qualified Leads', description: 'Get notified instantly when a homeowner in your area requests your service.' },
  { step_number: 4, icon_class: 'faCircleDollarToSlot', title: 'Win More Business',       description: 'Respond fast, send a quote, and close the job. Build your reputation with every 5-star review.' },
];

const BENEFITS = [
  { icon: faLocationDot, title: 'Targeted Leads',        desc: 'Only receive leads from the ZIP codes and cities you choose. No wasted time or money.' },
  { icon: faBolt,        title: 'Instant Notifications', desc: 'Get notified the moment a homeowner submits a request matching your services.' },
  { icon: faCreditCard,  title: 'Flexible Pricing',     desc: 'Pay-per-lead or subscribe monthly. No contracts, cancel anytime.' },
  { icon: faShieldHalved, title: 'Verified Reviews',     desc: 'Build trust with verified customer reviews displayed on your public profile.' },
  { icon: faHeadset,     title: 'Dedicated Support',     desc: 'Our pro success team is here to help you maximize your leads and close more jobs.' },
  { icon: faHandshake,   title: 'Fair Competition',     desc: 'Each lead is shared with a maximum of 4 pros — giving you real odds of winning the job.' },
];

export default function TenantForProsPage({ slug, onNavigate, onProSignup }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showProModal, setShowProModal] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API}/tenant/${slug}/public`)
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.error || 'Not found')))
      .then(d => setData(d))
      .catch(e => setError(typeof e === 'string' ? e : 'Not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 36, color: '#3b82f6' }} />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: '#f8fafc' }}>
        <p style={{ fontSize: 18, fontWeight: 600, color: '#374151' }}>{error || 'Page not found'}</p>
        <button onClick={() => { window.location.hash = `#t/${slug}`; }} style={{ padding: '10px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
          Back to home
        </button>
      </div>
    );
  }

  const { tenant, settings, steps: stepsData, plans, proCount } = data;
  const siteName = settings?.site_name || tenant?.name || 'Us';
  const primary = settings?.theme_primary || settings?.color_primary || '#2563eb';
  const accent = settings?.theme_accent || settings?.color_accent || '#f59e0b';
  const steps = (stepsData?.pro && stepsData.pro.length > 0) ? stepsData.pro : PRO_STEPS_FALLBACK;
  const border = '#e5e7eb';
  const cardBg = '#fff';
  const surfaceBg = '#f3f6fb';
  const tp = '#111827';
  const ts = '#6b7280';

  const goToTenantHome = () => { window.location.hash = `#t/${slug}`; };
  const openProModal = () => setShowProModal(true);
  const tenantServices = data?.services?.map(s => ({ name: s.name })) || [];

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: tp }}>
      {showProModal && (
        <ProSignupModal
          services={tenantServices}
          tenantSlug={slug}
          onClose={() => setShowProModal(false)}
          onSuccess={() => {
            setShowProModal(false);
            onNavigate('pro-dashboard');
          }}
        />
      )}
      {/* Header — responsive padding, wraps on small screens */}
      <header className="sticky top-0 z-50 bg-white border-b flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-6" style={{ borderColor: border }}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div style={{ width: 36, height: 36, borderRadius: 8, background: primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
            {siteName.charAt(0).toUpperCase()}
          </div>
          <span className="font-bold text-base sm:text-lg text-gray-900 truncate">{siteName}</span>
          <span className="hidden sm:inline text-xs text-gray-500 font-semibold">— For Pros</span>
        </div>
        <button onClick={goToTenantHome} className="text-sm text-gray-500 border border-gray-300 rounded-md py-2 px-3 font-medium hover:bg-gray-50 whitespace-nowrap shrink-0">
          ← Back to home
        </button>
      </header>

      {/* Hero — responsive padding */}
      <section className="px-4 sm:px-6 py-12 sm:py-16 md:py-20 lg:py-24" style={{
        background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 30%, #fed7aa 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -120, right: -120, width: 400, height: 400, borderRadius: '50%', background: `${accent}15`, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 9999, fontSize: 13, fontWeight: 700,
            color: '#fff', background: accent, marginBottom: 20, boxShadow: '0 2px 8px rgba(249,115,22,0.3)',
          }}>
            <FontAwesomeIcon icon={faRocket} style={{ fontSize: 12 }} />
            FOR SERVICE PROFESSIONALS
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20, color: '#111827' }}>
            Grow your business with <span style={{ color: accent }}>qualified leads</span>
          </h1>
          <p style={{ fontSize: 18, color: ts, maxWidth: 560, margin: '0 auto 32px', lineHeight: 1.7 }}>
            Join {siteName} and get matched with homeowners in your area. Choose your ZIP codes, set your budget, and start winning jobs today.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={openProModal} style={{
              padding: '14px 32px', fontSize: 15, fontWeight: 700, color: '#fff', background: accent, border: 'none', borderRadius: 'var(--border-radius)', cursor: 'pointer', boxShadow: '0 4px 16px rgba(249,115,22,0.35)', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              Start Getting Leads <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: 13 }} />
            </button>
            <button onClick={() => document.getElementById('pro-pricing')?.scrollIntoView({ behavior: 'smooth' })} style={{
              padding: '14px 32px', fontSize: 15, fontWeight: 700, background: 'transparent', border: '2px solid #d6d3d1', borderRadius: 'var(--border-radius)', cursor: 'pointer', color: tp,
            }}>
              View Pricing
            </button>
          </div>
          <p style={{ fontSize: 13, color: ts, marginTop: 16 }}>
            <FontAwesomeIcon icon={faCircleCheck} style={{ color: '#22c55e', marginRight: 6 }} />
            Free to sign up · No contracts · Cancel anytime
          </p>
        </div>
      </section>

      {/* Stats */}
      <section style={{ background: '#fff', borderBottom: `1px solid ${border}`, padding: '28px 16px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 24, textAlign: 'center' }}>
          <div><FontAwesomeIcon icon={faUsers} style={{ color: accent, fontSize: 18, marginBottom: 6 }} /><div style={{ fontSize: 26, fontWeight: 800 }}>{proCount > 0 ? `${proCount}+` : '—'}</div><div style={{ fontSize: 13, color: ts }}>Active Pros</div></div>
          <div><FontAwesomeIcon icon={faAward} style={{ color: accent, fontSize: 18, marginBottom: 6 }} /><div style={{ fontSize: 26, fontWeight: 800 }}>2M+</div><div style={{ fontSize: 13, color: ts }}>Jobs Completed</div></div>
          <div><FontAwesomeIcon icon={faStar} style={{ color: accent, fontSize: 18, marginBottom: 6 }} /><div style={{ fontSize: 26, fontWeight: 800 }}>4.8</div><div style={{ fontSize: 13, color: ts }}>Avg Pro Rating</div></div>
          <div><FontAwesomeIcon icon={faChartLine} style={{ color: accent, fontSize: 18, marginBottom: 6 }} /><div style={{ fontSize: 26, fontWeight: 800 }}>92%</div><div style={{ fontSize: 13, color: ts }}>Win Rate</div></div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: surfaceBg, padding: '80px 16px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 9999, fontSize: 12, fontWeight: 700, color: '#fff', background: accent, marginBottom: 12 }}>HOW IT WORKS</span>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, color: tp }}>Get started in 4 simple steps</h2>
            <p style={{ color: ts, maxWidth: 500, margin: '0 auto' }}>From sign-up to your first closed job — it takes most pros less than a week.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            {steps.map((s, i) => (
              <div key={i} style={{
                background: cardBg, border: `1px solid ${border}`, borderTop: `4px solid ${accent}`,
                borderRadius: 'var(--border-radius)', padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--border-radius)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: accent, color: '#fff', marginBottom: 14, boxShadow: '0 4px 12px rgba(249,115,22,0.25)',
                }}>
                  <FontAwesomeIcon icon={getIcon(s.icon_class)} style={{ fontSize: 18 }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: accent, marginBottom: 4 }}>Step {String(s.step_number).padStart(2, '0')}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: tp }}>{s.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: ts }}>{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section style={{ background: '#fff', padding: '80px 16px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, color: tp }}>Why pros choose {siteName}</h2>
            <p style={{ color: ts, maxWidth: 480, margin: '0 auto' }}>Everything you need to grow your business, all in one platform.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {BENEFITS.map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: 20, background: '#f9fafb', borderRadius: 'var(--border-radius)', border: `1px solid ${border}` }}>
                <div style={{ width: 42, height: 42, borderRadius: 'var(--border-radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${accent}18`, color: accent, flexShrink: 0 }}>
                  <FontAwesomeIcon icon={b.icon} style={{ fontSize: 16 }} />
                </div>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: tp }}>{b.title}</h4>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: ts, margin: 0 }}>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — tenant plans: centered, 4 columns on large screens */}
      <section id="pro-pricing" style={{ background: surfaceBg, padding: '80px 16px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 9999, fontSize: 12, fontWeight: 700, color: '#fff', background: accent, marginBottom: 12 }}>PRICING</span>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, color: tp }}>Simple, transparent pricing</h2>
            <p style={{ color: ts, maxWidth: 440, margin: '0 auto' }}>Start free and upgrade as you grow. No hidden fees.</p>
          </div>
          <div className="tenant-for-pros-pricing-grid">
            {plans && plans.length > 0 ? plans.map(p => {
              let features = [];
              try { features = typeof p.features === 'string' ? JSON.parse(p.features) : (p.features || []); } catch {}
              if (!Array.isArray(features)) features = [];
              return (
                <div key={p.slug} style={{
                  background: cardBg, border: p.is_popular ? `2px solid ${accent}` : `1px solid ${border}`,
                  borderRadius: 'var(--border-radius)', padding: '28px 24px', position: 'relative',
                  boxShadow: p.is_popular ? '0 8px 30px rgba(249,115,22,0.15)' : '0 1px 4px rgba(0,0,0,0.06)',
                }}>
                  {p.is_popular && <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: accent, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 9999, textTransform: 'uppercase' }}>Most Popular</span>}
                  <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, color: tp }}>{p.name}</h3>
                  <div style={{ fontSize: 36, fontWeight: 900, margin: '8px 0', color: tp }}>${p.price_monthly}<span style={{ fontSize: 15, fontWeight: 500, color: ts }}>/mo</span></div>
                  <p style={{ fontSize: 13, color: ts, marginBottom: 18 }}>{p.lead_credits} lead credits · {p.max_service_areas || '—'} areas</p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px' }}>
                    {features.slice(0, 5).map((f, i) => (
                      <li key={i} style={{ fontSize: 13, color: ts, padding: '5px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FontAwesomeIcon icon={faCircleCheck} style={{ color: '#22c55e', fontSize: 12 }} />
                        {typeof f === 'string' ? f : (f.label || f.name || JSON.stringify(f))}
                      </li>
                    ))}
                  </ul>
                  <button onClick={openProModal} style={{
                    width: '100%', padding: '12px 0', fontSize: 14, fontWeight: 700, borderRadius: 'var(--border-radius)',
                    border: p.is_popular ? 'none' : `1px solid ${border}`, cursor: 'pointer',
                    background: p.is_popular ? accent : 'transparent', color: p.is_popular ? '#fff' : tp,
                  }}>
                    {p.price_monthly > 0 ? 'Get Started' : 'Sign Up Free'}
                  </button>
                </div>
              );
            }) : (
              <div style={{ width: '100%', flexBasis: '100%', textAlign: 'center', padding: 40, color: ts }}>
                <p>No plans configured yet. Contact {siteName} to get started.</p>
                <button onClick={openProModal} style={{
                  marginTop: 16, padding: '12px 24px', fontSize: 14, fontWeight: 700, borderRadius: 'var(--border-radius)',
                  border: 'none', cursor: 'pointer', background: accent, color: '#fff',
                }}>
                  Sign Up as a Pro
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', padding: '80px 16px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 30, fontWeight: 900, marginBottom: 16, color: tp }}>Ready to grow your business?</h2>
          <p style={{ fontSize: 16, color: ts, marginBottom: 28 }}>Join service professionals who trust {siteName} for qualified leads in their area.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={openProModal} style={{
              padding: '14px 36px', fontSize: 15, fontWeight: 700, color: '#fff', background: accent, border: 'none', borderRadius: 'var(--border-radius)', cursor: 'pointer', boxShadow: '0 4px 16px rgba(249,115,22,0.35)', display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto',
            }}>
              Create Free Account <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: 13 }} />
            </button>
            <button onClick={goToTenantHome} style={{
              padding: '14px 28px', fontSize: 15, fontWeight: 700, background: 'transparent', border: '2px solid #d6d3d1', borderRadius: 'var(--border-radius)', cursor: 'pointer', color: tp,
            }}>
              I'm a Homeowner
            </button>
          </div>
        </div>
      </section>

      <footer style={{ padding: '24px 16px', background: '#111827', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#6b7280' }}>&copy; {new Date().getFullYear()} {siteName}. All rights reserved.</p>
      </footer>
    </div>
  );
}
