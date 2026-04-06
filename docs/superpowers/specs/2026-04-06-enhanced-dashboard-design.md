# GitHub Manager - Enhanced Dashboard Design

**Date:** 2026-04-06  
**Status:** Draft  
**Category:** 1 - Enhanced Dashboard

---

## Overview

Replace the current single-view Dashboard with a **tab-based Enhanced Dashboard** that provides comprehensive insights into repository health, contributions, activity patterns, and security.

---

## Architecture

### Tab Structure

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Dashboard                    [Refresh]                  │
├─────────────────────────────────────────────────────────────┤
│  [ Overview ] [ Health ] [ Contributors ] [ Trends ] [ Alerts ] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    Tab Content Area                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tabs and Their Content

| Tab | Purpose | Data Source |
|-----|---------|-------------|
| **Overview** | Summary stats, language bars, recent activity, top repos (existing) | `/user`, `/user/repos`, `/users/{user}/events` |
| **Health** | Commit frequency, issue resolution time, PR merge rate | `/repos/{owner}/{repo}/stats/contributors`, `/repos/{owner}/{repo}/commits`, `/repos/{owner}/{repo}/pulls` |
| **Contributors** | Top contributors per repo with commit counts | `/repos/{owner}/{repo}/contributors` |
| **Trends** | Repos with most activity this week | `/user/repos` (sorted by updated_at, stargazers) |
| **Alerts** | Dependency vulnerabilities, security advisories | `/repos/{owner}/{repo}/vulnerability-alerts` |

---

## Component Specifications

### 1. Tab Navigation Bar

**HTML:**
```html
<div class="dashboard-tabs">
  <button class="tab-btn active" data-tab="overview">Overview</button>
  <button class="tab-btn" data-tab="health">Health</button>
  <button class="tab-btn" data-tab="contributors">Contributors</button>
  <button class="tab-btn" data-tab="trends">Trends</button>
  <button class="tab-btn" data-tab="alerts">Alerts</button>
</div>
```

**CSS:**
- Horizontal scrollable on mobile
- Active tab has accent underline
- Smooth transition between tabs

**State:**
```javascript
state.dashboardTab = 'overview';
```

---

### 2. Overview Tab (Existing + Enhanced)

Retains existing content:
- Stats grid (repos, stars, forks, issues, followers, gists)
- Language bars
- Recent activity feed
- Top starred repos

**Enhancement:** Add "Refresh" button to manually refresh all data.

---

### 3. Health Tab

#### 3.1 Repo Selector
```html
<select id="health-repo-select" class="repo-select">
  <option value="">Select repository...</option>
</select>
```

#### 3.2 Commit Frequency Chart
- Display last 52 weeks of commit activity
- Bar chart visualization
- X-axis: weeks
- Y-axis: commit count

**API:** `GET /repos/{owner}/{repo}/stats/commit_activity`

#### 3.3 Issue Resolution Time
- Average time from issue creation to close
- Display as: "X days average"
- Show last 30 closed issues sample

**API:** `GET /repos/{owner}/{repo}/issues?state=closed&per_page=100`

#### 3.4 PR Merge Rate
- Percentage of PRs merged vs closed without merge
- Display as percentage with mini bar chart

**API:** `GET /repos/{owner}/{repo}/pulls?state=closed&per_page=100`

---

### 4. Contributors Tab

#### 4.1 Repo Selector
Same as Health tab.

#### 4.2 Contributors List
- Avatar, username, commit count, percentage of total
- Sortable by commit count
- Top 10 contributors shown

**API:** `GET /repos/{owner}/{repo}/contributors`

**HTML:**
```html
<div class="contributors-list">
  <div class="contributor-item">
    <img class="contributor-avatar" src="..." />
    <div class="contributor-info">
      <span class="contributor-name">username</span>
      <span class="contributor-commits">1,234 commits</span>
    </div>
    <div class="contributor-bar">
      <div class="contributor-fill" style="width: 85%"></div>
    </div>
    <span class="contributor-percent">85%</span>
  </div>
</div>
```

---

### 5. Trends Tab

#### 5.1 Time Range Selector
```html
<select id="trends-range">
  <option value="7">Last 7 days</option>
  <option value="30">Last 30 days</option>
  <option value="90">Last 90 days</option>
</select>
```

#### 5.2 Trending Repos Grid
- Sort by: commits, stars gained, PRs opened, issues closed
- Cards showing:
  - Repo name
  - Change indicators (⬆️ +5 stars this week)
  - Sparkline for activity

**Sorting Logic:**
```javascript
repos.sort((a, b) => {
  switch(sortBy) {
    case 'commits': return b.pushes - a.pushes;
    case 'stars': return b.stargazers_delta - a.stargazers_delta;
    case 'prs': return b.prs_delta - a.prs_delta;
  }
});
```

---

### 6. Alerts Tab

#### 6.1 Alert Categories
| Type | Icon | API |
|------|------|-----|
| Dependency Alerts | 🔒 | `GET /repos/{owner}/{repo}/vulnerability-alerts` |
| Security Advisories | ⚠️ | `GET /repos/{owner}/{repo}/advisories` |
| Dependabot Alerts | 🐛 | `GET /repos/{owner}/{repo}/dependabot/alerts` |

#### 6.2 Alert Card
```html
<div class="alert-card severity-high">
  <div class="alert-icon">🔒</div>
  <div class="alert-content">
    <div class="alert-title">Prototype Pollution in lodash</div>
    <div class="alert-meta">Package: lodash@4.17.15 → 4.17.21</div>
    <div class="alert-actions">
      <button class="btn btn-sm">View Details</button>
      <button class="btn btn-sm btn-primary">Dismiss</button>
    </div>
  </div>
</div>
```

#### 6.3 Permission Note
Display warning if user lacks permission to view alerts:
> "You need admin access to view dependency alerts for this repository."

---

## Data Fetching Strategy

### Parallel Loading (Option A)

```javascript
async function loadDashboardData() {
  const [userRes, reposRes, eventsRes] = await Promise.all([
    gh('/user'),
    gh('/user/repos?per_page=100'),
    gh(`/users/${state.user.login}/events?per_page=30`)
  ]);
  // Process results
}
```

### Per-Tab Lazy Loading

Each tab fetches its own data when activated:
```javascript
async function switchTab(tabName) {
  state.dashboardTab = tabName;
  
  switch(tabName) {
    case 'health':
      if (!state.healthData) await loadHealthData();
      break;
    case 'contributors':
      if (!state.contributorsData) await loadContributorsData();
      break;
    // ...
  }
}
```

---

## State Management

```javascript
state = {
  // ... existing state ...
  
  // New dashboard state
  dashboardTab: 'overview',
  dashboardRefreshKey: 0,  // Force refresh on tab switch
  
  // Per-tab data caches
  healthData: null,
  contributorsData: null,
  trendsData: null,
  alertsData: null,
}
```

---

## CSS Additions

```css
/* Tab Navigation */
.dashboard-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 20px;
  overflow-x: auto;
}

.tab-btn {
  padding: 10px 16px;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  position: relative;
  transition: color var(--transition);
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--accent-blue-hover);
  font-weight: 500;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent-blue);
}

/* Health Metrics */
.health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.metric-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
}

.metric-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
}

.metric-label {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 4px;
}

/* Commit Chart */
.commit-chart {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 80px;
  padding: 8px 0;
}

.commit-week {
  flex: 1;
  background: var(--accent-green);
  border-radius: 2px;
  min-height: 4px;
  transition: height 0.3s ease;
}

/* Contributors */
.contributor-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
}

.contributor-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
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
  background: var(--accent-blue);
  border-radius: 4px;
}

/* Alerts */
.alert-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 12px;
}

.alert-card.severity-high {
  border-left: 3px solid var(--accent-red);
}

.alert-card.severity-medium {
  border-left: 3px solid var(--accent-orange);
}

.alert-card.severity-low {
  border-left: 3px solid var(--accent-yellow);
}
```

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| API rate limit | Show "API rate limit reached. Try again in X minutes." |
| Network error | Show retry button with error message |
| 404 (no data) | Show empty state with helpful message |
| Permission denied | Show permission required message |
| Empty data | Show empty state specific to context |

---

## Testing Strategy

### Unit Tests
- `formatDate()` continues to work
- `langColor()` mapping is correct
- Tab switching updates state correctly
- Data caching logic works

### Integration Tests
- API calls return expected data shape
- Error handling for failed requests
- Refresh functionality reloads data

### Manual Testing
1. Login with PAT
2. Navigate to Dashboard
3. Click through each tab
4. Verify data loads correctly
5. Test refresh button
6. Test error scenarios (offline, invalid PAT)

---

## Implementation Order

1. **Phase 1:** Tab navigation framework (HTML/CSS/JS)
2. **Phase 2:** Overview tab (enhance existing)
3. **Phase 3:** Health tab
4. **Phase 4:** Contributors tab
5. **Phase 5:** Trends tab
6. **Phase 6:** Alerts tab
7. **Phase 7:** Error handling polish
8. **Phase 8:** Testing and bug fixes

---

## Files to Modify

| File | Changes |
|------|---------|
| `index.html` | Add tab navigation, new section containers |
| `style.css` | Add tab styles, new component styles |
| `app.js` | Add tab switching logic, new data functions, state |

---

## Backward Compatibility

The existing Dashboard functionality is preserved within the "Overview" tab. No breaking changes to existing features.
