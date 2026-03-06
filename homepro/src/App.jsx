import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faXmark, faSpinner } from '@fortawesome/free-solid-svg-icons';

import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { getServices } from './services/api';

import Header             from './components/Header';
import Hero               from './components/Hero';
import ServiceCategories  from './components/ServiceCategories';
import HowItWorks         from './components/HowItWorks';
import MarketingSections  from './components/MarketingSections';
import ProDashboard       from './components/ProDashboard';
import ConsumerSignupModal from './components/ConsumerSignupModal';
import ProSignupModal     from './components/ProSignupModal';
import Footer             from './components/Footer';

import LoginPage        from './pages/LoginPage';
import RegisterPage     from './pages/RegisterPage';
import AdminDashboard   from './pages/AdminDashboard';
import LeadDetailsPage  from './pages/LeadDetailsPage';
import ProfilePage      from './pages/ProfilePage';
import ProHomePage      from './pages/ProHomePage';
import RecentReviews   from './components/RecentReviews';
import CmsPage          from './pages/CmsPage';
import ClaimPage        from './pages/ClaimPage';
import ReviewPage       from './pages/ReviewPage';
import InstallPage      from './pages/InstallPage';
import TenantSignupPage from './pages/TenantSignupPage';
import TenantHomePage   from './pages/TenantHomePage';
import TenantForProsPage from './pages/TenantForProsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage  from './pages/ResetPasswordPage';
import VerifyEmailPage    from './pages/VerifyEmailPage';
import ErrorBoundary    from './components/ErrorBoundary';
import GoogleAnalytics  from './components/GoogleAnalytics';

function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-5 right-5 z-[100] flex items-center gap-3 bg-green-600 text-white px-5 py-3 rounded-xl shadow-2xl animate-bounce-in">
      <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5" />
      <span className="text-sm font-semibold">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
        <FontAwesomeIcon icon={faXmark} className="w-4" />
      </button>
    </div>
  );
}

function AppInner() {
  const { user, loading: authLoading } = useAuth();
  const { siteName, settings } = useSettings();
  const show = (key) => settings[key] !== 'false' && settings[key] !== false;
  const [view, setView]                   = useState('home');
  const [services, setServices]           = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [consumerModal, setConsumerModal] = useState(null);
  const [proModal, setProModal]           = useState(false);
  const [toast, setToast]                 = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [cmsSlug, setCmsSlug]             = useState(null);
  const [claimToken, setClaimToken]       = useState(null);
  const [reviewToken, setReviewToken]     = useState(null);
  const [resetToken, setResetToken]       = useState(null);
  const [verifyToken, setVerifyToken]     = useState(null);
  const [tenantSlug, setTenantSlug]       = useState(null);

  // Parse hash routes on load and hash change (for SMS claim links)
  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash;
      const pathname = window.location.pathname || '';
      if (pathname === '/install' || hash === '#install' || hash === '#/install') {
        setView('install');
        return;
      }
      if (pathname === '/join' || hash === '#join' || hash === '#/join') {
        setView('join');
        return;
      }
      const claimMatch = hash.match(/^#claim\/(.+)$/);
      if (claimMatch) {
        setClaimToken(claimMatch[1]);
        setView('claim');
        return;
      }
      const reviewMatch = hash.match(/^#review\/(.+)$/);
      if (reviewMatch) {
        setReviewToken(reviewMatch[1]);
        setView('review');
        return;
      }
      const resetMatch = hash.match(/^#reset\/(.+)$/);
      if (resetMatch) {
        setResetToken(resetMatch[1]);
        setView('reset-password');
        return;
      }
      const verifyMatch = hash.match(/^#verify\/(.+)$/);
      if (verifyMatch) {
        setVerifyToken(verifyMatch[1]);
        setView('verify-email');
        return;
      }
      if (hash === '#forgot' || hash === '#/forgot') {
        setView('forgot-password');
        return;
      }
      const tenantForProsMatch = hash.match(/^#t\/([^/]+)\/for-pros$/);
      if (tenantForProsMatch) {
        setTenantSlug(tenantForProsMatch[1]);
        setView('tenant-for-pros');
        return;
      }
      const tenantMatch = hash.match(/^#t\/(.+)$/);
      if (tenantMatch) {
        setTenantSlug(tenantMatch[1]);
        setView('tenant-home');
        return;
      }
      const pageMatch = hash.match(/^#page\/(.+)$/);
      if (pageMatch) {
        setCmsSlug(pageMatch[1]);
        setView('cms-page');
        return;
      }
      if (hash === '#install' || hash === '#/install') {
        setView('install');
      }
    };
    parseHash();
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, []);

  // Handle Stripe redirect query params (?credits=success, ?checkout=success, etc.)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const creditsResult = params.get('credits');
    const checkoutResult = params.get('checkout');
    if (creditsResult === 'success') {
      const amount = params.get('amount');
      setToast(amount ? `${amount} lead credits purchased successfully!` : 'Credits purchased successfully!');
      setView('pro-dashboard');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (creditsResult === 'cancel') {
      setToast('Credit purchase was cancelled.');
      setView('pro-dashboard');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (checkoutResult === 'success') {
      setToast('Subscription activated! Your plan has been upgraded.');
      setView('pro-dashboard');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (checkoutResult === 'cancel') {
      setToast('Checkout was cancelled.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchServices = () => {
    setServicesLoading(true);
    getServices()
      .then(d => setServices(d))
      .catch(() => setServices([]))
      .finally(() => setServicesLoading(false));
  };

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && view === 'home') fetchServices();
    };
    const onDataUpdated = () => { if (view === 'home') fetchServices(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('app:settings-updated', onDataUpdated);
    window.addEventListener('app:data-updated', onDataUpdated);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('app:settings-updated', onDataUpdated);
      window.removeEventListener('app:data-updated', onDataUpdated);
    };
  }, [view]);

  // After login, redirect based on role
  useEffect(() => {
    if (user && (view === 'login' || view === 'register')) {
      if (user.role === 'admin' || user.role === 'superadmin') setView('admin');
      else if (user.role === 'pro') setView('pro-dashboard');
      else setView('home');
    }
  }, [user, view]);

  // Logged-in pros on the for-pros or tenant-for-pros page go straight to dashboard
  useEffect(() => {
    if ((view === 'for-pros' || view === 'tenant-for-pros') && user?.role === 'pro') {
      setView('pro-dashboard');
    }
  }, [view, user?.role]);

  // Logged-in admins/superadmins on the home page go straight to admin dashboard
  useEffect(() => {
    if (view === 'home' && (user?.role === 'admin' || user?.role === 'superadmin')) {
      setView('admin');
    }
  }, [view, user?.role]);

  const openConsumer = (data = {}) => setConsumerModal(data);
  const openPro      = (opts)     => setProModal(opts && opts.tenantSlug ? { tenantSlug: opts.tenantSlug } : true);
  const showToast    = (msg)       => setToast(msg);

  const navigate = (v) => {
    if (v && v.startsWith('page:')) {
      setCmsSlug(v.slice(5));
      setView('cms-page');
    } else if (v && v.startsWith('tenant:')) {
      setTenantSlug(v.slice(7));
      setView('tenant-home');
      window.location.hash = `#t/${v.slice(7)}`;
    } else if (v === 'forgot-password') {
      setResetToken(null);
      setVerifyToken(null);
      setView('forgot-password');
      window.location.hash = '#forgot';
    } else {
      setCmsSlug(null);
      setTenantSlug(null);
      setView(v);
    }
    window.scrollTo(0, 0);
  };

  // Auth loading spinner
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f0f4f8', fontFamily: 'var(--font-family)',
      }}>
        <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 32, color: 'var(--color-primary)' }} />
      </div>
    );
  }

  // Full-page views (no header/footer)
  if (view === 'claim' && claimToken) return <ClaimPage token={claimToken} onNavigate={navigate} />;
  if (view === 'review' && reviewToken) return <ReviewPage token={reviewToken} onNavigate={navigate} />;
  if (view === 'install') return <InstallPage onNavigate={navigate} />;
  if (view === 'join')    return <TenantSignupPage onNavigate={navigate} />;
  if (view === 'tenant-home' && tenantSlug) return <TenantHomePage slug={tenantSlug} onNavigate={navigate} />;
  if (view === 'tenant-for-pros' && tenantSlug) return <TenantForProsPage slug={tenantSlug} onNavigate={navigate} onProSignup={openPro} />;
  if (view === 'login') return <LoginPage onNavigate={navigate} />;
  if (view === 'register') return <RegisterPage onNavigate={navigate} />;
  if (view === 'forgot-password') return <ForgotPasswordPage onNavigate={navigate} />;
  if (view === 'reset-password' && resetToken) return <ResetPasswordPage token={resetToken} onNavigate={navigate} />;
  if (view === 'verify-email' && verifyToken) return <VerifyEmailPage token={verifyToken} onNavigate={navigate} />;

  return (
    <div style={{ fontFamily: 'var(--font-family)' }}>
      <Header
        onConsumerSignup={openConsumer}
        onProSignup={openPro}
        onShowView={navigate}
        currentView={view}
      />

      {view === 'home' && (
        <>
          {show('show_hero') && <Hero onConsumerSignup={openConsumer} onBookDemo={() => openConsumer({ demo: true })} services={services} />}
          <MarketingSections />
          {show('show_service_categories') && <ServiceCategories services={services} loading={servicesLoading} onConsumerSignup={openConsumer} />}
          {show('show_how_it_works') && <HowItWorks onConsumerSignup={openConsumer} onNavigatePro={() => navigate('for-pros')} />}
          {show('show_recent_reviews') && <RecentReviews />}
        </>
      )}

      {view === 'how' && (
        <div className="min-h-screen">
          <HowItWorks onConsumerSignup={openConsumer} onNavigatePro={() => navigate('for-pros')} />
        </div>
      )}

      {view === 'for-pros' && (!user || user.role !== 'pro') && (
        <ProHomePage onProSignup={openPro} onNavigate={navigate} />
      )}

      {view === 'pro-dashboard' && user?.role === 'pro' && (
        <ProDashboard onProSignup={openPro} />
      )}

      {view === 'pro-dashboard' && (!user || user.role !== 'pro') && (
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700 }}>Pro Account Required</h2>
          <p style={{ color: '#6b7280', maxWidth: 400, textAlign: 'center' }}>
            You need a Pro account to access the dashboard. Sign up as a service professional to start receiving leads.
          </p>
          <button onClick={openPro}
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff', padding: '10px 24px', borderRadius: 'var(--border-radius)', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            Join as a Pro
          </button>
        </div>
      )}

      {view === 'profile' && user && (
        <ProfilePage />
      )}

      {view === 'cms-page' && cmsSlug && (
        <CmsPage slug={cmsSlug} />
      )}

      {view === 'admin' && (user?.role === 'admin' || user?.role === 'superadmin') && !selectedLeadId && (
        <AdminDashboard onShowLead={(id) => setSelectedLeadId(id)} />
      )}

      {view === 'admin' && (user?.role === 'admin' || user?.role === 'superadmin') && selectedLeadId && (
        <LeadDetailsPage leadId={selectedLeadId} onBack={() => setSelectedLeadId(null)} />
      )}

      {!['home','how','for-pros','pro-dashboard','profile','cms-page','admin','claim','review','install','tenant-home','tenant-for-pros','join'].includes(view) && (
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 40 }}>
          <h2 style={{ fontSize: 48, fontWeight: 800, color: 'var(--color-primary)' }}>404</h2>
          <p style={{ fontSize: 18, fontWeight: 600 }}>Page not found</p>
          <p style={{ color: '#6b7280', maxWidth: 400, textAlign: 'center' }}>
            The page you're looking for doesn't exist or has been moved.
          </p>
          <button onClick={() => navigate('home')}
            style={{ backgroundColor: 'var(--color-primary)', color: '#fff', padding: '10px 24px', borderRadius: 'var(--border-radius)', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            Go Home
          </button>
        </div>
      )}

      {(view === 'home' || view === 'how' || view === 'for-pros' || view === 'cms-page') && <Footer onNavigate={navigate} />}

      {consumerModal !== null && (
        <ConsumerSignupModal
          initialData={consumerModal}
          services={services}
          onClose={() => setConsumerModal(null)}
          onSuccess={() => showToast('Request submitted! Pros in your area will contact you shortly.')}
        />
      )}

      {proModal && (
        <ProSignupModal
          services={services}
          tenantSlug={typeof proModal === 'object' && proModal?.tenantSlug ? proModal.tenantSlug : undefined}
          onClose={() => setProModal(false)}
          onSuccess={() => {
            showToast(`Account created! Welcome to ${siteName}. Check your email for next steps.`);
            setProModal(false);
            navigate('pro-dashboard');
          }}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <SettingsProvider>
            <GoogleAnalytics />
            <AppInner />
          </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
