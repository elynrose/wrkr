import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner, faMagnifyingGlass, faLocationDot, faShieldHalved,
  faBan, faStar, faBolt, faChevronLeft, faChevronRight, faCheck,
  faArrowRight, faEnvelope, faPhone, faGlobe, faUsers,
  faStarHalfAlt, faRocket, faBriefcase, faBars, faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { getIcon } from '../lib/icons';
import { themes as themeMap } from '../context/ThemeContext';
import TenantChatWidget from '../components/TenantChatWidget';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function resolveThemeColors(settings) {
  if (!settings || typeof settings !== 'object') {
    return { primary: '#2563eb', accent: '#f59e0b' };
  }
  const themeKey = settings.default_theme || '';
  const resolved = themeMap[themeKey];
  return {
    primary: settings.theme_primary || settings.color_primary || resolved?.primary || '#2563eb',
    accent: settings.theme_accent || settings.color_accent || resolved?.accent || '#f59e0b',
  };
}

export default function TenantHomePage({ slug, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestInitial, setRequestInitial] = useState({});

  const fetchData = () => {
    setLoading(true);
    setError(null);
    fetch(`${API}/tenant/${slug}/public`)
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.error || 'Not found')))
      .then(d => setData(d))
      .catch(e => setError(typeof e === 'string' ? e : 'Tenant not found'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [slug]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchData();
    };
    const onDataUpdated = () => fetchData();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('app:settings-updated', onDataUpdated);
    window.addEventListener('app:data-updated', onDataUpdated);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('app:settings-updated', onDataUpdated);
      window.removeEventListener('app:data-updated', onDataUpdated);
    };
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
        <h1 style={{ fontSize: 48, fontWeight: 800, color: '#e11d48' }}>404</h1>
        <p style={{ fontSize: 18, fontWeight: 600, color: '#374151' }}>{error || 'Tenant not found'}</p>
        <button onClick={() => onNavigate('home')} style={{ padding: '10px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
          Go Home
        </button>
      </div>
    );
  }

  const { tenant, settings, categories, services, steps, reviews, plans, proCount } = data;
  const { primary, accent } = resolveThemeColors(settings);
  const siteName = settings.site_name || tenant.name;
  const tagline = settings.site_tagline || 'Find Trusted Local Service Professionals';
  const supportEmail = settings.support_email || '';
  const supportPhone = settings.support_phone || '';
  const siteUrl = tenant.domain ? `https://${tenant.domain}` : null;

  const openRequest = (first, second) => {
    const initial = (typeof first === 'object' && first !== null && second === undefined)
      ? first
      : { service: typeof first === 'string' ? first : '', zip: typeof second === 'string' ? second : '' };
    setRequestInitial({
      service: initial.service || '',
      zip: initial.zip || '',
      city: initial.city || '',
      description: initial.description || '',
      urgency: initial.urgency || '',
      name: initial.name || '',
      email: initial.email || '',
      phone: initial.phone || '',
    });
    setShowRequestModal(true);
  };

  return (
    <div className="min-h-screen" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: '#1e293b' }}>
      <TenantHeader siteName={siteName} primary={primary} onNavigate={onNavigate} siteUrl={siteUrl} slug={slug} />
      <HeroSection siteName={siteName} tagline={tagline} primary={primary} services={services} proCount={proCount} onRequestService={openRequest} />
      <ServicesSection categories={categories} services={services} primary={primary} siteName={siteName} onRequestService={openRequest} />
      {steps.consumer?.length > 0 && <StepsSection steps={steps.consumer} primary={primary} />}
      {reviews.length > 0 && <ReviewsSection reviews={reviews} siteName={siteName} primary={primary} />}
      <ForProfessionalsSection slug={slug} siteName={siteName} primary={primary} accent={accent} plans={plans} siteUrl={siteUrl} />
      <ContactSection siteName={siteName} supportEmail={supportEmail} supportPhone={supportPhone} primary={primary} siteUrl={siteUrl} tenant={tenant} onRequestService={openRequest} />
      <TenantFooter siteName={siteName} primary={primary} />
      {showRequestModal && (
        <RequestServiceModal
          slug={slug}
          services={services}
          primary={primary}
          siteName={siteName}
          onClose={() => setShowRequestModal(false)}
          initialData={requestInitial}
        />
      )}

      {data.chat?.enabled && (
        <TenantChatWidget
          slug={slug}
          siteName={siteName}
          label={data.chat.label || 'Chat with us'}
          primary={primary}
          onOpenRequestModal={openRequest}
        />
      )}
    </div>
  );
}

function TenantHeader({ siteName, primary, onNavigate, siteUrl, slug }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const linkClass = 'block w-full text-left py-3 px-4 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors';
  return (
    <header
      className="app-header tenant-header sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3 sm:px-6 lg:px-6"
      style={{ borderBottomColor: '#e5e7eb' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0,
          }}>
            {siteName.charAt(0).toUpperCase()}
          </div>
          <span className="font-bold text-lg text-gray-900 truncate">{siteName}</span>
        </div>
        {/* Desktop nav — hidden on mobile (iPhone, Pixel, Samsung, etc.) */}
        <div className="desktop-nav hidden lg:flex items-center gap-3">
          {slug && (
            <a href={`#t/${slug}/for-pros`} onClick={(e) => { e.preventDefault(); window.location.hash = `#t/${slug}/for-pros`; window.scrollTo(0, 0); }}
              style={{ fontSize: 14, color: primary, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <FontAwesomeIcon icon={faBriefcase} style={{ width: 14 }} /> For Pros
            </a>
          )}
          {siteUrl && (
            <a href={siteUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 14, color: primary, fontWeight: 600, textDecoration: 'none' }}>
              Visit Site <FontAwesomeIcon icon={faArrowRight} style={{ width: 12, marginLeft: 4 }} />
            </a>
          )}
          <button onClick={() => onNavigate('home')}
            className="text-sm text-gray-500 border border-gray-300 rounded-md py-1.5 px-3.5 font-medium hover:bg-gray-50">
            ← Back
          </button>
        </div>
        {/* Hamburger — mobile (iPhone, Pixel, Samsung, etc.) and tablet */}
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="hamburger-btn lg:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          <FontAwesomeIcon icon={menuOpen ? faXmark : faBars} style={{ width: 20, height: 20 }} />
        </button>
      </div>
      {/* Mobile dropdown menu (phones and small tablets) */}
      {menuOpen && (
        <div className="mobile-menu lg:hidden mt-2 pt-2 border-t border-gray-200 flex flex-col gap-1">
          {slug && (
            <a href={`#t/${slug}/for-pros`} onClick={(e) => { e.preventDefault(); window.location.hash = `#t/${slug}/for-pros`; window.scrollTo(0, 0); setMenuOpen(false); }}
              className={linkClass} style={{ color: primary }}>
              <FontAwesomeIcon icon={faBriefcase} className="w-4 mr-2" /> For Pros
            </a>
          )}
          {siteUrl && (
            <a href={siteUrl} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}
              className={linkClass} style={{ color: primary }}>
              Visit Site <FontAwesomeIcon icon={faArrowRight} className="w-3 ml-1" />
            </a>
          )}
          <button onClick={() => { onNavigate('home'); setMenuOpen(false); }}
            className={linkClass + ' text-gray-600 border border-gray-300'}
          >
            ← Back to main site
          </button>
        </div>
      )}
    </header>
  );
}

function HeroSection({ siteName, tagline, primary, services, proCount, onRequestService }) {
  const [service, setService] = useState('');
  const [zip, setZip] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const allNames = services.map(s => s.name);
  const handleInput = (val) => {
    setService(val);
    setSuggestions(val.length > 1 ? allNames.filter(n => n.toLowerCase().includes(val.toLowerCase())).slice(0, 6) : []);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onRequestService(service, zip);
  };

  const primaryLight = primary + '18';

  return (
    <section style={{
      background: `linear-gradient(135deg, ${primaryLight} 0%, #ffffff 50%, #f8fafc 100%)`,
      padding: '80px 16px 64px',
    }}>
      <div style={{ maxWidth: '56rem', margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 16px', borderRadius: 9999, fontSize: 14,
          fontWeight: 600, color: '#fff', marginBottom: 24,
          backgroundColor: primary, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#86efac', display: 'inline-block' }} />
          {proCount > 0 ? `${proCount.toLocaleString()}+ pros ready to help` : 'Verified pros ready to help'}
        </div>

        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, color: '#111827', lineHeight: 1.1, marginBottom: 16 }}>
          {tagline.includes(' ') ? (
            <>
              {tagline.split(' ').slice(0, -2).join(' ')}{' '}
              <span style={{ color: primary }}>{tagline.split(' ').slice(-2).join(' ')}</span>
            </>
          ) : (
            <span style={{ color: primary }}>{tagline}</span>
          )}
        </h1>

        <p style={{ fontSize: '1.1rem', color: '#4b5563', marginBottom: 40, maxWidth: '42rem', margin: '0 auto 40px' }}>
          Describe your project, enter your ZIP code, and get matched with verified professionals from <strong>{siteName}</strong>.
        </p>

        <form onSubmit={handleSubmit} style={{
          display: 'flex', flexWrap: 'wrap', gap: 12, maxWidth: '40rem', margin: '0 auto', padding: 16,
          borderRadius: 16, backgroundColor: '#fff',
          boxShadow: '0 20px 40px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.06)',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ flex: '1 1 200px', position: 'relative' }}>
            <FontAwesomeIcon icon={faMagnifyingGlass} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', width: 16 }} />
            <input type="text" placeholder="What service do you need?" value={service} onChange={e => handleInput(e.target.value)}
              style={{ width: '100%', paddingLeft: 40, paddingRight: 12, paddingTop: 12, paddingBottom: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontWeight: 500, backgroundColor: '#f9fafb', color: '#111827', outline: 'none' }} />
            {suggestions.length > 0 && (
              <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', backgroundColor: '#fff', zIndex: 10, overflow: 'hidden', listStyle: 'none', padding: 0 }}>
                {suggestions.map(s => (
                  <li key={s} onClick={() => { setService(s); setSuggestions([]); }}
                    style={{ padding: '10px 16px', fontSize: 14, cursor: 'pointer', color: '#374151' }}
                    onMouseEnter={e => e.target.style.backgroundColor = '#f3f4f6'}
                    onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}>
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div style={{ width: 140, position: 'relative', flexShrink: 0 }}>
            <FontAwesomeIcon icon={faLocationDot} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', width: 14 }} />
            <input type="text" placeholder="ZIP Code" value={zip} onChange={e => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))} maxLength={5}
              style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 12, paddingBottom: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontWeight: 500, backgroundColor: '#f9fafb', color: '#111827', outline: 'none' }} />
          </div>
          <button type="submit" style={{
            padding: '12px 24px', fontSize: 14, fontWeight: 700, color: '#fff',
            backgroundColor: primary, borderRadius: 8, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            boxShadow: `0 4px 12px ${primary}44`,
          }}>
            Get Free Quotes
          </button>
        </form>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 24, marginTop: 32, fontSize: 14, color: '#4b5563' }}>
          {[
            { icon: faBan, text: 'Free to use' },
            { icon: faShieldHalved, text: 'No obligation' },
            { icon: faStar, text: 'Verified reviews' },
            { icon: faBolt, text: 'Same-day matching' },
          ].map(t => (
            <div key={t.text} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
              <FontAwesomeIcon icon={t.icon} style={{ width: 14, color: primary }} />
              {t.text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServicesSection({ categories, services, primary, siteName, onRequestService }) {
  const scrollRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const allItems = services.length > 0 ? services : [];

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      setCanLeft(el.scrollLeft > 10);
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
    };
    check();
    el.addEventListener('scroll', check);
    return () => el.removeEventListener('scroll', check);
  }, [allItems]);

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 280, behavior: 'smooth' });
  };

  if (!allItems.length) return null;

  return (
    <section style={{ padding: '64px 16px', background: '#fff' }}>
      <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: primary }}>
            SERVICES
          </span>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 800, color: '#111827', marginTop: 8 }}>
            Browse {siteName} Services
          </h2>
        </div>

        <div style={{ position: 'relative' }}>
          {canLeft && (
            <button onClick={() => scroll(-1)} style={{
              position: 'absolute', left: -16, top: '50%', transform: 'translateY(-50%)',
              width: 40, height: 40, borderRadius: '50%', background: '#fff',
              border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              cursor: 'pointer', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FontAwesomeIcon icon={faChevronLeft} style={{ width: 14, color: '#374151' }} />
            </button>
          )}

          <div ref={scrollRef} style={{
            display: 'flex', gap: 16, overflowX: 'auto', scrollBehavior: 'smooth',
            padding: '12px 4px', scrollbarWidth: 'none',
            justifyContent: allItems.length <= 4 ? 'center' : 'flex-start',
          }}>
            {allItems.map(s => (
              <div key={s.id} onClick={() => onRequestService(s.name)} style={{
                minWidth: 220, maxWidth: 220, padding: 20, borderRadius: 12,
                border: '1px solid #e5e7eb', background: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)', flexShrink: 0,
                transition: 'box-shadow 0.2s', cursor: 'pointer',
              }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'}
              >
                <ServiceIcon iconClass={s.icon_class} imageUrl={s.card_image_url} primary={primary} />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginTop: 12, marginBottom: 6 }}>{s.name}</h3>
                {s.avg_rating > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#6b7280' }}>
                    <FontAwesomeIcon icon={faStar} style={{ width: 12, color: '#f59e0b' }} />
                    <span>{Number(s.avg_rating).toFixed(1)}</span>
                    {s.review_count > 0 && <span>({s.review_count})</span>}
                  </div>
                )}
                {s.min_price > 0 && (
                  <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>From ${Number(s.min_price).toFixed(0)}</p>
                )}
              </div>
            ))}
          </div>

          {canRight && (
            <button onClick={() => scroll(1)} style={{
              position: 'absolute', right: -16, top: '50%', transform: 'translateY(-50%)',
              width: 40, height: 40, borderRadius: '50%', background: '#fff',
              border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              cursor: 'pointer', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FontAwesomeIcon icon={faChevronRight} style={{ width: 14, color: '#374151' }} />
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 32 }}>
            {categories.map(c => (
              <span key={c.id} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                background: `${primary}12`, color: primary, border: `1px solid ${primary}30`,
              }}>
                {c.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ServiceIcon({ iconClass, imageUrl, primary }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{
      width: 48, height: 48, borderRadius: 8, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: primary, color: '#fff', overflow: 'hidden', flexShrink: 0,
    }}>
      {imageUrl && !err ? (
        <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setErr(true)} />
      ) : (
        <FontAwesomeIcon icon={getIcon(iconClass)} style={{ width: 20, height: 20 }} />
      )}
    </div>
  );
}

function StepsSection({ steps, primary }) {
  return (
    <section style={{ padding: '64px 16px', background: '#f8fafc' }}>
      <div style={{ maxWidth: '64rem', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: primary }}>
            HOW IT WORKS
          </span>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 800, color: '#111827', marginTop: 8 }}>
            Get the help you need — fast
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
          {steps.map((step, i) => (
            <div key={i} style={{ textAlign: 'center', padding: 24 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: `${primary}15`, color: primary, fontSize: 20, fontWeight: 800,
              }}>
                {step.icon_class ? (
                  <FontAwesomeIcon icon={getIcon(step.icon_class)} style={{ width: 24 }} />
                ) : (
                  i + 1
                )}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{step.title}</h3>
              <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReviewsSection({ reviews, siteName, primary }) {
  return (
    <section style={{ padding: '64px 16px', background: '#fff' }}>
      <div style={{ maxWidth: '64rem', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: primary }}>
            REVIEWS
          </span>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 800, color: '#111827', marginTop: 8 }}>
            What Customers Are Saying
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {reviews.map((r, i) => (
            <div key={i} style={{
              padding: 20, borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', background: `${primary}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: primary, fontWeight: 700, fontSize: 16,
                }}>
                  {r.first_name?.charAt(0) || '?'}
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{r.first_name || 'Customer'}</p>
                  {r.service_name && <p style={{ fontSize: 12, color: '#6b7280' }}>{r.service_name}</p>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <FontAwesomeIcon key={s} icon={faStar}
                    style={{ width: 14, color: s <= r.rating ? '#f59e0b' : '#d1d5db' }} />
                ))}
              </div>
              {r.title && <p style={{ fontWeight: 600, fontSize: 14, color: '#111827', marginBottom: 4 }}>{r.title}</p>}
              {r.body && <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.5 }}>{r.body}</p>}
              {r.business_name && (
                <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
                  Service by <strong>{r.business_name}</strong>
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** For Professionals section: main-site-style CTA banner + tenant packages (plans) */
function ForProfessionalsSection({ slug, siteName, primary, accent, plans, siteUrl }) {
  return (
    <section style={{ padding: '64px 16px', background: '#f8fafc' }}>
      <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
        {/* CTA banner — same look as main site HowItWorks FOR PROFESSIONALS */}
        <div style={{
          background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
          borderRadius: 'var(--border-radius)',
          border: '1px solid #fed7aa',
          padding: '40px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 20,
          marginBottom: 48,
        }}>
          <div style={{ maxWidth: 460 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 9999, fontSize: 11, fontWeight: 700,
              color: '#fff', background: accent || '#f59e0b', marginBottom: 12,
            }}>
              <FontAwesomeIcon icon={faRocket} style={{ fontSize: 10 }} />
              FOR PROFESSIONALS
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
              Are you a service professional?
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: '#6b7280', margin: 0 }}>
              Join {siteName} and get qualified leads in your area. Set your ZIP codes, choose your services, and start growing your business today.
            </p>
          </div>
          <a href={slug ? `#t/${slug}/for-pros` : '#'} onClick={(e) => { if (slug) { e.preventDefault(); window.location.hash = `#t/${slug}/for-pros`; window.scrollTo(0, 0); } }} style={{
            padding: '14px 28px', fontSize: 14, fontWeight: 700, color: '#fff',
            background: accent || '#f59e0b', border: 'none', borderRadius: 'var(--border-radius)',
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(249,115,22,0.3)',
            display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', textDecoration: 'none',
          }}>
            Learn More <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: 13 }} />
          </a>
        </div>

        {/* Tenant packages (plans) */}
        {plans && plans.length > 0 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 800, color: '#111827', marginTop: 0 }}>
                Plans for pros
              </h2>
              <p style={{ fontSize: 15, color: '#6b7280', marginTop: 8, maxWidth: 480, margin: '8px auto 0' }}>
                Choose a plan and start receiving leads from {siteName}.
              </p>
            </div>
            <div className="tenant-for-pros-pricing-grid" style={{ display: 'grid', gap: 20, alignItems: 'start', justifyContent: 'center', maxWidth: 1100, margin: '0 auto' }}>
              {plans.map(plan => {
                let features = [];
                try {
                  const raw = typeof plan.features === 'string' ? JSON.parse(plan.features) : (plan.features || []);
                  features = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.values(raw) : []);
                } catch { features = []; }
                if (!Array.isArray(features)) features = [];

                return (
                  <div key={plan.slug} style={{
                    padding: 24, borderRadius: 12, background: '#fff',
                    border: plan.is_popular ? `2px solid ${primary}` : '1px solid #e5e7eb',
                    position: 'relative',
                    boxShadow: plan.is_popular ? `0 4px 20px ${primary}22` : '0 2px 8px rgba(0,0,0,0.04)',
                  }}>
                    {plan.is_popular && (
                      <span style={{
                        position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                        padding: '4px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: primary, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5,
                      }}>
                        Most Popular
                      </span>
                    )}
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8, marginTop: plan.is_popular ? 8 : 0 }}>{plan.name}</h3>
                    <div style={{ marginBottom: 16 }}>
                      <span style={{ fontSize: 32, fontWeight: 800, color: '#111827' }}>
                        ${Number(plan.price_monthly || 0).toFixed(0)}
                      </span>
                      <span style={{ fontSize: 14, color: '#6b7280' }}>/mo</span>
                    </div>
                    <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
                      {plan.lead_credits} lead credits/month
                    </p>
                    {features.length > 0 && (
                      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px' }}>
                        {features.slice(0, 5).map((f, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#374151', marginBottom: 6 }}>
                            <FontAwesomeIcon icon={faCheck} style={{ width: 12, color: primary, marginTop: 2, flexShrink: 0 }} />
                            {typeof f === 'string' ? f : (f.label || f.name || JSON.stringify(f))}
                          </li>
                        ))}
                      </ul>
                    )}
                    {slug && (
                      <a href={`#t/${slug}/for-pros`} onClick={(e) => { e.preventDefault(); window.location.hash = `#t/${slug}/for-pros`; window.scrollTo(0, 0); }} style={{
                        display: 'block', textAlign: 'center', padding: '10px 20px', borderRadius: 8,
                        fontWeight: 600, fontSize: 14, textDecoration: 'none',
                        background: plan.is_popular ? primary : 'transparent',
                        color: plan.is_popular ? '#fff' : primary,
                        border: plan.is_popular ? 'none' : `1px solid ${primary}`,
                      }}>
                        Get Started
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function ContactSection({ siteName, supportEmail, supportPhone, primary, siteUrl, tenant, onRequestService }) {
  return (
    <section style={{ padding: '64px 16px', background: '#fff' }}>
      <div style={{ maxWidth: '48rem', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 800, color: '#111827', marginBottom: 16 }}>
          Ready to Get Started?
        </h2>
        <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
          Connect with {siteName} to find the right professional for your needs.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginBottom: 32 }}>
          {supportEmail && (
            <a href={`mailto:${supportEmail}`} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 10,
              border: '1px solid #e5e7eb', textDecoration: 'none', color: '#374151', fontSize: 14, fontWeight: 500,
            }}>
              <FontAwesomeIcon icon={faEnvelope} style={{ width: 16, color: primary }} />
              {supportEmail}
            </a>
          )}
          {supportPhone && (
            <a href={`tel:${supportPhone}`} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 10,
              border: '1px solid #e5e7eb', textDecoration: 'none', color: '#374151', fontSize: 14, fontWeight: 500,
            }}>
              <FontAwesomeIcon icon={faPhone} style={{ width: 16, color: primary }} />
              {supportPhone}
            </a>
          )}
          {tenant.domain && (
            <a href={`https://${tenant.domain}`} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 10,
              border: '1px solid #e5e7eb', textDecoration: 'none', color: '#374151', fontSize: 14, fontWeight: 500,
            }}>
              <FontAwesomeIcon icon={faGlobe} style={{ width: 16, color: primary }} />
              {tenant.domain}
            </a>
          )}
        </div>

        <button onClick={() => onRequestService()} style={{
          display: 'inline-block', padding: '14px 36px', borderRadius: 10, fontWeight: 700,
          fontSize: 16, color: '#fff', backgroundColor: primary, border: 'none', cursor: 'pointer',
          boxShadow: `0 4px 16px ${primary}44`,
        }}>
          Get Free Quotes <FontAwesomeIcon icon={faArrowRight} style={{ width: 14, marginLeft: 8 }} />
        </button>
      </div>
    </section>
  );
}

function TenantFooter({ siteName, primary }) {
  return (
    <footer style={{
      padding: '24px 16px', background: '#111827', textAlign: 'center',
    }}>
      <p style={{ fontSize: 13, color: '#6b7280' }}>
        &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
      </p>
    </footer>
  );
}

const URGENCY_OPTS = ['Within 24 hours', 'This week', 'This month', 'Just planning'];

function RequestServiceModal({ slug, services, primary, siteName, onClose, initialData = {} }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    service: initialData.service || '',
    zip: initialData.zip || '',
    city: '', description: '', urgency: '',
    name: '', email: '', phone: '',
  });

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid email address.'); return;
    }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/tenant/${slug}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setSuccess(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const serviceNames = services.map(s => s.name);
  const bg = '#fff';
  const border = '#e5e7eb';
  const inputStyle = {
    width: '100%', padding: '10px 14px', border: `1px solid ${border}`,
    borderRadius: 8, fontSize: 14, backgroundColor: '#f9fafb', color: '#111827', outline: 'none',
  };
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 };

  if (success) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div style={{ background: bg, borderRadius: 16, padding: 40, maxWidth: 420, width: '90%', textAlign: 'center', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <FontAwesomeIcon icon={faCheck} style={{ width: 28, color: '#16a34a' }} />
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Request Submitted!</h3>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
            We've received your request and will match you with qualified professionals from {siteName}.
          </p>
          <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: primary, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: bg, borderRadius: 16, maxWidth: 480, width: '90%', overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${border}` }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>Request a Service Pro</h2>
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Step {step} of 3 — Free, no obligation</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#6b7280', fontSize: 18 }}>&times;</button>
        </div>

        <div style={{ padding: '6px 24px 0' }}>
          <div style={{ height: 6, borderRadius: 3, background: '#e5e7eb' }}>
            <div style={{ height: 6, borderRadius: 3, background: primary, width: `${(step / 3) * 100}%`, transition: 'width 0.3s' }} />
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Service Type</label>
                <select value={form.service} onChange={e => update('service', e.target.value)} style={inputStyle}>
                  <option value="">Select a service...</option>
                  {serviceNames.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Describe your project</label>
                <textarea rows={3} placeholder="e.g. My kitchen faucet is leaking..." value={form.description} onChange={e => update('description', e.target.value)} style={{ ...inputStyle, resize: 'none' }} />
              </div>
              <div>
                <label style={labelStyle}>How soon do you need this?</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {URGENCY_OPTS.map(u => (
                    <button key={u} onClick={() => update('urgency', u)} style={{
                      padding: '8px 12px', fontSize: 13, fontWeight: 500, border: `1px solid ${form.urgency === u ? primary : border}`,
                      borderRadius: 8, cursor: 'pointer', color: form.urgency === u ? '#fff' : '#374151',
                      background: form.urgency === u ? primary : 'transparent',
                    }}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Where do you need the work done?</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>ZIP Code *</label>
                  <input type="text" placeholder="e.g. 90210" value={form.zip} onChange={e => update('zip', e.target.value.replace(/\D/g, '').slice(0, 5))} maxLength={5} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>City</label>
                  <input type="text" placeholder="e.g. Austin" value={form.city} onChange={e => update('city', e.target.value)} style={inputStyle} />
                </div>
              </div>
              {error && <p style={{ fontSize: 13, color: '#ef4444', fontWeight: 500 }}>{error}</p>}
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>How should pros reach you?</h3>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input type="text" placeholder="Jane Smith" value={form.name} onChange={e => update('name', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email Address *</label>
                <input type="email" placeholder="jane@email.com" value={form.email} onChange={e => update('email', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input type="tel" placeholder="(555) 000-0000" value={form.phone} onChange={e => update('phone', e.target.value)} style={inputStyle} />
              </div>
              {error && <p style={{ fontSize: 13, color: '#ef4444', fontWeight: 500 }}>{error}</p>}
              <p style={{ fontSize: 11, color: '#9ca3af' }}>By submitting, you agree to our Terms. Your contact info is shared only with matched pros.</p>
            </div>
          )}
        </div>

        <div style={{ padding: '0 24px 20px', display: 'flex', justifyContent: step > 1 ? 'space-between' : 'flex-end', gap: 12 }}>
          {step > 1 && (
            <button onClick={() => { setError(''); setStep(s => s - 1); }} style={{
              padding: '10px 20px', fontSize: 14, fontWeight: 600, border: `1px solid ${border}`, borderRadius: 8, background: 'transparent', color: '#374151', cursor: 'pointer',
            }}>
              &larr; Back
            </button>
          )}
          {step < 3 ? (
            <button onClick={() => {
              if (step === 2 && form.zip && !/^\d{5}$/.test(form.zip)) { setError('ZIP code must be exactly 5 digits.'); return; }
              setError(''); setStep(s => s + 1);
            }} disabled={step === 1 && !form.service} style={{
              padding: '10px 24px', fontSize: 14, fontWeight: 700, color: '#fff', background: primary,
              border: 'none', borderRadius: 8, cursor: 'pointer', opacity: (step === 1 && !form.service) ? 0.4 : 1,
            }}>
              Continue &rarr;
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={!form.name || !form.email || loading} style={{
              padding: '10px 24px', fontSize: 14, fontWeight: 700, color: '#fff', background: primary,
              border: 'none', borderRadius: 8, cursor: 'pointer', opacity: (!form.name || !form.email || loading) ? 0.4 : 1,
            }}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
