import { createContext, useContext, useState, useEffect } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const SettingsContext = createContext(null);
export const TenantContext = createContext(null);

const DEFAULTS = {
  site_name: 'HomePro',
  support_email: 'support@homepro.com',
  support_phone: '1-800-HOMEPRO',
  site_tagline: 'Find Trusted Local Service Professionals',
  meta_title: 'HomePro — Find Trusted Local Service Professionals',
  google_analytics_enabled: false,
  google_analytics_measurement_id: '',
};

const DEFAULT_TENANT = {
  id: 1,
  name: 'HomePro',
  slug: 'default',
  plan: 'starter',
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);
  const [tenant, setTenant] = useState(DEFAULT_TENANT);

  useEffect(() => {
    // Load tenant config (includes settings) in one call
    fetch(`${BASE}/tenant/config`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        if (data.tenant) setTenant(data.tenant);
        if (data.settings) {
          setSettings(prev => ({ ...DEFAULTS, ...prev, ...data.settings }));
        }
      })
      .catch(() => {
        // Fall back to direct settings fetch
        fetch(`${BASE}/settings`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data) setSettings(prev => ({ ...DEFAULTS, ...prev, ...data }));
          })
          .catch(() => {});
      });
  }, []);

  useEffect(() => {
    const title = settings.meta_title || DEFAULTS.meta_title;
    if (title) document.title = title;
  }, [settings.meta_title]);

  const value = {
    siteName: settings.site_name || DEFAULTS.site_name,
    supportEmail: settings.support_email || DEFAULTS.support_email,
    supportPhone: settings.support_phone || DEFAULTS.support_phone,
    siteTagline: settings.site_tagline || DEFAULTS.site_tagline,
    metaTitle: settings.meta_title || DEFAULTS.meta_title,
    googleAnalyticsEnabled: settings.google_analytics_enabled === true || settings.google_analytics_enabled === 'true' || settings.google_analytics_enabled === '1',
    googleAnalyticsMeasurementId: (settings.google_analytics_measurement_id || DEFAULTS.google_analytics_measurement_id || '').trim(),
  };

  return (
    <TenantContext.Provider value={tenant}>
      <SettingsContext.Provider value={value}>
        {children}
      </SettingsContext.Provider>
    </TenantContext.Provider>
  );
}

const FALLBACK = {
  siteName: 'HomePro',
  supportEmail: 'support@homepro.com',
  supportPhone: '1-800-HOMEPRO',
  siteTagline: 'Find Trusted Local Service Professionals',
  metaTitle: 'HomePro — Find Trusted Local Service Professionals',
  googleAnalyticsEnabled: false,
  googleAnalyticsMeasurementId: '',
};

export const useSettings = () => useContext(SettingsContext) || FALLBACK;
export const useTenant = () => useContext(TenantContext) || DEFAULT_TENANT;
