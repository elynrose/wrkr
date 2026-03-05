import { createContext, useContext, useState, useEffect } from 'react';
import { getSettings } from '../services/api';

const SettingsContext = createContext(null);

const DEFAULTS = {
  site_name: 'HomePro',
  support_email: 'support@homepro.com',
  support_phone: '1-800-HOMEPRO',
  site_tagline: 'Find Trusted Local Service Professionals',
  meta_title: 'HomePro — Find Trusted Local Service Professionals',
  google_analytics_enabled: false,
  google_analytics_measurement_id: '',
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);

  useEffect(() => {
    getSettings()
      .then((data) => setSettings((prev) => ({ ...DEFAULTS, ...prev, ...data })))
      .catch(() => { /* use defaults when API unavailable */ });
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
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
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
