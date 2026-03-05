require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

// Stripe webhook needs raw body — must be before json parser
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth',            require('./routes/auth'));
app.use('/api/users',           require('./routes/users'));
app.use('/api/categories',      require('./routes/categories'));
app.use('/api/services',        require('./routes/services'));
app.use('/api/leads',           require('./routes/leads'));
app.use('/api/cities',          require('./routes/cities'));
app.use('/api/pros',            require('./routes/pros'));
app.use('/api/payments',        require('./routes/payments'));
app.use('/api/subscriptions',   require('./routes/subscriptions'));
app.use('/api/reviews',         require('./routes/reviews'));
app.use('/api/notifications',   require('./routes/notifications'));
app.use('/api/messages',        require('./routes/messages'));
app.use('/api/settings',        require('./routes/settings'));
app.use('/api/templates',       require('./routes/templates'));
app.use('/api/pages',           require('./routes/pages'));
app.use('/api/matching',        require('./routes/matching'));
app.use('/api/credits',         require('./routes/credits'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    stripe: !!process.env.STRIPE_SECRET_KEY,
    routes: [
      'auth', 'users', 'categories', 'services', 'leads',
      'cities', 'pros', 'payments', 'subscriptions',
      'reviews', 'notifications', 'messages', 'settings', 'pages',
      'matching', 'credits',
    ],
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✅ HomePro API running at http://localhost:${PORT}`);
  console.log(`   Routes: auth, users, categories, services, leads, cities, pros, payments, subscriptions, reviews, notifications, messages`);
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log(`   ⚠️  Stripe not configured — set STRIPE_SECRET_KEY in .env for payments`);
  }
});
