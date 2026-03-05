import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPalette, faSun, faMoon, faXmark, faFont, faSliders } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

const RADII = [
  { key: 'sm',   label: 'Sharp',    preview: '4px' },
  { key: 'md',   label: 'Rounded',  preview: '8px' },
  { key: 'lg',   label: 'Pill-ish', preview: '16px' },
  { key: 'full', label: 'Full',     preview: '9999px' },
];

export default function ThemeCustomizer() {
  const { colorKey, setColorKey, darkMode, setDarkMode, fontKey, setFontKey, borderRadius, setBorderRadius, themes, fontOptions } = useTheme();
  const [open, setOpen] = useState(false);

  const panelBg  = darkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900';
  const sectionBg = darkMode ? 'bg-gray-800' : 'bg-gray-50';
  const subTxt   = darkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full text-white shadow-xl flex items-center justify-center hover:scale-110 transition-transform"
        style={{ backgroundColor: 'var(--color-primary)' }}
        title="Customize Theme"
      >
        <FontAwesomeIcon icon={faPalette} className="w-5 h-5" />
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
          <div
            className={`pointer-events-auto w-80 h-full overflow-y-auto border-l shadow-2xl ${panelBg}`}
            style={{ fontFamily: 'var(--font-family)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: darkMode ? '#374151' : '#e5e7eb' }}>
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faPalette} style={{ color: 'var(--color-primary)' }} className="w-4" />
                <h2 className="font-bold text-base">Customize Theme</h2>
              </div>
              <button onClick={() => setOpen(false)} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* Dark Mode */}
              <div className={`${sectionBg} rounded-xl p-4`} style={{ borderRadius: 'var(--border-radius)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={darkMode ? faMoon : faSun} className="w-4" style={{ color: 'var(--color-primary)' }} />
                    <span className="font-semibold text-sm">Appearance</span>
                  </div>
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className={`w-12 h-6 rounded-full transition-all relative ${darkMode ? 'bg-[var(--color-primary)]' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${darkMode ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
                <p className={`text-xs mt-1 ${subTxt}`}>{darkMode ? 'Dark mode on' : 'Light mode on'}</p>
              </div>

              {/* Color Scheme */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FontAwesomeIcon icon={faPalette} className="w-4" style={{ color: 'var(--color-primary)' }} />
                  <span className="font-semibold text-sm">Color Scheme</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(themes).map(([key, t]) => (
                    <button
                      key={key}
                      onClick={() => setColorKey(key)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${colorKey === key ? 'border-[var(--color-primary)]' : darkMode ? 'border-gray-700 hover:border-gray-500' : 'border-gray-100 hover:border-gray-200'}`}
                      style={{ borderRadius: 'var(--border-radius)' }}
                    >
                      <div className="flex gap-1.5 flex-shrink-0">
                        <div className="w-5 h-5 rounded-full shadow-sm" style={{ backgroundColor: t.primary }} />
                        <div className="w-5 h-5 rounded-full shadow-sm" style={{ backgroundColor: t.accent }} />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium">{t.name}</span>
                      </div>
                      {colorKey === key && (
                        <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
                          style={{ backgroundColor: 'var(--color-primary)' }}>
                          ✓
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FontAwesomeIcon icon={faFont} className="w-4" style={{ color: 'var(--color-primary)' }} />
                  <span className="font-semibold text-sm">Font Family</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(fontOptions).map(([key, f]) => (
                    <button
                      key={key}
                      onClick={() => setFontKey(key)}
                      className={`py-2 px-3 text-sm border-2 font-medium transition-all ${fontKey === key ? 'text-white border-transparent' : darkMode ? 'border-gray-700 text-gray-300 hover:border-gray-500' : 'border-gray-100 text-gray-700 hover:border-gray-200'}`}
                      style={{
                        borderRadius: 'var(--border-radius)',
                        fontFamily: f.value,
                        backgroundColor: fontKey === key ? 'var(--color-primary)' : undefined,
                      }}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Border Radius */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FontAwesomeIcon icon={faSliders} className="w-4" style={{ color: 'var(--color-primary)' }} />
                  <span className="font-semibold text-sm">Border Radius</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {RADII.map(r => (
                    <button
                      key={r.key}
                      onClick={() => setBorderRadius(r.key)}
                      className={`py-2.5 text-xs font-semibold border-2 transition-all ${borderRadius === r.key ? 'text-white border-transparent' : darkMode ? 'border-gray-700 text-gray-300' : 'border-gray-100 text-gray-700'}`}
                      style={{
                        borderRadius: r.preview,
                        backgroundColor: borderRadius === r.key ? 'var(--color-primary)' : undefined,
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live preview */}
              <div className={`${sectionBg} rounded-xl p-4`} style={{ borderRadius: 'var(--border-radius)' }}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${subTxt} mb-3`}>Preview</p>
                <button
                  className="w-full py-2 text-sm font-bold text-white shadow mb-2"
                  style={{ backgroundColor: 'var(--color-primary)', borderRadius: 'var(--border-radius)' }}
                >
                  Primary Button
                </button>
                <button
                  className="w-full py-2 text-sm font-bold text-white shadow"
                  style={{ backgroundColor: 'var(--color-accent)', borderRadius: 'var(--border-radius)' }}
                >
                  Accent Button
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
