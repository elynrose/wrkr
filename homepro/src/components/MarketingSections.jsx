import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';

const primary = 'var(--color-primary)';
const primaryMuted = 'var(--color-primary-light, rgba(99, 102, 241, 0.15))';

const OVERLAY_OPACITY = 0.55;

function SectionBlock({ headline, body, list, steps, layout = 'default', darkMode, sectionIndex = 0, image, imageOverlay = 'black' }) {
  const hasBgImage = image && image.trim();
  const overlayIsBlack = (imageOverlay || 'black') !== 'white';
  const tp = hasBgImage ? (overlayIsBlack ? '#f1f5f9' : '#0f172a') : (darkMode ? '#f1f5f9' : '#1e293b');
  const ts = hasBgImage ? (overlayIsBlack ? '#cbd5e1' : '#475569') : (darkMode ? '#94a3b8' : '#64748b');
  const border = darkMode ? '#334155' : '#e2e8f0';
  const cardBg = darkMode ? '#1e293b' : '#f8fafc';
  const innerBg = darkMode ? '#0f172a' : '#fff';
  const isAlt = sectionIndex % 2 === 1 && !hasBgImage;
  const sectionBg = hasBgImage
    ? 'transparent'
    : layout === 'full'
      ? (darkMode ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)')
      : isAlt
        ? (darkMode ? 'rgba(99, 102, 241, 0.06)' : 'rgba(99, 102, 241, 0.04)')
        : cardBg;

  const accentLine = { width: 48, height: 4, borderRadius: 2, background: primary, marginBottom: 20 };
  const listItemStyle = { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14, fontSize: 15, color: tp, lineHeight: 1.5 };
  const listBullet = { width: 6, height: 6, borderRadius: '50%', background: primary, flexShrink: 0, marginTop: 8 };

  const maxWidth = layout === 'narrow' ? '32rem' : layout === 'full' ? '100%' : '52rem';
  const sectionStyle = {
    paddingTop: layout === 'full' ? 80 : 72,
    paddingBottom: layout === 'full' ? 80 : 72,
    background: sectionBg,
    borderTop: layout === 'full' ? `3px solid ${primary}` : `1px solid ${border}`,
    position: 'relative',
    minHeight: hasBgImage ? 320 : undefined,
    backgroundImage: hasBgImage ? `url(${image})` : undefined,
    backgroundSize: hasBgImage ? 'cover' : undefined,
    backgroundPosition: hasBgImage ? 'center' : undefined,
  };
  const sectionClass = 'px-4 sm:px-6 md:px-8';

  const headlineStyle = {
    fontSize: 'clamp(1.625rem, 4vw, 2.25rem)',
    fontWeight: 800,
    color: tp,
    marginBottom: 24,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  };

  const bodyStyle = { fontSize: 17, lineHeight: 1.8, color: ts, whiteSpace: 'pre-line', marginBottom: list?.length || steps?.length ? 28 : 0 };

  const contentWrapper = (content) => (
    <>
      {hasBgImage && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: overlayIsBlack ? '#000' : '#fff',
            opacity: OVERLAY_OPACITY,
            zIndex: 0,
          }}
        />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>{content}</div>
    </>
  );

  const renderList = (align = 'left') => (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {list.map((item, i) => (
        <li key={i} style={listItemStyle}>
          <span style={listBullet} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );

  const renderStepsCards = (vertical = false) => (
    <div
      className={vertical ? '' : 'marketing-steps-grid'}
      style={vertical ? { display: 'grid', gridTemplateColumns: '1fr', gap: 24, marginTop: 32 } : { marginTop: 32 }}
    >
      {steps.map((step, i) => (
        <div
          key={i}
          style={{
            padding: 28,
            background: innerBg,
            borderRadius: 16,
            border: `1px solid ${border}`,
            boxShadow: darkMode ? '0 4px 24px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.06)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: `linear-gradient(90deg, ${primary}, var(--color-accent, #6366f1))`,
          }} />
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: primaryMuted,
            color: primary,
            fontSize: 14,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}>
            {i + 1}
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: tp, marginBottom: 10, letterSpacing: '-0.01em' }}>{step.title}</h3>
          <p style={{ fontSize: 12, color: ts, margin: 0, lineHeight: 1.6 }}>{step.description}</p>
        </div>
      ))}
    </div>
  );

  // ── Full: bold strip, large type ──
  if (layout === 'full') {
    return (
      <section className={sectionClass} style={sectionStyle}>
        {contentWrapper(
          <div style={{ maxWidth: '64rem', margin: '0 auto' }}>
            {headline && (
              <>
                <div style={{ ...accentLine, width: 64, height: 5 }} />
                <h2 style={{ ...headlineStyle, fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', textAlign: 'left' }}>{headline}</h2>
              </>
            )}
            {body && <div style={{ ...bodyStyle, fontSize: 18, maxWidth: '42rem' }}>{body}</div>}
            {Array.isArray(list) && list.length > 0 && renderList()}
            {Array.isArray(steps) && steps.length > 0 && renderStepsCards(false)}
          </div>
        )}
      </section>
    );
  }

  // ── Two-column: editorial with vertical accent ──
  if (layout === 'two-column' && (body || (Array.isArray(list) && list.length) || (Array.isArray(steps) && steps.length))) {
    return (
      <section className={sectionClass} style={sectionStyle}>
        {contentWrapper(
          <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'start' }}>
              <div style={{ borderLeft: `4px solid ${primary}`, paddingLeft: 28 }}>
                {headline && <h2 style={{ ...headlineStyle, textAlign: 'left' }}>{headline}</h2>}
                {body && <div style={bodyStyle}>{body}</div>}
              </div>
              <div>
                {Array.isArray(list) && list.length > 0 && renderList()}
                {Array.isArray(steps) && steps.length > 0 && renderStepsCards(true)}
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  // ── Cards: step cards with gradient bar and number circle ──
  if (layout === 'cards' && Array.isArray(steps) && steps.length > 0) {
    return (
      <section className={sectionClass} style={sectionStyle}>
        {contentWrapper(
          <div style={{ maxWidth: '64rem', margin: '0 auto' }}>
            {headline && (
              <>
                <h2 style={{ ...headlineStyle, textAlign: 'center' }}>{headline}</h2>
                <div style={{ ...accentLine, margin: '0 auto 28px' }} />
              </>
            )}
            {body && <div style={{ ...bodyStyle, textAlign: 'center', marginBottom: 32 }}>{body}</div>}
            {renderStepsCards(false)}
            {Array.isArray(list) && list.length > 0 && (
              <div style={{ marginTop: 32, textAlign: 'center' }}>{renderList()}</div>
            )}
          </div>
        )}
      </section>
    );
  }

  // ── Narrow: magazine strip ──
  if (layout === 'narrow') {
    return (
      <section className={sectionClass} style={sectionStyle}>
        {contentWrapper(
          <div style={{ maxWidth: '32rem', margin: '0 auto', textAlign: 'center' }}>
            {headline && (
              <>
                <div style={{ ...accentLine, margin: '0 auto 20px', width: 32 }} />
                <h2 style={{ ...headlineStyle, fontSize: 'clamp(1.5rem, 3vw, 1.875rem)' }}>{headline}</h2>
              </>
            )}
            {body && <div style={bodyStyle}>{body}</div>}
            {Array.isArray(list) && list.length > 0 && renderList()}
            {Array.isArray(steps) && steps.length > 0 && renderStepsCards(true)}
          </div>
        )}
      </section>
    );
  }

  // ── Default: centered with accent line ──
  return (
    <section className={sectionClass} style={sectionStyle}>
      {contentWrapper(
        <div style={{ maxWidth, margin: '0 auto', textAlign: 'center' }}>
          {headline && (
            <>
              <h2 style={headlineStyle}>{headline}</h2>
              <div style={{ ...accentLine, margin: '0 auto 24px' }} />
            </>
          )}
          {body && <div style={bodyStyle}>{body}</div>}
          {Array.isArray(list) && list.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 auto', maxWidth: '28rem', textAlign: 'left' }}>
              {list.map((item, i) => (
                <li key={i} style={listItemStyle}>
                  <span style={listBullet} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          {Array.isArray(steps) && steps.length > 0 && renderStepsCards(false)}
        </div>
      )}
    </section>
  );
}

function SectionCarousel({ sections, darkMode }) {
  const [index, setIndex] = useState(0);
  const n = sections.length;
  if (n === 0) return null;
  const sec = sections[index];
  const tp = darkMode ? '#f1f5f9' : '#1e293b';
  const ts = darkMode ? '#94a3b8' : '#64748b';
  const border = darkMode ? '#334155' : '#e2e8f0';

  return (
    <section style={{ position: 'relative', paddingBottom: 56, borderTop: `1px solid ${border}` }}>
      <div style={{ overflow: 'hidden' }}>
        <SectionBlock
          key={sec.id || index}
          headline={sec.headline}
          body={sec.body}
          list={Array.isArray(sec.list) ? sec.list : []}
          steps={Array.isArray(sec.steps) ? sec.steps : null}
          layout={sec.layout || 'default'}
          darkMode={darkMode}
          sectionIndex={index}
          image={sec.image || ''}
          imageOverlay={sec.imageOverlay || 'black'}
        />
      </div>
      {n > 1 && (
        <>
          <button
            type="button"
            onClick={() => setIndex(i => (i - 1 + n) % n)}
            aria-label="Previous slide"
            style={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: `2px solid ${border}`,
              background: darkMode ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)',
              color: tp,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <button
            type="button"
            onClick={() => setIndex(i => (i + 1) % n)}
            aria-label="Next slide"
            style={{
              position: 'absolute',
              right: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: `2px solid ${border}`,
              background: darkMode ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)',
              color: tp,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
          <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }}>
            {sections.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIndex(i)}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  border: 'none',
                  background: i === index ? 'var(--color-primary)' : (darkMode ? '#475569' : '#cbd5e1'),
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default function MarketingSections() {
  const { darkMode } = useTheme();
  const { settings } = useSettings();

  if (!settings?.hero_headline) return null;

  let sections = [];
  try {
    const v = settings.homepage_sections;
    if (v != null) sections = Array.isArray(v) ? v : (typeof v === 'string' ? JSON.parse(v || '[]') : []);
  } catch (_) {}

  const visible = sections.filter(sec => sec.visible !== false);
  const carouselSections = visible.filter(sec => sec.carousel === true);
  const normalSections = visible.filter(sec => sec.carousel !== true);

  return (
    <>
      {normalSections.map((sec, idx) => (
        <SectionBlock
          key={sec.id || idx}
          headline={sec.headline}
          body={sec.body}
          list={Array.isArray(sec.list) ? sec.list : []}
          steps={Array.isArray(sec.steps) ? sec.steps : null}
          layout={sec.layout || 'default'}
          darkMode={darkMode}
          sectionIndex={idx}
          image={sec.image || ''}
          imageOverlay={sec.imageOverlay || 'black'}
        />
      ))}
      {carouselSections.length > 0 && (
        <SectionCarousel sections={carouselSections} darkMode={darkMode} />
      )}
    </>
  );
}
