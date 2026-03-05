import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark, faLocationDot, faUser, faEnvelope, faPhone,
  faChevronRight, faChevronLeft, faCheckCircle, faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { submitLead } from '../services/api';
import useSpamProtect from '../hooks/useSpamProtect';

const URGENCY = ['Within 24 hours', 'This week', 'This month', 'Just planning'];

export default function ConsumerSignupModal({ initialData = {}, services = [], onClose, onSuccess }) {
  const { darkMode } = useTheme();
  const { spamFields, SpamHoneypot } = useSpamProtect();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    service: initialData.service || '',
    zip: initialData.zip || '',
    city: '',
    description: '',
    urgency: '',
    name: '',
    email: '',
    phone: '',
  });

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (form.zip && !/^\d{5}$/.test(form.zip)) {
      setError('ZIP code must be exactly 5 digits.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await submitLead({ ...form, ...spamFields() });
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const overlay = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm';
  const modalBg = darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900';
  const inputCls = darkMode
    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500'
    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400';
  const labelCls = darkMode ? 'text-gray-300' : 'text-gray-700';
  const subCls   = darkMode ? 'text-gray-400' : 'text-gray-500';
  const divColor = darkMode ? '#374151' : '#e5e7eb';

  const serviceOptions = services.length ? services.map(s => s.name) : [
    'Handyperson','Plumbing','Electrical','HVAC','Landscaping','Roofing',
    'Painting','Cleaning','Remodeling','Pest Control','Flooring',
    'Appliance Repair','Fence Installation','Tree Service','Pool Service',
    'Moving','Garage Door','Window Cleaning',
  ];

  return (
    <div className={overlay}>
      <div className={`${modalBg} rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden`}>
        <SpamHoneypot />

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b" style={{ borderColor: divColor }}>
          <div>
            <h2 className="text-lg font-bold">Request a Service Pro</h2>
            <p className={`text-xs mt-0.5 ${subCls}`}>Step {step} of 3 — Free, no obligation</p>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 pt-4">
          <div className={`h-1.5 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${(step / 3) * 100}%`, backgroundColor: 'var(--color-primary)' }} />
          </div>
        </div>

        <div className="px-6 py-6">
          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold">What do you need help with?</h3>
              <div>
                <label className={`block text-sm font-medium ${labelCls} mb-1`}>Service Type</label>
                <select
                  value={form.service}
                  onChange={e => update('service', e.target.value)}
                  className={`w-full px-3 py-2.5 border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${inputCls}`}
                  style={{ borderRadius: 'var(--border-radius)' }}
                >
                  <option value="">Select a service...</option>
                  {serviceOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium ${labelCls} mb-1`}>Describe your project</label>
                <textarea
                  rows={3}
                  placeholder="e.g. My kitchen faucet is leaking under the sink..."
                  value={form.description}
                  onChange={e => update('description', e.target.value)}
                  className={`w-full px-3 py-2.5 border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${inputCls}`}
                  style={{ borderRadius: 'var(--border-radius)' }}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${labelCls} mb-2`}>How soon do you need this?</label>
                <div className="grid grid-cols-2 gap-2">
                  {URGENCY.map(u => (
                    <button
                      key={u}
                      onClick={() => update('urgency', u)}
                      className={`py-2 px-3 text-sm border font-medium transition-all ${form.urgency === u ? 'text-white border-transparent' : darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-700'}`}
                      style={{
                        borderRadius: 'var(--border-radius)',
                        backgroundColor: form.urgency === u ? 'var(--color-primary)' : undefined,
                      }}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Where do you need the work done?</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${labelCls} mb-1`}>
                    <FontAwesomeIcon icon={faLocationDot} className="mr-1.5" />ZIP Code *
                  </label>
                  <input
                    type="text" placeholder="e.g. 90210"
                    value={form.zip}
                    onChange={e => update('zip', e.target.value.replace(/\D/g,'').slice(0,5))}
                    className={`w-full px-3 py-2.5 border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${inputCls}`}
                    style={{ borderRadius: 'var(--border-radius)' }}
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${labelCls} mb-1`}>City</label>
                  <input
                    type="text" placeholder="e.g. Austin"
                    value={form.city}
                    onChange={e => update('city', e.target.value)}
                    className={`w-full px-3 py-2.5 border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${inputCls}`}
                    style={{ borderRadius: 'var(--border-radius)' }}
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
              <div className={`p-4 rounded-xl text-sm ${darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'}`}
                style={{ borderRadius: 'var(--border-radius)' }}>
                <p className="font-semibold mb-1">
                  <FontAwesomeIcon icon={faCheckCircle} className="mr-1.5" />How matching works
                </p>
                <p>Your request is sent to verified pros registered for your ZIP code. You'll receive up to 4 quotes — completely free.</p>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold">How should pros reach you?</h3>
              {[
                { key:'name',  label:'Full Name *',       icon:faUser,     type:'text',  placeholder:'Jane Smith' },
                { key:'email', label:'Email Address *',   icon:faEnvelope, type:'email', placeholder:'jane@email.com' },
                { key:'phone', label:'Phone Number',      icon:faPhone,    type:'tel',   placeholder:'(555) 000-0000' },
              ].map(f => (
                <div key={f.key}>
                  <label className={`block text-sm font-medium ${labelCls} mb-1`}>
                    <FontAwesomeIcon icon={f.icon} className="mr-1.5 text-xs" />{f.label}
                  </label>
                  <input
                    type={f.type} placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={e => update(f.key, e.target.value)}
                    className={`w-full px-3 py-2.5 border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${inputCls}`}
                    style={{ borderRadius: 'var(--border-radius)' }}
                  />
                </div>
              ))}
              {error && (
                <p className="text-sm text-red-500 font-medium">{error}</p>
              )}
              <p className={`text-xs ${subCls}`}>
                By submitting, you agree to our Terms. Your contact info is shared only with matched pros.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 pb-6 flex gap-3 ${step > 1 ? 'justify-between' : 'justify-end'}`}
          style={{ borderTop: `1px solid ${divColor}`, paddingTop: '16px' }}>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border ${darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}
              style={{ borderRadius: 'var(--border-radius)' }}>
              <FontAwesomeIcon icon={faChevronLeft} className="w-3" /> Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => {
                if (step === 2 && form.zip && !/^\d{5}$/.test(form.zip)) {
                  setError('ZIP code must be exactly 5 digits.');
                  return;
                }
                setError('');
                setStep(s => s + 1);
              }}
              disabled={step === 1 && !form.service}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white shadow hover:opacity-90 transition-all disabled:opacity-40"
              style={{ backgroundColor: 'var(--color-primary)', borderRadius: 'var(--border-radius)' }}
            >
              Continue <FontAwesomeIcon icon={faChevronRight} className="w-3" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!form.name || !form.email || loading}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white shadow hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: 'var(--color-primary)', borderRadius: 'var(--border-radius)' }}
            >
              {loading
                ? <><FontAwesomeIcon icon={faSpinner} spin className="w-4" /> Submitting...</>
                : <><FontAwesomeIcon icon={faCheckCircle} className="w-4" /> Submit Request</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
