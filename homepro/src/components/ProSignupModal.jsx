import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark, faLocationDot, faBuilding, faUser, faEnvelope, faPhone, faLock,
  faChevronRight, faChevronLeft, faCheckCircle, faSpinner, faPlus, faCreditCard,
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { signupPro, getPlans, createCheckout } from '../services/api';
import useSpamProtect from '../hooks/useSpamProtect';

const POPULAR_ZIPS = ['10001','90210','60601','77001','30301','85001','98101','33101'];

export default function ProSignupModal({ services = [], tenantSlug, onClose, onSuccess }) {
  const { darkMode } = useTheme();
  const { fetchMe } = useAuth();
  const { spamFields, SpamHoneypot } = useSpamProtect();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({
    businessName:'', ownerName:'', email:'', phone:'', password:'',
    services:[], zips:[], cities:[],
    zipInput:'', cityInput:'',
    plan:'free', yearsInBusiness:'', licenseNumber:'',
  });

  // Load subscription plans when reaching step 4 (Choose plan)
  useEffect(() => {
    if (step === 4 && plans.length === 0) {
      getPlans()
        .then((data) => {
          const list = Array.isArray(data) ? data : [];
          setPlans(list);
          if (list.length && !list.some((p) => p.slug === form.plan)) {
            setForm((f) => ({ ...f, plan: list[0].slug }));
          }
        })
        .catch(() => setPlans([]));
    }
  }, [step, plans.length]);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleService = (s) => setForm(f => ({
    ...f,
    services: f.services.includes(s) ? f.services.filter(x => x !== s) : [...f.services, s],
  }));
  const addZip = () => {
    const z = form.zipInput.trim().replace(/\D/g,'').slice(0,5);
    if (z.length === 5 && !form.zips.includes(z))
      setForm(f => ({ ...f, zips: [...f.zips, z], zipInput: '' }));
  };
  const addCity = () => {
    const c = form.cityInput.trim();
    if (c && !form.cities.includes(c))
      setForm(f => ({ ...f, cities: [...f.cities, c], cityInput: '' }));
  };
  const removeZip  = z => setForm(f => ({ ...f, zips:   f.zips.filter(x => x !== z) }));
  const removeCity = c => setForm(f => ({ ...f, cities: f.cities.filter(x => x !== c) }));

  const handleSubmit = async () => {
    if (!form.password || form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = { ...form, ...spamFields() };
      if (tenantSlug) payload.tenant_slug = tenantSlug;
      payload.planSlug = form.plan;
      const data = await signupPro(payload);
      if (data.token) {
        localStorage.setItem('hp_token', data.token);
        await fetchMe();
        const selectedPlan = plans.find((p) => p.slug === form.plan);
        if (selectedPlan?.stripe_price_id) {
          const checkout = await createCheckout(form.plan, 'monthly');
          if (checkout?.url) {
            onClose();
            window.location.href = checkout.url;
            return;
          }
        }
      }
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const serviceOptions = services.length ? services.map(s => s.name) : [
    'Handyperson','Plumbing','Electrical','HVAC','Landscaping','Roofing',
    'Painting','Cleaning','Remodeling','Pest Control','Flooring',
    'Appliance Repair','Fence Installation','Tree Service','Pool Service',
    'Moving','Garage Door','Window Cleaning',
  ];

  const overlay  = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm';
  const modalBg  = darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900';
  const inputCls = darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400';
  const labelCls = darkMode ? 'text-gray-300' : 'text-gray-700';
  const subCls   = darkMode ? 'text-gray-400' : 'text-gray-500';
  const tagBg    = darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600';
  const divColor = darkMode ? '#374151' : '#e5e7eb';

  const inputField = (key, label, icon, type, placeholder) => (
    <div key={key}>
      <label className={`block text-sm font-medium ${labelCls} mb-1`}>
        <FontAwesomeIcon icon={icon} className="mr-1.5 text-xs" />{label}
      </label>
      <input type={type} placeholder={placeholder} value={form[key]}
        onChange={e => update(key, e.target.value)}
        className={`w-full px-3 py-2.5 border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${inputCls}`}
        style={{ borderRadius: 'var(--border-radius)' }}
      />
    </div>
  );

  return (
    <div className={overlay}>
      <div className={`${modalBg} rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col`}>
        <SpamHoneypot />

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b flex-shrink-0" style={{ borderColor: divColor }}>
          <div>
            <h2 className="text-lg font-bold">Join as a Pro</h2>
            <p className={`text-xs mt-0.5 ${subCls}`}>Step {step} of 4 — Start getting leads today</p>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 pt-4 flex-shrink-0">
          <div className={`h-1.5 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="h-1.5 rounded-full transition-all duration-500"
              style={{ width:`${(step/4)*100}%`, backgroundColor:'var(--color-accent)' }} />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto flex-1">

          {/* Step 1 — Business Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Business Information</h3>
              {inputField('businessName', 'Business Name *',    faBuilding, 'text',  "Smith's Plumbing & Repair")}
              {inputField('ownerName',    'Owner / Contact *',  faUser,     'text',  'John Smith')}
              <div className="grid grid-cols-2 gap-4">
                {inputField('email', 'Email *', faEnvelope, 'email', 'john@biz.com')}
                {inputField('phone', 'Phone *', faPhone,    'tel',   '(555) 000-0000')}
              </div>
              {inputField('password', 'Password *', faLock, 'password', 'Min 6 characters')}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${labelCls} mb-1`}>Years in Business</label>
                  <select value={form.yearsInBusiness} onChange={e => update('yearsInBusiness', e.target.value)}
                    className={`w-full px-3 py-2.5 border text-sm focus:outline-none ${inputCls}`}
                    style={{ borderRadius: 'var(--border-radius)' }}>
                    <option value="">Select...</option>
                    {['Less than 1','1–3','3–5','5–10','10+'].map(y => <option key={y} value={y}>{y} yrs</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${labelCls} mb-1`}>License # (optional)</label>
                  <input type="text" placeholder="LIC-123456" value={form.licenseNumber}
                    onChange={e => update('licenseNumber', e.target.value)}
                    className={`w-full px-3 py-2.5 border text-sm focus:outline-none ${inputCls}`}
                    style={{ borderRadius: 'var(--border-radius)' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Services */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold">What services do you offer?</h3>
              <p className={`text-sm ${subCls}`}>You'll only receive leads for selected services.</p>
              <div className="grid grid-cols-2 gap-2">
                {serviceOptions.map(s => (
                  <button key={s} onClick={() => toggleService(s)}
                    className={`py-2 px-3 text-sm border font-medium transition-all text-left ${form.services.includes(s) ? 'text-white border-transparent' : darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-700'}`}
                    style={{ borderRadius:'var(--border-radius)', backgroundColor: form.services.includes(s) ? 'var(--color-accent)' : undefined }}>
                    {s}
                  </button>
                ))}
              </div>
              {form.services.length > 0 && (
                <p className="text-sm font-semibold" style={{ color:'var(--color-accent)' }}>
                  <FontAwesomeIcon icon={faCheckCircle} className="mr-1.5" />
                  {form.services.length} service{form.services.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          {/* Step 3 — Service Area */}
          {step === 3 && (
            <div className="space-y-5">
              <h3 className="font-semibold">Set Your Service Area</h3>
              <p className={`text-sm ${subCls}`}>You'll only receive leads from these ZIP codes and cities.</p>

              {/* ZIPs */}
              <div>
                <label className={`block text-sm font-medium ${labelCls} mb-2`}>
                  <FontAwesomeIcon icon={faLocationDot} className="mr-1.5 text-xs" />ZIP Codes
                </label>
                <div className="flex gap-2">
                  <input type="text" placeholder="Enter ZIP..." value={form.zipInput}
                    onChange={e => update('zipInput', e.target.value.replace(/\D/g,'').slice(0,5))}
                    onKeyDown={e => e.key === 'Enter' && addZip()}
                    className={`flex-1 px-3 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${inputCls}`}
                    style={{ borderRadius:'var(--border-radius)' }} maxLength={5}
                  />
                  <button onClick={addZip} className="px-4 py-2 text-sm font-semibold text-white flex items-center gap-1"
                    style={{ backgroundColor:'var(--color-accent)', borderRadius:'var(--border-radius)' }}>
                    <FontAwesomeIcon icon={faPlus} className="w-3" /> Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className={`text-xs ${subCls}`}>Quick add:</span>
                  {POPULAR_ZIPS.map(z => (
                    <button key={z} onClick={() => { if (!form.zips.includes(z)) setForm(f => ({ ...f, zips:[...f.zips,z] })); }}
                      className={`text-xs px-2 py-0.5 rounded ${form.zips.includes(z) ? 'opacity-40' : ''} ${tagBg}`}>
                      {z}
                    </button>
                  ))}
                </div>
                {form.zips.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {form.zips.map(z => (
                      <span key={z} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor:'var(--color-accent)' }}>
                        <FontAwesomeIcon icon={faLocationDot} className="w-2.5" /> {z}
                        <button onClick={() => removeZip(z)} className="ml-1 hover:opacity-70">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Cities */}
              <div>
                <label className={`block text-sm font-medium ${labelCls} mb-2`}>Cities (optional)</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="e.g. Austin, TX" value={form.cityInput}
                    onChange={e => update('cityInput', e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCity()}
                    className={`flex-1 px-3 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${inputCls}`}
                    style={{ borderRadius:'var(--border-radius)' }}
                  />
                  <button onClick={addCity} className="px-4 py-2 text-sm font-semibold text-white flex items-center gap-1"
                    style={{ backgroundColor:'var(--color-accent)', borderRadius:'var(--border-radius)' }}>
                    <FontAwesomeIcon icon={faPlus} className="w-3" /> Add
                  </button>
                </div>
                {form.cities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {form.cities.map(c => (
                      <span key={c} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor:'var(--color-primary)' }}>
                        {c}
                        <button onClick={() => removeCity(c)} className="ml-1 hover:opacity-70">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className={`p-3 rounded-xl text-sm ${darkMode ? 'bg-orange-900/30 text-orange-300' : 'bg-orange-50 text-orange-700'}`}
                style={{ borderRadius:'var(--border-radius)' }}>
                You can update your service area at any time from your dashboard.
              </div>
            </div>
          )}

          {/* Step 4 — Plan (from subscription_plans; paid plans go to Stripe after signup) */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Choose Your Plan</h3>
              <p className={`text-sm ${subCls}`}>Paid plans require payment via Stripe after you create your account.</p>
              {plans.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                  <FontAwesomeIcon icon={faSpinner} spin /> Loading plans...
                </div>
              ) : (
                <div className="space-y-3">
                  {plans.map((plan) => (
                    <button key={plan.id || plan.slug} type="button" onClick={() => update('plan', plan.slug)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all relative ${form.plan === plan.slug ? 'border-[var(--color-accent)]' : darkMode ? 'border-gray-700 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'}`}
                      style={{ borderRadius:'var(--border-radius)' }}>
                      {plan.is_popular && (
                        <span className="absolute top-2 right-3 text-xs font-bold text-white px-2 py-0.5 rounded-full"
                          style={{ backgroundColor:'var(--color-accent)' }}>POPULAR</span>
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{plan.name}</p>
                          <p className={`text-xs mt-1 ${subCls}`}>
                            {plan.lead_credits ? `${plan.lead_credits} credits/month` : 'Free tier'}
                            {plan.stripe_price_id && (
                              <span className="ml-1.5 inline-flex items-center gap-1">
                                <FontAwesomeIcon icon={faCreditCard} className="w-3" /> Pay with card after signup
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-extrabold text-lg" style={{ color:'var(--color-accent)' }}>
                            {plan.price_monthly > 0 ? `$${Number(plan.price_monthly)}` : 'Free'}
                          </p>
                          <p className={`text-xs ${subCls}`}>{plan.price_monthly > 0 ? '/month' : ''}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 pb-6 flex gap-3 flex-shrink-0 ${step > 1 ? 'justify-between' : 'justify-end'}`}
          style={{ borderTop:`1px solid ${divColor}`, paddingTop:'16px' }}>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border ${darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}
              style={{ borderRadius:'var(--border-radius)' }}>
              <FontAwesomeIcon icon={faChevronLeft} className="w-3" /> Back
            </button>
          )}
          {step < 4 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={(step===1 && (!form.businessName || !form.email || !form.password)) || (step===2 && !form.services.length)}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white shadow hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor:'var(--color-accent)', borderRadius:'var(--border-radius)' }}>
              Continue <FontAwesomeIcon icon={faChevronRight} className="w-3" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white shadow hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor:'var(--color-accent)', borderRadius:'var(--border-radius)' }}>
              {loading
                ? <><FontAwesomeIcon icon={faSpinner} spin className="w-4" /> Creating...</>
                : <><FontAwesomeIcon icon={faCheckCircle} className="w-4" /> Create My Account</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
