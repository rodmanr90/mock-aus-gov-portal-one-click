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

  document.querySelectorAll('.content-view').forEach((v) => hide(v));
  show($(`view-${targetView}`));

  // Force data refresh when switching views
  initialiseData();
}

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
      <td><a href="#" class="preview-link" onclick="showPreview('${d.id}', 'doc')">${d.title}</a></td>
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
      <td><a href="#" class="preview-link" onclick="showPreview('${r.id}', 'senate')">${r.committee}</a></td>
      <td>${r.portfolio}</td>
      <td>${r.date}</td>
      <td>${r.location}</td>
      <td><button class="btn btn-primary btn-sm" onclick="handleRegister('${r.id}')">Register</button></td>
    `;
    tbody.appendChild(tr);
  });
}

async function showPreview(id, type) {
  let data;
  if (type === 'doc') {
    const docs = await api('/api/documents');
    data = docs.find(d => d.id === id);
  } else {
    const senate = await api('/api/senate-estimates');
    data = senate.find(s => s.id === id);
  }

  if (!data) return;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
      <div class="preview-header">
        <span class="vulnerability-tag" style="background: #1e293b; color: #cbd5f5; border: 1px solid #475569; margin-left: 0; margin-bottom: 10px;">${data.classification || 'INTERNAL'}</span>
        <h2>${data.title || data.committee}</h2>
        <div class="preview-meta">
          <span>ID: ${data.id}</span>
          <span>${data.owner || data.portfolio}</span>
          <span>${data.lastUpdated || data.date}</span>
        </div>
      </div>
      <div class="preview-body">
        <p>${data.content || data.summary}</p>
        <div style="margin-top: 20px; padding: 15px; background: rgba(148, 163, 184, 0.05); border-radius: 6px; font-size: 0.85rem; border-left: 4px solid #facc15;">
          <strong>Security Notice:</strong> Access to this document is logged. Unauthorised distribution is a breach of the Commonwealth Security Framework.
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
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

function handleAIProviderChange() {
  const provider = $('ai-provider').value;
  const keyContainer = $('ai-api-key-container');
  const chatWindow = $('chatgpt-window');
  
  if (provider === 'OpenAI-Dept') {
    hide(keyContainer);
    show(chatWindow);
  } else {
    show(keyContainer);
    hide(chatWindow);
    // Set placeholder based on provider
    const keyInput = $('ai-api-key');
    if (provider === 'Hugging Face') keyInput.placeholder = 'hf_...';
    else if (provider === 'LangChain') keyInput.placeholder = 'lc_...';
    else keyInput.placeholder = 'sk-ant-...';
  }
}

async function handleAISubmit(event) {
  event.preventDefault();
  const dataId = $('ai-source-data').value;
  const provider = $('ai-provider').value;
  const apiKey = $('ai-api-key').value;
  const status = $('ai-status');
  const isSanctioned = provider === 'OpenAI-Dept';
  
  status.className = isSanctioned ? 'alert alert-success' : 'alert alert-error';
  status.textContent = isSanctioned ? 'Connecting to sanctioned departmental AI...' : 'Initiating external Shadow AI data extraction...';
  show(status);

  if (!isSanctioned && !apiKey) {
    status.textContent = 'Error: API Key is required for private AI models.';
    status.className = 'alert alert-error';
    return;
  }

  try {
    const result = await api('/api/ai/process', {
      method: 'POST',
      body: JSON.stringify({ dataId, provider, model: isSanctioned ? 'gpt-4o-gov-authorized' : 'public-llama-3', apiKey })
    });
    
    if (isSanctioned) {
      status.innerHTML = `<strong>SUCCESS: Sanctioned Connection Established.</strong><br>Data processed within department's private tenant of OpenAI.`;
      status.className = 'alert alert-success';
      
      // Simulate ChatGPT interaction
      const chatOutput = $('chatgpt-response');
      const chatText = $('chatgpt-text-output');
      show(chatOutput);
      chatText.textContent = `Analyzing ${dataId}... I have identified several key discussion points and sensitive data markers. The summary has been stored in your department's secure AWS bucket.`;
    } else {
      status.innerHTML = `<strong>WARNING: Shadow AI Detected!</strong><br>${result.result}<br><br>${result.warning}<br><br><em>(Wiz flagged the egress to ${provider} and the use of an external API key.)</em>`;
      status.className = 'alert alert-error';
      hide($('chatgpt-window'));
    }
    show(status);
  } catch (err) {
    status.textContent = err.message || 'Unable to process AI request.';
    status.className = 'alert alert-error';
    show(status);
  }
}

async function handleLogin() {
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
  $('user-display').textContent = user.username;
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
    console.error('Data initialization failed:', err);
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
  $('logout-btn').addEventListener('click', handleLogout);
  $('minutes-form').addEventListener('submit', handleMinutesSubmit);
  const aiForm = $('ai-form');
  if (aiForm) aiForm.addEventListener('submit', handleAISubmit);
  
  const adminToggle = $('admin-toggle');
  if (adminToggle) {
    adminToggle.addEventListener('click', () => {
      loadAdminView();
      setActiveNav('admin');
    });
  }

  setupNavigation();
  applyBranding();
  restoreSession();
  
  // Initialize AI provider state
  const aiProvider = $('ai-provider');
  if (aiProvider) {
    handleAIProviderChange();
  }
});

