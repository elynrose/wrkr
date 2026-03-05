import { useRef, useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { getIcon } from '../lib/icons';

function ServiceCardIcon({ iconClass, cardImageUrl }) {
  const [imgError, setImgError] = useState(false);
  const useImage = cardImageUrl && !imgError;
  return (
    <div style={{
      width: 48, height: 48, borderRadius: 'var(--border-radius)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'var(--color-primary)', color: '#fff',
      overflow: 'hidden', flexShrink: 0,
    }}>
      {useImage ? (
        <img
          src={cardImageUrl}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setImgError(true)}
        />
      ) : (
        <FontAwesomeIcon icon={getIcon(iconClass)} style={{ width: 20, height: 20 }} />
      )}
    </div>
  );
}

export default function ServiceCategories({ services = [], onConsumerSignup, loading }) {
  const { darkMode } = useTheme();
  const scrollRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const skeletons = Array.from({ length: 10 });

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => { checkScroll(); }, [services, loading]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  const arrowStyle = (visible) => ({
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: darkMode ? '#1f2937' : '#ffffff',
    color: darkMode ? '#e5e7eb' : '#374151',
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
    opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none',
    transition: 'opacity 0.2s', zIndex: 10,
  });

  return (
    <section style={{
      backgroundColor: darkMode ? '#030712' : '#f9fafb',
      padding: '64px 0',
    }}>
      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: darkMode ? '#fff' : '#111827', marginBottom: 8 }}>
            Browse Popular Services
          </h2>
          <p style={{ color: darkMode ? '#9ca3af' : '#6b7280', fontSize: '1rem' }}>
            Thousands of local pros ready to help — pick a category to get started
          </p>
        </div>
      </div>

      {/* Scroll container */}
      <div style={{ position: 'relative', maxWidth: '80rem', margin: '0 auto', padding: '0 16px' }}>

        {/* Left arrow */}
        <button onClick={() => scroll('left')} style={{ ...arrowStyle(canLeft), left: 4 }}
          className="hidden sm:flex">
          <FontAwesomeIcon icon={faChevronLeft} style={{ fontSize: 16 }} />
        </button>

        {/* Right arrow */}
        <button onClick={() => scroll('right')} style={{ ...arrowStyle(canRight), right: 4 }}
          className="hidden sm:flex">
          <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: 16 }} />
        </button>

        {/* Scrollable track */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="hp-scroll-track"
          style={{
            display: 'flex', gap: 16, overflowX: 'auto', scrollSnapType: 'x mandatory',
            paddingTop: 16, paddingBottom: 16, scrollbarWidth: 'none', msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <style>{`.hp-scroll-track::-webkit-scrollbar { display: none; }`}</style>

          {loading
            ? skeletons.map((_, i) => (
                <div key={i} className="hp-scroll-track" style={{
                  minWidth: 170, height: 190, borderRadius: 'var(--border-radius)',
                  backgroundColor: darkMode ? '#1f2937' : '#e5e7eb',
                  animation: 'pulse 2s infinite', flexShrink: 0, scrollSnapAlign: 'start',
                }} />
              ))
            : services.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => onConsumerSignup({ service: cat.name })}
                  style={{
                    minWidth: 170, flexShrink: 0, scrollSnapAlign: 'start',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 8, padding: '22px 14px', textAlign: 'center',
                    borderRadius: 'var(--border-radius)', cursor: 'pointer',
                    border: darkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                    backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = darkMode ? '#374151' : '#e5e7eb';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <ServiceCardIcon iconClass={cat.icon_class} cardImageUrl={cat.card_image_url} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: darkMode ? '#f3f4f6' : '#1f2937', whiteSpace: 'nowrap' }}>
                    {cat.name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {[1,2,3,4,5].map(n => (
                      <FontAwesomeIcon
                        key={n}
                        icon={faStar}
                        style={{
                          width: 10, height: 10,
                          color: n <= Math.round(parseFloat(cat.avg_rating)) ? '#facc15' : (darkMode ? '#4b5563' : '#d1d5db'),
                        }}
                      />
                    ))}
                    <span style={{ fontSize: 12, marginLeft: 4, color: darkMode ? '#9ca3af' : '#6b7280' }}>
                      {cat.avg_rating}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: darkMode ? '#9ca3af' : '#6b7280', whiteSpace: 'nowrap' }}>
                    {cat.review_label} reviews
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)' }}>
                    {cat.min_price}
                  </span>
                </button>
              ))
          }
        </div>

        {/* Fade edges */}
        {canLeft && (
          <div style={{
            position: 'absolute', left: 16, top: 0, bottom: 8, width: 48, pointerEvents: 'none',
            background: `linear-gradient(to right, ${darkMode ? '#030712' : '#f9fafb'}, transparent)`,
            zIndex: 5,
          }} />
        )}
        {canRight && (
          <div style={{
            position: 'absolute', right: 16, top: 0, bottom: 8, width: 48, pointerEvents: 'none',
            background: `linear-gradient(to left, ${darkMode ? '#030712' : '#f9fafb'}, transparent)`,
            zIndex: 5,
          }} />
        )}
      </div>
    </section>
  );
}
