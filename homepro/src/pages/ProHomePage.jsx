import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRocket, faShieldHalved, faChartLine, faCreditCard, faCircleCheck,
  faArrowRight, faStar, faLocationDot, faBolt, faHeadset,
  faPenToSquare, faEnvelopeOpenText, faCircleDollarToSlot,
  faUsers, faAward, faHandshake, faQuoteLeft,
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { getHowItWorks, getPlans } from '../services/api';

const PRO_STEPS_FALLBACK = [
  { step_number: 1, icon_class: 'faPenToSquare',        title: 'Create Your Profile',     description: 'Sign up, list your services, add photos of your work, and set up your business profile in minutes.' },
  { step_number: 2, icon_class: 'faLocationDot',        title: 'Set Your Service Area',   description: 'Choose the ZIP codes and cities you want to serve. Only receive leads from your target area.' },
  { step_number: 3, icon_class: 'faEnvelopeOpenText',   title: 'Receive Qualified Leads', description: 'Get notified instantly when a homeowner in your area requests your service.' },
  { step_number: 4, icon_class: 'faCircleDollarToSlot', title: 'Win More Business',       description: 'Respond fast, send a quote, and close the job. Build your reputation with every 5-star review.' },
];

const ICON_MAP = { faPenToSquare, faLocationDot, faEnvelopeOpenText, faCircleDollarToSlot, faRocket, faShieldHalved, faChartLine, faCreditCard, faStar, faBolt, faHeadset, faUsers, faAward, faHandshake };
function getIcon(name) { return ICON_MAP[name] || faCircleCheck; }

const STATS = [
  { value: '50,000+', label: 'Active Pros', icon: faUsers },
  { value: '2M+',     label: 'Jobs Completed', icon: faAward },
  { value: '4.8',     label: 'Avg Pro Rating', icon: faStar },
  { value: '92%',     label: 'Win Rate', icon: faChartLine },
];

const BENEFITS = [
  { icon: faLocationDot, title: 'Targeted Leads',     desc: 'Only receive leads from the ZIP codes and cities you choose. No wasted time or money.' },
  { icon: faBolt,        title: 'Instant Notifications', desc: 'Get notified the moment a homeowner submits a request matching your services.' },
  { icon: faCreditCard,  title: 'Flexible Pricing',   desc: 'Pay-per-lead or subscribe monthly. No contracts, cancel anytime.' },
  { icon: faShieldHalved,title: 'Verified Reviews',    desc: 'Build trust with verified customer reviews displayed on your public profile.' },
  { icon: faHeadset,     title: 'Dedicated Support',   desc: 'Our pro success team is here to help you maximize your leads and close more jobs.' },
  { icon: faHandshake,   title: 'Fair Competition',    desc: 'Each lead is shared with a maximum of 4 pros — giving you real odds of winning the job.' },
];

const TESTIMONIALS_BASE = [
  { name: 'Mike R.', biz: 'MR Plumbing Co.', textKey: 'gameChanger', stars: 5 },
  { name: 'Sarah T.', biz: 'Bright Spark Electric', text: 'The targeted ZIP code system means I only see leads in my area. No more driving an hour for a $50 job.', stars: 5 },
  { name: 'James L.', biz: 'LandscapePro LLC', text: 'Signed up as a free user, got my first lead in 2 hours, and closed a $3,200 job that same week.', stars: 5 },
];

export default function ProHomePage({ onProSignup, onNavigate }) {
  const { darkMode: dm } = useTheme();
  const { siteName } = useSettings();
  const [steps, setSteps] = useState(PRO_STEPS_FALLBACK);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    getHowItWorks('pro').then(d => { if (d?.length) setSteps(d); }).catch(() => {});
    getPlans().then(d => { if (Array.isArray(d)) setPlans(d); }).catch(() => {});
  }, []);

  const tp = dm ? '#f1f5f9' : '#111827';
  const ts = dm ? '#9ca3af' : '#6b7280';
  const border = dm ? '#1f2937' : '#e5e7eb';
  const cardBg = dm ? '#111827' : '#fff';
  const surfaceBg = dm ? '#0b1220' : '#f3f6fb';
  const accent = 'var(--color-accent)';

  const testimonials = TESTIMONIALS_BASE.map((t) =>
    t.textKey === 'gameChanger'
      ? { ...t, text: `${siteName} has been a game-changer. I get 15-20 qualified leads a month and my close rate is over 40%.` }
      : t
  );

  return (
    <div style={{ fontFamily: 'var(--font-family)', color: tp }}>

      {/* ═══ HERO ═══ */}
      <section className="px-4 py-12 sm:py-16 md:py-20 sm:px-6 lg:py-24" style={{
        background: dm
          ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
          : 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 30%, #fed7aa 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -120, right: -120, width: 400, height: 400, borderRadius: '50%', background: `${accent}15`, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 9999, fontSize: 13, fontWeight: 700,
            color: '#fff', background: accent, marginBottom: 20,
            boxShadow: '0 2px 8px rgba(249,115,22,0.3)',
          }}>
            <FontAwesomeIcon icon={faRocket} style={{ fontSize: 12 }} />
            FOR SERVICE PROFESSIONALS
          </div>

          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
            Grow your business with
            <span style={{ color: accent }}> qualified leads</span>
          </h1>
          <p style={{ fontSize: 18, color: ts, maxWidth: 560, margin: '0 auto 32px', lineHeight: 1.7 }}>
            Join thousands of professionals getting matched with homeowners in their area. Choose your ZIP codes, set your budget, and start winning jobs today.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={onProSignup} style={{
              padding: '14px 32px', fontSize: 15, fontWeight: 700, color: '#fff',
              background: accent, border: 'none', borderRadius: 'var(--border-radius)',
              cursor: 'pointer', boxShadow: '0 4px 16px rgba(249,115,22,0.35)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              Start Getting Leads <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: 13 }} />
            </button>
            <button onClick={() => {
              document.getElementById('pro-pricing')?.scrollIntoView({ behavior: 'smooth' });
            }} style={{
              padding: '14px 32px', fontSize: 15, fontWeight: 700,
              background: 'transparent', border: `2px solid ${dm ? '#475569' : '#d6d3d1'}`,
              borderRadius: 'var(--border-radius)', cursor: 'pointer', color: tp,
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

      {/* ═══ STATS BAR ═══ */}
      <section style={{ background: dm ? '#111827' : '#fff', borderBottom: `1px solid ${border}`, padding: '28px 16px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 24, textAlign: 'center' }}>
          {STATS.map(s => (
            <div key={s.label}>
              <FontAwesomeIcon icon={s.icon} style={{ color: accent, fontSize: 18, marginBottom: 6 }} />
              <div style={{ fontSize: 26, fontWeight: 800 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: ts }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section style={{ background: surfaceBg, padding: '80px 16px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 9999, fontSize: 12, fontWeight: 700, color: '#fff', background: accent, marginBottom: 12 }}>
              HOW IT WORKS
            </span>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Get started in 4 simple steps</h2>
            <p style={{ color: ts, maxWidth: 500, margin: '0 auto' }}>From sign-up to your first closed job — it takes most pros less than a week.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            {steps.map((s, i) => (
              <div key={i} style={{
                background: cardBg, border: `1px solid ${border}`, borderTop: `4px solid ${accent}`,
                borderRadius: 'var(--border-radius)', padding: 24,
                boxShadow: dm ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--border-radius)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: accent, color: '#fff', marginBottom: 14,
                  boxShadow: '0 4px 12px rgba(249,115,22,0.25)',
                }}>
                  <FontAwesomeIcon icon={getIcon(s.icon_class)} style={{ fontSize: 18 }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: accent, marginBottom: 4 }}>
                  Step {String(s.step_number).padStart(2, '0')}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: ts }}>{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BENEFITS ═══ */}
      <section style={{ background: dm ? '#111827' : '#fff', padding: '80px 16px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Why pros choose {siteName}</h2>
            <p style={{ color: ts, maxWidth: 480, margin: '0 auto' }}>Everything you need to grow your business, all in one platform.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {BENEFITS.map((b, i) => (
              <div key={i} style={{
                display: 'flex', gap: 14, padding: 20,
                background: dm ? '#1e293b' : '#f9fafb', borderRadius: 'var(--border-radius)',
                border: `1px solid ${border}`,
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 'var(--border-radius)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${accent}18`, color: accent, flexShrink: 0,
                }}>
                  <FontAwesomeIcon icon={b.icon} style={{ fontSize: 16 }} />
                </div>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{b.title}</h4>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: ts, margin: 0 }}>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pro-pricing" style={{ background: surfaceBg, padding: '80px 16px' }}>
        <div style={{ maxWidth: 950, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 9999, fontSize: 12, fontWeight: 700, color: '#fff', background: accent, marginBottom: 12 }}>
              PRICING
            </span>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Simple, transparent pricing</h2>
            <p style={{ color: ts, maxWidth: 440, margin: '0 auto' }}>Start free and upgrade as you grow. No hidden fees.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, alignItems: 'start' }}>
            {plans.length > 0 ? plans.map(p => {
              let features = [];
              try { features = typeof p.features === 'string' ? JSON.parse(p.features) : p.features; } catch {}
              if (!Array.isArray(features)) features = [];
              return (
                <div key={p.id} style={{
                  background: cardBg, border: p.is_popular ? `2px solid ${accent}` : `1px solid ${border}`,
                  borderRadius: 'var(--border-radius)', padding: '28px 24px', position: 'relative',
                  boxShadow: p.is_popular ? '0 8px 30px rgba(249,115,22,0.15)' : (dm ? 'none' : '0 1px 4px rgba(0,0,0,0.06)'),
                }}>
                  {p.is_popular && <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: accent, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 9999, textTransform: 'uppercase' }}>Most Popular</span>}
                  <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{p.name}</h3>
                  <div style={{ fontSize: 36, fontWeight: 900, margin: '8px 0' }}>
                    ${p.price_monthly}<span style={{ fontSize: 15, fontWeight: 500, color: ts }}>/mo</span>
                  </div>
                  <p style={{ fontSize: 13, color: ts, marginBottom: 18 }}>
                    {p.lead_credits} lead credits · {p.max_service_areas} areas
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px' }}>
                    {features.map((f, i) => (
                      <li key={i} style={{ fontSize: 13, color: ts, padding: '5px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FontAwesomeIcon icon={faCircleCheck} style={{ color: '#22c55e', fontSize: 12 }} />
                        {typeof f === 'string' ? f : f.label || f.name || JSON.stringify(f)}
                      </li>
                    ))}
                  </ul>
                  <button onClick={onProSignup} style={{
                    width: '100%', padding: '12px 0', fontSize: 14, fontWeight: 700, borderRadius: 'var(--border-radius)',
                    border: p.is_popular ? 'none' : `1px solid ${border}`, cursor: 'pointer',
                    background: p.is_popular ? accent : 'transparent',
                    color: p.is_popular ? '#fff' : tp,
                  }}>
                    {p.price_monthly > 0 ? 'Get Started' : 'Sign Up Free'}
                  </button>
                </div>
              );
            }) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: ts }}>
                <p>Loading pricing plans...</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section style={{ background: dm ? '#111827' : '#fff', padding: '80px 16px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>What pros are saying</h2>
            <p style={{ color: ts }}>Real results from real service professionals.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {testimonials.map((t, i) => (
              <div key={i} style={{
                background: dm ? '#1e293b' : '#f9fafb', border: `1px solid ${border}`,
                borderRadius: 'var(--border-radius)', padding: 24, position: 'relative',
              }}>
                <FontAwesomeIcon icon={faQuoteLeft} style={{ position: 'absolute', top: 16, right: 18, fontSize: 24, color: `${accent}25` }} />
                <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                  {[...Array(t.stars)].map((_, j) => <FontAwesomeIcon key={j} icon={faStar} style={{ color: '#facc15', fontSize: 13 }} />)}
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: ts, marginBottom: 16, fontStyle: 'italic' }}>"{t.text}"</p>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: ts }}>{t.biz}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section style={{
        background: dm
          ? 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)'
          : `linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)`,
        padding: '80px 16px', textAlign: 'center',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 30, fontWeight: 900, marginBottom: 16 }}>
            Ready to grow your business?
          </h2>
          <p style={{ fontSize: 16, color: ts, marginBottom: 28 }}>
            Join over 50,000 service professionals who trust {siteName} for qualified leads in their area.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={onProSignup} style={{
              padding: '14px 36px', fontSize: 15, fontWeight: 700, color: '#fff',
              background: accent, border: 'none', borderRadius: 'var(--border-radius)',
              cursor: 'pointer', boxShadow: '0 4px 16px rgba(249,115,22,0.35)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              Create Free Account <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: 13 }} />
            </button>
            <button onClick={() => onNavigate && onNavigate('home')} style={{
              padding: '14px 28px', fontSize: 15, fontWeight: 700,
              background: 'transparent', border: `2px solid ${dm ? '#475569' : '#d6d3d1'}`,
              borderRadius: 'var(--border-radius)', cursor: 'pointer', color: tp,
            }}>
              I'm a Homeowner
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
