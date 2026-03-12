import { useSettings } from '../context/SettingsContext';

export default function CopyrightPage({ onNavigate }) {
  const { siteName } = useSettings();
  const name = siteName || 'HomePro';
  const year = new Date().getFullYear();

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px', fontFamily: 'var(--font-family)' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Copyright & Legal</h1>
      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 32 }}>Last updated: {new Date().toLocaleDateString('en-US')}</p>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Copyright Notice</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#374151' }}>
          © {year} {name}. All rights reserved.
        </p>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#374151' }}>
          The content on this website—including text, graphics, logos, images, and software—is the property of {name} or its content suppliers and is protected by copyright and other intellectual property laws. You may not reproduce, distribute, modify, or create derivative works from this content without prior written permission.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Trademarks</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#374151' }}>
          {name} and related logos and marks are trademarks or registered trademarks. Other product and company names may be trademarks of their respective owners.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Use of the Site</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#374151' }}>
          You may use this site for lawful purposes only. You may not use the site to transmit harmful code, attempt to gain unauthorized access to our systems, or use the site in any way that could damage or overburden our infrastructure.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Contact</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#374151' }}>
          For copyright or legal inquiries, please contact us using the information provided on our website.
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
