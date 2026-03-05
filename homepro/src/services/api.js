const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Public fetch for settings (no auth required)
async function requestPublic(path) {
  const res = await fetch(`${BASE}${path}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API error');
  return data;
}

async function request(path, options = {}) {
  const token = localStorage.getItem('hp_token');
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API error');
  return data;
}

// ── Public settings (no auth) ───────────────
export const getSettings = () => requestPublic('/settings');

// ── Services ────────────────────────────────
export const getServices = () => request('/services');

// ── How It Works ────────────────────────────
export const getHowItWorks = (audience) =>
  request(`/services/how-it-works/${audience}`);

export const getHowItWorksAll = () => request('/services/how-it-works');
export const updateHowItWorksStep = (id, data) =>
  request(`/services/how-it-works/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// ── Leads ───────────────────────────────────
export const submitLead = (data) =>
  request('/leads', { method: 'POST', body: JSON.stringify(data) });

export const getLeads = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/leads${qs ? '?' + qs : ''}`);
};

export const getLeadsForPro = (proId) =>
  request(`/leads/for-pro/${proId}`);

export const updateLeadStatus = (id, status) =>
  request(`/leads/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

export const getMyLeads = () => request('/leads/mine');

// ── Pros ────────────────────────────────────
export const signupPro = (data) =>
  request('/pros', { method: 'POST', body: JSON.stringify(data) });

export const getProProfile = (id) => request(`/pros/${id}`);

// ── Categories ──────────────────────────────
export const getCategories = () => request('/categories');

// ── Cities ──────────────────────────────────
export const searchCities = (q) => request(`/cities?q=${encodeURIComponent(q)}`);
export const lookupZip = (zip) => request(`/cities/zip/${zip}`);

// ── Subscriptions ───────────────────────────
export const getPlans = () => request('/subscriptions/plans');

export const getCurrentSubscription = () => request('/subscriptions/current');

export const createCheckout = (planSlug, billingPeriod = 'monthly') =>
  request('/payments/create-checkout', {
    method: 'POST',
    body: JSON.stringify({ planSlug, billingPeriod }),
  });

export const cancelSubscription = () =>
  request('/subscriptions/cancel', { method: 'POST' });

export const resumeSubscription = () =>
  request('/subscriptions/resume', { method: 'POST' });

export const openBillingPortal = () =>
  request('/subscriptions/portal', { method: 'POST' });

// ── Payments ────────────────────────────────
export const getPaymentHistory = (page = 1, limit = 20) =>
  request(`/payments?page=${page}&limit=${limit}`);

export const getInvoices = () => request('/payments/invoices');

// ── Profile ─────────────────────────────────
export const changePassword = (currentPassword, newPassword) =>
  request('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  });

export const updateProProfile = (proId, data) =>
  request(`/pros/${proId}`, { method: 'PUT', body: JSON.stringify(data) });

// ── CMS Pages ─────────────────────────────
export const getPages = () => request('/pages');
export const getPage = (slug) => request(`/pages/${slug}`);
