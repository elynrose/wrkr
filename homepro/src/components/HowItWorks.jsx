import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faRocket } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { getIcon } from '../lib/icons';
import { getHowItWorks } from '../services/api';

const CONSUMER_FALLBACK = [
  { step_number: 1, icon_class: 'faClipboardList',  title: 'Describe Your Project',  description: 'Tell us what you need — service type, details, and your ZIP code. Takes less than 2 minutes.' },
  { step_number: 2, icon_class: 'faMagnifyingGlass', title: 'Get Matched Instantly',  description: 'We instantly match you with verified local pros in your area who specialize in exactly what you need.' },
  { step_number: 3, icon_class: 'faComments',        title: 'Compare & Choose',       description: 'Receive up to 4 quotes. Compare pricing, read real reviews, and pick the pro you trust most.' },
  { step_number: 4, icon_class: 'faTrophy',          title: 'Job Done Right',         description: 'Your pro handles the work. Leave a verified review to help your neighbors find great pros too.' },
];

function StepCard({ step, accentColor, darkMode, isLast }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'stretch' }}>
      <div style={{
        flex: 1, padding: '24px', borderRadius: 'var(--border-radius)',
        backgroundColor: darkMode ? '#1f2937' : '#f9fafb',
        border: darkMode ? '1px solid #374151' : '1px solid #e5e7eb',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 'var(--border-radius)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: accentColor, color: '#fff', marginBottom: 16,
          boxShadow: `0 4px 12px ${accentColor}44`,
        }}>
          <FontAwesomeIcon icon={getIcon(step.icon_class)} style={{ width: 20, height: 20 }} />
        </div>
        <div style={{
          fontSize: 12, fontWeight: 700, marginBottom: 4,
          textTransform: 'uppercase', letterSpacing: '0.05em', color: accentColor,
        }}>
          Step {String(step.step_number).padStart(2, '0')}
        </div>
        <h3 style={{ fontWeight: 700, fontSize: 16, color: darkMode ? '#fff' : '#111827', marginBottom: 8 }}>
          {step.title}
        </h3>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: darkMode ? '#d1d5db' : '#4b5563' }}>
          {step.description}
        </p>
      </div>
      {!isLast && (
        <div style={{
          display: 'none', position: 'absolute', right: -14, top: 36,
          width: 28, height: 28, alignItems: 'center', justifyContent: 'center', zIndex: 1,
        }} className="hidden lg:flex">
          <FontAwesomeIcon icon={faArrowRight} style={{ color: accentColor, width: 16 }} />
        </div>
      )}
    </div>
  );
}

export default function HowItWorks({ onConsumerSignup, onNavigatePro }) {
  const { darkMode } = useTheme();
  const [consumerSteps, setConsumerSteps] = useState(CONSUMER_FALLBACK);

  useEffect(() => {
    getHowItWorks('consumer').then(d => { if (d.length) setConsumerSteps(d); }).catch(() => {});
  }, []);

  const headColor = darkMode ? '#fff' : '#111827';
  const subColor  = darkMode ? '#9ca3af' : '#6b7280';

  return (
    <section style={{ backgroundColor: darkMode ? '#111827' : '#ffffff', padding: '80px 16px' }}>
      <div style={{ maxWidth: '80rem', margin: '0 auto' }}>

        {/* Consumer how-it-works */}
        <div style={{ marginBottom: 64 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{
              display: 'inline-block', padding: '4px 14px', borderRadius: 9999, fontSize: 12,
              fontWeight: 700, color: '#fff', marginBottom: 12,
              backgroundColor: 'var(--color-primary)',
            }}>
              FOR HOMEOWNERS
            </span>
            <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: headColor, marginBottom: 12 }}>
              Get the help you need — fast
            </h2>
            <p style={{ color: subColor, maxWidth: '36rem', margin: '0 auto' }}>
              From leaky faucets to full renovations — connect with trusted local professionals in your ZIP code.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {consumerSteps.map((s, i) => (
              <StepCard key={i} step={s} accentColor="var(--color-primary)" darkMode={darkMode} isLast={i === consumerSteps.length - 1} />
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <button onClick={() => onConsumerSignup({})} style={{
              padding: '12px 32px', fontSize: 14, fontWeight: 700, color: '#fff',
              backgroundColor: 'var(--color-primary)', borderRadius: 'var(--border-radius)',
              border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(26,111,219,0.3)',
            }}>
              Find a Pro Near Me
            </button>
          </div>
        </div>

        {/* Pro CTA banner */}
        <div style={{
          background: darkMode
            ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
            : 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
          borderRadius: 'var(--border-radius)',
          border: `1px solid ${darkMode ? '#334155' : '#fed7aa'}`,
          padding: '40px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 20,
        }}>
          <div style={{ maxWidth: 460 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 9999, fontSize: 11, fontWeight: 700,
              color: '#fff', background: 'var(--color-accent)', marginBottom: 12,
            }}>
              <FontAwesomeIcon icon={faRocket} style={{ fontSize: 10 }} />
              FOR PROFESSIONALS
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: headColor, marginBottom: 8 }}>
              Are you a service professional?
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: subColor, margin: 0 }}>
              Join 50,000+ pros getting qualified leads in their area. Set your ZIP codes, choose your services, and start growing your business today.
            </p>
          </div>
          <button onClick={() => onNavigatePro && onNavigatePro()} style={{
            padding: '14px 28px', fontSize: 14, fontWeight: 700, color: '#fff',
            background: 'var(--color-accent)', border: 'none', borderRadius: 'var(--border-radius)',
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(249,115,22,0.3)',
            display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
          }}>
            Learn More <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: 13 }} />
          </button>
        </div>
      </div>
    </section>
  );
}
