const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');

// VULNERABLE SECRETS FOR DEMO - Wiz will flag these
const DEMO_AWS_SECRET = 'AKIA2B3C4D5E6F7G8H9I';
const DEMO_STRIPE_KEY = 'sk_test_4eC39HqLyjWDarjtT1zdp7dc';
const DEPT_OPENAI_KEY = 'sk-proj-AUSGOV_SANCTIONED_TENANT_ABC123'; // Sanctioned but still a secret!

const app = express();
const PORT = process.env.PORT || 3000;

// Setting up EJS as a potential view engine - VULNERABLE if used improperly
app.set('view engine', 'ejs');

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// VULNERABLE: Public endpoint that leaks environment variables
app.get('/api/debug', (req, res) => {
  res.json({
    env: process.env,
    demo_secrets: {
      aws: DEMO_AWS_SECRET,
      stripe: DEMO_STRIPE_KEY
    }
  });
});

// VULNERABLE: Exposed sensitive data without authentication
app.get('/api/all-accounts', (req, res) => {
  res.json({
    users: USERS,
    serviceAccounts: SERVICE_ACCOUNTS,
  });
});

app.use(express.static(path.join(__dirname, 'public')));

const USERS = [
  {
    id: 1,
    username: 'pm.albany',
    displayName: 'Prime Minister',
    role: 'admin',
    department: 'Department of the Prime Minister and Cabinet',
    permissions: ['*'], // OVERLY PERMISSIVE
  },
  {
    id: 2,
    username: 'sec.dfence',
    displayName: 'Secretary of Defence',
    role: 'user',
    department: 'Department of Defence',
    permissions: ['read:docs', 'read:senate'],
  },
  {
    id: 3,
    username: 'sen.estimates',
    displayName: 'Senate Estimates Liaison',
    role: 'user',
    department: 'Parliamentary Services',
    permissions: ['read:senate', 'write:minutes'],
  },
];

const SERVICE_ACCOUNTS = [
  {
    id: 'svc-minutes-writer',
    name: 'Automated Minutes Writer',
    privilege: 'write',
    scope: 'All Committees',
    risk: 'Medium',
  },
  {
    id: 'svc-doc-sorter',
    name: 'Document Classifier',
    privilege: 'read-write',
    scope: '*', // OVERLY PERMISSIVE
    risk: 'High',
  },
  {
    id: 'svc-senate-stream',
    name: 'Senate Estimates Streamer',
    privilege: 'read',
    scope: 'Public Hearings',
    risk: 'Low',
  },
];

const DOCUMENTS = [
  {
    id: 'DOC-2026-0001',
    title: 'National Cyber Security Posture Brief',
    classification: 'Protected',
    owner: 'Department of Home Affairs',
    lastUpdated: '2026-03-28',
  },
  {
    id: 'DOC-2026-0002',
    title: 'Budget Estimates – Defence Capability',
    classification: 'Cabinet-in-Confidence',
    owner: 'Department of Defence',
    lastUpdated: '2026-03-30',
  },
  {
    id: 'DOC-2026-0003',
    title: 'Emergency Management Coordination Minutes',
    classification: 'Official: Sensitive',
    owner: 'National Emergency Management Agency',
    lastUpdated: '2026-03-25',
  },
];

const SENATE_ESTIMATES = [
  {
    id: 'HEARING-001',
    committee: 'Finance and Public Administration Legislation Committee',
    portfolio: 'Prime Minister and Cabinet',
    date: '2026-05-02',
    location: 'Parliament House, Canberra',
  },
  {
    id: 'HEARING-002',
    committee: 'Foreign Affairs, Defence and Trade Committee',
    portfolio: 'Defence',
    date: '2026-05-05',
    location: 'Parliament House, Canberra',
  },
  {
    id: 'HEARING-003',
    committee: 'Environment and Communications Legislation Committee',
    portfolio: 'Climate Change, Energy, the Environment and Water',
    date: '2026-05-07',
    location: 'Parliament House, Canberra',
  },
];

// Persistent storage for minutes (In-memory for demo)
const MINUTES_STORAGE = [
  {
    id: 'MIN-001',
    documentId: 'DOC-2026-0001',
    summary: 'Initial discussion on regional cyber resilience. Agreed to increase funding for state-level SOCs.',
    storedBy: 'Prime Minister',
    storedAt: '2026-03-30T10:00:00.000Z'
  }
];

function getUserFromCookie(req) {
  const username = req.cookies['gov_portal_user'];
  if (!username) return null;
  return USERS.find((u) => u.username === username) || null;
}

app.post('/api/login', (req, res) => {
  const { username } = req.body || {};
  const user = USERS.find((u) => u.username === username);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.cookie('gov_portal_user', user.username, {
    httpOnly: false,
  });

  res.json({
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    department: user.department,
  });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('gov_portal_user');
  res.json({ success: true });
});

app.get('/api/session', (req, res) => {
  const user = getUserFromCookie(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    department: user.department,
  });
});

app.get('/api/documents', (req, res) => {
  const user = getUserFromCookie(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json(DOCUMENTS);
});

// Persistent storage for registrations (In-memory for demo)
const REGISTRATIONS = [];

app.post('/api/senate-estimates/register', (req, res) => {
  const user = getUserFromCookie(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // VULNERABLE: IDOR. We use the username from the body instead of the session.
  // This allows an attacker to register OTHER users for hearings.
  const { hearingId, username } = req.body || {};
  if (!hearingId || !username) {
    return res.status(400).json({ error: 'Missing hearingId or username' });
  }

  const hearing = SENATE_ESTIMATES.find(h => h.id === hearingId);
  if (!hearing) {
    return res.status(404).json({ error: 'Hearing not found' });
  }

  const registration = {
    id: `REG-${Math.floor(Math.random() * 10000)}`,
    hearingId,
    committee: hearing.committee,
    username,
    registeredAt: new Date().toISOString()
  };

  REGISTRATIONS.push(registration);

  res.json({
    success: true,
    registration
  });
});

app.get('/api/registrations', (req, res) => {
  const user = getUserFromCookie(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // VULNERABLE: Over-privileged. Returns ALL registrations, not just the user's.
  res.json(REGISTRATIONS);
});

// VULNERABLE: This endpoint should require authentication, but it's public!
// This allows any unauthenticated user to see all sensitive meeting minutes.
app.get('/api/minutes', (req, res) => {
  res.json(MINUTES_STORAGE);
});

app.post('/api/minutes', (req, res) => {
  const user = getUserFromCookie(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { documentId, summary } = req.body || {};
  if (!documentId || !summary) {
    return res.status(400).json({ error: 'Missing documentId or summary' });
  }

  const newEntry = {
    id: `MIN-00${MINUTES_STORAGE.length + 1}`,
    documentId,
    summary,
    storedBy: user.displayName,
    storedAt: new Date().toISOString(),
  };

  MINUTES_STORAGE.push(newEntry);

  res.json({
    success: true,
    stored: newEntry,
  });
});

app.post('/api/ai/process', (req, res) => {
  const user = getUserFromCookie(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const { dataId, provider, model } = req.body || {};
  if (!dataId || !provider) {
    return res.status(400).json({ error: 'Missing dataId or provider' });
  }

  // VULNERABLE: Simulates data extraction to third-party AI
  res.json({
    success: true,
    result: `Data ${dataId} successfully processed by ${provider}. Output stored in external bucket.`,
    warning: "CRITICAL: Potential PII/Sensitive data leakage to external LLM provider detected."
  });
});

app.get('/api/admin/accounts', (req, res) => {
  const user = getUserFromCookie(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  res.json({
    users: USERS,
    serviceAccounts: SERVICE_ACCOUNTS,
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Mock AUS Gov Portal running on http://localhost:${PORT}`);
});

