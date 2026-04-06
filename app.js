/* =====================================================
   GitHub Manager — app.js  (Enhanced Edition)
   New Features:
     1. Repository Sorting & Language/Visibility Filtering
     2. Dark / Light Theme Toggle
     3. Activity Dashboard section
     4. PR Merge Button (merge open pull requests)
   ===================================================== */

const API = 'https://api.github.com';

// ── State ──────────────────────────────────────────────
let state = {
  pat: null,
  user: null,
  repos: [],
  currentSection: 'repos',
  issueFilter: 'open',
  pullFilter: 'open',
  reviewsFilter: 'pending',
  confirmCallback: null,
  repoSearchQuery: '',
  repoSort: 'updated',
  repoLangFilter: '',
  repoVisFilter: '',
  repoShowArchived: false,
  repoHasIssues: false,
  theme: 'dark',
  dashboardTab: 'overview',
  dashboardRefreshKey: 0,
  healthData: null,
  contributorsData: null,
  trendsData: null,
  alertsData: null,
  batchMode: false,
  selectedRepos: new Set(),
  currentPR: null,
  reviewsData: null,
  issuesBatchMode: false,
  selectedIssues: new Set(),
  currentIssueRepo: null,
  
  // Category 5: Organization
  currentOrg: null,
  orgMembers: [],
  orgTeams: [],
  
  // Category 6: Notifications
  notifications: [],
  
  // Category 9: Actions
  currentActionsRepo: null,
  workflows: [],
  runs: [],
  
  // Category 11: Labels & Milestones
  currentLabelsRepo: null,
  currentMilestonesRepo: null,
  labels: [],
  milestones: [],
  
  // Category 12: User Experience
  favorites: [],
  keyboardShortcutsEnabled: true,
  autoTheme: false,
  
  // Category 13: Developer Experience
  apiRateLimit: { limit: 5000, remaining: 5000, reset: null },
  requestLog: [],
  
  // Category 15: Settings
  slackWebhook: '',
  bookmarks: []
};

// ── Helpers ─────────────────────────────────────────────
const $ = id => document.getElementById(id);
const q = sel => document.querySelector(sel);
const qa = sel => document.querySelectorAll(sel);

function gh(endpoint, opts = {}) {
  return fetch(API + endpoint, {
    ...opts,
    headers: {
      'Authorization': `token ${state.pat}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...(opts.headers || {})
    }
  });
}

function toast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  $('toast-container').appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

function showModal(id) {
  $('modal-overlay').classList.remove('hidden');
  $('modal-overlay').classList.add('active');
  $(id).classList.remove('hidden');
}

function hideModal(id) {
  $(id).classList.add('hidden');
  const open = document.querySelectorAll('.modal:not(.hidden)');
  if (open.length === 0) {
    $('modal-overlay').classList.add('hidden');
    $('modal-overlay').classList.remove('active');
  }
}

function closeModal(id) {
  hideModal(id);
}

function hideAllModals() {
  qa('.modal').forEach(m => m.classList.add('hidden'));
  $('modal-overlay').classList.add('hidden');
  $('modal-overlay').classList.remove('active');
}

function loadingHTML() {
  return `<div class="loading-overlay"><div class="spinner"></div><span>Loading…</span></div>`;
}

function emptyHTML(msg) {
  return `<div class="empty-state"><p>${msg}</p></div>`;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function langColor(lang) {
  const colors = {
    JavaScript:'#f1e05a', TypeScript:'#2b7489', Python:'#3572A5', Java:'#b07219',
    'C++':'#f34b7d', C:'#555555', 'C#':'#178600', PHP:'#4F5D95', Ruby:'#701516',
    Go:'#00ADD8', Rust:'#dea584', Swift:'#ffac45', Kotlin:'#F18E33', Dart:'#00B4AB',
    HTML:'#e34c26', CSS:'#563d7c', Shell:'#89e051', Scala:'#c22d40', R:'#198CE7',
    Lua:'#000080', Elixir:'#6e4a7e', Haskell:'#5e5086', Vue:'#2c3e50',
  };
  return colors[lang] || '#8b949e';
}

// ── Feature 2: Theme Toggle ───────────────────────────────
function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('gh_theme', theme);
  const btn = $('theme-toggle-btn');
  if (btn) {
    btn.title = theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme';
    btn.innerHTML = theme === 'dark'
      ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 3a9 9 0 100 18A9 9 0 0012 3zm0 16a7 7 0 110-14 7 7 0 010 14z"/><path d="M12 1V3M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
      : `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`;
  }
}

function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
}

// ── Auth ─────────────────────────────────────────────────
function savePat(pat) {
  sessionStorage.setItem('gh_pat', pat);
  state.pat = pat;
}

function loadPat() {
  return sessionStorage.getItem('gh_pat');
}

function clearPat() {
  sessionStorage.removeItem('gh_pat');
  state.pat = null;
  state.user = null;
  state.repos = [];
}

async function login(pat) {
  state.pat = pat;
  const res = await gh('/user');
  if (!res.ok) {
    state.pat = null;
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  const user = await res.json();
  savePat(pat);
  state.user = user;
  return user;
}

function logout() {
  clearPat();
  showLoginScreen();
}

// ── Screens ──────────────────────────────────────────────
function showLoginScreen() {
  $('login-screen').classList.remove('hidden');
  $('login-screen').classList.add('active');
  $('app-screen').classList.remove('active');
  $('app-screen').classList.add('hidden');
  $('pat-input').value = '';
  $('login-error').classList.add('hidden');
}

function showAppScreen() {
  $('login-screen').classList.remove('active');
  $('login-screen').classList.add('hidden');
  $('app-screen').classList.remove('hidden');
  $('app-screen').classList.add('active');
  renderUserSidebar();
  navigateTo('dashboard');
}

function renderUserSidebar() {
  const u = state.user;
  if (!u) return;
  $('user-avatar').src = u.avatar_url;
  $('user-name').textContent = u.name || u.login;
  $('user-login').textContent = '@' + u.login;
}

// ── Navigation ───────────────────────────────────────────
function navigateTo(section) {
  state.currentSection = section;

  qa('.content-section').forEach(s => { s.classList.remove('active'); s.classList.add('hidden'); });
  const el = $(`${section}-section`);
  if (el) { el.classList.remove('hidden'); el.classList.add('active'); }

  qa('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.section === section);
  });

  closeSidebar();

  switch (section) {
    case 'dashboard': 
      loadDashboard(); 
      if (!state.healthData) loadHealthData();
      if (!state.contributorsData) loadContributorsData();
      if (!state.trendsData) loadTrendsData();
      if (!state.alertsData) loadAlertsData();
      break;
    case 'repos': loadRepos(); break;
    case 'issues': loadIssueRepoSelect(); break;
    case 'pulls': loadPullRepoSelect(); break;
    case 'gists': loadGists(); break;
    case 'profile': loadProfile(); break;
    case 'orgs': loadOrgs(); break;
    case 'notifications': loadNotifications(); break;
    case 'actions': loadActionsRepoSelect(); break;
    case 'labels': loadLabelsRepoSelect(); break;
    case 'milestones': loadMilestonesRepoSelect(); break;
    case 'packages': loadPackages(); break;
    case 'settings': loadSettings(); break;
  }
}

// ── Dashboard Tab Navigation ──────────────────────────────
function switchDashboardTab(tabName) {
  state.dashboardTab = tabName;
  
  qa('.dashboard-tabs .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  qa('.tab-content').forEach(content => {
    content.classList.toggle('active', content.dataset.content === tabName);
  });
  
  switch(tabName) {
    case 'overview':
      break;
    case 'health':
      if (!state.healthData) loadHealthData();
      break;
    case 'contributors':
      if (!state.contributorsData) loadContributorsData();
      break;
    case 'trends':
      if (!state.trendsData) loadTrendsData();
      break;
    case 'alerts':
      if (!state.alertsData) loadAlertsData();
      break;
  }
}

// ── Sidebar mobile ────────────────────────────────────────
function openSidebar() {
  $('sidebar').classList.add('open');
  $('sidebar-backdrop').classList.add('active');
}
function closeSidebar() {
  $('sidebar').classList.remove('open');
  $('sidebar-backdrop').classList.remove('active');
}

// ── Feature 3: Activity Dashboard ────────────────────────
async function loadDashboard() {
  const container = $('dashboard-content');
  container.innerHTML = loadingHTML();
  try {
    // Fetch user, repos and events in parallel
    const [userRes, reposRes, eventsRes] = await Promise.all([
      gh('/user'),
      gh('/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member'),
      gh(`/users/${state.user.login}/events?per_page=30`)
    ]);

    const user = userRes.ok ? await userRes.json() : state.user;
    const repos = reposRes.ok ? await reposRes.json() : [];
    const events = eventsRes.ok ? await eventsRes.json() : [];

    if (repos.length) {
      state.repos = repos;
      populateRepoSelects();
    }

    // Compute stats
    const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
    const totalForks = repos.reduce((s, r) => s + r.forks_count, 0);
    const languages = {};
    repos.forEach(r => { if (r.language) languages[r.language] = (languages[r.language] || 0) + 1; });
    const topLangs = Object.entries(languages).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const openIssues = repos.reduce((s, r) => s + r.open_issues_count, 0);

    container.innerHTML = `
      <div class="dashboard-grid">
        <div class="dashboard-stat-card">
          <div class="dash-stat-icon">📦</div>
          <div class="dash-stat-value">${repos.length}</div>
          <div class="dash-stat-label">Repositories</div>
        </div>
        <div class="dashboard-stat-card">
          <div class="dash-stat-icon">⭐</div>
          <div class="dash-stat-value">${totalStars}</div>
          <div class="dash-stat-label">Total Stars</div>
        </div>
        <div class="dashboard-stat-card">
          <div class="dash-stat-icon">🍴</div>
          <div class="dash-stat-value">${totalForks}</div>
          <div class="dash-stat-label">Total Forks</div>
        </div>
        <div class="dashboard-stat-card">
          <div class="dash-stat-icon">🐛</div>
          <div class="dash-stat-value">${openIssues}</div>
          <div class="dash-stat-label">Open Issues</div>
        </div>
        <div class="dashboard-stat-card">
          <div class="dash-stat-icon">👥</div>
          <div class="dash-stat-value">${user.followers}</div>
          <div class="dash-stat-label">Followers</div>
        </div>
        <div class="dashboard-stat-card">
          <div class="dash-stat-icon">🔥</div>
          <div class="dash-stat-value">${user.public_gists}</div>
          <div class="dash-stat-label">Public Gists</div>
        </div>
      </div>

      <div class="dashboard-panels">
        <div class="dashboard-panel">
          <h3 class="panel-title">🔤 Top Languages</h3>
          <div class="lang-bars">
            ${topLangs.length ? topLangs.map(([lang, count]) => `
              <div class="lang-bar-row">
                <span class="lang-dot" style="background:${langColor(lang)}"></span>
                <span class="lang-bar-name">${escHtml(lang)}</span>
                <div class="lang-bar-track">
                  <div class="lang-bar-fill" style="width:${Math.round(count / repos.length * 100)}%;background:${langColor(lang)}"></div>
                </div>
                <span class="lang-bar-count">${count}</span>
              </div>
            `).join('') : '<p style="color:var(--text-muted);font-size:13px">No language data.</p>'}
          </div>
        </div>

        <div class="dashboard-panel">
          <h3 class="panel-title">🕐 Recent Activity</h3>
          <div class="activity-list">
            ${events.length ? events.slice(0, 10).map(ev => {
              const icon = eventIcon(ev.type);
              const desc = eventDesc(ev);
              return `
                <div class="activity-item">
                  <span class="activity-icon">${icon}</span>
                  <div class="activity-body">
                    <div class="activity-desc">${desc}</div>
                    <div class="activity-time">${formatDate(ev.created_at)}</div>
                  </div>
                </div>
              `;
            }).join('') : '<p style="color:var(--text-muted);font-size:13px">No recent events.</p>'}
          </div>
        </div>

        <div class="dashboard-panel">
          <h3 class="panel-title">⭐ Most Starred Repos</h3>
          <div class="top-repos-list">
            ${repos.sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 5).map(r => `
              <div class="top-repo-item">
                <div class="top-repo-info">
                  <span class="top-repo-name" onclick="navigateTo('repos')">${escHtml(r.name)}</span>
                  ${r.language ? `<span class="lang-dot" style="background:${langColor(r.language)};margin-left:6px"></span><span style="font-size:11px;color:var(--text-muted)">${escHtml(r.language)}</span>` : ''}
                </div>
                <span class="top-repo-stars">⭐ ${r.stargazers_count}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

function eventIcon(type) {
  const icons = {
    PushEvent: '⬆️', CreateEvent: '✨', DeleteEvent: '🗑️', WatchEvent: '⭐',
    ForkEvent: '🍴', IssuesEvent: '🐛', PullRequestEvent: '🔀', ReleaseEvent: '🚀',
    IssueCommentEvent: '💬', PullRequestReviewEvent: '👀', CommitCommentEvent: '📝',
    GollumEvent: '📖', MemberEvent: '👥', PublicEvent: '🌍'
  };
  return icons[type] || '🔔';
}

function eventDesc(ev) {
  const repo = `<strong>${escHtml(ev.repo?.name || '')}</strong>`;
  switch (ev.type) {
    case 'PushEvent': return `Pushed ${ev.payload?.commits?.length || 0} commit(s) to ${repo}`;
    case 'CreateEvent': return `Created ${escHtml(ev.payload?.ref_type || '')} in ${repo}`;
    case 'DeleteEvent': return `Deleted ${escHtml(ev.payload?.ref_type || '')} in ${repo}`;
    case 'WatchEvent': return `Starred ${repo}`;
    case 'ForkEvent': return `Forked ${repo}`;
    case 'IssuesEvent': return `${escHtml(ev.payload?.action || '')} issue in ${repo}`;
    case 'PullRequestEvent': return `${escHtml(ev.payload?.action || '')} pull request in ${repo}`;
    case 'ReleaseEvent': return `Published release in ${repo}`;
    case 'IssueCommentEvent': return `Commented on issue in ${repo}`;
    default: return `${escHtml(ev.type?.replace('Event','') || '')} in ${repo}`;
  }
}

// ── Feature 1: Repository Sorting & Filtering ────────────
async function loadRepos() {
  const container = $('repos-list');
  container.innerHTML = loadingHTML();
  try {
    let page = 1, all = [];
    while (true) {
      const res = await gh(`/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`);
      if (!res.ok) throw new Error(`Failed to fetch repos (${res.status})`);
      const data = await res.json();
      all = all.concat(data);
      if (data.length < 100) break;
      page++;
    }
    state.repos = all;
    populateRepoSelects();
    populateLangFilter(all);
    renderRepos(filterAndSortRepos());
  } catch (e) {
    container.innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

function populateLangFilter(repos) {
  const langs = [...new Set(repos.map(r => r.language).filter(Boolean))].sort();
  const sel = $('repo-lang-filter');
  if (!sel) return;
  sel.innerHTML = `<option value="">📝 All Languages</option>` +
    langs.map(l => `<option value="${escHtml(l)}">${escHtml(l)}</option>`).join('');
  sel.value = state.repoLangFilter;
}

// ── Filter and Sort Repos ────────────────────────────────
function filterAndSortRepos() {
  let repos = [...state.repos];
  
  // Search
  if (state.repoSearchQuery) {
    const q = state.repoSearchQuery.toLowerCase();
    repos = repos.filter(r => 
      r.name.toLowerCase().includes(q) || 
      (r.description || '').toLowerCase().includes(q)
    );
  }
  
  // Visibility
  if (state.repoVisFilter === 'public') {
    repos = repos.filter(r => !r.private);
  } else if (state.repoVisFilter === 'private') {
    repos = repos.filter(r => r.private);
  }
  
  // Language
  if (state.repoLangFilter) {
    repos = repos.filter(r => r.language === state.repoLangFilter);
  }
  
  // Archived (default hide)
  if (!state.repoShowArchived) {
    repos = repos.filter(r => !r.archived);
  }
  
  // Sort
  repos.sort((a, b) => {
    switch(state.repoSort) {
      case 'stars': return b.stargazers_count - a.stargazers_count;
      case 'forks': return b.forks_count - a.forks_count;
      case 'name': return a.name.localeCompare(b.name);
      case 'created': return new Date(b.created_at) - new Date(a.created_at);
      default: return new Date(b.updated_at) - new Date(a.updated_at);
    }
  });
  
  return repos;
}

function renderRepos(repos) {
  const container = $('repos-list');
  const query = ($('repo-search').value || '').toLowerCase();
  const sort = state.repoSort;
  const langFilter = state.repoLangFilter;
  const visFilter = state.repoVisFilter;

  let filtered = repos.filter(r =>
    (r.name.toLowerCase().includes(query) || (r.description || '').toLowerCase().includes(query)) &&
    (langFilter ? r.language === langFilter : true) &&
    (visFilter === 'public' ? !r.private : visFilter === 'private' ? r.private : true)
  );

  // Sort
  filtered.sort((a, b) => {
    switch (sort) {
      case 'stars': return b.stargazers_count - a.stargazers_count;
      case 'forks': return b.forks_count - a.forks_count;
      case 'name': return a.name.localeCompare(b.name);
      case 'created': return new Date(b.created_at) - new Date(a.created_at);
      default: return new Date(b.updated_at) - new Date(a.updated_at); // updated
    }
  });

  if (!filtered.length) {
    container.innerHTML = emptyHTML('No repositories found.');
    return;
  }

  container.innerHTML = filtered.map(repo => `
    <div class="repo-card" data-full-name="${repo.full_name}">
      <div class="batch-checkbox">
        <input type="checkbox" class="batch-select-item" value="${repo.full_name}" />
      </div>
      <div class="repo-card-header">
        <span class="repo-card-name" onclick="showRepoDetail('${escHtml(repo.full_name)}')">${escHtml(repo.name)}</span>
        <span class="badge badge-${repo.private ? 'private' : 'public'}">${repo.private ? 'Private' : 'Public'}</span>
        <div class="repo-actions">
          <button class="btn btn-icon repo-menu-btn" data-repo="${repo.full_name}" title="Actions">⋮</button>
        </div>
      </div>
      <div class="repo-card-desc">${escHtml(repo.description || 'No description provided.')}</div>
      <div class="repo-card-meta">
        ${repo.language ? `<span class="repo-meta-item"><span class="lang-dot" style="background:${langColor(repo.language)}"></span>${escHtml(repo.language)}</span>` : ''}
        <span class="repo-meta-item">⭐ ${repo.stargazers_count}</span>
        <span class="repo-meta-item">🍴 ${repo.forks_count}</span>
        <span class="repo-meta-item">Updated ${formatDate(repo.updated_at)}</span>
      </div>
      <div class="repo-card-actions">
        <a href="${escHtml(repo.html_url)}" target="_blank" class="btn btn-outline btn-sm">Open on GitHub</a>
        <button class="btn btn-outline btn-sm" onclick="showRepoDetail('${escHtml(repo.full_name)}')">Details</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDeleteRepo('${escHtml(repo.full_name)}')">Delete</button>
      </div>
    </div>
  `).join('');

  // Re-attach menu listeners
  qa('.repo-menu-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleRepoMenu(btn);
    });
  });
}

// ── Batch Operations ─────────────────────────────────────
function toggleBatchMode() {
  state.batchMode = !state.batchMode;
  const reposSection = $('repos-section');
  reposSection.classList.toggle('batch-mode', state.batchMode);
  $('batch-action-bar').classList.toggle('hidden', !state.batchMode || state.selectedRepos.size === 0);
  
  if (!state.batchMode) {
    clearBatchSelection();
  }
}

function clearBatchSelection() {
  state.selectedRepos.clear();
  qa('.batch-select-item').forEach(cb => cb.checked = false);
  const batchSelectAll = $('batch-select-all');
  if (batchSelectAll) batchSelectAll.checked = false;
  updateBatchCount();
}

function updateBatchCount() {
  const count = state.selectedRepos.size;
  const countEl = $('batch-action-bar').querySelector('.batch-count');
  if (countEl) countEl.textContent = `${count} selected`;
  $('batch-action-bar').classList.toggle('hidden', count === 0);
  qa('.repo-card').forEach(card => {
    card.classList.toggle('selected', state.selectedRepos.has(card.dataset.fullName));
  });
}

async function batchArchive() {
  const repos = Array.from(state.selectedRepos);
  if (repos.length === 0) return;
  
  const confirmed = confirm(`Archive ${repos.length} repository(ies)?\n\nArchived repos will become read-only.`);
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

async function batchDelete() {
  const repos = Array.from(state.selectedRepos);
  if (repos.length === 0) return;
  
  const repoList = repos.map(r => `  - ${r}`).join('\n');
  const confirmed = confirm(`⚠️ DELETE ${repos.length} repository(ies)?\n\nThis is PERMANENT and cannot be undone!\n\nRepos to delete:\n${repoList}\n\nClick OK to confirm deletion.`);
  if (!confirmed) {
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

// Batch checkbox listeners - added after rendering
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

async function showRepoDetail(fullName) {
  showModal('repo-detail-modal');
  $('repo-detail-title').textContent = fullName;
  $('repo-detail-body').innerHTML = loadingHTML();
  try {
    const res = await gh(`/repos/${fullName}`);
    if (!res.ok) throw new Error(`Failed: ${res.status}`);
    const r = await res.json();
    $('repo-detail-body').innerHTML = `
      <div>
        <p style="color:var(--text-secondary);margin-bottom:16px">${escHtml(r.description || 'No description.')}</p>
        <div class="repo-detail-grid">
          <div class="repo-detail-item"><div class="repo-detail-label">Stars</div><div class="repo-detail-value">⭐ ${r.stargazers_count}</div></div>
          <div class="repo-detail-item"><div class="repo-detail-label">Forks</div><div class="repo-detail-value">🍴 ${r.forks_count}</div></div>
          <div class="repo-detail-item"><div class="repo-detail-label">Watchers</div><div class="repo-detail-value">👁 ${r.watchers_count}</div></div>
          <div class="repo-detail-item"><div class="repo-detail-label">Open Issues</div><div class="repo-detail-value">${r.open_issues_count}</div></div>
          <div class="repo-detail-item"><div class="repo-detail-label">Language</div><div class="repo-detail-value">${escHtml(r.language || 'N/A')}</div></div>
          <div class="repo-detail-item"><div class="repo-detail-label">Visibility</div><div class="repo-detail-value">${r.private ? '🔒 Private' : '🌍 Public'}</div></div>
          <div class="repo-detail-item"><div class="repo-detail-label">Created</div><div class="repo-detail-value">${formatDate(r.created_at)}</div></div>
          <div class="repo-detail-item"><div class="repo-detail-label">Updated</div><div class="repo-detail-value">${formatDate(r.updated_at)}</div></div>
          <div class="repo-detail-item"><div class="repo-detail-label">Default Branch</div><div class="repo-detail-value">${escHtml(r.default_branch)}</div></div>
          <div class="repo-detail-item"><div class="repo-detail-label">Size</div><div class="repo-detail-value">${(r.size / 1024).toFixed(1)} MB</div></div>
        </div>
        <div style="margin-top:16px">
          <a href="${r.html_url}" target="_blank" class="btn btn-outline btn-sm">Open on GitHub ↗</a>
          ${r.homepage ? `<a href="${escHtml(r.homepage)}" target="_blank" class="btn btn-outline btn-sm" style="margin-left:8px">Homepage ↗</a>` : ''}
        </div>
      </div>
    `;
  } catch (e) {
    $('repo-detail-body').innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

function confirmDeleteRepo(fullName) {
  $('confirm-title').textContent = 'Delete Repository';
  $('confirm-message').innerHTML = `Are you sure you want to delete <strong>${escHtml(fullName)}</strong>? This action cannot be undone.<br><br>Please type the repository name to confirm:`;
  $('confirm-input-group').style.display = 'block';
  $('confirm-input-label').textContent = 'Repository name';
  $('confirm-input').value = '';
  $('confirm-input').placeholder = fullName.split('/')[1];
  showModal('confirm-modal');
  state.confirmCallback = async () => {
    const typed = $('confirm-input').value.trim();
    const repoName = fullName.split('/')[1];
    if (typed !== repoName) {
      toast('Repository name does not match!', 'error');
      return;
    }
    hideModal('confirm-modal');
    try {
      const res = await gh(`/repos/${fullName}`, { method: 'DELETE' });
      if (res.status === 204) {
        toast(`Deleted ${fullName}`, 'success');
        loadRepos();
      } else {
        const err = await res.json().catch(() => ({}));
        toast(`Error: ${err.message || res.status}`, 'error');
      }
    } catch (e) {
      toast(e.message, 'error');
    }
  };
}

async function createRepo() {
  const name = $('new-repo-name').value.trim();
  if (!name) { toast('Repository name is required', 'error'); return; }
  const desc = $('new-repo-desc').value.trim();
  const priv = q('input[name="repo-visibility"]:checked').value === 'private';
  const init = $('new-repo-init').checked;

  $('create-repo-btn').disabled = true;
  try {
    const res = await gh('/user/repos', {
      method: 'POST',
      body: JSON.stringify({ name, description: desc, private: priv, auto_init: init })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create repo');
    toast(`Created ${data.full_name}`, 'success');
    hideModal('new-repo-modal');
    $('new-repo-name').value = '';
    $('new-repo-desc').value = '';
    $('new-repo-init').checked = false;
    loadRepos();
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    $('create-repo-btn').disabled = false;
  }
}

// ── Issue Repo Select ─────────────────────────────────────
function populateRepoSelects() {
  const repos = state.repos;
  const issueSelect = $('issues-repo-select');
  const pullsSelect = $('pulls-repo-select');

  const options = `<option value="">Select a repository...</option>` +
    repos.map(r => `<option value="${escHtml(r.full_name)}">${escHtml(r.full_name)}</option>`).join('');

  issueSelect.innerHTML = options;
  pullsSelect.innerHTML = options;
}

async function loadIssueRepoSelect() {
  if (!state.repos.length) {
    try {
      const res = await gh('/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member');
      if (res.ok) { state.repos = await res.json(); }
    } catch (_) {}
  }
  populateRepoSelects();
  $('issues-list').innerHTML = emptyHTML('Select a repository to view its issues.');
}

// ── Issues ───────────────────────────────────────────────
async function loadIssues(repoFullName, state_filter = 'open') {
  const container = $('issues-list');
  if (!repoFullName) { container.innerHTML = emptyHTML('Select a repository to view its issues.'); return; }
  container.innerHTML = loadingHTML();
  try {
    const res = await gh(`/repos/${repoFullName}/issues?state=${state_filter}&per_page=50&filter=all`);
    if (!res.ok) throw new Error(`Failed (${res.status})`);
    const issues = (await res.json()).filter(i => !i.pull_request);
    renderIssues(issues, repoFullName);
  } catch (e) {
    container.innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

function renderIssues(issues, repoFullName) {
  const container = $('issues-list');
  if (!issues.length) { container.innerHTML = emptyHTML('No issues found.'); return; }
  container.innerHTML = issues.map(issue => `
    <div class="list-item ${state.selectedIssues.has(issue.id) ? 'selected' : ''}" data-issue-id="${issue.id}">
      <div class="batch-checkbox">
        <input type="checkbox" class="issue-select-item" value="${issue.id}" ${state.selectedIssues.has(issue.id) ? 'checked' : ''} />
      </div>
      <div class="list-item-header" onclick="toggleIssueExpand(${issue.id})">
        <div class="list-item-icon">
          <button class="issue-expand-btn" id="expand-btn-${issue.id}">▶</button>
        </div>
        <div class="list-item-content">
          <div class="list-item-title">${escHtml(issue.title)}</div>
          <div class="list-item-meta">
            <span>#${issue.number}</span>
            <span>by ${escHtml(issue.user.login)}</span>
            <span>${formatDate(issue.created_at)}</span>
            ${issue.labels.map(l => `<span class="badge" style="background:rgba(${hexToRgb(l.color)},0.15);color:#${l.color};border:1px solid rgba(${hexToRgb(l.color)},0.4)">${escHtml(l.name)}</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="list-item-actions">
        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); showIssueDetail('${escHtml(repoFullName)}', ${issue.number})">Details</button>
        <a href="${issue.html_url}" target="_blank" class="btn btn-outline btn-sm">View</a>
        <button class="btn ${issue.state === 'open' ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="toggleIssue('${escHtml(repoFullName)}', ${issue.number}, '${issue.state}')">
          ${issue.state === 'open' ? 'Close' : 'Reopen'}
        </button>
      </div>
      <div class="issue-expanded-content" id="issue-expand-${issue.id}">
        <div class="issue-description">${escHtml(issue.body || 'No description provided.')}</div>
        
        <div class="issue-meta-section">
          <div class="issue-meta-label">Labels</div>
          <div class="issue-labels">
            ${issue.labels.length ? issue.labels.map(l => `
              <span class="issue-label" style="background:rgba(${hexToRgb(l.color)},0.15);color:#${l.color};border:1px solid rgba(${hexToRgb(l.color)},0.4)">
                ${escHtml(l.name)}
                <span class="issue-label-remove" onclick="removeIssueLabel('${escHtml(repoFullName)}', ${issue.number}, '${escHtml(l.name)}')">×</span>
              </span>
            `).join('') : '<span style="color:var(--text-muted);font-size:12px">No labels</span>'}
            <button class="btn btn-sm btn-outline" onclick="renderIssueLabelsForm('${escHtml(repoFullName)}', ${issue.number})">+ Add</button>
          </div>
        </div>
        
        <div class="issue-meta-section">
          <div class="issue-meta-label">Assignees</div>
          <div class="issue-assignees">
            ${issue.assignees.length ? issue.assignees.map(a => `
              <div class="issue-assignee">
                <img src="${a.avatar_url}" alt="${a.login}" />
                <span>${escHtml(a.login)}</span>
                <span class="issue-assignee-remove" onclick="removeIssueAssignee('${escHtml(repoFullName)}', ${issue.number}, '${a.login}')">×</span>
              </div>
            `).join('') : '<span style="color:var(--text-muted);font-size:12px">No assignees</span>'}
            <button class="btn btn-sm btn-outline" onclick="renderIssueAssigneesForm('${escHtml(repoFullName)}', ${issue.number})">+ Add</button>
          </div>
        </div>
        
        ${issue.milestone ? `
        <div class="issue-meta-section">
          <div class="issue-meta-label">Milestone</div>
          <div class="issue-milestone">🏔️ ${escHtml(issue.milestone.title)}</div>
        </div>
        ` : ''}
      </div>
    </div>
  `).join('');

  // Add checkbox listeners
  qa('.issue-select-item').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const issueId = parseInt(e.target.value);
      if (e.target.checked) {
        state.selectedIssues.add(issueId);
      } else {
        state.selectedIssues.delete(issueId);
      }
      updateIssuesBatchCount();
      document.querySelector(`[data-issue-id="${issueId}"]`)?.classList.toggle('selected', state.selectedIssues.has(issueId));
    });
  });
}

function toggleIssueExpand(issueId) {
  const btn = $('expand-btn-' + issueId);
  const content = $('issue-expand-' + issueId);
  if (btn && content) {
    btn.classList.toggle('expanded');
    content.classList.toggle('show');
  }
}

function updateIssuesBatchCount() {
  const count = state.selectedIssues.size;
  const countEl = $('issues-batch-action-bar').querySelector('.batch-count');
  if (countEl) countEl.textContent = `${count} selected`;
  $('issues-batch-action-bar').classList.toggle('hidden', count === 0);
}

function toggleIssueSelectMode() {
  state.issuesBatchMode = !state.issuesBatchMode;
  const issuesSection = $('issues-section');
  issuesSection.classList.toggle('issues-batch-mode', state.issuesBatchMode);
  $('issues-batch-action-bar').classList.toggle('hidden', !state.issuesBatchMode || state.selectedIssues.size === 0);
  
  if (!state.issuesBatchMode) {
    clearIssuesSelection();
  }
}

function clearIssuesSelection() {
  state.selectedIssues.clear();
  qa('.issue-select-item').forEach(cb => cb.checked = false);
  updateIssuesBatchCount();
  qa('.list-item').forEach(item => item.classList.remove('selected'));
}

// ── Issue Detail Modal ─────────────────────────────────────
async function showIssueDetail(repoFullName, issueNumber) {
  state.currentIssueRepo = repoFullName;
  $('issue-detail-title').textContent = `Issue #${issueNumber}`;
  $('issue-detail-body').innerHTML = loadingHTML();
  showModal('issue-detail-modal');
  
  try {
    const res = await gh(`/repos/${repoFullName}/issues/${issueNumber}`);
    if (!res.ok) throw new Error('Failed to load issue');
    const issue = await res.json();
    renderIssueDetail(issue);
  } catch (e) {
    $('issue-detail-body').innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

function renderIssueDetail(issue) {
  const statusIcon = issue.state === 'open'
    ? `<svg viewBox="0 0 16 16" width="16" height="16" fill="#3fb950"><path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/><path fill-rule="evenodd" d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"/></svg>`
    : `<svg viewBox="0 0 16 16" width="16" height="16" fill="#8b949e"><path d="M11.28 6.78a.75.75 0 00-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l3.5-3.5z"/><path fill-rule="evenodd" d="M16 8A8 8 0 110 8a8 8 0 0116 0zm-1.5 0a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"/></svg>`;

  $('issue-detail-body').innerHTML = `
    <div class="issue-detail-header">
      <div class="issue-detail-status">${statusIcon}</div>
      <div>
        <div class="issue-detail-title">${escHtml(issue.title)}</div>
        <div class="issue-detail-meta">
          <span class="badge badge-${issue.state}">${issue.state}</span>
          <span>#${issue.number}</span>
          <span>by ${escHtml(issue.user.login)}</span>
          <span>${formatDate(issue.created_at)}</span>
          ${issue.milestone ? `<span class="issue-milestone">🏔️ ${escHtml(issue.milestone.title)}</span>` : ''}
        </div>
      </div>
    </div>
    
    <div class="issue-detail-body">
      ${issue.body ? `<div class="issue-description">${escHtml(issue.body)}</div>` : '<p style="color:var(--text-muted)">No description provided.</p>'}
    </div>
    
    <div class="issue-detail-section">
      <div class="issue-detail-section-title">Labels</div>
      <div class="issue-labels">
        ${issue.labels.length ? issue.labels.map(l => `
          <span class="issue-label" style="background:rgba(${hexToRgb(l.color)},0.15);color:#${l.color};border:1px solid rgba(${hexToRgb(l.color)},0.4)">
            ${escHtml(l.name)}
            <span class="issue-label-remove" onclick="removeIssueLabel('${issue.repository_url?.full_name || state.currentIssueRepo}', ${issue.number}, '${escHtml(l.name)}')">×</span>
          </span>
        `).join('') : '<span style="color:var(--text-muted)">No labels</span>'}
        <button class="btn btn-sm btn-outline" onclick="renderIssueLabelsForm('${issue.repository_url?.full_name || state.currentIssueRepo}', ${issue.number})">+ Add Label</button>
      </div>
    </div>
    
    <div class="issue-detail-section">
      <div class="issue-detail-section-title">Assignees</div>
      <div class="issue-assignees">
        ${issue.assignees.length ? issue.assignees.map(a => `
          <div class="issue-assignee">
            <img src="${a.avatar_url}" alt="${a.login}" />
            <span>${escHtml(a.login)}</span>
            <span class="issue-assignee-remove" onclick="removeIssueAssignee('${issue.repository_url?.full_name || state.currentIssueRepo}', ${issue.number}, '${a.login}')">×</span>
          </div>
        `).join('') : '<span style="color:var(--text-muted)">No assignees</span>'}
        <button class="btn btn-sm btn-outline" onclick="renderIssueAssigneesForm('${issue.repository_url?.full_name || state.currentIssueRepo}', ${issue.number})">+ Add Assignee</button>
      </div>
    </div>
    
    <div class="issue-detail-section">
      <div class="issue-detail-section-title">Comments</div>
      <div id="issue-comments-list" class="issue-comments-list">
        <div class="loading-overlay"><div class="spinner"></div><span>Loading comments...</span></div>
      </div>
    </div>
    
    <div class="issue-detail-actions">
      <button class="btn ${issue.state === 'open' ? 'btn-secondary' : 'btn-primary'}" onclick="toggleIssue('${state.currentIssueRepo}', ${issue.number}, '${issue.state}')">
        ${issue.state === 'open' ? 'Close Issue' : 'Reopen Issue'}
      </button>
      <button class="btn btn-outline" onclick="window.open('${issue.html_url}', '_blank')">Open on GitHub</button>
    </div>
    
    <div class="issue-comment-form">
      <h4>Add Comment</h4>
      <textarea id="issue-comment-body" placeholder="Write a comment..."></textarea>
      <button class="btn btn-primary" onclick="postIssueComment('${state.currentIssueRepo}', ${issue.number})">Post Comment</button>
    </div>
  `;
  
  loadIssueComments(issue.repository_url?.full_name || state.currentIssueRepo, issue.number);
}

async function loadIssueComments(repoFullName, issueNumber) {
  const container = $('issue-comments-list');
  try {
    const res = await gh(`/repos/${repoFullName}/issues/${issueNumber}/comments`);
    const comments = await res.json();
    
    if (!comments.length) {
      container.innerHTML = '<p style="color:var(--text-muted)">No comments yet.</p>';
      return;
    }
    
    container.innerHTML = comments.map(c => `
      <div class="issue-comment-item">
        <img src="${c.user.avatar_url}" class="issue-comment-avatar" alt="${c.user.login}" />
        <div class="issue-comment-content">
          <div class="issue-comment-header">
            <span class="issue-comment-author">${c.user.login}</span>
            <span class="issue-comment-date">${formatDate(c.created_at)}</span>
          </div>
          <div class="issue-comment-body">${escHtml(c.body)}</div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

async function postIssueComment(repoFullName, issueNumber) {
  const body = $('issue-comment-body').value;
  if (!body.trim()) { toast('Comment cannot be empty', 'error'); return; }
  
  try {
    const res = await gh(`/repos/${repoFullName}/issues/${issueNumber}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body })
    });
    
    if (res.ok) {
      toast('Comment posted', 'success');
      $('issue-comment-body').value = '';
      loadIssueComments(repoFullName, issueNumber);
    } else {
      const err = await res.json();
      toast(`Error: ${err.message}`, 'error');
    }
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ── Issue Labels & Assignees ─────────────────────────────────
async function renderIssueLabelsForm(repoFullName, issueNumber) {
  try {
    const res = await gh(`/repos/${repoFullName}/labels`);
    const labels = await res.json();
    
    const issueRes = await gh(`/repos/${repoFullName}/issues/${issueNumber}`);
    const issue = await issueRes.json();
    const existingLabels = issue.labels.map(l => l.name);
    const availableLabels = labels.filter(l => !existingLabels.includes(l.name));
    
    if (availableLabels.length === 0) {
      toast('No more labels available', 'info');
      return;
    }
    
    $('confirm-title').textContent = 'Add Label';
    $('confirm-message').innerHTML = 'Select a label to add:';
    $('confirm-input-group').style.display = 'block';
    $('confirm-input-label').textContent = 'Label';
    
    const labelSelect = document.createElement('select');
    labelSelect.id = 'issue-label-select';
    labelSelect.innerHTML = availableLabels.map(l => 
      `<option value="${escHtml(l.name)}">${escHtml(l.name)}</option>`
    ).join('');
    labelSelect.style.width = '100%';
    
    const inputGroup = $('confirm-input-group');
    inputGroup.innerHTML = '';
    inputGroup.appendChild(labelSelect);
    
    showModal('confirm-modal');
    state.confirmCallback = async () => {
      const labelName = $('issue-label-select').value;
      await addIssueLabel(repoFullName, issueNumber, labelName);
    };
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function addIssueLabel(repoFullName, issueNumber, labelName) {
  try {
    const res = await gh(`/repos/${repoFullName}/issues/${issueNumber}`, {
      method: 'PATCH',
      body: JSON.stringify({ labels: [...new Set([labelName])] })
    });
    
    if (res.ok) {
      toast(`Label "${labelName}" added`, 'success');
      const issue = await res.json();
      renderIssueDetail(issue);
    } else {
      const err = await res.json();
      toast(`Error: ${err.message}`, 'error');
    }
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function removeIssueLabel(repoFullName, issueNumber, labelName) {
  try {
    const res = await gh(`/repos/${repoFullName}/issues/${issueNumber}`);
    const issue = await res.json();
    const newLabels = issue.labels.filter(l => l.name !== labelName).map(l => l.name);
    
    const updateRes = await gh(`/repos/${repoFullName}/issues/${issueNumber}`, {
      method: 'PATCH',
      body: JSON.stringify({ labels: newLabels })
    });
    
    if (updateRes.ok) {
      toast(`Label "${labelName}" removed`, 'success');
      const updated = await updateRes.json();
      renderIssueDetail(updated);
    } else {
      const err = await updateRes.json();
      toast(`Error: ${err.message}`, 'error');
    }
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function renderIssueAssigneesForm(repoFullName, issueNumber) {
  try {
    const res = await gh(`/repos/${repoFullName}/collaborators`);
    const collaborators = await res.json();
    
    const issueRes = await gh(`/repos/${repoFullName}/issues/${issueNumber}`);
    const issue = await issueRes.json();
    const existingAssignees = issue.assignees.map(a => a.login);
    const availableAssignees = collaborators.filter(c => !existingAssignees.includes(c.login));
    
    if (availableAssignees.length === 0) {
      toast('No more collaborators available to assign', 'info');
      return;
    }
    
    $('confirm-title').textContent = 'Add Assignee';
    $('confirm-message').innerHTML = 'Select a collaborator to add:';
    $('confirm-input-group').style.display = 'block';
    $('confirm-input-label').textContent = 'Assignee';
    
    const assigneeSelect = document.createElement('select');
    assigneeSelect.id = 'issue-assignee-select';
    assigneeSelect.innerHTML = availableAssignees.map(c => 
      `<option value="${c.login}">${c.login}</option>`
    ).join('');
    assigneeSelect.style.width = '100%';
    
    const inputGroup = $('confirm-input-group');
    inputGroup.innerHTML = '';
    inputGroup.appendChild(assigneeSelect);
    
    showModal('confirm-modal');
    state.confirmCallback = async () => {
      const assignee = $('issue-assignee-select').value;
      await addIssueAssignee(repoFullName, issueNumber, assignee);
    };
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function addIssueAssignee(repoFullName, issueNumber, assignee) {
  try {
    const res = await gh(`/repos/${repoFullName}/issues/${issueNumber}`, {
      method: 'PATCH',
      body: JSON.stringify({ assignees: [assignee] })
    });
    
    if (res.ok) {
      toast(`Assignee "${assignee}" added`, 'success');
      const issue = await res.json();
      renderIssueDetail(issue);
    } else {
      const err = await res.json();
      toast(`Error: ${err.message}`, 'error');
    }
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function removeIssueAssignee(repoFullName, issueNumber, assignee) {
  try {
    const res = await gh(`/repos/${repoFullName}/issues/${issueNumber}`);
    const issue = await res.json();
    const newAssignees = issue.assignees.filter(a => a.login !== assignee).map(a => a.login);
    
    const updateRes = await gh(`/repos/${repoFullName}/issues/${issueNumber}`, {
      method: 'PATCH',
      body: JSON.stringify({ assignees: newAssignees })
    });
    
    if (updateRes.ok) {
      toast(`Assignee "${assignee}" removed`, 'success');
      const updated = await updateRes.json();
      renderIssueDetail(updated);
    } else {
      const err = await updateRes.json();
      toast(`Error: ${err.message}`, 'error');
    }
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ── Issue Bulk Operations ─────────────────────────────────────
async function batchCloseIssues() {
  const repo = $('issues-repo-select').value;
  if (!repo || state.selectedIssues.size === 0) return;
  
  const confirmed = confirm(`Close ${state.selectedIssues.size} issue(s)?`);
  if (!confirmed) return;
  
  let success = 0, failed = 0;
  for (const issueId of state.selectedIssues) {
    try {
      const issueEl = document.querySelector(`[data-issue-id="${issueId}"]`);
      const issueNumber = issueEl?.querySelector('.list-item-meta span')?.textContent?.replace('#', '');
      if (!issueNumber) continue;
      
      const res = await gh(`/repos/${repo}/issues/${issueNumber}`, {
        method: 'PATCH',
        body: JSON.stringify({ state: 'closed' })
      });
      if (res.ok) success++;
      else failed++;
    } catch { failed++; }
  }
  
  toast(`Closed ${success} issue(s)${failed ? `, ${failed} failed` : ''}`, success > 0 ? 'success' : 'error');
  clearIssuesSelection();
  loadIssues(repo, state.issueFilter);
}

async function batchOpenIssues() {
  const repo = $('issues-repo-select').value;
  if (!repo || state.selectedIssues.size === 0) return;
  
  const confirmed = confirm(`Reopen ${state.selectedIssues.size} issue(s)?`);
  if (!confirmed) return;
  
  let success = 0, failed = 0;
  for (const issueId of state.selectedIssues) {
    try {
      const issueEl = document.querySelector(`[data-issue-id="${issueId}"]`);
      const metaSpan = issueEl?.querySelector('.list-item-meta span');
      const issueNumber = metaSpan?.textContent?.replace('#', '');
      if (!issueNumber) continue;
      
      const res = await gh(`/repos/${repo}/issues/${issueNumber}`, {
        method: 'PATCH',
        body: JSON.stringify({ state: 'open' })
      });
      if (res.ok) success++;
      else failed++;
    } catch { failed++; }
  }
  
  toast(`Reopened ${success} issue(s)${failed ? `, ${failed} failed` : ''}`, success > 0 ? 'success' : 'error');
  clearIssuesSelection();
  loadIssues(repo, state.issueFilter);
}

async function toggleIssue(repoFullName, number, currentState) {
  const newState = currentState === 'open' ? 'closed' : 'open';
  try {
    const res = await gh(`/repos/${repoFullName}/issues/${number}`, {
      method: 'PATCH',
      body: JSON.stringify({ state: newState })
    });
    if (!res.ok) throw new Error('Failed to update issue');
    toast(`Issue #${number} ${newState}`, 'success');
    loadIssues(repoFullName, state.issueFilter);
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function createIssue() {
  const repo = $('issues-repo-select').value;
  if (!repo) { toast('Please select a repository first', 'error'); return; }
  const title = $('new-issue-title').value.trim();
  if (!title) { toast('Issue title is required', 'error'); return; }
  const body = $('new-issue-body').value.trim();
  const labelsRaw = $('new-issue-labels').value.trim();
  const labels = labelsRaw ? labelsRaw.split(',').map(l => l.trim()).filter(Boolean) : [];

  $('create-issue-btn').disabled = true;
  try {
    const res = await gh(`/repos/${repo}/issues`, {
      method: 'POST',
      body: JSON.stringify({ title, body, labels })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed');
    toast(`Issue #${data.number} created`, 'success');
    hideModal('new-issue-modal');
    $('new-issue-title').value = '';
    $('new-issue-body').value = '';
    $('new-issue-labels').value = '';
    loadIssues(repo, state.issueFilter);
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    $('create-issue-btn').disabled = false;
  }
}

// ── Pull Requests ────────────────────────────────────────
async function loadPullRepoSelect() {
  if (!state.repos.length) {
    try {
      const res = await gh('/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member');
      if (res.ok) { state.repos = await res.json(); }
    } catch (_) {}
  }
  populateRepoSelects();
  $('pulls-list').innerHTML = emptyHTML('Select a repository to view pull requests.');
}

async function loadPulls(repoFullName, state_filter = 'open') {
  const container = $('pulls-list');
  if (!repoFullName) { container.innerHTML = emptyHTML('Select a repository to view pull requests.'); return; }
  container.innerHTML = loadingHTML();
  try {
    const res = await gh(`/repos/${repoFullName}/pulls?state=${state_filter}&per_page=50`);
    if (!res.ok) throw new Error(`Failed (${res.status})`);
    const pulls = await res.json();
    renderPulls(pulls, repoFullName);
  } catch (e) {
    container.innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

function renderPulls(pulls, repoFullName) {
  const container = $('pulls-list');
  if (!pulls.length) { container.innerHTML = emptyHTML('No pull requests found.'); return; }
  container.innerHTML = pulls.map(pr => `
    <div class="list-item">
      <div class="list-item-icon">
        ${pr.state === 'open'
          ? `<svg viewBox="0 0 16 16" width="16" height="16" fill="#3fb950"><path fill-rule="evenodd" d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"/></svg>`
          : `<svg viewBox="0 0 16 16" width="16" height="16" fill="${pr.merged_at ? '#a371f7' : '#8b949e'}"><path fill-rule="evenodd" d="M5 3.254V3.25v.005a.75.75 0 110-.005v.004zm.45 1.9a2.25 2.25 0 10-1.95.218v5.256a2.25 2.25 0 101.5 0V7.123A5.735 5.735 0 009.25 9h1.378a2.251 2.251 0 100-1.5H9.25a4.25 4.25 0 01-3.8-2.346zM12.75 9a.75.75 0 100-1.5.75.75 0 000 1.5zm-8.5 4.5a.75.75 0 100-1.5.75.75 0 000 1.5z"/></svg>`}
      </div>
      <div class="list-item-content">
        <div class="list-item-title">${escHtml(pr.title)}</div>
        <div class="list-item-meta">
          <span class="badge badge-${pr.merged_at ? 'merged' : pr.state}">${pr.merged_at ? 'Merged' : pr.state}</span>
          <span>#${pr.number}</span>
          <span>by ${escHtml(pr.user.login)}</span>
          <span>${formatDate(pr.created_at)}</span>
          <span>${escHtml(pr.head.label)} → ${escHtml(pr.base.label)}</span>
        </div>
      </div>
      <div class="list-item-actions">
        <a href="${pr.html_url}" target="_blank" class="btn btn-outline btn-sm">View</a>
        ${pr.state === 'open' && !pr.merged_at ? `
          <button class="btn btn-primary btn-sm" onclick="confirmMergePR('${escHtml(repoFullName)}', ${pr.number}, '${escHtml(pr.title)}')">
            🔀 Merge
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

// ── Feature 4: PR Merge ──────────────────────────────────
function confirmMergePR(repoFullName, prNumber, prTitle) {
  $('confirm-title').textContent = 'Merge Pull Request';
  $('confirm-message').innerHTML = `Are you sure you want to merge <strong>PR #${prNumber}: ${escHtml(prTitle)}</strong> into the base branch?`;
  $('confirm-input-group').style.display = 'none';
  showModal('confirm-modal');
  state.confirmCallback = async () => {
    hideModal('confirm-modal');
    try {
      const res = await gh(`/repos/${repoFullName}/pulls/${prNumber}/merge`, {
        method: 'PUT',
        body: JSON.stringify({
          commit_title: `Merge pull request #${prNumber}`,
          merge_method: 'merge'
        })
      });
      if (res.status === 200) {
        toast(`PR #${prNumber} merged successfully! 🎉`, 'success');
        loadPulls(repoFullName, state.pullFilter);
      } else {
        const err = await res.json().catch(() => ({}));
        toast(`Cannot merge: ${err.message || res.status}`, 'error');
      }
    } catch (e) {
      toast(e.message, 'error');
    }
  };
}

// ── Reviews Dashboard ─────────────────────────────────────
async function loadReviewsDashboard() {
  const container = $('reviews-list');
  container.innerHTML = loadingHTML();
  
  try {
    const [searchPending, searchRequested] = await Promise.all([
      gh('/search/issues?q=is:pr+review:required+is:open+user:' + state.user.login),
      gh('/search/issues?q=is:pr+review-requested:+is:open+user:' + state.user.login)
    ]);
    
    const pendingPRs = searchPending.ok ? await searchPending.json() : { items: [] };
    const requestedPRs = searchRequested.ok ? await searchRequested.json() : { items: [] };
    
    state.reviewsData = {
      pending: pendingPRs.items || [],
      requested: requestedPRs.items || [],
      approved: []
    };
    
    $('pending-count').textContent = state.reviewsData.pending.length;
    $('requested-count').textContent = state.reviewsData.requested.length;
    $('completed-count').textContent = state.reviewsData.approved.length;
    
    renderReviewsList();
  } catch (e) {
    container.innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

function renderReviewsList() {
  const container = $('reviews-list');
  let prs = [];
  
  switch(state.reviewsFilter) {
    case 'pending':
      prs = state.reviewsData?.pending || [];
      break;
    case 'requested':
      prs = state.reviewsData?.requested || [];
      break;
    case 'approved':
      prs = state.reviewsData?.approved || [];
      break;
  }
  
  if (!prs.length) {
    container.innerHTML = emptyHTML(`No pull requests to review.`);
    return;
  }
  
  container.innerHTML = prs.map(pr => {
    const repoName = pr.repository_url ? pr.repository_url.split('/').slice(-2).join('/') : '';
    return `
      <div class="review-item">
        <div class="review-item-icon">
          <svg viewBox="0 0 16 16" width="20" height="20" fill="#3fb950"><path fill-rule="evenodd" d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"/></svg>
        </div>
        <div class="review-item-content">
          <div class="review-item-title">
            <a href="${pr.html_url}" target="_blank">${escHtml(pr.title)}</a>
          </div>
          <div class="review-item-meta">
            <span>${escHtml(repoName)}</span>
            <span>#${pr.number}</span>
            <span>by ${escHtml(pr.user?.login || 'unknown')}</span>
            <span>${formatDate(pr.created_at)}</span>
          </div>
        </div>
        <div class="review-item-actions">
          <button class="btn btn-primary btn-sm" onclick="showPRDetail('${escHtml(repoName)}', ${pr.number})">Review</button>
        </div>
      </div>
    `;
  }).join('');
}

// ── PR Detail Modal ───────────────────────────────────────
async function showPRDetail(repoFullName, prNumber) {
  state.currentPR = { repo: repoFullName, number: prNumber };
  $('pr-detail-title').textContent = `PR #${prNumber}`;
  $('pr-detail-body').innerHTML = loadingHTML();
  showModal('pr-detail-modal');
  
  try {
    const res = await gh(`/repos/${repoFullName}/pulls/${prNumber}`);
    if (!res.ok) throw new Error('Failed to load PR');
    const pr = await res.json();
    state.currentPR.data = pr;
    renderPRDetail(pr);
  } catch (e) {
    $('pr-detail-body').innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

function renderPRDetail(pr) {
  const statusIcon = pr.state === 'open' 
    ? `<svg viewBox="0 0 16 16" width="16" height="16" fill="#3fb950"><path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/><path fill-rule="evenodd" d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"/></svg>`
    : pr.merged_at
      ? `<svg viewBox="0 0 16 16" width="16" height="16" fill="#a371f7"><path fill-rule="evenodd" d="M5 3.254V3.25v.005a.75.75 0 110-.005v.004zm.45 1.9a2.25 2.25 0 10-1.95.218v5.256a2.25 2.25 0 101.5 0V7.123A5.735 5.735 0 009.25 9h1.378a2.251 2.251 0 100-1.5H9.25a4.25 4.25 0 01-3.8-2.346zM12.75 9a.75.75 0 100-1.5.75.75 0 000 1.5zm-8.5 4.5a.75.75 0 100-1.5.75.75 0 000 1.5z"/></svg>`
      : `<svg viewBox="0 0 16 16" width="16" height="16" fill="#8b949e"><path d="M11.28 6.78a.75.75 0 00-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l3.5-3.5z"/><path fill-rule="evenodd" d="M16 8A8 8 0 110 8a8 8 0 0116 0zm-1.5 0a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"/></svg>`;
  
  const statusClass = pr.merged_at ? 'merged' : pr.state;
  const statusLabel = pr.merged_at ? 'Merged' : pr.state;
  
  $('pr-detail-body').innerHTML = `
    <div class="pr-detail-header">
      <div class="pr-detail-status">${statusIcon}</div>
      <div>
        <div class="pr-detail-title">${escHtml(pr.title)}</div>
        <div class="pr-detail-meta">
          <span class="badge badge-${statusClass}">${statusLabel}</span>
          <span>${escHtml(pr.head.label)} → ${escHtml(pr.base.label)}</span>
          <span>by ${escHtml(pr.user.login)}</span>
          <span>${formatDate(pr.created_at)}</span>
        </div>
      </div>
    </div>
    
    <div class="pr-detail-tabs">
      <button class="pr-detail-tab active" data-tab="conversation">Conversation</button>
      <button class="pr-detail-tab" data-tab="commits">Commits</button>
      <button class="pr-detail-tab" data-tab="files">Files Changed</button>
    </div>
    
    <div id="pr-detail-content" class="pr-detail-content">
      ${pr.body ? `<div class="item-detail-body">${escHtml(pr.body)}</div>` : '<p style="color:var(--text-muted)">No description provided.</p>'}
      
      <div class="divider"></div>
      
      <h4 style="margin-bottom:12px">Labels</h4>
      <div id="pr-labels-list" style="margin-bottom:16px">
        ${pr.labels.length ? pr.labels.map(l => 
          `<span class="label-badge" style="background:rgba(${hexToRgb(l.color)},0.15);color:#${l.color};border:1px solid rgba(${hexToRgb(l.color)},0.4)">
            ${escHtml(l.name)}
            <span class="label-remove" onclick="removePRLabel('${pr.base.repo.full_name}', ${pr.number}, '${escHtml(l.name)}')">×</span>
          </span>`
        ).join('') : '<span style="color:var(--text-muted)">No labels</span>'}
      </div>
      
      <h4 style="margin-bottom:12px">Assignees</h4>
      <div id="pr-assignees-list">
        ${pr.assignees.length ? pr.assignees.map(a => 
          `<img src="${a.avatar_url}" class="assignee-avatar" title="${escHtml(a.login)}" />`
        ).join('') : '<span style="color:var(--text-muted)">No assignees</span>'}
      </div>
      
      <div class="pr-detail-actions">
        ${pr.state === 'open' && !pr.merged_at ? `
          <button class="btn btn-primary" onclick="confirmMergePR('${pr.base.repo.full_name}', ${pr.number}, '${escHtml(pr.title)}')">🔀 Merge PR</button>
        ` : ''}
        <button class="btn btn-secondary" onclick="renderPRLabelsForm('${pr.base.repo.full_name}', ${pr.number})">🏷️ Add Label</button>
        <button class="btn btn-secondary" onclick="renderPRAssigneesForm('${pr.base.repo.full_name}', ${pr.number})">👤 Add Assignee</button>
      </div>
      
      <div class="review-form">
        <h4 style="margin-bottom:12px">Submit Review</h4>
        <textarea id="review-body" placeholder="Leave a comment..."></textarea>
        <div class="review-form-actions">
          <button class="btn btn-primary btn-sm" onclick="submitReview('${pr.base.repo.full_name}', ${pr.number}, 'APPROVE')">✅ Approve</button>
          <button class="btn btn-secondary btn-sm" onclick="submitReview('${pr.base.repo.full_name}', ${pr.number}, 'REQUEST_CHANGES')">❌ Request Changes</button>
          <button class="btn btn-secondary btn-sm" onclick="submitReview('${pr.base.repo.full_name}', ${pr.number}, 'COMMENT')">💬 Comment</button>
        </div>
      </div>
      
      <div class="comment-form">
        <h4 style="margin-bottom:12px">Add Comment</h4>
        <textarea id="comment-body" placeholder="Write a comment..."></textarea>
        <div class="comment-form-actions">
          <button class="btn btn-primary btn-sm" onclick="postComment('${pr.base.repo.full_name}', ${pr.number})">Post Comment</button>
        </div>
      </div>
    </div>
  `;
  
  qa('.pr-detail-tab').forEach(tab => {
    tab.addEventListener('click', () => switchPRDetailTab(tab.dataset.tab));
  });
}

function switchPRDetailTab(tabName) {
  qa('.pr-detail-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
}

async function renderPRReviews(repoFullName, prNumber) {
  const content = $('pr-detail-content');
  try {
    const res = await gh(`/repos/${repoFullName}/pulls/${prNumber}/reviews`);
    const reviews = await res.json();
    
    if (!reviews.length) {
      content.innerHTML = '<p style="color:var(--text-muted)">No reviews yet.</p>';
      return;
    }
    
    content.innerHTML = reviews.map(r => `
      <div class="pr-review-item">
        <img src="${r.user.avatar_url}" class="pr-review-avatar" alt="${r.user.login}" />
        <div class="pr-review-body">
          <div class="pr-review-header">
            <span class="pr-review-author">${r.user.login}</span>
            <span class="pr-review-state ${r.state.toLowerCase()}">${r.state}</span>
            <span class="pr-review-date">${formatDate(r.submitted_at)}</span>
          </div>
          ${r.body ? `<div class="pr-review-text">${escHtml(r.body)}</div>` : ''}
        </div>
      </div>
    `).join('');
  } catch (e) {
    content.innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

async function renderPRComments(repoFullName, prNumber) {
  const content = $('pr-detail-content');
  try {
    const res = await gh(`/repos/${repoFullName}/issues/${prNumber}/comments`);
    const comments = await res.json();
    
    if (!comments.length) {
      content.innerHTML = '<p style="color:var(--text-muted)">No comments yet.</p>';
      return;
    }
    
    content.innerHTML = comments.map(c => `
      <div class="pr-comment-item">
        <img src="${c.user.avatar_url}" class="pr-comment-avatar" alt="${c.user.login}" />
        <div class="pr-comment-body">
          <div class="pr-comment-header">
            <span class="pr-comment-author">${c.user.login}</span>
            <span class="pr-comment-date">${formatDate(c.created_at)}</span>
          </div>
          <div class="pr-comment-text">${escHtml(c.body)}</div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    content.innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

async function submitReview(repoFullName, prNumber, event) {
  const body = $('review-body').value;
  
  try {
    const res = await gh(`/repos/${repoFullName}/pulls/${prNumber}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ body, event })
    });
    
    if (res.ok) {
      toast('Review submitted', 'success');
      $('review-body').value = '';
    } else {
      const err = await res.json();
      toast(`Error: ${err.message}`, 'error');
    }
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function postComment(repoFullName, prNumber) {
  const body = $('comment-body').value;
  if (!body.trim()) { toast('Comment cannot be empty', 'error'); return; }
  
  try {
    const res = await gh(`/repos/${repoFullName}/issues/${prNumber}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body })
    });
    
    if (res.ok) {
      toast('Comment posted', 'success');
      $('comment-body').value = '';
    } else {
      const err = await res.json();
      toast(`Error: ${err.message}`, 'error');
    }
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function mergePR(repoFullName, prNumber) {
  try {
    const res = await gh(`/repos/${repoFullName}/pulls/${prNumber}/merge`, {
      method: 'PUT',
      body: JSON.stringify({ merge_method: 'merge' })
    });
    
    if (res.ok) {
      toast('PR merged successfully', 'success');
      showPRDetail(repoFullName, prNumber);
    } else {
      const err = await res.json();
      toast(`Cannot merge: ${err.message}`, 'error');
    }
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ── Labels & Assignees ─────────────────────────────────────
async function renderPRLabelsForm(repoFullName, prNumber) {
  try {
    const res = await gh(`/repos/${repoFullName}/labels`);
    const labels = await res.json();
    
    const existingLabels = state.currentPR.data?.labels?.map(l => l.name) || [];
    const availableLabels = labels.filter(l => !existingLabels.includes(l.name));
    
    if (availableLabels.length === 0) {
      toast('No more labels available', 'info');
      return;
    }
    
    $('confirm-title').textContent = 'Add Label';
    $('confirm-message').innerHTML = 'Select a label to add:';
    $('confirm-input-group').style.display = 'block';
    $('confirm-input-label').textContent = 'Label';
    
    const labelSelect = document.createElement('select');
    labelSelect.id = 'label-select';
    labelSelect.innerHTML = availableLabels.map(l => 
      `<option value="${escHtml(l.name)}">${escHtml(l.name)}</option>`
    ).join('');
    labelSelect.style.width = '100%';
    
    const inputGroup = $('confirm-input-group');
    inputGroup.innerHTML = '';
    inputGroup.appendChild(labelSelect);
    
    showModal('confirm-modal');
    state.confirmCallback = async () => {
      const labelName = $('label-select').value;
      await addPRLabel(repoFullName, prNumber, labelName);
    };
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function addPRLabel(repoFullName, prNumber, labelName) {
  try {
    const currentLabels = state.currentPR.data?.labels?.map(l => l.name) || [];
    const res = await gh(`/repos/${repoFullName}/issues/${prNumber}`, {
      method: 'PATCH',
      body: JSON.stringify({ labels: [...currentLabels, labelName] })
    });
    
    if (res.ok) {
      const pr = await res.json();
      state.currentPR.data = pr;
      renderPRDetail(pr);
      toast('Label added', 'success');
    } else {
      toast('Failed to add label', 'error');
    }
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function removePRLabel(repoFullName, prNumber, labelName) {
  try {
    const currentLabels = state.currentPR.data?.labels?.map(l => l.name) || [];
    const newLabels = currentLabels.filter(l => l !== labelName);
    
    const res = await gh(`/repos/${repoFullName}/issues/${prNumber}`, {
      method: 'PATCH',
      body: JSON.stringify({ labels: newLabels })
    });
    
    if (res.ok) {
      const pr = await res.json();
      state.currentPR.data = pr;
      renderPRDetail(pr);
      toast('Label removed', 'success');
    } else {
      toast('Failed to remove label', 'error');
    }
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function renderPRAssigneesForm(repoFullName, prNumber) {
  try {
    const res = await gh(`/repos/${repoFullName}/assignees`);
    const availableAssignees = await res.json();
    
    const existingAssignees = state.currentPR.data?.assignees?.map(a => a.login) || [];
    const available = availableAssignees.filter(a => !existingAssignees.includes(a.login));
    
    if (available.length === 0) {
      toast('No more assignees available', 'info');
      return;
    }
    
    $('confirm-title').textContent = 'Add Assignee';
    $('confirm-message').innerHTML = 'Select a user to assign:';
    $('confirm-input-group').style.display = 'block';
    $('confirm-input-label').textContent = 'Assignee';
    
    const select = document.createElement('select');
    select.id = 'assignee-select';
    select.innerHTML = available.map(a => 
      `<option value="${escHtml(a.login)}">${escHtml(a.login)}</option>`
    ).join('');
    select.style.width = '100%';
    
    const inputGroup = $('confirm-input-group');
    inputGroup.innerHTML = '';
    inputGroup.appendChild(select);
    
    showModal('confirm-modal');
    state.confirmCallback = async () => {
      const username = $('assignee-select').value;
      await addPRAssignee(repoFullName, prNumber, username);
    };
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function addPRAssignee(repoFullName, prNumber, username) {
  try {
    const currentAssignees = state.currentPR.data?.assignees?.map(a => a.login) || [];
    const res = await gh(`/repos/${repoFullName}/issues/${prNumber}`, {
      method: 'PATCH',
      body: JSON.stringify({ assignees: [...currentAssignees, username] })
    });
    
    if (res.ok) {
      const pr = await res.json();
      state.currentPR.data = pr;
      renderPRDetail(pr);
      toast('Assignee added', 'success');
    } else {
      toast('Failed to add assignee', 'error');
    }
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function removePRAssignee(repoFullName, prNumber, username) {
  try {
    const currentAssignees = state.currentPR.data?.assignees?.map(a => a.login) || [];
    const newAssignees = currentAssignees.filter(a => a !== username);
    
    const res = await gh(`/repos/${repoFullName}/issues/${prNumber}`, {
      method: 'PATCH',
      body: JSON.stringify({ assignees: newAssignees })
    });
    
    if (res.ok) {
      const pr = await res.json();
      state.currentPR.data = pr;
      renderPRDetail(pr);
      toast('Assignee removed', 'success');
    } else {
      toast('Failed to remove assignee', 'error');
    }
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ── Gists ────────────────────────────────────────────────
async function loadGists() {
  const container = $('gists-list');
  container.innerHTML = loadingHTML();
  try {
    const res = await gh('/gists?per_page=100');
    if (!res.ok) throw new Error(`Failed (${res.status})`);
    const gists = await res.json();
    renderGists(gists);
  } catch (e) {
    container.innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

function renderGists(gists) {
  const container = $('gists-list');
  if (!gists.length) { container.innerHTML = emptyHTML('No gists found. Create your first gist!'); return; }
  container.innerHTML = gists.map(g => {
    const files = Object.keys(g.files);
    const firstName = files[0] || 'untitled';
    return `
    <div class="gist-card">
      <div class="gist-filename">${escHtml(firstName)}${files.length > 1 ? ` +${files.length - 1} more` : ''}</div>
      <div class="gist-desc">${escHtml(g.description || '')}</div>
      <div class="gist-meta">
        ${g.public ? '🌍 Public' : '🔒 Secret'} · Created ${formatDate(g.created_at)} · Updated ${formatDate(g.updated_at)}
      </div>
      <div class="gist-card-actions">
        <a href="${g.html_url}" target="_blank" class="btn btn-outline btn-sm">Open</a>
        <button class="btn btn-danger btn-sm" onclick="confirmDeleteGist('${escHtml(g.id)}', '${escHtml(firstName)}')">Delete</button>
      </div>
    </div>
    `;
  }).join('');
}

function confirmDeleteGist(id, name) {
  $('confirm-title').textContent = 'Delete Gist';
  $('confirm-message').innerHTML = `Are you sure you want to delete <strong>${escHtml(name)}</strong>? This cannot be undone.`;
  $('confirm-input-group').style.display = 'none';
  showModal('confirm-modal');
  state.confirmCallback = async () => {
    hideModal('confirm-modal');
    try {
      const res = await gh(`/gists/${id}`, { method: 'DELETE' });
      if (res.status === 204) { toast('Gist deleted', 'success'); loadGists(); }
      else { toast('Failed to delete gist', 'error'); }
    } catch (e) { toast(e.message, 'error'); }
  };
}

async function createGist() {
  const filename = $('new-gist-filename').value.trim();
  if (!filename) { toast('Filename is required', 'error'); return; }
  const content = $('new-gist-content').value;
  if (!content.trim()) { toast('Content is required', 'error'); return; }
  const desc = $('new-gist-desc').value.trim();
  const isPublic = q('input[name="gist-visibility"]:checked').value === 'public';

  $('create-gist-btn').disabled = true;
  try {
    const res = await gh('/gists', {
      method: 'POST',
      body: JSON.stringify({
        description: desc,
        public: isPublic,
        files: { [filename]: { content } }
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed');
    toast('Gist created!', 'success');
    hideModal('new-gist-modal');
    $('new-gist-filename').value = '';
    $('new-gist-desc').value = '';
    $('new-gist-content').value = '';
    loadGists();
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    $('create-gist-btn').disabled = false;
  }
}

// ── Profile ──────────────────────────────────────────────
async function loadProfile() {
  const container = $('profile-card');
  container.innerHTML = loadingHTML();
  try {
    const res = await gh('/user');
    if (!res.ok) throw new Error(`Failed (${res.status})`);
    const u = await res.json();
    container.innerHTML = `
      <div class="profile-card">
        <img class="profile-avatar" src="${u.avatar_url}" alt="${escHtml(u.login)}" />
        <div class="profile-info">
          <div class="profile-name">${escHtml(u.name || u.login)}</div>
          <div class="profile-login">@${escHtml(u.login)}</div>
          ${u.bio ? `<div class="profile-bio">${escHtml(u.bio)}</div>` : ''}
          <div class="profile-stats">
            <div class="profile-stat"><span class="stat-value">${u.public_repos}</span><span class="stat-label">Repos</span></div>
            <div class="profile-stat"><span class="stat-value">${u.followers}</span><span class="stat-label">Followers</span></div>
            <div class="profile-stat"><span class="stat-value">${u.following}</span><span class="stat-label">Following</span></div>
            <div class="profile-stat"><span class="stat-value">${u.public_gists}</span><span class="stat-label">Gists</span></div>
          </div>
          <div class="profile-links">
            ${u.company ? `<div class="profile-link">🏢 ${escHtml(u.company)}</div>` : ''}
            ${u.location ? `<div class="profile-link">📍 ${escHtml(u.location)}</div>` : ''}
            ${u.email ? `<div class="profile-link">✉️ ${escHtml(u.email)}</div>` : ''}
            ${u.blog ? `<div class="profile-link">🔗 <a href="${escHtml(u.blog)}" target="_blank" style="color:var(--accent-blue-hover)">${escHtml(u.blog)}</a></div>` : ''}
            ${u.twitter_username ? `<div class="profile-link">🐦 @${escHtml(u.twitter_username)}</div>` : ''}
          </div>
          <div style="margin-top:16px">
            <a href="${u.html_url}" target="_blank" class="btn btn-outline btn-sm">View on GitHub ↗</a>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

// ── Helpers ──────────────────────────────────────────────
function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function hexToRgb(hex) {
  if (!hex) return '139,148,158';
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.replace('#',''));
  return result ? `${parseInt(result[1],16)},${parseInt(result[2],16)},${parseInt(result[3],16)}` : '139,148,158';
}

// ── Event Listeners ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Load saved theme
  const savedTheme = localStorage.getItem('gh_theme') || 'dark';
  applyTheme(savedTheme);

  // Mobile sidebar backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'sidebar-backdrop';
  backdrop.className = 'sidebar-backdrop';
  backdrop.addEventListener('click', closeSidebar);
  document.body.appendChild(backdrop);

  // Mobile header
  const mobileHeader = document.createElement('div');
  mobileHeader.className = 'mobile-header';
  mobileHeader.innerHTML = `
    <button id="mobile-menu-btn" style="background:none;border:none;color:var(--text-primary);font-size:22px;cursor:pointer;margin-right:12px">☰</button>
    <svg height="24" viewBox="0 0 16 16" width="24" fill="var(--text-primary)"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
    <span style="font-weight:600;margin-left:8px;font-size:15px">GitHub Manager</span>
  `;
  document.querySelector('.main-content').prepend(mobileHeader);
  document.getElementById('mobile-menu-btn').addEventListener('click', openSidebar);

  // ── Login ──────────────────────────────────────────────
  const loginBtn = $('login-btn');
  loginBtn.addEventListener('click', async () => {
    const pat = $('pat-input').value.trim();
    if (!pat) { $('login-error').textContent = 'Please enter your PAT.'; $('login-error').classList.remove('hidden'); return; }
    $('login-text').textContent = 'Connecting…';
    $('login-spinner').classList.remove('hidden');
    loginBtn.disabled = true;
    $('login-error').classList.add('hidden');
    try {
      await login(pat);
      showAppScreen();
    } catch (e) {
      $('login-error').textContent = `Authentication failed: ${e.message}`;
      $('login-error').classList.remove('hidden');
    } finally {
      $('login-text').textContent = 'Connect to GitHub';
      $('login-spinner').classList.add('hidden');
      loginBtn.disabled = false;
    }
  });

  $('pat-input').addEventListener('keydown', e => { if (e.key === 'Enter') loginBtn.click(); });

  $('toggle-pat').addEventListener('click', () => {
    const input = $('pat-input');
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  // ── Logout ─────────────────────────────────────────────
  $('logout-btn').addEventListener('click', logout);

  // ── Navigation ─────────────────────────────────────────
  qa('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.section));
  });

  // ── Modal closes ───────────────────────────────────────
  qa('.modal-close, [data-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal || btn.closest('.modal')?.id;
      if (modalId) hideModal(modalId);
    });
  });

  $('modal-overlay').addEventListener('click', e => {
    if (e.target === $('modal-overlay')) hideAllModals();
  });

  // ── New Repo ───────────────────────────────────────────
  $('new-repo-btn').addEventListener('click', () => showModal('new-repo-modal'));
  $('create-repo-btn').addEventListener('click', createRepo);

  // ── Feature 1: Repo Sorting & Filtering controls ───────
  // Search input with debounce
  let searchTimeout;
  $('repo-search').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.repoSearchQuery = e.target.value;
      renderRepos(filterAndSortRepos());
    }, 300);
  });

  $('repo-sort').addEventListener('change', (e) => {
    state.repoSort = e.target.value;
    renderRepos(filterAndSortRepos());
  });

  $('repo-lang-filter').addEventListener('change', (e) => {
    state.repoLangFilter = e.target.value;
    renderRepos(filterAndSortRepos());
  });

  $('repo-vis-filter').addEventListener('change', (e) => {
    state.repoVisFilter = e.target.value;
    renderRepos(filterAndSortRepos());
  });

  // Archived toggle
  $('repo-show-archived').addEventListener('change', (e) => {
    state.repoShowArchived = e.target.checked;
    $('archived-toggle').classList.toggle('active', e.target.checked);
    renderRepos(filterAndSortRepos());
  });

  // ── Batch Operations ─────────────────────────────────────
  $('batch-toggle-btn').addEventListener('click', toggleBatchMode);
  $('batch-archive-btn').addEventListener('click', batchArchive);
  $('batch-delete-btn').addEventListener('click', batchDelete);
  $('batch-clear-btn').addEventListener('click', () => {
    clearBatchSelection();
    toggleBatchMode();
  });

  // ── Issues ─────────────────────────────────────────────
  $('new-issue-btn').addEventListener('click', () => {
    if (!$('issues-repo-select').value) { toast('Please select a repository first', 'error'); return; }
    showModal('new-issue-modal');
  });
  $('create-issue-btn').addEventListener('click', createIssue);

  $('issues-repo-select').addEventListener('change', () => {
    loadIssues($('issues-repo-select').value, state.issueFilter);
  });

  document.querySelectorAll('#issues-section .filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#issues-section .filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.issueFilter = btn.dataset.state;
      loadIssues($('issues-repo-select').value, state.issueFilter);
    });
  });

  // Issue Batch Operations
  $('issues-batch-toggle-btn').addEventListener('click', toggleIssueSelectMode);
  $('issues-batch-close-btn').addEventListener('click', batchCloseIssues);
  $('issues-batch-reopen-btn').addEventListener('click', batchOpenIssues);
  $('issues-batch-clear-btn').addEventListener('click', () => {
    clearIssuesSelection();
    toggleIssueSelectMode();
  });

  // ── Pull Requests ──────────────────────────────────────
  $('pulls-repo-select').addEventListener('change', () => {
    loadPulls($('pulls-repo-select').value, state.pullFilter);
  });

  $('new-pr-btn')?.addEventListener('click', () => {
    if (!$('pulls-repo-select').value) { toast('Please select a repository first', 'error'); return; }
    showNewPRModal($('pulls-repo-select').value);
  });

  document.querySelectorAll('#pulls-section .filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#pulls-section .filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const filter = btn.dataset.state || btn.dataset.filter;
      
      if (filter === 'reviews') {
        state.reviewsFilter = 'pending';
        $('pulls-list').classList.add('hidden');
        $('reviews-dashboard').classList.remove('hidden');
        loadReviewsDashboard();
      } else {
        state.pullFilter = filter;
        $('pulls-list').classList.remove('hidden');
        $('reviews-dashboard').classList.add('hidden');
        loadPulls($('pulls-repo-select').value, state.pullFilter);
      }
    });
  });

  // ── Export Functionality ────────────────────────────────
  function showExportModal() {
    const count = state.selectedRepos.size > 0 
      ? state.selectedRepos.size 
      : filterAndSortRepos().length;
    
    $('export-count').textContent = count;
    $('export-selected-count').textContent = state.selectedRepos.size;
    $('export-selected-only').checked = false;
    showModal('export-modal');
  }

  function exportRepos() {
    const format = $('export-format').value;
    const selectedOnly = $('export-selected-only').checked;
    
    let repos = selectedOnly 
      ? state.repos.filter(r => state.selectedRepos.has(r.full_name))
      : filterAndSortRepos();
    
    if (repos.length === 0) {
      toast('No repositories to export', 'info');
      return;
    }
    
    let content, mimeType, filename;
    
    if (format === 'json') {
      const exportData = repos.map(r => ({
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
        html_url: r.html_url,
        archived: r.archived
      }));
      
      content = JSON.stringify(exportData, null, 2);
      mimeType = 'application/json';
      filename = `repos-export-${new Date().toISOString().split('T')[0]}.json`;
    } else {
      const headers = ['name', 'full_name', 'description', 'language', 'private', 'stars', 'forks', 'issues', 'archived', 'updated', 'created', 'url'];
      
      const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      
      const rows = repos.map(r => [
        escapeCSV(r.name),
        escapeCSV(r.full_name),
        escapeCSV(r.description),
        escapeCSV(r.language),
        escapeCSV(r.private),
        escapeCSV(r.stargazers_count),
        escapeCSV(r.forks_count),
        escapeCSV(r.open_issues_count),
        escapeCSV(r.archived),
        escapeCSV(r.updated_at),
        escapeCSV(r.created_at),
        escapeCSV(r.html_url)
      ]);
      
      content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      mimeType = 'text/csv';
      filename = `repos-export-${new Date().toISOString().split('T')[0]}.csv`;
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    closeModal('export-modal');
    toast(`Exported ${repos.length} repositories as ${format.toUpperCase()}`, 'success');
  }

  $('export-btn').addEventListener('click', showExportModal);
  $('export-download-btn').addEventListener('click', exportRepos);

  // ── Gists ──────────────────────────────────────────────
  $('new-gist-btn').addEventListener('click', () => showModal('new-gist-modal'));
  $('create-gist-btn').addEventListener('click', createGist);

  // ── Confirm ────────────────────────────────────────────
  $('confirm-action-btn').addEventListener('click', () => {
    if (state.confirmCallback) state.confirmCallback();
  });

  // ── Hamburger sidebar toggle ────────────────────────────
  $('sidebar-toggle').addEventListener('click', () => {
    if ($('sidebar').classList.contains('open')) closeSidebar();
    else openSidebar();
  });

  // ── Feature 2: Theme toggle button ─────────────────────
  $('theme-toggle-btn').addEventListener('click', toggleTheme);

  // ── Dashboard Refresh ───────────────────────────────────
  $('dashboard-refresh-btn').addEventListener('click', () => {
    state.dashboardRefreshKey++;
    switchDashboardTab(state.dashboardTab);
    toast('Dashboard refreshed', 'info');
  });

  // ── Dashboard Tab Navigation ─────────────────────────────
  qa('.dashboard-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchDashboardTab(btn.dataset.tab));
  });

  // ── Auto-login from session ────────────────────────────
  const savedPat = loadPat();
  if (savedPat) {
    $('login-text').textContent = 'Reconnecting…';
    $('login-spinner').classList.remove('hidden');
    login(savedPat)
      .then(() => showAppScreen())
      .catch(() => { clearPat(); showLoginScreen(); })
      .finally(() => {
        $('login-text').textContent = 'Connect to GitHub';
        $('login-spinner').classList.add('hidden');
      });
  } else {
    showLoginScreen();
  }
});

// ── Health Tab ──────────────────────────────────────────
async function loadHealthData() {
  const container = $('health-content');
  container.innerHTML = `
    <div class="health-controls">
      <select id="health-repo-select" class="repo-select">
        <option value="">Select a repository...</option>
        ${state.repos.map(r => `<option value="${escHtml(r.full_name)}">${escHtml(r.full_name)}</option>`).join('')}
      </select>
    </div>
    <div id="health-metrics" class="health-grid">
      <div class="metric-card">
        <div class="metric-value">—</div>
        <div class="metric-label">Select a repository</div>
      </div>
    </div>
  `;
  
  // Add event listener
  $('health-repo-select').addEventListener('change', () => {
    const repo = $('health-repo-select').value;
    if (repo) loadHealthMetrics(repo);
  });
  
  state.healthData = { loaded: true };
}

async function loadHealthMetrics(repoFullName) {
  const container = $('health-metrics');
  container.innerHTML = `
    <div class="metric-card">
      <div class="loading-overlay"><div class="spinner"></div><span>Loading...</span></div>
    </div>
  `;
  
  try {
    const [statsRes, issuesRes, pullsRes] = await Promise.all([
      gh(`/repos/${repoFullName}/stats/commit_activity`),
      gh(`/repos/${repoFullName}/issues?state=closed&per_page=100`),
      gh(`/repos/${repoFullName}/pulls?state=all&per_page=100`)
    ]);
    
    const commitData = statsRes.ok ? await statsRes.json() : [];
    const issues = issuesRes.ok ? await issuesRes.json() : [];
    const pulls = pullsRes.ok ? await pullsRes.json() : [];
    
    // Calculate metrics
    const totalCommits = commitData.reduce((sum, week) => {
      return sum + week.total;
    }, 0);
    
    const avgCommitsPerWeek = commitData.length > 0 
      ? Math.round(totalCommits / commitData.length) 
      : 0;
    
    // Issue resolution time (last 30)
    const resolvedIssues = issues.filter(i => !i.pull_request).slice(0, 30);
    let avgResolutionDays = 0;
    if (resolvedIssues.length > 0) {
      const totalDays = resolvedIssues.reduce((sum, issue) => {
        const created = new Date(issue.created_at);
        const closed = new Date(issue.closed_at);
        return sum + (closed - created) / (1000 * 60 * 60 * 24);
      }, 0);
      avgResolutionDays = Math.round(totalDays / resolvedIssues.length);
    }
    
    // PR merge rate
    const closedPRs = pulls.filter(pr => pr.merged_at !== null || pr.state === 'closed');
    const mergedPRs = pulls.filter(pr => pr.merged_at !== null);
    const mergeRate = closedPRs.length > 0 
      ? Math.round((mergedPRs.length / closedPRs.length) * 100) 
      : 0;
    
    // Render health metrics
    container.innerHTML = `
      <div class="metric-card">
        <div class="metric-value">${totalCommits.toLocaleString()}</div>
        <div class="metric-label">Total Commits (52 weeks)</div>
        <div class="metric-detail">Avg ${avgCommitsPerWeek}/week</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-value">${avgResolutionDays}d</div>
        <div class="metric-label">Avg Issue Resolution</div>
        <div class="metric-detail">Based on last ${resolvedIssues.length} closed issues</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-value">${mergeRate}%</div>
        <div class="metric-label">PR Merge Rate</div>
        <div class="metric-detail">${mergedPRs.length}/${closedPRs.length} merged</div>
      </div>
      
      <div class="metric-card" style="grid-column: 1 / -1">
        <div class="metric-label">Commit Activity (Last 52 Weeks)</div>
        <div class="commit-chart" id="commit-chart"></div>
      </div>
    `;
    
    // Render commit chart
    renderCommitChart('commit-chart', commitData);
    
  } catch (e) {
    container.innerHTML = `<div class="error-msg">Failed to load health metrics: ${e.message}</div>`;
  }
}

function renderCommitChart(containerId, commitData) {
  const container = $(containerId);
  if (!container || !commitData || commitData.length === 0) {
    container.innerHTML = '<div class="commit-chart-empty">No commit data available</div>';
    return;
  }
  
  const maxCommits = Math.max(...commitData.map(w => w.total), 1);
  
  container.innerHTML = commitData.map(week => {
    const height = week.total > 0 ? Math.max((week.total / maxCommits) * 100, 5) : 2;
    return `<div class="commit-week" style="height: ${height}%" title="${week.total} commits"></div>`;
  }).join('');
}

// ── Contributors Tab ─────────────────────────────────────
async function loadContributorsData() {
  const container = $('contributors-content');
  container.innerHTML = `
    <div class="contributors-controls" style="margin-bottom: 20px;">
      <select id="contributors-repo-select" class="repo-select">
        <option value="">Select a repository...</option>
        ${state.repos.map(r => `<option value="${escHtml(r.full_name)}">${escHtml(r.full_name)}</option>`).join('')}
      </select>
    </div>
    <div id="contributors-list" class="contributors-grid">
      <div class="empty-state"><p>Select a repository to view contributors.</p></div>
    </div>
  `;
  
  $('contributors-repo-select').addEventListener('change', () => {
    const repo = $('contributors-repo-select').value;
    if (repo) loadContributors(repo);
  });
  
  state.contributorsData = { loaded: true };
}

async function loadContributors(repoFullName) {
  const container = $('contributors-list');
  container.innerHTML = `
    <div class="contributor-card">
      <div class="loading-overlay"><div class="spinner"></div></div>
    </div>
  `;
  
  try {
    const res = await gh(`/repos/${repoFullName}/contributors?per_page=20`);
    
    if (!res.ok) {
      if (res.status === 404) {
        container.innerHTML = '<div class="error-msg">Repository not found or has no contributors.</div>';
        return;
      }
      throw new Error(`Failed to load contributors (${res.status})`);
    }
    
    const contributors = await res.json();
    
    if (!contributors || contributors.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No contributors found for this repository.</p></div>';
      return;
    }
    
    const totalContributions = contributors.reduce((sum, c) => sum + c.contributions, 0);
    
    container.innerHTML = contributors.map(contributor => {
      const percent = Math.round((contributor.contributions / totalContributions) * 100);
      return `
        <div class="contributor-card">
          <a href="${contributor.html_url}" target="_blank" rel="noopener">
            <img class="contributor-avatar" src="${contributor.avatar_url}" alt="${escHtml(contributor.login)}" />
          </a>
          <div class="contributor-info">
            <a class="contributor-name" href="${contributor.html_url}" target="_blank" rel="noopener">${escHtml(contributor.login)}</a>
            <div class="contributor-meta">${contributor.contributions.toLocaleString()} commits</div>
            <div class="contributor-bar-container">
              <div class="contributor-bar">
                <div class="contributor-fill" style="width: ${percent}%"></div>
              </div>
              <span class="contributor-percent">${percent}%</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (e) {
    container.innerHTML = `<div class="error-msg">Failed to load contributors: ${e.message}</div>`;
  }
}

// ── Trends Tab ───────────────────────────────────────────
async function loadTrendsData() {
  const container = $('trends-content');
  
  container.innerHTML = `
    <div class="trends-controls">
      <select id="trends-sort">
        <option value="updated">Recently Updated</option>
        <option value="stars">Most Stars</option>
        <option value="forks">Most Forks</option>
      </select>
      <select id="trends-visibility">
        <option value="">All Repos</option>
        <option value="public">Public Only</option>
        <option value="private">Private Only</option>
      </select>
    </div>
    <div id="trends-list" class="trends-grid">
      <div class="loading-overlay"><div class="spinner"></div><span>Loading...</span></div>
    </div>
  `;
  
  $('trends-sort').addEventListener('change', renderTrends);
  $('trends-visibility').addEventListener('change', renderTrends);
  
  await loadTrendsDataFromAPI();
  
  state.trendsData = { loaded: true };
}

async function loadTrendsDataFromAPI() {
  const container = $('trends-list');
  container.innerHTML = `<div class="loading-overlay"><div class="spinner"></div><span>Loading...</span></div>`;
  
  try {
    const reposWithActivity = await Promise.all(
      state.repos.slice(0, 30).map(async repo => {
        try {
          const eventsRes = await gh(`/repos/${repo.full_name}/events?per_page=100`);
          const events = eventsRes.ok ? await eventsRes.json() : [];
          
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          
          const recentEvents = events.filter(e => new Date(e.created_at) > oneWeekAgo);
          
          return {
            ...repo,
            weeklyActivity: recentEvents.length,
            weeklyCommits: recentEvents.filter(e => e.type === 'PushEvent').reduce(
              (sum, e) => sum + (e.payload?.commits?.length || 0), 0
            )
          };
        } catch {
          return { ...repo, weeklyActivity: 0, weeklyCommits: 0 };
        }
      })
    );
    
    state.trendsData.repos = reposWithActivity;
    renderTrends();
    
  } catch (e) {
    container.innerHTML = `<div class="error-msg">Failed to load trends: ${e.message}</div>`;
  }
}

function renderTrends() {
  const container = $('trends-list');
  if (!state.trendsData?.repos) {
    container.innerHTML = '<div class="empty-state"><p>No data available.</p></div>';
    return;
  }
  
  const sortBy = $('trends-sort').value;
  const visibilityFilter = $('trends-visibility').value;
  
  let repos = [...state.trendsData.repos];
  
  if (visibilityFilter === 'public') {
    repos = repos.filter(r => !r.private);
  } else if (visibilityFilter === 'private') {
    repos = repos.filter(r => r.private);
  }
  
  switch (sortBy) {
    case 'stars':
      repos.sort((a, b) => b.stargazers_count - a.stargazers_count);
      break;
    case 'forks':
      repos.sort((a, b) => b.forks_count - a.forks_count);
      break;
    default:
      repos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }
  
  repos = repos.slice(0, 20);
  
  if (repos.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No repositories match your filters.</p></div>';
    return;
  }
  
  container.innerHTML = repos.map(repo => {
    const activityClass = repo.weeklyActivity > 20 ? 'positive' : '';
    const activityIcon = repo.weeklyActivity > 10 ? '📈' : repo.weeklyActivity > 0 ? '📊' : '📉';
    
    return `
      <div class="trend-card">
        <div class="trend-header">
          <a class="trend-name" href="${repo.html_url}" target="_blank" rel="noopener">${escHtml(repo.name)}</a>
          ${repo.private 
            ? '<span class="badge badge-private">Private</span>' 
            : '<span class="badge badge-public">Public</span>'}
        </div>
        <div class="trend-stats">
          <div class="trend-stat">
            <span class="trend-stat-icon">⭐</span>
            <span>${repo.stargazers_count.toLocaleString()}</span>
          </div>
          <div class="trend-stat">
            <span class="trend-stat-icon">🍴</span>
            <span>${repo.forks_count.toLocaleString()}</span>
          </div>
          <div class="trend-stat">
            <span class="trend-stat-icon">${activityIcon}</span>
            <span class="trend-change ${activityClass}">${repo.weeklyActivity} events</span>
          </div>
        </div>
        <div class="trend-description">${escHtml(repo.description || 'No description')}</div>
      </div>
    `;
  }).join('');
}

// ── Alerts Tab ───────────────────────────────────────────
async function loadAlertsData() {
  const container = $('alerts-content');
  container.innerHTML = `
    <div class="alerts-controls">
      <select id="alerts-repo-select" class="repo-select">
        <option value="">Select a repository...</option>
        ${state.repos.map(r => `<option value="${escHtml(r.full_name)}">${escHtml(r.full_name)}</option>`).join('')}
      </select>
    </div>
    <div id="alerts-list" class="alerts-list">
      <div class="empty-state"><p>Select a repository to view security alerts.</p></div>
    </div>
  `;
  
  $('alerts-repo-select').addEventListener('change', () => {
    const repo = $('alerts-repo-select').value;
    if (repo) loadAlerts(repo);
  });
  
  state.alertsData = { loaded: true };
}

async function loadAlerts(repoFullName) {
  const container = $('alerts-list');
  container.innerHTML = `<div class="loading-overlay"><div class="spinner"></div><span>Loading alerts...</span></div>`;
  
  try {
    const [dependabotRes, advisoriesRes] = await Promise.all([
      gh(`/repos/${repoFullName}/dependabot/alerts`),
      gh(`/repos/${repoFullName}/advisories?per_page=30`)
    ]);
    
    const dependabotAlerts = dependabotRes.ok ? await dependabotRes.json() : [];
    const advisories = advisoriesRes.ok ? await advisoriesRes.json() : [];
    
    const allAlerts = [
      ...dependabotAlerts.map(a => ({
        type: 'dependabot',
        severity: a.security_vulnerability?.severity || 'medium',
        package: a.security_advisory?.package?.name || 'Unknown',
        title: a.security_advisory?.summary || 'Vulnerability detected',
        description: a.security_advisory?.description || '',
        html_url: a.html_url || '',
        state: a.state || 'open',
        fixedIn: a.fixed_in,
        createdAt: a.created_at
      })),
      ...advisories.filter(a => !dependabotAlerts.some(d => 
        d.security_advisory?.ghsa_id === a.ghsa_id
      )).map(a => ({
        type: 'advisory',
        severity: a.severity || 'medium',
        package: a.vulnerabilities?.[0]?.package?.name || 'Unknown',
        title: a.summary || 'Security advisory',
        description: a.description || '',
        html_url: a.html_url || '',
        state: 'open',
        fixedIn: a.fixed_in,
        createdAt: a.published_at
      }))
    ];
    
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    allAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    
    if (allAlerts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>✅ No security alerts for this repository.</p>
        </div>
      `;
      return;
    }
    
    const hasPermission = dependabotRes.ok || advisoriesRes.ok;
    
    if (!hasPermission) {
      container.innerHTML = `
        <div class="permission-warning">
          <span>⚠️</span>
          <span>You need admin access or security manager role to view dependency alerts for this repository.</span>
        </div>
        <div class="empty-state">
          <p>Select a different repository or request access.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div style="margin-bottom: 16px; color: var(--text-secondary); font-size: 14px;">
        Found ${allAlerts.length} alert${allAlerts.length !== 1 ? 's' : ''}
      </div>
      ${allAlerts.map(alert => `
        <div class="alert-card severity-${alert.severity}">
          <div class="alert-icon">
            ${alert.severity === 'critical' ? '🔴' : 
              alert.severity === 'high' ? '🔶' : 
              alert.severity === 'medium' ? '⚠️' : 'ℹ️'}
          </div>
          <div class="alert-content">
            <div class="alert-title">${escHtml(alert.title)}</div>
            <div class="alert-meta">
              <span class="alert-severity-badge ${alert.severity}">${escHtml(alert.severity)}</span>
              <span>📦 ${escHtml(alert.package)}</span>
              ${alert.fixedIn ? `<span>Fixed in ${escHtml(alert.fixedIn)}</span>` : ''}
            </div>
            ${alert.description ? `<p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">${escHtml(alert.description.substring(0, 200))}${alert.description.length > 200 ? '...' : ''}</p>` : ''}
            <div class="alert-actions">
              ${alert.html_url ? `<a href="${alert.html_url}" target="_blank" class="btn btn-outline btn-sm">View on GitHub</a>` : ''}
              ${alert.state === 'open' ? `<span class="badge badge-open" style="align-self: center;">Open</span>` : ''}
            </div>
          </div>
        </div>
      `).join('')}
    `;
    
  } catch (e) {
    container.innerHTML = `
      <div class="permission-warning">
        <span>⚠️</span>
        <span>Unable to fetch security alerts. This may require additional permissions.</span>
      </div>
      <div class="error-msg">Error: ${e.message}</div>
    `;
  }
}

// ── Three-Dot Menu ─────────────────────────────────────
let activeDropdown = null;

function toggleRepoMenu(btn) {
  const menu = $('repo-dropdown');
  const repoFullName = btn.dataset.repo;
  
  // Position menu
  const rect = btn.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  
  // Ensure menu stays within viewport
  let top = rect.bottom + 4;
  let right = window.innerWidth - rect.right;
  
  if (top + menuRect.height > window.innerHeight) {
    top = rect.top - menuRect.height - 4;
  }
  
  menu.style.top = `${top}px`;
  menu.style.right = `${right}px`;
  menu.style.left = 'auto';
  
  // Show/hide menu
  if (activeDropdown === menu && !menu.classList.contains('hidden')) {
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
  if (!e.target.closest('.repo-actions') && !e.target.closest('.dropdown-menu')) {
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
  
  // Close menu
  qa('.dropdown-menu').forEach(m => m.classList.add('hidden'));
  activeDropdown = null;
  
  // Handle action
  switch(action) {
    case 'view': 
      showRepoDetail(repoFullName); 
      break;
    case 'webhooks': 
      showWebhooksModal(repoFullName); 
      break;
    case 'collaborators': 
      showCollaboratorsModal(repoFullName); 
      break;
    case 'protection': 
      showBranchProtectionModal(repoFullName); 
      break;
    case 'delete': 
      confirmDeleteRepo(repoFullName); 
      break;
  }
});

// ── Collaborator Management ───────────────────────────────
async function showCollaboratorsModal(repoFullName) {
  $('collaborators-repo-name').textContent = repoFullName;
  $('collaborators-list').innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  showModal('collaborators-modal');
  
  try {
    const res = await gh(`/repos/${repoFullName}/collaborators`);
    if (!res.ok) throw new Error('Failed to load collaborators');
    
    const collabs = await res.json();
    renderCollaboratorsList(collabs, repoFullName);
  } catch (e) {
    $('collaborators-list').innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

function renderCollaboratorsList(collabs, repoFullName) {
  if (collabs.length === 0) {
    $('collaborators-list').innerHTML = `
      <div class="webhook-empty">
        <p>No collaborators found.</p>
        <p style="font-size: 13px; margin-top: 8px;">Click "Add Collaborator" to invite someone.</p>
      </div>
    `;
    return;
  }
  
  $('add-collab-btn').dataset.repo = repoFullName;
  
  $('collaborators-list').innerHTML = collabs.map(c => `
    <div class="collaborator-item">
      <img src="${c.avatar_url}" class="collaborator-avatar" alt="${escHtml(c.login)}" />
      <div class="collaborator-info">
        <div class="collaborator-name">${escHtml(c.login)}</div>
        <div class="collaborator-permission">${escHtml(c.permissions ? Object.keys(c.permissions).filter(p => c.permissions[p]).join(', ') : 'member')}</div>
      </div>
      <div class="collaborator-actions">
        <select class="permission-select" onchange="changeCollaboratorPermission('${escHtml(repoFullName)}', '${escHtml(c.login)}', this.value)">
          <option value="pull" ${(c.permissions?.pull && !c.permissions.push) ? 'selected' : ''}>Pull</option>
          <option value="triage" ${c.permissions?.triage ? 'selected' : ''}>Triage</option>
          <option value="push" ${(c.permissions?.push && !c.permissions.maintain) ? 'selected' : ''}>Push</option>
          <option value="maintain" ${c.permissions?.maintain ? 'selected' : ''}>Maintain</option>
          <option value="admin" ${c.permissions?.admin ? 'selected' : ''}>Admin</option>
        </select>
        <button class="btn btn-sm btn-danger" onclick="removeCollaborator('${escHtml(repoFullName)}', '${escHtml(c.login)}')">✕</button>
      </div>
    </div>
  `).join('');
}

async function changeCollaboratorPermission(repoFullName, username, permission) {
  try {
    const res = await gh(`/repos/${repoFullName}/collaborators/${username}`, {
      method: 'PUT',
      body: JSON.stringify({ permission })
    });
    
    if (res.ok || res.status === 204) {
      toast(`Permission updated to ${permission}`, 'success');
    } else {
      toast('Failed to update permission', 'error');
      showCollaboratorsModal(repoFullName);
    }
  } catch (e) {
    toast('Error updating permission', 'error');
    showCollaboratorsModal(repoFullName);
  }
}

async function removeCollaborator(repoFullName, username) {
  if (!confirm(`Remove ${username} from this repository?\n\nThey will lose access immediately.`)) return;
  
  try {
    const res = await gh(`/repos/${repoFullName}/collaborators/${username}`, { 
      method: 'DELETE' 
    });
    
    if (res.ok || res.status === 204) {
      toast(`${username} removed`, 'success');
      showCollaboratorsModal(repoFullName);
    } else {
      toast('Failed to remove collaborator', 'error');
    }
  } catch (e) {
    toast('Error removing collaborator', 'error');
  }
}

$('add-collab-btn').addEventListener('click', () => {
  $('collab-username').value = '';
  $('collab-permission').value = 'push';
  $('save-collab-btn').dataset.repo = $('add-collab-btn').dataset.repo;
  closeModal('collaborators-modal');
  showModal('collab-form-modal');
});

$('save-collab-btn').addEventListener('click', async () => {
  const username = $('collab-username').value.trim();
  const permission = $('collab-permission').value;
  
  if (!username) {
    toast('Please enter a username', 'error');
    return;
  }
  
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(username)) {
    toast('Invalid username format', 'error');
    return;
  }
  
  const repoFullName = $('save-collab-btn').dataset.repo;
  
  try {
    const res = await gh(`/repos/${repoFullName}/collaborators/${username}`, {
      method: 'PUT',
      body: JSON.stringify({ permission })
    });
    
    if (res.ok || res.status === 204) {
      toast(`${username} added as ${permission}`, 'success');
      closeModal('collab-form-modal');
      showCollaboratorsModal(repoFullName);
    } else {
      const err = await res.json();
      toast(`Failed: ${err.message || 'User not found or access denied'}`, 'error');
    }
  } catch (e) {
    toast('Error adding collaborator', 'error');
  }
});

// ── Branch Protection Rules ─────────────────────────────
let currentProtectionRepo = '';
let currentProtectionBranch = '';
let currentProtectionData = null;

async function showBranchProtectionModal(repoFullName) {
  currentProtectionRepo = repoFullName;
  $('protection-repo-name').textContent = repoFullName;
  showModal('protection-modal');
  
  // Load branches
  try {
    const branchesRes = await gh(`/repos/${repoFullName}/branches`);
    if (!branchesRes.ok) throw new Error('Failed to load branches');
    
    const branches = await branchesRes.json();
    
    // Populate branch dropdown
    $('protection-branch').innerHTML = branches.map(b => 
      `<option value="${escHtml(b.name)}" ${b.name === 'main' || b.name === 'master' ? 'selected' : ''}>${escHtml(b.name)}</option>`
    ).join('');
    
    // Load protection for selected branch
    await loadBranchProtection(repoFullName, branches[0]?.name || 'main');
  } catch (e) {
    $('protection-rules').innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

$('protection-branch').addEventListener('change', async (e) => {
  await loadBranchProtection(currentProtectionRepo, e.target.value);
});

async function loadBranchProtection(repoFullName, branch) {
  currentProtectionBranch = branch;
  $('protection-rules').innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  
  try {
    const res = await gh(`/repos/${repoFullName}/branches/${branch}/protection`);
    
    if (res.ok) {
      currentProtectionData = await res.json();
    } else if (res.status === 404) {
      currentProtectionData = null;
    } else {
      throw new Error('Failed to load protection rules');
    }
    
    renderProtectionRules(currentProtectionData);
  } catch (e) {
    $('protection-rules').innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

function renderProtectionRules(data) {
  const enabled = !!data;
  const checks = data?.required_status_checks;
  const reviews = data?.required_pull_request_reviews;
  const linear = data?.required_linear_history;
  const admins = data?.enforce_admins;
  
  $('protection-rules').innerHTML = `
    <div class="protection-rule ${checks || reviews ? 'enabled' : ''}" id="rule-reviews">
      <div>
        <label class="checkbox-label" style="cursor: pointer;">
          <input type="checkbox" id="prot-required-reviews" ${reviews ? 'checked' : ''} />
          <span><strong>Require pull request reviews before merging</strong></span>
        </label>
        <p>Require at least one approving review before pull requests can be merged.</p>
        ${reviews ? `
          <div class="rule-detail">
            <div class="rule-detail-item">
              <span>Required reviewers:</span>
              <strong>${reviews.required_approving_review_count || 0}</strong>
            </div>
            ${reviews.dismiss_stale_reviews ? '<div class="rule-detail-item">✓ Dismiss stale reviews</div>' : ''}
            ${reviews.require_last_approval ? '<div class="rule-detail-item">✓ Require last approval</div>' : ''}
          </div>
        ` : ''}
      </div>
    </div>
    
    <div class="protection-rule ${checks ? 'enabled' : ''}" id="rule-status">
      <div>
        <label class="checkbox-label" style="cursor: pointer;">
          <input type="checkbox" id="prot-status-checks" ${checks ? 'checked' : ''} />
          <span><strong>Require status checks to pass before merging</strong></span>
        </label>
        <p>Require all required status checks to pass before pull requests can be merged.</p>
        ${checks ? `
          <div class="rule-detail">
            <div class="rule-detail-item">✓ Require branches to be up to date before merging</div>
            ${checks.contexts?.length ? `
              <div style="margin-top: 8px;">
                <span style="font-size: 12px; color: var(--text-muted);">Required checks:</span>
                <div class="status-checks-list">
                  ${checks.contexts.map(c => `<span class="status-check-badge">${escHtml(c)}</span>`).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    </div>
    
    <div class="protection-rule ${linear ? 'enabled' : ''}">
      <div>
        <label class="checkbox-label" style="cursor: pointer;">
          <input type="checkbox" id="prot-linear-history" ${linear ? 'checked' : ''} />
          <span><strong>Require linear history</strong></span>
        </label>
        <p>Prevent force pushes and merges with merge commits to this branch.</p>
      </div>
    </div>
    
    <div class="protection-rule ${admins ? 'enabled' : ''}">
      <div>
        <label class="checkbox-label" style="cursor: pointer;">
          <input type="checkbox" id="prot-include-admins" ${admins ? 'checked' : ''} />
          <span><strong>Include administrators</strong></span>
        </label>
        <p>Apply the above rules to repository administrators.</p>
      </div>
    </div>
  `;
  
  // Update delete button visibility
  $('delete-protection-btn').style.display = enabled ? '' : 'none';
}

$('save-protection-btn').addEventListener('click', async () => {
  const branch = $('protection-branch').value;
  
  const rules = {
    required_status_checks: $('prot-status-checks').checked 
      ? { strict: true, contexts: currentProtectionData?.required_status_checks?.contexts || [] }
      : null,
    enforce_admins: $('prot-include-admins').checked,
    required_linear_history: $('prot-linear-history').checked,
    required_pull_request_reviews: $('prot-required-reviews').checked
      ? { required_approving_review_count: 1 }
      : null
  };
  
  try {
    // If no protection exists, create it; otherwise update
    const res = await gh(`/repos/${currentProtectionRepo}/branches/${branch}/protection`, {
      method: 'PUT',
      body: JSON.stringify(rules)
    });
    
    if (res.ok) {
      toast('Protection rules saved', 'success');
      closeModal('protection-modal');
    } else {
      const err = await res.json();
      toast(`Failed: ${err.message || 'Unknown error'}`, 'error');
    }
  } catch (e) {
    toast('Error saving protection rules', 'error');
  }
});

$('delete-protection-btn').addEventListener('click', async () => {
  if (!confirm(`Delete protection rules for "${currentProtectionBranch}"?\n\nThis branch will become unprotected.`)) return;
  
  try {
    const res = await gh(`/repos/${currentProtectionRepo}/branches/${currentProtectionBranch}/protection`, { 
      method: 'DELETE' 
    });
    
    if (res.ok || res.status === 204) {
      toast('Protection rules deleted', 'success');
      closeModal('protection-modal');
    } else {
      toast('Failed to delete protection rules', 'error');
    }
  } catch (e) {
    toast('Error deleting protection rules', 'error');
  }
});

// ── Webhook Management ──────────────────────────────────
async function showWebhooksModal(repoFullName) {
  $('webhooks-repo-name').textContent = repoFullName;
  $('webhooks-list').innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  showModal('webhooks-modal');
  
  try {
    const res = await gh(`/repos/${repoFullName}/hooks`);
    if (!res.ok) throw new Error('Failed to load webhooks');
    
    const hooks = await res.json();
    renderWebhooksList(hooks, repoFullName);
  } catch (e) {
    $('webhooks-list').innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

function renderWebhooksList(hooks, repoFullName) {
  if (hooks.length === 0) {
    $('webhooks-list').innerHTML = `
      <div class="webhook-empty">
        <p>No webhooks configured.</p>
        <p style="font-size: 13px; margin-top: 8px;">Click "Add Webhook" to create one.</p>
      </div>
    `;
    return;
  }
  
  $('webhooks-list').innerHTML = hooks.map(hook => `
    <div class="webhook-item">
      <div class="webhook-header">
        <span class="webhook-url">${escHtml(hook.url || '')}</span>
        ${hook.active 
          ? '<span class="badge badge-open">Active</span>' 
          : '<span class="badge badge-closed">Inactive</span>'}
      </div>
      <div class="webhook-events">
        ${hook.events.map(e => `<span class="badge">${escHtml(e)}</span>`).join('')}
      </div>
      <div class="webhook-actions">
        <button class="btn btn-sm btn-secondary" onclick="testWebhook('${escHtml(repoFullName)}', ${hook.id})">🧪 Test</button>
        <button class="btn btn-sm btn-danger" onclick="deleteWebhook('${escHtml(repoFullName)}', ${hook.id})">🗑️ Delete</button>
      </div>
    </div>
  `).join('');
  
  $('add-webhook-btn').dataset.repo = repoFullName;
}

async function testWebhook(repoFullName, hookId) {
  toast('Sending test payload...', 'info');
  
  try {
    const res = await gh(`/repos/${repoFullName}/hooks/${hookId}/tests`, { method: 'POST' });
    if (res.ok) {
      toast('Test payload sent!', 'success');
    } else {
      toast('Failed to send test payload', 'error');
    }
  } catch (e) {
    toast('Error testing webhook', 'error');
  }
}

async function deleteWebhook(repoFullName, hookId) {
  if (!confirm('Delete this webhook?\n\nThis action cannot be undone.')) return;
  
  try {
    const res = await gh(`/repos/${repoFullName}/hooks/${hookId}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      toast('Webhook deleted', 'success');
      showWebhooksModal(repoFullName);
    } else {
      toast('Failed to delete webhook', 'error');
    }
  } catch (e) {
    toast('Error deleting webhook', 'error');
  }
}

function showAddWebhookForm() {
  const repoFullName = $('add-webhook-btn').dataset.repo;
  
  $('webhook-form-title').textContent = '📡 Add Webhook';
  $('webhook-url').value = '';
  $('webhook-secret').value = '';
  $('webhook-content-type').value = 'application/json';
  
  qa('#webhook-form-modal input[type="checkbox"]').forEach(cb => {
    cb.checked = cb.value === 'push';
  });
  
  $('save-webhook-btn').dataset.repo = repoFullName;
  $('save-webhook-btn').dataset.hookId = '';
  
  closeModal('webhooks-modal');
  showModal('webhook-form-modal');
}

$('add-webhook-btn').addEventListener('click', showAddWebhookForm);

$('save-webhook-btn').addEventListener('click', async () => {
  const url = $('webhook-url').value.trim();
  const secret = $('webhook-secret').value.trim();
  const contentType = $('webhook-content-type').value;
  
  if (!url) {
    toast('Please enter a payload URL', 'error');
    return;
  }
  
  try {
    new URL(url);
  } catch {
    toast('Please enter a valid URL', 'error');
    return;
  }
  
  const events = [];
  qa('#webhook-form-modal input[type="checkbox"]:checked').forEach(cb => {
    events.push(cb.value);
  });
  
  if (events.length === 0) {
    toast('Please select at least one event', 'error');
    return;
  }
  
  const repoFullName = $('save-webhook-btn').dataset.repo;
  
  const hookData = {
    config: {
      url: url,
      content_type: contentType,
      secret: secret || undefined
    },
    events: events,
    active: true
  };
  
  try {
    const res = await gh(`/repos/${repoFullName}/hooks`, {
      method: 'POST',
      body: JSON.stringify(hookData)
    });
    
    if (res.ok) {
      toast('Webhook created successfully', 'success');
      closeModal('webhook-form-modal');
      showWebhooksModal(repoFullName);
    } else {
      const err = await res.json();
      toast(`Failed: ${err.message || 'Unknown error'}`, 'error');
    }
  } catch (e) {
    toast('Error creating webhook', 'error');
  }
});

// ── Create Pull Request ───────────────────────────────────
async function showNewPRModal(repoFullName) {
  $('new-pr-title').value = '';
  $('new-pr-body').value = '';
  $('new-pr-draft').checked = false;
  $('new-pr-auto-merge').checked = false;
  
  try {
    const [baseRes, headRes] = await Promise.all([
      gh(`/repos/${repoFullName}/branches`),
      gh(`/repos/${repoFullName}/branches`)
    ]);
    
    const branches = baseRes.ok ? await baseRes.json() : [];
    
    const options = branches.map(b => 
      `<option value="${escHtml(b.name)}">${escHtml(b.name)}</option>`
    ).join('');
    
    $('new-pr-base').innerHTML = options;
    $('new-pr-head').innerHTML = options;
    
    if (branches.length > 1) {
      $('new-pr-head').value = branches[1].name;
    }
    
    showModal('new-pr-modal');
    $('create-pr-btn').dataset.repo = repoFullName;
  } catch (e) {
    toast('Failed to load branches: ' + e.message, 'error');
  }
}

$('create-pr-btn').addEventListener('click', async () => {
  const repoFullName = $('create-pr-btn').dataset.repo;
  const title = $('new-pr-title').value.trim();
  const body = $('new-pr-body').value.trim();
  const base = $('new-pr-base').value;
  const head = $('new-pr-head').value;
  const draft = $('new-pr-draft').checked;
  const autoMerge = $('new-pr-auto-merge').checked;
  
  if (!title) { toast('Title is required', 'error'); return; }
  if (!base || !head) { toast('Please select branches', 'error'); return; }
  if (base === head) { toast('Base and head branches must be different', 'error'); return; }
  
  try {
    const res = await gh(`/repos/${repoFullName}/pulls`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        body,
        base,
        head,
        draft,
        maintainer_can_modify: true
      })
    });
    
    const pr = await res.json();
    
    if (!res.ok) throw new Error(pr.message || 'Failed to create PR');
    
    if (autoMerge && pr.html_url) {
      gh(`/repos/${repoFullName}/pulls/${pr.number}/merge`, {
        method: 'PUT',
        body: JSON.stringify({ merge_method: 'squash' })
      }).then(() => {});
    }
    
    toast(`PR #${pr.number} created${draft ? ' (draft)' : ''}`, 'success');
    closeModal('new-pr-modal');
    loadPulls(repoFullName, 'open');
  } catch (e) {
    toast(e.message, 'error');
  }
});

// =====================================================
// CATEGORY 5: ORGANIZATION FEATURES
// =====================================================

async function loadOrgs() {
  const container = $('org-info-content');
  container.innerHTML = loadingHTML();
  
  try {
    const res = await gh('/user/orgs');
    if (!res.ok) throw new Error('Failed to load organizations');
    const orgs = await res.json();
    
    if (orgs.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>You are not a member of any organizations.</p></div>';
      return;
    }
    
    // Store first org as current
    if (!state.currentOrg && orgs.length > 0) {
      state.currentOrg = orgs[0].login;
    }
    
    renderOrgSelector(orgs);
    await loadOrgInfo(state.currentOrg);
    
  } catch (e) {
    container.innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

function renderOrgSelector(orgs) {
  const selectorHtml = `
    <select id="org-select" style="max-width: 250px; margin-bottom: 20px;">
      ${orgs.map(o => `<option value="${o.login}" ${o.login === state.currentOrg ? 'selected' : ''}>${o.login}</option>`).join('')}
    </select>
  `;
  
  // Insert at beginning of container
  const container = $('org-info-card');
  if (container) {
    container.innerHTML = selectorHtml;
  }
  
  $('org-select')?.addEventListener('change', (e) => {
    state.currentOrg = e.target.value;
    loadOrgInfo(state.currentOrg);
  });
}

async function loadOrgInfo(orgLogin) {
  const infoCard = $('org-info-card');
  const infoContent = $('org-info-content');
  const membersContent = $('org-members-content');
  const teamsContent = $('org-teams-content');
  
  infoCard.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><span>Loading...</span></div>';
  
  try {
    const res = await gh(`/orgs/${orgLogin}`);
    if (!res.ok) throw new Error('Failed to load organization');
    const org = await res.json();
    
    infoCard.innerHTML = `
      <img src="${org.avatar_url}" class="org-avatar" alt="${org.login}" />
      <div class="org-info">
        <div class="org-name">${escHtml(org.name || org.login)}</div>
        <div class="org-desc">${escHtml(org.description || 'No description')}</div>
        <div class="org-stats">
          <span class="org-stat">👥 ${org.members_count || '--'} members</span>
          <span class="org-stat">📦 ${org.public_repos || 0} repos</span>
          ${org.location ? `<span class="org-stat">📍 ${escHtml(org.location)}</span>` : ''}
          ${org.blog ? `<span class="org-stat"><a href="${escHtml(org.blog)}" target="_blank">🌐 Website</a></span>` : ''}
        </div>
      </div>
    `;
    
    // Add tab switching
    qa('.org-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchOrgTab(btn.dataset.orgTab));
    });
    
  } catch (e) {
    infoCard.innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

function switchOrgTab(tabName) {
  qa('.org-tabs .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.orgTab === tabName);
  });
  
  qa('.org-tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  const contentId = `org-${tabName}-content`;
  const content = $(contentId);
  if (content) {
    content.classList.add('active');
    
    // Load data if needed
    if (tabName === 'members' && state.orgMembers.length === 0) {
      loadOrgMembers(state.currentOrg);
    } else if (tabName === 'teams' && state.orgTeams.length === 0) {
      loadOrgTeams(state.currentOrg);
    }
  }
}

async function loadOrgMembers(orgLogin) {
  const content = $('org-members-content');
  content.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><span>Loading members...</span></div>';
  
  try {
    const res = await gh(`/orgs/${orgLogin}/members?per_page=50`);
    if (!res.ok) throw new Error('Failed to load members');
    state.orgMembers = await res.json();
    
    renderOrgMembers();
  } catch (e) {
    content.innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

function renderOrgMembers() {
  const content = $('org-members-content');
  
  if (state.orgMembers.length === 0) {
    content.innerHTML = '<div class="empty-state"><p>No members found.</p></div>';
    return;
  }
  
  content.innerHTML = `
    <div class="members-list">
      ${state.orgMembers.map(m => `
        <div class="member-item">
          <img src="${m.avatar_url}" class="member-avatar" alt="${m.login}" />
          <div class="member-info">
            <a href="${m.html_url}" target="_blank" class="member-name">${m.login}</a>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

async function loadOrgTeams(orgLogin) {
  const content = $('org-teams-content');
  content.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><span>Loading teams...</span></div>';
  
  try {
    const res = await gh(`/orgs/${orgLogin}/teams?per_page=50`);
    if (!res.ok) throw new Error('Failed to load teams');
    state.orgTeams = await res.json();
    
    renderOrgTeams();
  } catch (e) {
    content.innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

function renderOrgTeams() {
  const content = $('org-teams-content');
  
  if (state.orgTeams.length === 0) {
    content.innerHTML = '<div class="empty-state"><p>No teams found.</p></div>';
    return;
  }
  
  content.innerHTML = `
    <div class="teams-list">
      ${state.orgTeams.map(t => `
        <div class="team-item">
          <div class="team-avatar" style="width:40px;height:40px;background:var(--bg-tertiary);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;">👥</div>
          <div class="team-info">
            <div class="team-name">${escHtml(t.name)}</div>
            <div class="team-desc">${escHtml(t.description || 'No description')}</div>
          </div>
          <span class="team-members-count">${t.members_count || 0} members</span>
        </div>
      `).join('')}
    </div>
  `;
}

// =====================================================
// CATEGORY 6: NOTIFICATIONS
// =====================================================

async function loadNotifications() {
  const container = $('notifications-list');
  container.innerHTML = loadingHTML();
  
  try {
    const res = await gh('/notifications?all=false&participating=false&per_page=50');
    if (!res.ok) throw new Error('Failed to load notifications');
    state.notifications = await res.json();
    
    updateApiRateFromResponse(res);
    renderNotifications();
  } catch (e) {
    container.innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

function renderNotifications() {
  const container = $('notifications-list');
  
  if (state.notifications.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No unread notifications.</p></div>';
    return;
  }
  
  container.innerHTML = state.notifications.map(n => {
    const typeIcon = n.subject?.type === 'Issue' ? '🐛' : 
                    n.subject?.type === 'PullRequest' ? '🔀' : 
                    n.subject?.type === 'Release' ? '🚀' : '📄';
    const repoName = n.repository?.full_name || '';
    const title = n.subject?.title || 'No title';
    const updatedAt = n.updated_at ? formatDate(n.updated_at) : '';
    
    return `
      <div class="notification-item ${n.unread ? 'unread' : ''}" onclick="markNotificationRead('${n.id}', '${n.repository_url}')">
        <div class="notification-icon">${typeIcon}</div>
        <div class="notification-content">
          <div class="notification-title">${escHtml(title)}</div>
          <div class="notification-repo">${escHtml(repoName)}</div>
          <div class="notification-time">${updatedAt}</div>
        </div>
      </div>
    `;
  }).join('');
  
  $('mark-all-read-btn').addEventListener('click', markAllNotificationsRead);
}

async function markNotificationRead(notificationId, repoUrl) {
  try {
    const res = await gh(`/repos/${repoUrl.replace('https://api.github.com/repos/', '')}/notifications`, {
      method: 'PATCH',
      body: JSON.stringify({ read: true })
    });
    
    if (res.ok) {
      state.notifications = state.notifications.filter(n => n.id !== notificationId);
      renderNotifications();
      toast('Notification marked as read', 'success');
    }
  } catch (e) {
    toast('Failed to mark notification as read', 'error');
  }
}

async function markAllNotificationsRead() {
  try {
    const res = await gh('/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ read: true })
    });
    
    if (res.ok) {
      state.notifications = [];
      renderNotifications();
      toast('All notifications marked as read', 'success');
    }
  } catch (e) {
    toast('Failed to mark notifications as read', 'error');
  }
}

// =====================================================
// CATEGORY 9: GITHUB ACTIONS
// =====================================================

function loadActionsRepoSelect() {
  populateGenericRepoSelect('actions-repo-select');
  $('actions-workflows-content').innerHTML = '<div class="empty-state"><p>Select a repository to view workflows.</p></div>';
  $('actions-runs-content').innerHTML = '<div class="empty-state"><p>Select a repository to view runs.</p></div>';
  
  $('actions-repo-select').addEventListener('change', (e) => {
    state.currentActionsRepo = e.target.value;
    if (state.currentActionsRepo) {
      loadWorkflows(state.currentActionsRepo);
      loadRuns(state.currentActionsRepo);
    }
  });
}

async function loadWorkflows(repoFullName) {
  const container = $('actions-workflows-content');
  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><span>Loading workflows...</span></div>';
  
  try {
    const res = await gh(`/repos/${repoFullName}/actions/workflows`);
    if (!res.ok) throw new Error('Failed to load workflows');
    const data = await res.json();
    state.workflows = data.workflows || [];
    
    renderWorkflows(repoFullName);
  } catch (e) {
    container.innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

function renderWorkflows(repoFullName) {
  const container = $('actions-workflows-content');
  
  if (state.workflows.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No workflows found. Create a .yml file in .github/workflows/</p></div>';
    return;
  }
  
  container.innerHTML = `
    <div class="workflow-list">
      ${state.workflows.map(w => `
        <div class="workflow-item">
          <div class="workflow-info">
            <div class="workflow-name">${escHtml(w.name)}</div>
            <div class="workflow-path">${escHtml(w.path)}</div>
          </div>
          <span class="badge badge-${w.state === 'active' ? 'open' : 'closed'}">${w.state}</span>
          <a href="${w.html_url}" target="_blank" class="btn btn-outline btn-sm">View</a>
        </div>
      `).join('')}
    </div>
  `;
}

async function loadRuns(repoFullName) {
  const container = $('actions-runs-content');
  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><span>Loading runs...</span></div>';
  
  try {
    const res = await gh(`/repos/${repoFullName}/actions/runs?per_page=20`);
    if (!res.ok) throw new Error('Failed to load runs');
    const data = await res.json();
    state.runs = data.workflow_runs || [];
    
    renderRuns(repoFullName);
  } catch (e) {
    container.innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

function renderRuns(repoFullName) {
  const container = $('actions-runs-content');
  
  if (state.runs.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No workflow runs found.</p></div>';
    return;
  }
  
  container.innerHTML = `
    <div class="runs-list">
      ${state.runs.map(r => `
        <div class="run-item">
          <div class="run-name">${escHtml(r.name || r.workflow_id?.toString() || 'Workflow')}</div>
          <span class="run-status ${r.conclusion || r.status}">${r.conclusion || r.status}</span>
          <div class="run-meta">
            <span>${r.head_branch}</span>
            <span>${formatDate(r.created_at)}</span>
          </div>
          <button class="btn btn-sm btn-secondary" onclick="rerunWorkflow('${repoFullName}', ${r.id})">↻ Re-run</button>
          <a href="${r.html_url}" target="_blank" class="btn btn-sm btn-outline">View</a>
        </div>
      `).join('')}
    </div>
  `;
  
  // Add tab switching
  qa('.actions-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchActionsTab(btn.dataset.actionsTab));
  });
}

function switchActionsTab(tabName) {
  qa('.actions-tabs .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.actionsTab === tabName);
  });
  
  qa('.tab-content').forEach(content => {
    if (content.id.startsWith('actions-')) {
      content.classList.remove('active');
    }
  });
  
  const content = $(`actions-${tabName}-content`);
  if (content) content.classList.add('active');
}

async function rerunWorkflow(repoFullName, runId) {
  toast('Re-running workflow...', 'info');
  
  try {
    const res = await gh(`/repos/${repoFullName}/actions/runs/${runId}/rerun`, { method: 'POST' });
    if (res.ok || res.status === 201) {
      toast('Workflow re-run started', 'success');
      loadRuns(repoFullName);
    } else {
      toast('Failed to re-run workflow', 'error');
    }
  } catch (e) {
    toast('Error re-running workflow', 'error');
  }
}

// =====================================================
// CATEGORY 11: LABELS
// =====================================================

function loadLabelsRepoSelect() {
  populateGenericRepoSelect('labels-repo-select');
  $('labels-list').innerHTML = '<div class="empty-state"><p>Select a repository to view labels.</p></div>';
  
  $('labels-repo-select').addEventListener('change', (e) => {
    state.currentLabelsRepo = e.target.value;
    if (state.currentLabelsRepo) {
      loadLabels(state.currentLabelsRepo);
    }
  });
}

async function loadLabels(repoFullName) {
  const container = $('labels-list');
  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><span>Loading labels...</span></div>';
  
  try {
    const res = await gh(`/repos/${repoFullName}/labels`);
    if (!res.ok) throw new Error('Failed to load labels');
    state.labels = await res.json();
    
    renderLabels(repoFullName);
  } catch (e) {
    container.innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

function renderLabels(repoFullName) {
  const container = $('labels-list');
  
  if (state.labels.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No labels found. Click "New Label" to create one.</p></div>';
    return;
  }
  
  container.innerHTML = `
    <div class="labels-list">
      ${state.labels.map(l => `
        <div class="label-item">
          <div class="label-color" style="background: #${l.color}"></div>
          <div class="label-name">${escHtml(l.name)}</div>
          <div class="label-desc">${escHtml(l.description || '')}</div>
          <div class="label-actions">
            <button class="btn btn-sm btn-outline" onclick="editLabel('${repoFullName}', '${escHtml(l.name)}', '${l.color}', '${escHtml(l.description || '')}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteLabel('${repoFullName}', '${escHtml(l.name)}')">Delete</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  $('new-label-btn').addEventListener('click', () => showCreateLabelForm(repoFullName));
}

function showCreateLabelForm(repoFullName) {
  $('confirm-title').textContent = 'Create New Label';
  $('confirm-message').innerHTML = `
    <div class="form-group">
      <label>Label Name</label>
      <input type="text" id="label-name-input" placeholder="bug" />
    </div>
    <div class="form-group">
      <label>Color</label>
      <input type="color" id="label-color-input" value="d73a49" />
    </div>
    <div class="form-group">
      <label>Description</label>
      <input type="text" id="label-desc-input" placeholder="Bug fix" />
    </div>
  `;
  $('confirm-input-group').style.display = 'none';
  showModal('confirm-modal');
  
  state.confirmCallback = async () => {
    const name = $('label-name-input').value.trim();
    const color = $('label-color-input').value.replace('#', '');
    const description = $('label-desc-input').value.trim();
    
    if (!name) { toast('Label name required', 'error'); return; }
    
    try {
      const res = await gh(`/repos/${repoFullName}/labels`, {
        method: 'POST',
        body: JSON.stringify({ name, color, description })
      });
      
      if (res.ok) {
        toast('Label created', 'success');
        loadLabels(repoFullName);
      } else {
        const err = await res.json();
        toast(err.message || 'Failed to create label', 'error');
      }
    } catch (e) {
      toast('Error creating label', 'error');
    }
  };
}

function editLabel(repoFullName, name, color, description) {
  $('confirm-title').textContent = 'Edit Label';
  $('confirm-message').innerHTML = `
    <div class="form-group">
      <label>Label Name</label>
      <input type="text" id="label-name-input" value="${escHtml(name)}" />
    </div>
    <div class="form-group">
      <label>Color</label>
      <input type="color" id="label-color-input" value="#${color}" />
    </div>
    <div class="form-group">
      <label>Description</label>
      <input type="text" id="label-desc-input" value="${escHtml(description)}" />
    </div>
  `;
  $('confirm-input-group').style.display = 'none';
  showModal('confirm-modal');
  
  state.confirmCallback = async () => {
    const newName = $('label-name-input').value.trim();
    const newColor = $('label-color-input').value.replace('#', '');
    const newDescription = $('label-desc-input').value.trim();
    
    try {
      const res = await gh(`/repos/${repoFullName}/labels/${encodeURIComponent(name)}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: newName, color: newColor, description: newDescription })
      });
      
      if (res.ok) {
        toast('Label updated', 'success');
        loadLabels(repoFullName);
      } else {
        const err = await res.json();
        toast(err.message || 'Failed to update label', 'error');
      }
    } catch (e) {
      toast('Error updating label', 'error');
    }
  };
}

async function deleteLabel(repoFullName, name) {
  if (!confirm(`Delete label "${name}"?`)) return;
  
  try {
    const res = await gh(`/repos/${repoFullName}/labels/${encodeURIComponent(name)}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      toast('Label deleted', 'success');
      loadLabels(repoFullName);
    } else {
      toast('Failed to delete label', 'error');
    }
  } catch (e) {
    toast('Error deleting label', 'error');
  }
}

// =====================================================
// CATEGORY 11: MILESTONES
// =====================================================

function loadMilestonesRepoSelect() {
  populateGenericRepoSelect('milestones-repo-select');
  $('milestones-list').innerHTML = '<div class="empty-state"><p>Select a repository to view milestones.</p></div>';
  
  $('milestones-repo-select').addEventListener('change', (e) => {
    state.currentMilestonesRepo = e.target.value;
    if (state.currentMilestonesRepo) {
      loadMilestones(state.currentMilestonesRepo);
    }
  });
}

async function loadMilestones(repoFullName) {
  const container = $('milestones-list');
  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><span>Loading milestones...</span></div>';
  
  try {
    const res = await gh(`/repos/${repoFullName}/milestones?state=all&per_page=50`);
    if (!res.ok) throw new Error('Failed to load milestones');
    state.milestones = await res.json();
    
    renderMilestones(repoFullName);
  } catch (e) {
    container.innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

function renderMilestones(repoFullName) {
  const container = $('milestones-list');
  
  if (state.milestones.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No milestones found. Click "New Milestone" to create one.</p></div>';
    return;
  }
  
  container.innerHTML = `
    <div class="milestones-list">
      ${state.milestones.map(m => {
        const progress = m.open_issues + m.closed_issues > 0 
          ? Math.round((m.closed_issues / (m.open_issues + m.closed_issues)) * 100) 
          : 0;
        
        return `
          <div class="milestone-item ${m.state === 'closed' ? 'closed' : ''}">
            <div class="milestone-title">${escHtml(m.title)}</div>
            <div class="milestone-progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
              </div>
              <div class="milestone-stats">${m.closed_issues} / ${m.open_issues + m.closed_issues} closed</div>
            </div>
            <span class="badge badge-${m.state === 'open' ? 'open' : 'closed'}">${m.state}</span>
            <div class="milestone-actions">
              <button class="btn btn-sm btn-secondary" onclick="editMilestone('${repoFullName}', ${m.number}, '${escHtml(m.title)}', '${m.state}')">Edit</button>
              ${m.state === 'open' 
                ? `<button class="btn btn-sm btn-primary" onclick="closeMilestone('${repoFullName}', ${m.number})">Close</button>`
                : `<button class="btn btn-sm btn-secondary" onclick="reopenMilestone('${repoFullName}', ${m.number})">Reopen</button>`
              }
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  
  $('new-milestone-btn').addEventListener('click', () => showCreateMilestoneForm(repoFullName));
}

function showCreateMilestoneForm(repoFullName) {
  $('confirm-title').textContent = 'Create New Milestone';
  $('confirm-message').innerHTML = `
    <div class="form-group">
      <label>Title</label>
      <input type="text" id="milestone-title-input" placeholder="v1.0.0" />
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="milestone-desc-input" placeholder="Release milestone"></textarea>
    </div>
    <div class="form-group">
      <label>Due Date (optional)</label>
      <input type="date" id="milestone-due-input" />
    </div>
  `;
  $('confirm-input-group').style.display = 'none';
  showModal('confirm-modal');
  
  state.confirmCallback = async () => {
    const title = $('milestone-title-input').value.trim();
    const description = $('milestone-desc-input').value.trim();
    const dueOn = $('milestone-due-input').value || null;
    
    if (!title) { toast('Title required', 'error'); return; }
    
    try {
      const res = await gh(`/repos/${repoFullName}/milestones`, {
        method: 'POST',
        body: JSON.stringify({ title, description, due_on: dueOn })
      });
      
      if (res.ok) {
        toast('Milestone created', 'success');
        loadMilestones(repoFullName);
      } else {
        const err = await res.json();
        toast(err.message || 'Failed to create milestone', 'error');
      }
    } catch (e) {
      toast('Error creating milestone', 'error');
    }
  };
}

function editMilestone(repoFullName, number, title, state) {
  $('confirm-title').textContent = 'Edit Milestone';
  $('confirm-message').innerHTML = `
    <div class="form-group">
      <label>Title</label>
      <input type="text" id="milestone-title-input" value="${escHtml(title)}" />
    </div>
  `;
  $('confirm-input-group').style.display = 'none';
  showModal('confirm-modal');
  
  state.confirmCallback = async () => {
    const newTitle = $('milestone-title-input').value.trim();
    
    try {
      const res = await gh(`/repos/${repoFullName}/milestones/${number}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: newTitle })
      });
      
      if (res.ok) {
        toast('Milestone updated', 'success');
        loadMilestones(repoFullName);
      } else {
        const err = await res.json();
        toast(err.message || 'Failed to update milestone', 'error');
      }
    } catch (e) {
      toast('Error updating milestone', 'error');
    }
  };
}

async function closeMilestone(repoFullName, number) {
  try {
    const res = await gh(`/repos/${repoFullName}/milestones/${number}`, {
      method: 'PATCH',
      body: JSON.stringify({ state: 'closed' })
    });
    
    if (res.ok) {
      toast('Milestone closed', 'success');
      loadMilestones(repoFullName);
    } else {
      toast('Failed to close milestone', 'error');
    }
  } catch (e) {
    toast('Error closing milestone', 'error');
  }
}

async function reopenMilestone(repoFullName, number) {
  try {
    const res = await gh(`/repos/${repoFullName}/milestones/${number}`, {
      method: 'PATCH',
      body: JSON.stringify({ state: 'open' })
    });
    
    if (res.ok) {
      toast('Milestone reopened', 'success');
      loadMilestones(repoFullName);
    } else {
      toast('Failed to reopen milestone', 'error');
    }
  } catch (e) {
    toast('Error reopening milestone', 'error');
  }
}

// =====================================================
// CATEGORY 10: PACKAGES
// =====================================================

async function loadPackages() {
  const container = $('packages-list');
  container.innerHTML = loadingHTML();
  
  try {
    // Try user packages first
    let packages = [];
    let res = await gh('/user/packages?per_page=50');
    
    if (res.ok) {
      packages = await res.json();
      updateApiRateFromResponse(res);
    } else if (res.status === 404) {
      // Try orgs
      const orgsRes = await gh('/user/orgs');
      if (orgsRes.ok) {
        const orgs = await orgsRes.json();
        for (const org of orgs) {
          const orgRes = await gh(`/orgs/${org.login}/packages?per_page=50`);
          if (orgRes.ok) {
            const orgPackages = await orgRes.json();
            packages = packages.concat(orgPackages);
          }
        }
      }
    }
    
    renderPackages(packages);
  } catch (e) {
    container.innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

function renderPackages(packages) {
  const container = $('packages-list');
  
  if (packages.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No packages found.</p></div>';
    return;
  }
  
  container.innerHTML = packages.map(p => `
    <div class="package-card">
      <span class="package-type">${escHtml(p.package_type)}</span>
      <div class="package-name">${escHtml(p.name)}</div>
      <div class="package-desc">${escHtml(p.description || 'No description')}</div>
      <div class="package-stats">
        <span>⬇️ ${p.downloads || 0} downloads</span>
        <span>📅 Updated ${formatDate(p.updated_at)}</span>
      </div>
    </div>
  `).join('');
}

// =====================================================
// CATEGORY 15: SETTINGS
// =====================================================

async function loadSettings() {
  // Load saved settings
  state.bookmarks = JSON.parse(localStorage.getItem('gh_bookmarks') || '[]');
  state.slackWebhook = localStorage.getItem('gh_slack_webhook') || '';
  state.keyboardShortcutsEnabled = localStorage.getItem('gh_keyboard_shortcuts') !== 'false';
  state.autoTheme = localStorage.getItem('gh_auto_theme') === 'true';
  
  // Populate form
  $('keyboard-shortcuts-enabled').checked = state.keyboardShortcutsEnabled;
  $('auto-theme').checked = state.autoTheme;
  $('slack-webhook').value = state.slackWebhook;
  
  // Render bookmarks
  renderBookmarks();
  
  // Setup event listeners
  $('keyboard-shortcuts-enabled').addEventListener('change', (e) => {
    state.keyboardShortcutsEnabled = e.target.checked;
    localStorage.setItem('gh_keyboard_shortcuts', e.target.checked);
  });
  
  $('auto-theme').addEventListener('change', (e) => {
    state.autoTheme = e.target.checked;
    localStorage.setItem('gh_auto_theme', e.target.checked);
    if (e.target.checked) {
      applyAutoTheme();
    }
  });
  
  $('save-slack-btn').addEventListener('click', () => {
    const webhook = $('slack-webhook').value.trim();
    localStorage.setItem('gh_slack_webhook', webhook);
    state.slackWebhook = webhook;
    toast('Slack webhook saved', 'success');
  });
  
  $('backup-data-btn').addEventListener('click', backupData);
  $('export-data-btn').addEventListener('click', exportData);
  
  // Apply auto theme if enabled
  if (state.autoTheme) {
    applyAutoTheme();
  }
}

function applyAutoTheme() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
  
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (state.autoTheme) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
}

function renderBookmarks() {
  const container = $('bookmarks-list');
  
  if (state.bookmarks.length === 0) {
    container.innerHTML = '<div class="empty-bookmarks">No bookmarks yet. Star repos for quick access.</div>';
    return;
  }
  
  container.innerHTML = state.bookmarks.map(b => `
    <div class="bookmark-item">
      <span class="bookmark-name" onclick="navigateTo('repos')">${escHtml(b)}</span>
      <button class="bookmark-remove" onclick="removeBookmark('${escHtml(b)}')">×</button>
    </div>
  `).join('');
}

function addBookmark(repoFullName) {
  if (!state.bookmarks.includes(repoFullName)) {
    state.bookmarks.push(repoFullName);
    localStorage.setItem('gh_bookmarks', JSON.stringify(state.bookmarks));
    toast('Bookmark added', 'success');
    renderBookmarks();
  }
}

function removeBookmark(repoFullName) {
  state.bookmarks = state.bookmarks.filter(b => b !== repoFullName);
  localStorage.setItem('gh_bookmarks', JSON.stringify(state.bookmarks));
  toast('Bookmark removed', 'success');
  renderBookmarks();
}

function toggleFavorite(repoFullName) {
  if (state.bookmarks.includes(repoFullName)) {
    removeBookmark(repoFullName);
  } else {
    addBookmark(repoFullName);
  }
}

function backupData() {
  const data = {
    repos: state.repos,
    user: state.user,
    bookmarks: state.bookmarks,
    exportDate: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `github-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  toast('Backup downloaded', 'success');
}

function exportData() {
  const data = {
    repos: state.repos.map(r => ({
      name: r.name,
      full_name: r.full_name,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      private: r.private,
      created: r.created_at,
      updated: r.updated_at,
      url: r.html_url
    })),
    exportDate: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `github-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  toast('Data exported', 'success');
}

// =====================================================
// CATEGORY 13: DEVELOPER EXPERIENCE
// =====================================================

function updateApiRateFromResponse(res) {
  const limit = res.headers.get('X-RateLimit-Limit');
  const remaining = res.headers.get('X-RateLimit-Remaining');
  const reset = res.headers.get('X-RateLimit-Reset');
  
  if (limit && remaining) {
    state.apiRateLimit = {
      limit: parseInt(limit),
      remaining: parseInt(remaining),
      reset: reset ? new Date(reset * 1000) : null
    };
    
    updateApiRateDisplay();
  }
}

function updateApiRateDisplay() {
  const { limit, remaining } = state.apiRateLimit;
  const el = $('api-rate-info');
  
  if (el) {
    el.textContent = `API: ${remaining}/${limit}`;
    
    // Color code based on remaining
    el.classList.remove('warning', 'danger');
    if (remaining < 100) {
      el.classList.add('danger');
    } else if (remaining < 500) {
      el.classList.add('warning');
    }
  }
}

async function checkRateLimit() {
  try {
    const res = await gh('/rate_limit');
    if (res.ok) {
      const data = await res.json();
      state.apiRateLimit = {
        limit: data.rate.limit,
        remaining: data.rate.remaining,
        reset: new Date(data.rate.reset * 1000)
      };
      updateApiRateDisplay();
    }
  } catch (e) {
    console.error('Failed to check rate limit', e);
  }
}

// =====================================================
// CATEGORY 12: KEYBOARD SHORTCUTS & COMMAND PALETTE
// =====================================================

function initKeyboardShortcuts() {
  document.addEventListener('keydown', handleKeyboardShortcuts);
}

function handleKeyboardShortcuts(e) {
  if (!state.keyboardShortcutsEnabled) return;
  
  // Ctrl+K - Command Palette
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    openCommandPalette();
  }
  
  // / - Focus search
  if (e.key === '/' && !e.ctrlKey && !e.metaKey && 
      !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    e.preventDefault();
    $('repo-search')?.focus();
  }
  
  // n - New repo
  if (e.key === 'n' && !e.ctrlKey && !e.metaKey && 
      !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    e.preventDefault();
    if (state.currentSection === 'repos') {
      showModal('new-repo-modal');
    }
  }
  
  // Escape - Close command palette
  if (e.key === 'Escape') {
    const palette = $('command-palette');
    if (palette && !palette.classList.contains('hidden')) {
      closeModal('command-palette');
    }
  }
}

function openCommandPalette() {
  $('command-input').value = '';
  $('command-results').innerHTML = '';
  showModal('command-palette');
  $('command-input').focus();
  
  $('command-input').addEventListener('input', renderCommandResults);
}

function renderCommandResults() {
  const query = $('command-input').value.toLowerCase();
  const results = $('command-results');
  
  const commands = [
    { title: 'Go to Repositories', desc: 'View all repositories', section: 'repos' },
    { title: 'Go to Dashboard', desc: 'View activity dashboard', section: 'dashboard' },
    { title: 'Go to Issues', desc: 'View issues', section: 'issues' },
    { title: 'Go to Pull Requests', desc: 'View pull requests', section: 'pulls' },
    { title: 'Go to Organization', desc: 'View organization', section: 'orgs' },
    { title: 'Go to Actions', desc: 'View GitHub Actions', section: 'actions' },
    { title: 'Go to Labels', desc: 'Manage labels', section: 'labels' },
    { title: 'Go to Milestones', desc: 'Manage milestones', section: 'milestones' },
    { title: 'Go to Packages', desc: 'View packages', section: 'packages' },
    { title: 'Go to Settings', desc: 'App settings', section: 'settings' },
    { title: 'Create Repository', desc: 'Create new repository', action: 'new-repo' },
    { title: 'Toggle Theme', desc: 'Switch dark/light theme', action: 'toggle-theme' },
    { title: 'Export Data', desc: 'Export repository data', action: 'export' }
  ];
  
  const filtered = commands.filter(c => 
    c.title.toLowerCase().includes(query) || 
    c.desc.toLowerCase().includes(query)
  );
  
  results.innerHTML = filtered.map(c => `
    <div class="command-item" onclick="executeCommand('${c.section || ''}', '${c.action || ''}')">
      <div class="command-item-title">${c.title}</div>
      <div class="command-item-desc">${c.desc}</div>
    </div>
  `).join('');
}

function executeCommand(section, action) {
  closeModal('command-palette');
  
  if (section) {
    navigateTo(section);
  } else if (action === 'new-repo') {
    showModal('new-repo-modal');
  } else if (action === 'toggle-theme') {
    toggleTheme();
  } else if (action === 'export') {
    exportData();
  }
}

// Helper for generic repo select
function populateGenericRepoSelect(selectId) {
  const select = $(selectId);
  if (!select) return;
  
  const options = `<option value="">Select a repository...</option>` +
    state.repos.map(r => `<option value="${escHtml(r.full_name)}">${escHtml(r.full_name)}</option>`).join('');
  
  select.innerHTML = options;
}

// =====================================================
// INITIALIZATION
// =====================================================

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  // Theme
  const savedTheme = localStorage.getItem('gh_theme') || 'dark';
  applyTheme(savedTheme);
  
  // Auto theme check
  if (localStorage.getItem('gh_auto_theme') === 'true') {
    applyAutoTheme();
  }
  
  // Keyboard shortcuts
  initKeyboardShortcuts();
  
  // Check rate limit
  checkRateLimit();
});
