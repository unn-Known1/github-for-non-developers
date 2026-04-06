# Repository Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance the existing Repositories page with batch operations, advanced search, webhook management, collaborator management, branch protection rules, export functionality, and archived repo filtering.

**Architecture:** Expand existing Repos page with new controls, modals, and state management. API-driven with client-side filtering.

**Tech Stack:** Vanilla JavaScript, HTML5, CSS3, GitHub REST API v3

---

## File Structure

| File | Changes |
|------|---------|
| `index.html` | Add modals (webhooks, collaborators, protection), batch action bar, filter toggles |
| `style.css` | Add modal styles, batch UI, three-dot menu, toast improvements |
| `app.js` | Add state, filters, batch logic, modal functions, API functions |
| `bundle.html` | Sync all changes |

---

## Phase 1: Batch Operations UI

### Task 1.1: Add Batch Selection State and UI

**Files:**
- Modify: `app.js`
- Modify: `index.html`
- Modify: `style.css`

**Steps:**

1. Add state properties to `state` object:
```javascript
batchMode: false,
selectedRepos: new Set(),
```

2. Add checkbox column header to repo list HTML (inside `#repos-section`):
```html
<div class="repo-list-header">
  <label class="batch-checkbox">
    <input type="checkbox" id="batch-select-all" />
  </label>
  <!-- existing header content -->
</div>
```

3. Add checkbox to each repo item:
```html
<div class="repo-item" data-repo-fullname="{full_name}">
  <label class="batch-checkbox">
    <input type="checkbox" class="batch-select-item" value="{full_name}" />
  </label>
  <!-- existing item content -->
</div>
```

4. Add batch action bar (hidden by default):
```html
<div id="batch-action-bar" class="batch-action-bar hidden">
  <span id="batch-count">0 selected</span>
  <button class="btn btn-sm" id="batch-archive-btn">Archive</button>
  <button class="btn btn-sm btn-danger" id="batch-delete-btn">Delete</button>
  <button class="btn btn-sm btn-secondary" id="batch-clear-btn">✕</button>
</div>
```

5. Add batch CSS:
```css
.batch-checkbox { display: flex; align-items: center; }
.batch-checkbox input { cursor: pointer; }
.repo-item.selected { background: rgba(31, 111, 235, 0.1); }
.batch-action-bar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-secondary);
  border: 1px solid var(--accent-blue);
  border-radius: var(--radius);
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: var(--shadow);
  z-index: 100;
}
```

6. Add batch selection JavaScript:
```javascript
// Toggle batch mode
function toggleBatchMode() {
  state.batchMode = !state.batchMode;
  qa('.batch-checkbox').forEach(el => el.style.display = state.batchMode ? '' : 'none');
  $('batch-action-bar').classList.toggle('hidden', !state.batchMode);
  if (!state.batchMode) clearBatchSelection();
}

// Select all
$('batch-select-all')?.addEventListener('change', (e) => {
  if (e.target.checked) {
    qa('.batch-select-item').forEach(cb => {
      cb.checked = true;
      state.selectedRepos.add(cb.value);
    });
  } else {
    clearBatchSelection();
  }
  updateBatchCount();
});

// Individual select
qa('.batch-select-item').forEach(cb => {
  cb.addEventListener('change', (e) => {
    if (e.target.checked) {
      state.selectedRepos.add(e.target.value);
    } else {
      state.selectedRepos.delete(e.target.value);
    }
    updateBatchCount();
  });
});

function updateBatchCount() {
  const count = state.selectedRepos.size;
  $('batch-count').textContent = `${count} selected`;
  $('batch-action-bar').classList.toggle('hidden', count === 0);
}

function clearBatchSelection() {
  state.selectedRepos.clear();
  qa('.batch-select-item').forEach(cb => cb.checked = false);
  $('batch-select-all').checked = false;
  updateBatchCount();
}

// Add toggle button to section header
$('repos-section').querySelector('.section-header').innerHTML += `
  <button class="btn btn-sm btn-outline" id="batch-toggle-btn">
    ☑ Batch
  </button>
`;
$('batch-toggle-btn').addEventListener('click', toggleBatchMode);
```

**Commit:** `feat(repos): add batch selection UI`

---

### Task 1.2: Implement Batch Actions

**Files:**
- Modify: `app.js`

**Steps:**

1. Add batch archive function:
```javascript
async function batchArchive() {
  const repos = Array.from(state.selectedRepos);
  if (repos.length === 0) return;
  
  const confirmed = await showConfirm(
    `Archive ${repos.length} repository(ies)?`,
    'Archived repos will be read-only.'
  );
  if (!confirmed) return;
  
  let success = 0, failed = 0;
  for (const fullName of repos) {
    try {
      const res = await gh(`/repos/${fullName}`, {
        method: 'PATCH',
        body: JSON.stringify({ archived: true })
      });
      if (res.ok) success++;
      else failed++;
    } catch { failed++; }
  }
  
  toast(`Archived ${success} repo(s)${failed ? `, ${failed} failed` : ''}`, success > 0 ? 'success' : 'error');
  clearBatchSelection();
  loadRepos();
}
```

2. Add batch delete function:
```javascript
async function batchDelete() {
  const repos = Array.from(state.selectedRepos);
  if (repos.length === 0) return;
  
  const repoNames = repos.join(', ');
  const typed = await showPrompt(
    `Delete ${repos.length} repository(ies)?`,
    `Type "${repos.length > 1 ? 'confirm' : repos[0].split('/')[1]}" to confirm:`,
    repos.length > 1 ? 'confirm' : repos[0].split('/')[1]
  );
  if (!typed || typed !== (repos.length > 1 ? 'confirm' : repos[0].split('/')[1])) {
    toast('Deletion cancelled', 'info');
    return;
  }
  
  let success = 0, failed = 0;
  for (const fullName of repos) {
    try {
      const res = await gh(`/repos/${fullName}`, { method: 'DELETE' });
      if (res.ok) success++;
      else failed++;
    } catch { failed++; }
  }
  
  toast(`Deleted ${success} repo(s)${failed ? `, ${failed} failed` : ''}`, success > 0 ? 'success' : 'error');
  clearBatchSelection();
  loadRepos();
}
```

3. Add event listeners:
```javascript
$('batch-archive-btn').addEventListener('click', batchArchive);
$('batch-delete-btn').addEventListener('click', batchDelete);
$('batch-clear-btn').addEventListener('click', () => {
  clearBatchSelection();
  toggleBatchMode();
});
```

**Commit:** `feat(repos): add batch archive/delete actions`

---

## Phase 2: Enhanced Filters

### Task 2.1: Add Filter Controls

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `app.js`

**Steps:**

1. Update filter bar HTML in repos section:
```html
<div class="repo-filters">
  <input type="text" id="repo-search" placeholder="Search repositories…" class="search-input" />
  <select id="repo-sort">
    <option value="updated">Sort: Updated</option>
    <option value="stars">Stars</option>
    <option value="forks">Forks</option>
    <option value="name">Name</option>
  </select>
  <select id="repo-lang-filter">
    <option value="">All Languages</option>
  </select>
  <select id="repo-vis-filter">
    <option value="">All</option>
    <option value="public">Public</option>
    <option value="private">Private</option>
  </select>
  <label class="filter-toggle">
    <input type="checkbox" id="repo-has-issues" />
    <span>Has Issues</span>
  </label>
  <label class="filter-toggle">
    <input type="checkbox" id="repo-show-archived" />
    <span>Archived</span>
  </label>
</div>
```

2. Add filter CSS:
```css
.repo-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  align-items: center;
}
.repo-filters .search-input { max-width: 200px; }
.repo-filters select { min-width: 120px; }
.filter-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
}
.filter-toggle input { cursor: pointer; }
```

3. Add state for filters:
```javascript
repoSearchQuery: '',
repoHasIssues: false,
repoShowArchived: false,
```

4. Add filter functions:
```javascript
function filterRepos(repos) {
  let filtered = [...repos];
  
  // Search
  if (state.repoSearchQuery) {
    const q = state.repoSearchQuery.toLowerCase();
    filtered = filtered.filter(r => 
      r.name.toLowerCase().includes(q) || 
      (r.description || '').toLowerCase().includes(q)
    );
  }
  
  // Language
  if (state.repoLangFilter) {
    filtered = filtered.filter(r => r.language === state.repoLangFilter);
  }
  
  // Visibility
  if (state.repoVisFilter === 'public') {
    filtered = filtered.filter(r => !r.private);
  } else if (state.repoVisFilter === 'private') {
    filtered = filtered.filter(r => r.private);
  }
  
  // Archived
  if (!state.repoShowArchived) {
    filtered = filtered.filter(r => !r.archived);
  }
  
  // Sort
  filtered.sort((a, b) => {
    switch(state.repoSort) {
      case 'stars': return b.stargazers_count - a.stargazers_count;
      case 'forks': return b.forks_count - a.forks_count;
      case 'name': return a.name.localeCompare(b.name);
      default: return new Date(b.updated_at) - new Date(a.updated_at);
    }
  });
  
  return filtered;
}
```

5. Wire up event listeners in loadRepos:
```javascript
// Search input
$('repo-search').addEventListener('input', debounce((e) => {
  state.repoSearchQuery = e.target.value;
  renderRepoList(filterRepos(state.repos));
}, 300));

// Filter selects
['repo-sort', 'repo-lang-filter', 'repo-vis-filter'].forEach(id => {
  $(id).addEventListener('change', (e) => {
    state[id.replace('repo-', '')] = e.target.value;
    renderRepoList(filterRepos(state.repos));
  });
});

// Toggle filters
$('repo-show-archived').addEventListener('change', (e) => {
  state.repoShowArchived = e.target.checked;
  renderRepoList(filterRepos(state.repos));
});
```

**Commit:** `feat(repos): add enhanced filter controls`

---

## Phase 3: Export Functionality

### Task 3.1: Implement Export

**Files:**
- Modify: `app.js`
- Modify: `index.html`

**Steps:**

1. Add export button to section header:
```html
<button class="btn btn-sm btn-outline" id="export-btn">📥 Export</button>
```

2. Add export modal HTML:
```html
<div id="export-modal" class="modal-overlay hidden">
  <div class="modal">
    <div class="modal-header">
      <h3>Export Repositories</h3>
      <button class="modal-close" data-close="export-modal">✕</button>
    </div>
    <div class="modal-body">
      <p style="margin-bottom: 16px;">Export <span id="export-count">0</span> repositories</p>
      <div class="form-group">
        <label>Format</label>
        <select id="export-format">
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
        </select>
      </div>
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" id="export-selected" />
          <span>Export selected only</span>
        </label>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-close="export-modal">Cancel</button>
      <button class="btn btn-primary" id="export-download-btn">Download</button>
    </div>
  </div>
</div>
```

3. Add export function:
```javascript
function showExportModal() {
  const count = state.selectedRepos.size > 0 ? state.selectedRepos.size : state.repos.length;
  $('export-count').textContent = count;
  $('export-selected').checked = false;
  showModal('export-modal');
}

function exportRepos() {
  const format = $('export-format').value;
  const selectedOnly = $('export-selected').checked;
  
  let repos = selectedOnly 
    ? state.repos.filter(r => state.selectedRepos.has(r.full_name))
    : state.repos;
  
  let content, mimeType, ext;
  
  if (format === 'json') {
    content = JSON.stringify(repos.map(r => ({
      name: r.name,
      full_name: r.full_name,
      description: r.description,
      language: r.language,
      private: r.private,
      fork: r.fork,
      stargazers_count: r.stargazers_count,
      forks_count: r.forks_count,
      open_issues_count: r.open_issues_count,
      updated_at: r.updated_at,
      created_at: r.created_at,
      homepage: r.homepage,
      html_url: r.html_url
    })), null, 2);
    mimeType = 'application/json';
    ext = 'json';
  } else {
    const headers = ['name', 'full_name', 'description', 'language', 'private', 'stargazers', 'forks', 'issues', 'updated', 'created', 'url'];
    const rows = repos.map(r => [
      r.name, r.full_name, `"${(r.description || '').replace(/"/g, '""')}"`,
      r.language || '', r.private, r.stargazers_count, r.forks_count,
      r.open_issues_count, r.updated_at, r.created_at, r.html_url
    ]);
    content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    mimeType = 'text/csv';
    ext = 'csv';
  }
  
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `repos-export.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
  
  closeModal('export-modal');
  toast(`Exported ${repos.length} repositories`, 'success');
}

$('export-btn').addEventListener('click', showExportModal);
$('export-download-btn').addEventListener('click', exportRepos);
```

**Commit:** `feat(repos): add export functionality`

---

## Phase 4: Three-Dot Menu & Modal Framework

### Task 4.1: Add Three-Dot Menu

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `app.js`

**Steps:**

1. Add menu button to each repo item:
```html
<div class="repo-actions">
  <button class="btn btn-icon repo-menu-btn" data-repo="{full_name}">⋮</button>
</div>
```

2. Add dropdown menu HTML (single instance, cloned):
```html
<div id="repo-dropdown" class="dropdown-menu hidden">
  <button class="dropdown-item" data-action="view">View Details</button>
  <div class="dropdown-divider"></div>
  <button class="dropdown-item" data-action="webhooks">📡 Webhooks</button>
  <button class="dropdown-item" data-action="collaborators">👥 Collaborators</button>
  <button class="dropdown-item" data-action="protection">🔒 Branch Protection</button>
  <div class="dropdown-divider"></div>
  <button class="dropdown-item text-danger" data-action="delete">⚠️ Delete</button>
</div>
```

3. Add menu CSS:
```css
.repo-actions { position: relative; }
.dropdown-menu {
  position: absolute;
  right: 0;
  top: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  min-width: 180px;
  box-shadow: var(--shadow);
  z-index: 100;
  padding: 4px 0;
}
.dropdown-item {
  display: block;
  width: 100%;
  padding: 8px 16px;
  text-align: left;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
}
.dropdown-item:hover { background: var(--bg-hover); }
.dropdown-item.text-danger { color: var(--accent-red); }
.dropdown-divider { height: 1px; background: var(--border); margin: 4px 0; }
```

4. Add menu logic:
```javascript
let activeDropdown = null;

function toggleRepoMenu(btn) {
  const menu = $('repo-dropdown');
  const repoFullName = btn.dataset.repo;
  
  // Position menu
  const rect = btn.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.right = '0px';
  
  // Show/hide
  if (activeDropdown === menu) {
    menu.classList.add('hidden');
    activeDropdown = null;
  } else {
    qa('.dropdown-menu').forEach(m => m.classList.add('hidden'));
    menu.classList.remove('hidden');
    menu.dataset.repo = repoFullName;
    activeDropdown = menu;
  }
}

// Close menu on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.repo-actions')) {
    qa('.dropdown-menu').forEach(m => m.classList.add('hidden'));
    activeDropdown = null;
  }
});

// Handle menu actions
$('repo-dropdown').addEventListener('click', (e) => {
  const item = e.target.closest('.dropdown-item');
  if (!item) return;
  
  const action = item.dataset.action;
  const repoFullName = $('repo-dropdown').dataset.repo;
  
  qa('.dropdown-menu').forEach(m => m.classList.add('hidden'));
  activeDropdown = null;
  
  switch(action) {
    case 'view': showRepoDetails(repoFullName); break;
    case 'webhooks': showWebhooksModal(repoFullName); break;
    case 'collaborators': showCollaboratorsModal(repoFullName); break;
    case 'protection': showBranchProtectionModal(repoFullName); break;
    case 'delete': confirmDeleteRepo(repoFullName); break;
  }
});
```

**Commit:** `feat(repos): add three-dot menu and modal framework`

---

## Phase 5: Webhook Management

### Task 5.1: Webhooks Modal UI

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `app.js`

**Steps:**

1. Add webhooks modal HTML:
```html
<div id="webhooks-modal" class="modal-overlay hidden">
  <div class="modal" style="max-width: 700px;">
    <div class="modal-header">
      <h3>Webhooks for <span id="webhooks-repo-name"></span></h3>
      <button class="modal-close" data-close="webhooks-modal">✕</button>
    </div>
    <div class="modal-body" style="max-height: 400px; overflow-y: auto;">
      <div id="webhooks-list"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="add-webhook-btn">+ Add Webhook</button>
      <button class="btn btn-primary" data-close="webhooks-modal">Done</button>
    </div>
  </div>
</div>
```

2. Add webhook form modal:
```html
<div id="webhook-form-modal" class="modal-overlay hidden">
  <div class="modal" style="max-width: 500px;">
    <div class="modal-header">
      <h3 id="webhook-form-title">Add Webhook</h3>
      <button class="modal-close" data-close="webhook-form-modal">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Payload URL *</label>
        <input type="url" id="webhook-url" placeholder="https://example.com/webhook" />
      </div>
      <div class="form-group">
        <label>Content Type</label>
        <select id="webhook-content-type">
          <option value="application/json">application/json</option>
          <option value="application/x-www-form-urlencoded">application/x-www-form-urlencoded</option>
        </select>
      </div>
      <div class="form-group">
        <label>Secret (optional)</label>
        <input type="text" id="webhook-secret" placeholder="Webhook secret" />
      </div>
      <div class="form-group">
        <label>Events</label>
        <div class="checkbox-grid">
          <label class="checkbox-label"><input type="checkbox" value="push" checked /> Push</label>
          <label class="checkbox-label"><input type="checkbox" value="pull_requests" /> Pull Requests</label>
          <label class="checkbox-label"><input type="checkbox" value="issues" /> Issues</label>
          <label class="checkbox-label"><input type="checkbox" value="release" /> Releases</label>
          <label class="checkbox-label"><input type="checkbox" value="create" /> Create</label>
          <label class="checkbox-label"><input type="checkbox" value="delete" /> Delete</label>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-close="webhook-form-modal">Cancel</button>
      <button class="btn btn-primary" id="save-webhook-btn">Save</button>
    </div>
  </div>
</div>
```

3. Add webhooks API functions:
```javascript
async function showWebhooksModal(repoFullName) {
  $('webhooks-repo-name').textContent = repoFullName;
  $('webhooks-list').innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  showModal('webhooks-modal');
  await loadWebhooks(repoFullName);
}

async function loadWebhooks(repoFullName) {
  try {
    const res = await gh(`/repos/${repoFullName}/hooks`);
    if (!res.ok) throw new Error('Failed to load webhooks');
    
    const hooks = await res.json();
    
    if (hooks.length === 0) {
      $('webhooks-list').innerHTML = '<div class="empty-state"><p>No webhooks configured.</p></div>';
      return;
    }
    
    $('webhooks-list').innerHTML = hooks.map(hook => `
      <div class="webhook-item">
        <div class="webhook-url">${escHtml(hook.url || hook.test_url || '')}</div>
        <div class="webhook-events">
          ${hook.events.map(e => `<span class="badge">${e}</span>`).join(' ')}
        </div>
        <div class="webhook-actions">
          <button class="btn btn-sm btn-secondary" onclick="testWebhook('${repoFullName}', ${hook.id})">Test</button>
          <button class="btn btn-sm btn-danger" onclick="deleteWebhook('${repoFullName}', ${hook.id})">✕</button>
        </div>
      </div>
    `).join('');
    
  } catch (e) {
    $('webhooks-list').innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

async function testWebhook(repoFullName, hookId) {
  try {
    const res = await gh(`/repos/${repoFullName}/hooks/${hookId}/tests`, { method: 'POST' });
    if (res.ok) toast('Webhook test sent!', 'success');
    else toast('Failed to test webhook', 'error');
  } catch (e) {
    toast('Error testing webhook', 'error');
  }
}

async function deleteWebhook(repoFullName, hookId) {
  const confirmed = await showConfirm('Delete this webhook?', 'This action cannot be undone.');
  if (!confirmed) return;
  
  try {
    const res = await gh(`/repos/${repoFullName}/hooks/${hookId}`, { method: 'DELETE' });
    if (res.ok) {
      toast('Webhook deleted', 'success');
      loadWebhooks(repoFullName);
    } else {
      toast('Failed to delete webhook', 'error');
    }
  } catch (e) {
    toast('Error deleting webhook', 'error');
  }
}

function showAddWebhookForm(repoFullName) {
  $('webhook-form-title').textContent = 'Add Webhook';
  $('webhook-url').value = '';
  $('webhook-secret').value = '';
  qa('#webhook-form-modal input[type="checkbox"]').forEach(cb => {
    cb.checked = cb.value === 'push';
  });
  showModal('webhook-form-modal');
}

$('add-webhook-btn').addEventListener('click', () => {
  const repo = $('webhooks-repo-name').textContent;
  showAddWebhookForm(repo);
});
```

**Commit:** `feat(repos): add webhook management modal`

---

## Phase 6: Collaborator Management

### Task 6.1: Collaborators Modal

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `app.js`

**Steps:**

1. Add collaborators modal HTML:
```html
<div id="collaborators-modal" class="modal-overlay hidden">
  <div class="modal" style="max-width: 600px;">
    <div class="modal-header">
      <h3>Collaborators for <span id="collaborators-repo-name"></span></h3>
      <button class="modal-close" data-close="collaborators-modal">✕</button>
    </div>
    <div class="modal-body" style="max-height: 400px; overflow-y: auto;">
      <div id="collaborators-list"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="add-collab-btn">+ Add Collaborator</button>
      <button class="btn btn-primary" data-close="collaborators-modal">Done</button>
    </div>
  </div>
</div>
```

2. Add collaborator form modal:
```html
<div id="collab-form-modal" class="modal-overlay hidden">
  <div class="modal" style="max-width: 400px;">
    <div class="modal-header">
      <h3>Add Collaborator</h3>
      <button class="modal-close" data-close="collab-form-modal">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Username *</label>
        <input type="text" id="collab-username" placeholder="GitHub username" />
      </div>
      <div class="form-group">
        <label>Permission</label>
        <select id="collab-permission">
          <option value="pull">Pull (read only)</option>
          <option value="triage">Triage (can manage PRs)</option>
          <option value="push" selected>Push (read + write)</option>
          <option value="maintain">Maintain (can manage settings)</option>
          <option value="admin">Admin (full access)</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-close="collab-form-modal">Cancel</button>
      <button class="btn btn-primary" id="save-collab-btn">Add</button>
    </div>
  </div>
</div>
```

3. Add collaborator functions:
```javascript
async function showCollaboratorsModal(repoFullName) {
  $('collaborators-repo-name').textContent = repoFullName;
  $('collaborators-list').innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  showModal('collaborators-modal');
  await loadCollaborators(repoFullName);
}

async function loadCollaborators(repoFullName) {
  try {
    const res = await gh(`/repos/${repoFullName}/collaborators`);
    if (!res.ok) throw new Error('Failed to load collaborators');
    
    const collabs = await res.json();
    
    if (collabs.length === 0) {
      $('collaborators-list').innerHTML = '<div class="empty-state"><p>No collaborators.</p></div>';
      return;
    }
    
    $('collaborators-list').innerHTML = collabs.map(c => `
      <div class="collab-item">
        <img src="${c.avatar_url}" class="collab-avatar" />
        <span class="collab-name">${escHtml(c.login)}</span>
        <button class="btn btn-sm btn-danger" onclick="removeCollaborator('${repoFullName}', '${c.login}')">✕</button>
      </div>
    `).join('');
    
  } catch (e) {
    $('collaborators-list').innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

async function removeCollaborator(repoFullName, username) {
  const confirmed = await showConfirm(`Remove ${username}?`, 'They will lose access to this repository.');
  if (!confirmed) return;
  
  try {
    const res = await gh(`/repos/${repoFullName}/collaborators/${username}`, { method: 'DELETE' });
    if (res.ok) {
      toast(`${username} removed`, 'success');
      loadCollaborators(repoFullName);
    } else {
      toast('Failed to remove collaborator', 'error');
    }
  } catch (e) {
    toast('Error removing collaborator', 'error');
  }
}

$('add-collab-btn').addEventListener('click', () => showModal('collab-form-modal'));

$('save-collab-btn').addEventListener('click', async () => {
  const username = $('collab-username').value.trim();
  const permission = $('collab-permission').value;
  
  if (!username) {
    toast('Please enter a username', 'error');
    return;
  }
  
  const repo = $('collaborators-repo-name').textContent;
  
  try {
    const res = await gh(`/repos/${repo}/collaborators/${username}`, {
      method: 'PUT',
      body: JSON.stringify({ permission })
    });
    
    if (res.ok || res.status === 204) {
      toast(`${username} added as ${permission}`, 'success');
      closeModal('collab-form-modal');
      loadCollaborators(repo);
    } else {
      toast('Failed to add collaborator', 'error');
    }
  } catch (e) {
    toast('Error adding collaborator', 'error');
  }
});
```

**Commit:** `feat(repos): add collaborator management modal`

---

## Phase 7: Branch Protection Rules

### Task 7.1: Branch Protection Modal

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `app.js`

**Steps:**

1. Add branch protection modal HTML:
```html
<div id="protection-modal" class="modal-overlay hidden">
  <div class="modal" style="max-width: 600px;">
    <div class="modal-header">
      <h3>Branch Protection: <span id="protection-repo-name"></span></h3>
      <button class="modal-close" data-close="protection-modal">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Branch</label>
        <select id="protection-branch"></select>
      </div>
      <div id="protection-rules"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-danger" id="delete-protection-btn">Delete Rules</button>
      <button class="btn btn-primary" id="save-protection-btn">Save Rules</button>
    </div>
  </div>
</div>
```

2. Add protection functions:
```javascript
async function showBranchProtectionModal(repoFullName) {
  $('protection-repo-name').textContent = repoFullName;
  showModal('protection-modal');
  await loadBranchesAndProtection(repoFullName);
}

async function loadBranchesAndProtection(repoFullName) {
  try {
    // Load branches
    const branchesRes = await gh(`/repos/${repoFullName}/branches`);
    const branches = await branchesRes.json();
    
    $('protection-branch').innerHTML = branches.map(b => 
      `<option value="${b.name}">${b.name}</option>`
    ).join('');
    
    const branch = branches[0]?.name;
    if (branch) {
      await loadProtectionRules(repoFullName, branch);
    }
  } catch (e) {
    toast('Error loading branches', 'error');
  }
}

async function loadProtectionRules(repoFullName, branch) {
  try {
    const res = await gh(`/repos/${repoFullName}/branches/${branch}/protection`);
    
    let rules = {};
    if (res.ok) {
      rules = await res.json();
    }
    
    renderProtectionForm(rules);
  } catch (e) {
    renderProtectionForm({});
  }
}

function renderProtectionForm(rules) {
  $('protection-rules').innerHTML = `
    <div class="form-group">
      <label class="checkbox-label">
        <input type="checkbox" id="prot-required-reviews" ${rules.required_status_checks ? 'checked' : ''} />
        <span>Require pull request reviews before merging</span>
      </label>
    </div>
    <div class="form-group" style="padding-left: 20px;">
      <label>Required approving reviewers: ${rules.required_pull_request_reviews?.required_approving_review_count || 0}</label>
      <input type="range" id="prot-review-count" min="0" max="6" 
        value="${rules.required_pull_request_reviews?.required_approving_review_count || 0}" />
    </div>
    <div class="form-group">
      <label class="checkbox-label">
        <input type="checkbox" id="prot-status-checks" ${rules.required_status_checks ? 'checked' : ''} />
        <span>Require status checks to pass before merging</span>
      </label>
    </div>
    <div class="form-group">
      <label class="checkbox-label">
        <input type="checkbox" id="prot-linear-history" ${rules.required_linear_history ? 'checked' : ''} />
        <span>Require linear history</span>
      </label>
    </div>
    <div class="form-group">
      <label class="checkbox-label">
        <input type="checkbox" id="prot-include-admins" ${rules.enforce_admins ? 'checked' : ''} />
        <span>Include administrators</span>
      </label>
    </div>
  `;
}

$('protection-branch').addEventListener('change', (e) => {
  const repo = $('protection-repo-name').textContent;
  loadProtectionRules(repo, e.target.value);
});

$('save-protection-btn').addEventListener('click', async () => {
  const repo = $('protection-repo-name').textContent;
  const branch = $('protection-branch').value;
  
  const rules = {
    required_status_checks: $('prot-status-checks').checked ? { strict: true, contexts: [] } : null,
    enforce_admins: $('prot-include-admins').checked,
    required_linear_history: $('prot-linear-history').checked,
    required_pull_request_reviews: $('prot-required-reviews').checked ? {
      required_approving_review_count: parseInt($('prot-review-count').value)
    } : null
  };
  
  try {
    const res = await gh(`/repos/${repo}/branches/${branch}/protection`, {
      method: 'PUT',
      body: JSON.stringify(rules)
    });
    
    if (res.ok) {
      toast('Protection rules saved', 'success');
      closeModal('protection-modal');
    } else {
      toast('Failed to save rules', 'error');
    }
  } catch (e) {
    toast('Error saving rules', 'error');
  }
});

$('delete-protection-btn').addEventListener('click', async () => {
  const repo = $('protection-repo-name').textContent;
  const branch = $('protection-branch').value;
  
  const confirmed = await showConfirm('Delete protection rules?', 'This branch will become unprotected.');
  if (!confirmed) return;
  
  try {
    const res = await gh(`/repos/${repo}/branches/${branch}/protection`, { method: 'DELETE' });
    if (res.ok) {
      toast('Protection rules deleted', 'success');
      closeModal('protection-modal');
    } else {
      toast('Failed to delete rules', 'error');
    }
  } catch (e) {
    toast('Error deleting rules', 'error');
  }
});
```

**Commit:** `feat(repos): add branch protection management`

---

## Phase 8: Sync Bundle.html

### Task 8.1: Update Bundle

Apply all changes from Tasks 1-7 to bundle.html.

**Steps:**

1. Read bundle.html structure
2. Find and update repos section
3. Add all new modals
4. Add all new CSS
5. Add all new JavaScript functions

**Commit:** `chore: sync bundle.html with all changes`

---

## Verification Checklist

| Feature | Status |
|---------|--------|
| Batch checkbox selection | ⬜ |
| Batch action bar appears | ⬜ |
| Batch archive works | ⬜ |
| Batch delete works | ⬜ |
| Search filters repos | ⬜ |
| Language filter works | ⬜ |
| Visibility filter works | ⬜ |
| Archived toggle works | ⬜ |
| Export CSV works | ⬜ |
| Export JSON works | ⬜ |
| Three-dot menu opens | ⬜ |
| Webhooks list loads | ⬜ |
| Add webhook works | ⬜ |
| Test webhook works | ⬜ |
| Delete webhook works | ⬜ |
| Collaborators list loads | ⬜ |
| Add collaborator works | ⬜ |
| Remove collaborator works | ⬜ |
| Branch protection loads | ⬜ |
| Save protection works | ⬜ |
| Delete protection works | ⬜ |
| Bundle.html updated | ⬜ |
