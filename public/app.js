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
    tr.innerHTML = `
      <td>${u.username}</td>
      <td>${u.displayName}</td>
      <td>${u.role}</td>
      <td>${u.department}</td>
    `;
    usersBody.appendChild(tr);
  });

  data.serviceAccounts.forEach((s) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.id}</td>
      <td>${s.name}</td>
      <td>${s.privilege}</td>
      <td>${s.scope}</td>
    `;
    svcBody.appendChild(tr);
  });
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
    const [docs, senate] = await Promise.all([
      api('/api/documents'),
      api('/api/senate-estimates'),
    ]);
    renderDocuments(docs);
    renderSenate(senate);
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
  setupNavigation();
  applyBranding();
  restoreSession();
});

