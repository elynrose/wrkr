import { useEffect, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';

/**
 * Injects Google Analytics (gtag.js) on all pages when enabled in admin settings.
 * Tracks page views on initial load and on hash change (SPA routing).
 */
export default function GoogleAnalytics() {
  const { googleAnalyticsEnabled, googleAnalyticsMeasurementId } = useSettings();
  const injected = useRef(false);

  useEffect(() => {
    if (!googleAnalyticsEnabled || !googleAnalyticsMeasurementId || injected.current) return;

    const id = googleAnalyticsMeasurementId.replace(/^\s+|\s+$/g, '');
    if (!id || !id.startsWith('G-')) return;

    injected.current = true;

    const sendPageView = (path = window.location.pathname + (window.location.hash || '') || '/') => {
      if (typeof window.gtag === 'function') {
        window.gtag('config', id, { page_path: path });
      }
    };

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', id, { send_page_view: true });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(script);

    const handleHashChange = () => sendPageView(window.location.pathname + (window.location.hash || '') || '/');
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [googleAnalyticsEnabled, googleAnalyticsMeasurementId]);

  return null;
}
