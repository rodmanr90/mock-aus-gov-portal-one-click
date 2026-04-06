const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.static(path.join(__dirname, 'public')));

const USERS = [
  {
    id: 1,
    username: 'pm.albany',
    displayName: 'Prime Minister',
    role: 'admin',
    department: 'Department of the Prime Minister and Cabinet',
  },
  {
    id: 2,
    username: 'sec.dfence',
    displayName: 'Secretary of Defence',
    role: 'user',
    department: 'Department of Defence',
  },
  {
    id: 3,
    username: 'sen.estimates',
    displayName: 'Senate Estimates Liaison',
    role: 'user',
    department: 'Parliamentary Services',
  },
];

const SERVICE_ACCOUNTS = [
  {
    id: 'svc-minutes-writer',
    name: 'Automated Minutes Writer',
    privilege: 'write',
    scope: 'All Committees',
  },
  {
    id: 'svc-doc-sorter',
    name: 'Document Classifier',
    privilege: 'read-write',
    scope: 'Cabinet-in-Confidence, Protected',
  },
  {
    id: 'svc-senate-stream',
    name: 'Senate Estimates Streamer',
    privilege: 'read',
    scope: 'Public Hearings',
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

app.get('/api/senate-estimates', (req, res) => {
  const user = getUserFromCookie(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json(SENATE_ESTIMATES);
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
  res.json({
    success: true,
    stored: {
      documentId,
      summary,
      storedBy: user.displayName,
      storedAt: new Date().toISOString(),
    },
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

