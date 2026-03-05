import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faXmark, faSpinner } from '@fortawesome/free-solid-svg-icons';

import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { getServices } from './services/api';

import Header             from './components/Header';
import Hero               from './components/Hero';
import ServiceCategories  from './components/ServiceCategories';
import HowItWorks         from './components/HowItWorks';
import ProDashboard       from './components/ProDashboard';
import ConsumerSignupModal from './components/ConsumerSignupModal';
import ProSignupModal     from './components/ProSignupModal';
import ThemeCustomizer    from './components/ThemeCustomizer';
import Footer             from './components/Footer';

import LoginPage        from './pages/LoginPage';
import RegisterPage     from './pages/RegisterPage';
import AdminDashboard   from './pages/AdminDashboard';
import LeadDetailsPage  from './pages/LeadDetailsPage';
import ProfilePage      from './pages/ProfilePage';
import ProHomePage      from './pages/ProHomePage';
import CmsPage          from './pages/CmsPage';
import ClaimPage        from './pages/ClaimPage';

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
  const [view, setView]                   = useState('home');
  const [services, setServices]           = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [consumerModal, setConsumerModal] = useState(null);
  const [proModal, setProModal]           = useState(false);
  const [toast, setToast]                 = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [cmsSlug, setCmsSlug]             = useState(null);
  const [claimToken, setClaimToken]       = useState(null);

  // Parse hash routes on load and hash change (for SMS claim links)
  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash;
      const claimMatch = hash.match(/^#claim\/(.+)$/);
      if (claimMatch) {
        setClaimToken(claimMatch[1]);
        setView('claim');
        return;
      }
      const pageMatch = hash.match(/^#page\/(.+)$/);
      if (pageMatch) {
        setCmsSlug(pageMatch[1]);
        setView('cms-page');
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

  useEffect(() => {
    getServices()
      .then(d => setServices(d))
      .catch(() => setServices([]))
      .finally(() => setServicesLoading(false));
  }, []);

  // After login, redirect based on role
  useEffect(() => {
    if (user && (view === 'login' || view === 'register')) {
      if (user.role === 'admin') setView('admin');
      else if (user.role === 'pro') setView('pro-dashboard');
      else setView('home');
    }
  }, [user, view]);

  // Logged-in pros on the for-pros landing page go straight to dashboard
  useEffect(() => {
    if (view === 'for-pros' && user?.role === 'pro') {
      setView('pro-dashboard');
    }
  }, [view, user?.role]);

  const openConsumer = (data = {}) => setConsumerModal(data);
  const openPro      = ()          => setProModal(true);
  const showToast    = (msg)       => setToast(msg);

  const navigate = (v) => {
    if (v && v.startsWith('page:')) {
      setCmsSlug(v.slice(5));
      setView('cms-page');
    } else {
      setCmsSlug(null);
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
  if (view === 'login') return <LoginPage onNavigate={navigate} />;
  if (view === 'register') return <RegisterPage onNavigate={navigate} />;

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
          <Hero onConsumerSignup={openConsumer} services={services} />
          <ServiceCategories services={services} loading={servicesLoading} onConsumerSignup={openConsumer} />
          <HowItWorks onConsumerSignup={openConsumer} onNavigatePro={() => navigate('for-pros')} />
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

      {view === 'admin' && user?.role === 'admin' && !selectedLeadId && (
        <AdminDashboard onShowLead={(id) => setSelectedLeadId(id)} />
      )}

      {view === 'admin' && user?.role === 'admin' && selectedLeadId && (
        <LeadDetailsPage leadId={selectedLeadId} onBack={() => setSelectedLeadId(null)} />
      )}

      {!['home','how','for-pros','pro-dashboard','profile','cms-page','admin','claim'].includes(view) && (
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
          onClose={() => setProModal(false)}
          onSuccess={() => showToast('Account created! Welcome to HomePro. Check your email for next steps.')}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
      <ThemeCustomizer />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </ThemeProvider>
  );
}
