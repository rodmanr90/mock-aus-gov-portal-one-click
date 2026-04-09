async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  if (!res.ok) {
    let errText = 'Request failed';
    try {
      const data = await res.json();
      errText = data.error || errText;
    } catch {
      // ignore
    }
    throw new Error(errText);
  }
  return res.json();
}

function $(id) {
  return document.getElementById(id);
}

function show(el) {
  el.classList.remove('hidden');
}

function hide(el) {
  el.classList.add('hidden');
}

function setActiveNav(targetView) {
  document.querySelectorAll('.nav-item').forEach((btn) => {
    const view = btn.getAttribute('data-view');
    if (view === targetView) {
      btn.classList.add('nav-item-active');
    } else {
      btn.classList.remove('nav-item-active');
    }
  });

  document.querySelectorAll('.content-view').forEach((section) => {
    if (section.id === `view-${targetView}`) {
      section.classList.remove('hidden');
    } else {
      section.classList.add('hidden');
    }
  });
}

function renderDocuments(docs) {
  const tbody = $('documents-body');
  tbody.innerHTML = '';
  docs.forEach((d) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d.id}</td>
      <td>${d.title}</td>
      <td>${d.classification}</td>
      <td>${d.owner}</td>
      <td>${d.lastUpdated}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderSenate(rows) {
  const tbody = $('senate-body');
  tbody.innerHTML = '';
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.committee}</td>
      <td>${r.portfolio}</td>
      <td>${r.date}</td>
      <td>${r.location}</td>
      <td><button class="btn btn-primary btn-sm" onclick="handleRegister('${r.id}')">Register</button></td>
    `;
    tbody.appendChild(tr);
  });
}

async function handleRegister(hearingId) {
  const status = $('registration-status');
  hide(status);
  
  // VULNERABLE: We're using the global user display name as a shortcut, 
  // but an attacker could modify the payload to any username.
  const username = $('user-display').textContent; 

  try {
    const result = await api('/api/senate-estimates/register', {
      method: 'POST',
      body: JSON.stringify({ hearingId, username })
    });
    
    status.textContent = `Registered for ${result.registration.committee}! (ID: ${result.registration.id})`;
    status.className = 'alert alert-success';
    show(status);
    
    // Refresh the registration list
    const registrations = await api('/api/registrations');
    renderRegistrations(registrations);
  } catch (err) {
    status.textContent = err.message || 'Unable to register.';
    status.className = 'alert alert-error';
    show(status);
  }
}

function renderRegistrations(rows) {
  const tbody = $('registrations-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.id}</td>
      <td>${r.committee}</td>
      <td>${r.username}</td>
      <td>${new Date(r.registeredAt).toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderMinutesList(rows) {
  const tbody = $('minutes-list-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.id}</td>
      <td>${r.documentId}</td>
      <td>${r.summary}</td>
      <td>${r.storedBy}</td>
      <td>${new Date(r.storedAt).toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAdmin(data) {
  const usersBody = $('admin-users-body');
  const svcBody = $('admin-service-body');
  usersBody.innerHTML = '';
  svcBody.innerHTML = '';

  data.users.forEach((u) => {
    const tr = document.createElement('tr');
    const isOverlyPermissive = u.permissions.includes('*');
    tr.innerHTML = `
      <td>${u.username}</td>
      <td><code>${u.permissions.join(', ')}</code></td>
      <td><span class="${isOverlyPermissive ? 'vulnerability-tag' : 'muted'}">${isOverlyPermissive ? 'CRITICAL: FULL ACCESS' : 'Moderate'}</span></td>
      <td>
        <button class="btn btn-ghost btn-sm">Edit</button>
        <button class="btn btn-secondary btn-sm">Revoke</button>
      </td>
    `;
    usersBody.appendChild(tr);
  });

  data.serviceAccounts.forEach((s) => {
    const tr = document.createElement('tr');
    const isHighRisk = s.scope === '*';
    tr.innerHTML = `
      <td>${s.id}</td>
      <td><code>${s.scope}</code></td>
      <td><span class="${isHighRisk ? 'vulnerability-tag' : 'muted'}">${isHighRisk ? 'HIGH RISK: ALL SCOPES' : s.risk}</span></td>
      <td>
        <button class="btn btn-ghost btn-sm">Restrict</button>
      </td>
    `;
    svcBody.appendChild(tr);
  });
}

async function handleAISubmit(event) {
  event.preventDefault();
  const dataId = $('ai-source-data').value;
  const provider = $('ai-provider').value;
  const status = $('ai-status');
  const isSanctioned = provider === 'OpenAI-Dept';
  
  status.className = isSanctioned ? 'alert alert-success' : 'alert alert-error';
  status.textContent = isSanctioned ? 'Connecting to sanctioned departmental AI...' : 'Initiating external Shadow AI data extraction...';
  show(status);

  try {
    const result = await api('/api/ai/process', {
      method: 'POST',
      body: JSON.stringify({ dataId, provider, model: isSanctioned ? 'gpt-4o-gov-authorized' : 'public-llama-3' })
    });
    
    if (isSanctioned) {
      status.innerHTML = `<strong>SUCCESS: Sanctioned Connection Established.</strong><br>Data processed within department's private tenant of OpenAI. <br><br><em>(Wiz still detects the API key 'sk-proj-AUSGOV...' in the source code as a secret.)</em>`;
      status.className = 'alert alert-success';
    } else {
      status.innerHTML = `<strong>WARNING: Shadow AI Detected!</strong><br>${result.result}<br><br>${result.warning}`;
      status.className = 'alert alert-error';
    }
    show(status);
  } catch (err) {
    status.textContent = err.message || 'Unable to process AI request.';
    status.className = 'alert alert-error';
    show(status);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const username = $('username-input').value.trim();
  const password = $('password-input').value;

  const errorBox = $('login-error');
  hide(errorBox);
  errorBox.textContent = '';

  if (!username || !password) {
    errorBox.textContent = 'Username and password are required.';
    show(errorBox);
    return;
  }

  try {
    const user = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    onAuthenticated(user);
  } catch (err) {
    errorBox.textContent = err.message || 'Unable to sign in.';
    show(errorBox);
  }
}

function onAuthenticated(user) {
  $('user-display').textContent = user.displayName;
  $('user-dept').textContent = user.department;
  $('user-role').textContent = user.role === 'admin' ? 'Administrator' : 'Standard user';

  hide($('login-view'));
  show($('app-view'));

  if (user.role !== 'admin') {
    document.querySelectorAll('.admin-only').forEach((el) => {
      el.style.display = 'none';
    });
  } else {
    document.querySelectorAll('.admin-only').forEach((el) => {
      el.style.display = 'block';
    });
  }

  initialiseData();
}

async function handleLogout() {
  try {
    await api('/api/logout', { method: 'POST' });
  } catch (err) {
  } finally {
    show($('login-view'));
    hide($('app-view'));
    $('login-form').reset();
  }
}

async function initialiseData() {
  try {
    const [docs, senate, minutes, registrations] = await Promise.all([
      api('/api/documents'),
      api('/api/senate-estimates'),
      api('/api/minutes'),
      api('/api/registrations'),
    ]);
    renderDocuments(docs);
    renderSenate(senate);
    renderMinutesList(minutes);
    renderRegistrations(registrations);
  } catch (err) {
    console.error(err);
  }
}

async function applyBranding() {
  try {
    const res = await fetch('branding.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const cfg = await res.json();

    if (cfg.countryLine) {
      const el = $('brand-country');
      const loginCountry = $('login-country');
      if (el) el.textContent = cfg.countryLine;
      if (loginCountry) loginCountry.textContent = cfg.countryLine;
    }
    if (cfg.systemName) {
      const el = $('brand-system');
      if (el) el.textContent = cfg.systemName;
      const title = document.getElementById('page-title');
      if (title) title.textContent = `${cfg.countryLine || 'Commonwealth of Australia'} \u2013 ${cfg.systemName}`;
    }
    if (cfg.departmentFull) {
      const loginDept = $('login-dept');
      if (loginDept) loginDept.textContent = cfg.departmentFull;
    }
    if (cfg.shortName) {
      const crestInitials = $('crest-initials');
      const loginCrestInitials = $('login-crest-initials');
      if (crestInitials) crestInitials.textContent = cfg.shortName;
      if (loginCrestInitials) loginCrestInitials.textContent = cfg.shortName;
    }
    if (cfg.loginTitle) {
      const loginTitle = $('login-title');
      if (loginTitle) loginTitle.textContent = cfg.loginTitle;
    }
    if (cfg.loginBlurb) {
      const loginBlurb = $('login-blurb');
      if (loginBlurb) loginBlurb.textContent = cfg.loginBlurb;
    }
    if (cfg.headerStart && cfg.headerEnd) {
      const header = document.querySelector('.gov-header');
      if (header) {
        header.style.backgroundImage = `linear-gradient(90deg, ${cfg.headerStart}, ${cfg.headerEnd})`;
      }
    }
    if (cfg.accentColor) {
      document.documentElement.style.setProperty('--accent-color', cfg.accentColor);
    }
  } catch (err) {
    console.warn('Branding config not applied:', err);
  }
}

async function handleMinutesSubmit(event) {
  event.preventDefault();
  const docId = $('minutes-doc-id').value.trim();
  const summary = $('minutes-summary').value.trim();
  const status = $('minutes-status');
  status.className = 'alert';
  status.textContent = '';
  hide(status);

  if (!docId || !summary) {
    status.textContent = 'Both document ID and summary are required.';
    status.classList.add('alert-error');
    show(status);
    return;
  }

  try {
    const result = await api('/api/minutes', {
      method: 'POST',
      body: JSON.stringify({ documentId: docId, summary }),
    });
    status.textContent = `Minutes filed against ${result.stored.documentId} at ${new Date(
      result.stored.storedAt,
    ).toLocaleString()}.`;
    status.classList.add('alert-success');
    show(status);
    $('minutes-form').reset();

    // Refresh the list after filing
    const updatedMinutes = await api('/api/minutes');
    renderMinutesList(updatedMinutes);
  } catch (err) {
    status.textContent = err.message || 'Unable to file minutes.';
    status.classList.add('alert-error');
    show(status);
  }
}

async function loadAdminView() {
  const warning = $('admin-warning');
  warning.className = 'alert';
  warning.textContent = '';
  hide(warning);

  try {
    const data = await api('/api/admin/accounts');
    renderAdmin(data);
  } catch (err) {
    warning.textContent = err.message || 'Unable to load admin data.';
    warning.classList.add('alert-error');
    show(warning);
  }
}

function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      if (view === 'admin') {
        loadAdminView();
      }
      setActiveNav(view);
    });
  });
}

async function restoreSession() {
  try {
    const user = await api('/api/session');
    onAuthenticated(user);
  } catch {
    show($('login-view'));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  $('login-form').addEventListener('submit', handleLogin);
  $('logout-btn').addEventListener('click', handleLogout);
  $('minutes-form').addEventListener('submit', handleMinutesSubmit);
  const aiForm = $('ai-form');
  if (aiForm) aiForm.addEventListener('submit', handleAISubmit);
  setupNavigation();
  applyBranding();
  restoreSession();
});

