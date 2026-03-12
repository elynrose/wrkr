import { useSettings } from '../context/SettingsContext';

export default function TermsPage({ onNavigate }) {
  const { siteName } = useSettings();
  const name = siteName || 'HomePro';

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px', fontFamily: 'var(--font-family)' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Terms of Service</h1>
      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 32 }}>Last updated: {new Date().toLocaleDateString('en-US')}</p>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>1. Acceptance of Terms</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#374151' }}>
          By accessing or using {name} and its services, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>2. Description of Service</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#374151' }}>
          {name} connects homeowners with local service professionals. We provide a platform for submitting service requests, matching with pros, and managing leads. We do not guarantee the quality, legality, or completion of any work performed by professionals.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>3. User Accounts and Conduct</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#374151' }}>
          You must provide accurate information when registering. You are responsible for keeping your account secure. You may not use the service for any illegal purpose, to harass others, or to submit false or misleading information.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>4. Fees and Payments</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#374151' }}>
          Subscription and lead-credit fees are described on the site and at the time of purchase. Fees are charged in accordance with the plan you select. Refunds are subject to our refund policy as stated at checkout or in your plan terms.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>5. Intellectual Property</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#374151' }}>
          The {name} platform, including its design, text, graphics, and software, is owned by {name} or its licensors. You may not copy, modify, or distribute our content without permission.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>6. Limitation of Liability</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#374151' }}>
          To the fullest extent permitted by law, {name} is not liable for any indirect, incidental, special, or consequential damages arising from your use of the service. Our total liability shall not exceed the amount you paid us in the twelve months prior to the claim.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>7. Changes</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#374151' }}>
          We may update these terms from time to time. Continued use of the service after changes constitutes acceptance. We will indicate the last updated date at the top of this page.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>8. Contact</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#374151' }}>
          Questions about these Terms of Service may be sent to the contact information provided on our website.
        </p>
      </section>

      <button
        type="button"
        onClick={() => onNavigate && onNavigate('home')}
        style={{
          padding: '10px 20px',
          fontSize: 14,
          fontWeight: 600,
          borderRadius: 'var(--border-radius)',
          border: '1px solid #e5e7eb',
          background: '#f9fafb',
          color: '#374151',
          cursor: 'pointer',
        }}
      >
        ← Back to Home
      </button>
    </div>
  );
}
