# Enhanced Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current single-view Dashboard with a tab-based Enhanced Dashboard providing insights into repository health, contributions, activity trends, and security alerts.

**Architecture:** Tab-based SPA with lazy-loading per tab, parallel API fetching for initial data, and client-side caching to minimize API calls.

**Tech Stack:** Vanilla JavaScript, HTML5, CSS3, GitHub REST API v3

---

## File Structure

| File | Changes |
|------|---------|
| `index.html` | Add tab navigation bar, new section containers for each tab |
| `style.css` | Add tab styles, health metrics, contributors, alerts CSS |
| `app.js` | Add tab switching logic, new state variables, data fetch functions |

---

## Task 1: Add Tab Navigation to HTML

**Files:**
- Modify: `/home/ptelgm/Documents/github-manager/index.html`

- [ ] **Step 1: Read current dashboard section HTML**

```html
<!-- Current (lines ~105-110) -->
<section id="dashboard-section" class="content-section hidden">
  <div class="section-header">
    <h2>📊 Dashboard</h2>
  </div>
  <div id="dashboard-content"></div>
</section>
```

- [ ] **Step 2: Replace dashboard section with tabbed structure**

```html
<section id="dashboard-section" class="content-section hidden">
  <div class="section-header">
    <h2>📊 Dashboard</h2>
    <button id="dashboard-refresh-btn" class="btn btn-secondary btn-sm" title="Refresh Data">
      <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
        <path d="M8 3a5 5 0 104.546 2.914.5.5 0 01.908-.418A6 6 0 118 2v1z"/>
        <path d="M8 4.466V.534a.25.25 0 01.41-.192l2.36 1.966a.25.25 0 010 .384L8.41 4.658A.25.25 0 018 4.466z"/>
      </svg>
      Refresh
    </button>
  </div>
  
  <!-- Tab Navigation -->
  <div class="dashboard-tabs">
    <button class="tab-btn active" data-tab="overview">Overview</button>
    <button class="tab-btn" data-tab="health">Health</button>
    <button class="tab-btn" data-tab="contributors">Contributors</button>
    <button class="tab-btn" data-tab="trends">Trends</button>
    <button class="tab-btn" data-tab="alerts">Alerts</button>
  </div>
  
  <!-- Tab Contents -->
  <div id="dashboard-content" class="tab-content active" data-content="overview"></div>
  <div id="health-content" class="tab-content" data-content="health"></div>
  <div id="contributors-content" class="tab-content" data-content="contributors"></div>
  <div id="trends-content" class="tab-content" data-content="trends"></div>
  <div id="alerts-content" class="tab-content" data-content="alerts"></div>
</section>
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(dashboard): add tab navigation structure"
```

---

## Task 2: Add Tab Navigation CSS

**Files:**
- Modify: `/home/ptelgm/Documents/github-manager/style.css`

- [ ] **Step 1: Read end of style.css to find insertion point**

- [ ] **Step 2: Add tab navigation styles before closing brace**

```css
/* === Dashboard Tabs === */
.dashboard-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 24px;
  overflow-x: auto;
  scrollbar-width: none;
}

.dashboard-tabs::-webkit-scrollbar {
  display: none;
}

.tab-btn {
  padding: 12px 20px;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  position: relative;
  transition: color var(--transition);
  font-size: 14px;
  font-weight: 500;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--accent-blue-hover);
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent-blue);
  border-radius: 2px 2px 0 0;
}

/* Tab Content */
.tab-content {
  display: none;
}

.tab-content.active {
  display: block;
}

/* Section Header Enhancement */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.section-header .btn-sm {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
```

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "feat(dashboard): add tab navigation styles"
```

---

## Task 3: Add Dashboard State and Tab Logic to app.js

**Files:**
- Modify: `/home/ptelgm/Documents/github-manager/app.js`

- [ ] **Step 1: Read state object (lines ~13-25)**

```javascript
let state = {
  pat: null,
  user: null,
  repos: [],
  currentSection: 'repos',
  issueFilter: 'open',
  pullFilter: 'open',
  confirmCallback: null,
  repoSort: 'updated',
  repoLangFilter: '',
  repoVisFilter: '',
  theme: 'dark'
};
```

- [ ] **Step 2: Add dashboard state to state object**

```javascript
let state = {
  pat: null,
  user: null,
  repos: [],
  currentSection: 'repos',
  issueFilter: 'open',
  pullFilter: 'open',
  confirmCallback: null,
  repoSort: 'updated',
  repoLangFilter: '',
  repoVisFilter: '',
  theme: 'dark',
  
  // Dashboard state
  dashboardTab: 'overview',
  dashboardRefreshKey: 0,
  healthData: null,
  contributorsData: null,
  trendsData: null,
  alertsData: null
};
```

- [ ] **Step 3: Add tab switching function after navigateTo (around line 201)**

```javascript
// ── Dashboard Tab Navigation ──────────────────────────────
function switchDashboardTab(tabName) {
  state.dashboardTab = tabName;
  
  // Update tab buttons
  qa('.dashboard-tabs .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // Update tab content
  qa('.tab-content').forEach(content => {
    content.classList.toggle('active', content.dataset.content === tabName);
  });
  
  // Load tab data lazily
  switch(tabName) {
    case 'overview':
      // Already loaded
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
```

- [ ] **Step 4: Add refresh button event listener in DOMContentLoaded (around line 873)**

Find the DOMContentLoaded event listener and add this after the mobile header setup:

```javascript
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
```

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat(dashboard): add tab switching logic and state"
```

---

## Task 4: Implement Overview Tab Enhancement

**Files:**
- Modify: `/home/ptelgm/Documents/github-manager/app.js`

- [ ] **Step 1: Read loadDashboard function (lines ~214-331)**

- [ ] **Step 2: Modify loadDashboard to add refresh button functionality**

Update the function to use `state.dashboardRefreshKey`:

```javascript
async function loadDashboard() {
  const container = $('dashboard-content');
  container.innerHTML = loadingHTML();
  
  // Use refresh key to force reload if needed
  const cacheKey = `dashboard_${state.user.login}_${state.dashboardRefreshKey}`;
  
  try {
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
    
    // ... rest of function stays the same (lines 234-327)
```

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat(dashboard): enhance overview tab with refresh"
```

---

## Task 5: Implement Health Tab - Basic Structure

**Files:**
- Modify: `/home/ptelgm/Documents/github-manager/app.js`
- Modify: `/home/ptelgm/Documents/github-manager/style.css`

- [ ] **Step 1: Add Health tab HTML before closing of dashboard-section**

```html
<!-- Add to index.html, inside dashboard-section, after dashboard-tabs -->
<div id="health-content" class="tab-content" data-content="health">
  <div class="health-controls">
    <select id="health-repo-select" class="repo-select">
      <option value="">Select a repository...</option>
    </select>
  </div>
  <div id="health-metrics" class="health-grid"></div>
</div>
```

- [ ] **Step 2: Add Health CSS styles**

```css
/* === Health Tab === */
.health-controls {
  margin-bottom: 20px;
}

.health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.metric-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  transition: border-color var(--transition), transform var(--transition);
}

.metric-card:hover {
  border-color: var(--accent-blue);
  transform: translateY(-2px);
}

.metric-value {
  font-size: 36px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
  margin-bottom: 8px;
}

.metric-label {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.metric-detail {
  font-size: 12px;
  color: var(--text-secondary);
}

/* Commit Chart */
.commit-chart {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 60px;
  padding: 8px 0;
}

.commit-week {
  flex: 1;
  background: var(--accent);
  border-radius: 2px;
  min-height: 4px;
  transition: height 0.3s ease, background 0.2s ease;
}

.commit-week:hover {
  background: var(--accent-hover);
}

.commit-chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60px;
  color: var(--text-muted);
  font-size: 13px;
}
```

- [ ] **Step 3: Add Health tab data functions to app.js**

```javascript
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
```

- [ ] **Step 4: Update loadDashboard to call loadHealthData**

Modify the navigateTo switch case for dashboard:
```javascript
case 'dashboard': loadDashboard(); break;
case 'repos': loadRepos(); break;
```

Becomes:
```javascript
case 'dashboard': 
  loadDashboard(); 
  if (!state.healthData) loadHealthData();
  break;
case 'repos': loadRepos(); break;
```

- [ ] **Step 5: Commit**

```bash
git add app.js style.css index.html
git commit -m "feat(dashboard): implement health tab with metrics"
```

---

## Task 6: Implement Contributors Tab

**Files:**
- Modify: `/home/ptelgm/Documents/github-manager/app.js`
- Modify: `/home/ptelgm/Documents/github-manager/style.css`

- [ ] **Step 1: Add Contributors CSS styles**

```css
/* === Contributors Tab === */
.contributors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.contributor-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  display: flex;
  gap: 16px;
  transition: border-color var(--transition);
}

.contributor-card:hover {
  border-color: var(--accent-blue);
}

.contributor-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid var(--border);
  flex-shrink: 0;
}

.contributor-info {
  flex: 1;
  min-width: 0;
}

.contributor-name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: var(--accent-blue-hover);
  margin-bottom: 4px;
}

.contributor-name:hover {
  text-decoration: underline;
}

.contributor-name[target] {
  text-decoration: none;
}

.contributor-meta {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.contributor-bar-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.contributor-bar {
  flex: 1;
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.contributor-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-blue), var(--accent-blue-hover));
  border-radius: 4px;
  transition: width 0.5s ease;
}

.contributor-percent {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  min-width: 40px;
  text-align: right;
}
```

- [ ] **Step 2: Add Contributors tab content HTML**

```html
<div id="contributors-content" class="tab-content" data-content="contributors">
  <div class="contributors-controls">
    <select id="contributors-repo-select" class="repo-select">
      <option value="">Select a repository...</option>
    </select>
  </div>
  <div id="contributors-list" class="contributors-grid"></div>
</div>
```

- [ ] **Step 3: Add Contributors functions to app.js**

```javascript
// ── Contributors Tab ─────────────────────────────────────
async function loadContributorsData() {
  const container = $('contributors-content');
  container.innerHTML = `
    <div class="contributors-controls">
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
```

- [ ] **Step 4: Update navigateTo for contributors tab**

Add to the switch statement:
```javascript
case 'dashboard': 
  loadDashboard(); 
  if (!state.healthData) loadHealthData();
  if (!state.contributorsData) loadContributorsData();
  break;
```

- [ ] **Step 5: Commit**

```bash
git add app.js style.css index.html
git commit -m "feat(dashboard): implement contributors tab"
```

---

## Task 7: Implement Trends Tab

**Files:**
- Modify: `/home/ptelgm/Documents/github-manager/app.js`
- Modify: `/home/ptelgm/Documents/github-manager/style.css`

- [ ] **Step 1: Add Trends CSS styles**

```css
/* === Trends Tab === */
.trends-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.trends-controls select {
  min-width: 140px;
}

.trends-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.trend-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  transition: border-color var(--transition), transform var(--transition);
}

.trend-card:hover {
  border-color: var(--accent-blue);
  transform: translateY(-2px);
}

.trend-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 12px;
}

.trend-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--accent-blue-hover);
  word-break: break-word;
}

.trend-name:hover {
  text-decoration: underline;
}

.trend-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 12px;
}

.trend-stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.trend-stat-icon {
  font-size: 14px;
}

.trend-change {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.trend-change.positive {
  background: rgba(35, 134, 54, 0.15);
  color: #3fb950;
}

.trend-change.negative {
  background: rgba(218, 54, 51, 0.15);
  color: #f85149;
}

.trend-description {
  font-size: 13px;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

- [ ] **Step 2: Add Trends tab HTML**

```html
<div id="trends-content" class="tab-content" data-content="trends">
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
  <div id="trends-list" class="trends-grid"></div>
</div>
```

- [ ] **Step 3: Add Trends functions to app.js**

```javascript
// ── Trends Tab ───────────────────────────────────────────
async function loadTrendsData() {
  const container = $('trends-content');
  
  // Initialize with basic structure
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
  
  // Add event listeners
  $('trends-sort').addEventListener('change', renderTrends);
  $('trends-visibility').addEventListener('change', renderTrends);
  
  // Load data
  await loadTrendsDataFromAPI();
  
  state.trendsData = { loaded: true };
}

async function loadTrendsDataFromAPI() {
  const container = $('trends-list');
  container.innerHTML = `<div class="loading-overlay"><div class="spinner"></div><span>Loading...</span></div>`;
  
  try {
    // Fetch events for each repo to calculate activity
    const reposWithActivity = await Promise.all(
      state.repos.slice(0, 30).map(async repo => {
        try {
          const eventsRes = await gh(`/repos/${repo.full_name}/events?per_page=100`);
          const events = eventsRes.ok ? await eventsRes.json() : [];
          
          // Calculate activity in last 7 days
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
  
  // Apply visibility filter
  if (visibilityFilter === 'public') {
    repos = repos.filter(r => !r.private);
  } else if (visibilityFilter === 'private') {
    repos = repos.filter(r => r.private);
  }
  
  // Sort
  switch (sortBy) {
    case 'stars':
      repos.sort((a, b) => b.stargazers_count - a.stargazers_count);
      break;
    case 'forks':
      repos.sort((a, b) => b.forks_count - a.forks_count);
      break;
    default: // updated
      repos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }
  
  // Show top 20
  repos = repos.slice(0, 20);
  
  if (repos.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No repositories match your filters.</p></div>';
    return;
  }
  
  container.innerHTML = repos.map(repo => {
    const activityClass = repo.weeklyActivity > 20 ? 'positive' : repo.weeklyActivity > 5 ? '' : '';
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
```

- [ ] **Step 4: Update navigateTo for trends tab**

```javascript
case 'dashboard': 
  loadDashboard(); 
  if (!state.healthData) loadHealthData();
  if (!state.contributorsData) loadContributorsData();
  if (!state.trendsData) loadTrendsData();
  break;
```

- [ ] **Step 5: Commit**

```bash
git add app.js style.css index.html
git commit -m "feat(dashboard): implement trends tab"
```

---

## Task 8: Implement Alerts Tab

**Files:**
- Modify: `/home/ptelgm/Documents/github-manager/app.js`
- Modify: `/home/ptelgm/Documents/github-manager/style.css`

- [ ] **Step 1: Add Alerts CSS styles**

```css
/* === Alerts Tab === */
.alerts-controls {
  margin-bottom: 20px;
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alert-card {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  transition: border-color var(--transition);
}

.alert-card:hover {
  border-color: var(--accent-blue);
}

.alert-card.severity-critical {
  border-left: 4px solid var(--accent-red);
}

.alert-card.severity-high {
  border-left: 4px solid #f85149;
}

.alert-card.severity-medium {
  border-left: 4px solid var(--accent-orange);
}

.alert-card.severity-low {
  border-left: 4px solid var(--accent-yellow);
}

.alert-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.alert-content {
  flex: 1;
  min-width: 0;
}

.alert-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.alert-meta {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.alert-meta span {
  display: inline-block;
  margin-right: 12px;
}

.alert-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.alert-severity-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.alert-severity-badge.critical {
  background: rgba(218, 54, 51, 0.15);
  color: #f85149;
}

.alert-severity-badge.high {
  background: rgba(248, 81, 73, 0.15);
  color: #f85149;
}

.alert-severity-badge.medium {
  background: rgba(210, 153, 34, 0.15);
  color: #d29922;
}

.alert-severity-badge.low {
  background: rgba(139, 148, 158, 0.15);
  color: #8b949e;
}

.permission-warning {
  background: rgba(210, 153, 34, 0.1);
  border: 1px solid rgba(210, 153, 34, 0.3);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--accent-orange);
}
```

- [ ] **Step 2: Add Alerts tab HTML**

```html
<div id="alerts-content" class="tab-content" data-content="alerts">
  <div class="alerts-controls">
    <select id="alerts-repo-select" class="repo-select">
      <option value="">Select a repository...</option>
    </select>
  </div>
  <div id="alerts-list" class="alerts-list"></div>
</div>
```

- [ ] **Step 3: Add Alerts functions to app.js**

```javascript
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
    // Fetch Dependabot alerts
    const [dependabotRes, advisoriesRes] = await Promise.all([
      gh(`/repos/${repoFullName}/dependabot/alerts`),
      gh(`/repos/${repoFullName}/advisories?per_page=30`)
    ]);
    
    const dependabotAlerts = dependabotRes.ok ? await dependabotRes.json() : [];
    const advisories = advisoriesRes.ok ? await advisoriesRes.json() : [];
    
    // Combine and deduplicate
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
    
    // Sort by severity
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
    
    // Permission check (if all requests failed)
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
```

- [ ] **Step 4: Update navigateTo for alerts tab**

```javascript
case 'dashboard': 
  loadDashboard(); 
  if (!state.healthData) loadHealthData();
  if (!state.contributorsData) loadContributorsData();
  if (!state.trendsData) loadTrendsData();
  if (!state.alertsData) loadAlertsData();
  break;
```

- [ ] **Step 5: Commit**

```bash
git add app.js style.css index.html
git commit -m "feat(dashboard): implement alerts tab"
```

---

## Task 9: Update Bundle.html

**Files:**
- Modify: `/home/ptelgm/Documents/github-manager/bundle.html`

- [ ] **Step 1: Read bundle.html to find dashboard section**

- [ ] **Step 2: Update dashboard section in bundle.html**

Apply the same HTML changes from Tasks 1, 5, 6, 7, 8 to bundle.html

- [ ] **Step 3: Add all CSS from tasks to bundle.html style block**

- [ ] **Step 4: Add all JS functions from tasks to bundle.html script block**

- [ ] **Step 5: Commit**

```bash
git add bundle.html
git commit -m "feat(dashboard): update bundle.html with enhanced dashboard"
```

---

## Task 10: Test and Verify

**Files:**
- All modified files

- [ ] **Step 1: Review all changes**

```bash
git diff --stat HEAD~10 HEAD
```

- [ ] **Step 2: Verify HTML structure**

Check that all tab containers exist and have correct IDs

- [ ] **Step 3: Verify CSS loads correctly**

Check for any syntax errors in added CSS

- [ ] **Step 4: Verify JavaScript functions**

Check that all functions are defined and state updates correctly

- [ ] **Step 5: Test in browser (manual)**

1. Open app in browser
2. Login with PAT
3. Navigate to Dashboard
4. Click through each tab
5. Verify data loads correctly
6. Test refresh button
7. Test error scenarios

- [ ] **Step 6: Commit final verification**

```bash
git add -A
git commit -m "test: verify enhanced dashboard implementation"
```

---

## Verification Checklist

| Item | Status |
|------|--------|
| Tab navigation works | ⬜ |
| Overview tab displays stats | ⬜ |
| Health tab shows commit chart | ⬜ |
| Health tab shows issue resolution time | ⬜ |
| Health tab shows PR merge rate | ⬜ |
| Contributors tab shows avatars | ⬜ |
| Contributors tab shows commit percentages | ⬜ |
| Trends tab sorts correctly | ⬜ |
| Trends tab filters by visibility | ⬜ |
| Alerts tab shows severity badges | ⬜ |
| Refresh button works | ⬜ |
| Error states display correctly | ⬜ |
| Empty states display correctly | ⬜ |
| Mobile responsive | ⬜ |
| Bundle.html updated | ⬜ |
