# GitHub Manager Categories 5-15 Implementation Plan

> **For agentic workers:** Use inline execution - implement each category task-by-task

**Goal:** Implement 11 new feature categories (5-15) for GitHub Manager app including Organization features, Notifications, Analytics, Security, Actions, Packages, Labels/Milestones/Projects, User Experience, Developer Experience, Data Management, and External Integrations.

**Architecture:** Single HTML/JS/CSS app with inline implementation following existing patterns

**Tech Stack:** Vanilla JavaScript, GitHub REST API v3

---

### Task 1: Add New Navigation Items to Sidebar (Categories 5, 9, 11, 15)

**Files:**
- Modify: `/home/ptelgm/Documents/github-manager/index.html:61-87`

- [ ] **Step 1: Add Organization nav item**

Add after profile nav item (line 86):
```html
<button class="nav-item" data-section="orgs">
  <span>🏢</span> Organization
</button>
```

- [ ] **Step 2: Add Actions nav item**

Add after Organization:
```html
<button class="nav-item" data-section="actions">
  <span>⚡</span> Actions
</button>
```

- [ ] **Step 3: Add Labels nav item**

Add after Actions:
```html
<button class="nav-item" data-section="labels">
  <span>🏷️</span> Labels
</button>
```

- [ ] **Step 4: Add Milestones nav item**

Add after Labels:
```html
<button class="nav-item" data-section="milestones">
  <span>📍</span> Milestones
</button>
```

- [ ] **Step 5: Add Packages nav item**

Add after Milestones:
```html
<button class="nav-item" data-section="packages">
  <span>📦</span> Packages
</button>
```

- [ ] **Step 6: Add Settings nav item**

Add after Packages:
```html
<button class="nav-item" data-section="settings">
  <span>⚙️</span> Settings
</button>
```

---

### Task 2: Add All New Sections to HTML

**Files:**
- Modify: `/home/ptelgm/Documents/github-manager/index.html`

- [ ] **Step 1: Add Organization Section** (after profile-section, around line 257)

```html
<!-- Organization Section -->
<section id="orgs-section" class="content-section hidden">
  <div class="section-header">
    <h2>🏢 Organization</h2>
  </div>
  <div id="org-info-card" class="org-info-card"></div>
  <div class="org-tabs">
    <button class="tab-btn active" data-org-tab="info">Info</button>
    <button class="tab-btn" data-org-tab="members">Members</button>
    <button class="tab-btn" data-org-tab="teams">Teams</button>
  </div>
  <div id="org-info-content" class="tab-content active"></div>
  <div id="org-members-content" class="tab-content"></div>
  <div id="org-teams-content" class="tab-content"></div>
</section>
```

- [ ] **Step 2: Add Notifications Section** (after orgs-section)

```html
<!-- Notifications Section -->
<section id="notifications-section" class="content-section hidden">
  <div class="section-header">
    <h2>🔔 Notifications</h2>
    <button class="btn btn-secondary" id="mark-all-read-btn">Mark All Read</button>
  </div>
  <div id="notifications-list" class="notifications-list"></div>
</section>
```

- [ ] **Step 3: Add Actions Section** (after notifications-section)

```html
<!-- Actions Section -->
<section id="actions-section" class="content-section hidden">
  <div class="section-header">
    <h2>⚡ Actions</h2>
  </div>
  <div class="repo-selector-bar">
    <select id="actions-repo-select" class="repo-select">
      <option value="">Select a repository...</option>
    </select>
  </div>
  <div class="actions-tabs">
    <button class="tab-btn active" data-actions-tab="workflows">Workflows</button>
    <button class="tab-btn" data-actions-tab="runs">Runs</button>
  </div>
  <div id="actions-workflows-content" class="tab-content active"></div>
  <div id="actions-runs-content" class="tab-content"></div>
</section>
```

- [ ] **Step 4: Add Labels Section** (after actions-section)

```html
<!-- Labels Section -->
<section id="labels-section" class="content-section hidden">
  <div class="section-header">
    <h2>🏷️ Labels</h2>
    <button class="btn btn-primary" id="new-label-btn">+ New Label</button>
  </div>
  <div class="repo-selector-bar">
    <select id="labels-repo-select" class="repo-select">
      <option value="">Select a repository...</option>
    </select>
  </div>
  <div id="labels-list" class="labels-list"></div>
</section>
```

- [ ] **Step 5: Add Milestones Section** (after labels-section)

```html
<!-- Milestones Section -->
<section id="milestones-section" class="content-section hidden">
  <div class="section-header">
    <h2>📍 Milestones</h2>
    <button class="btn btn-primary" id="new-milestone-btn">+ New Milestone</button>
  </div>
  <div class="repo-selector-bar">
    <select id="milestones-repo-select" class="repo-select">
      <option value="">Select a repository...</option>
    </select>
  </div>
  <div id="milestones-list" class="milestones-list"></div>
</section>
```

- [ ] **Step 6: Add Packages Section** (after milestones-section)

```html
<!-- Packages Section -->
<section id="packages-section" class="content-section hidden">
  <div class="section-header">
    <h2>📦 Packages</h2>
  </div>
  <div id="packages-list" class="packages-list"></div>
</section>
```

- [ ] **Step 7: Add Settings Section** (after packages-section)

```html
<!-- Settings Section -->
<section id="settings-section" class="content-section hidden">
  <div class="section-header">
    <h2>⚙️ Settings</h2>
  </div>
  <div class="settings-grid">
    <div class="settings-card">
      <h3>Keyboard Shortcuts</h3>
      <label class="checkbox-label">
        <input type="checkbox" id="keyboard-shortcuts-enabled" checked />
        <span>Enable keyboard shortcuts</span>
      </label>
      <div class="shortcuts-hint">
        <p><kbd>/</kbd> Search</p>
        <p><kbd>n</kbd> New repository</p>
        <p><kbd>Ctrl+K</kbd> Command palette</p>
      </div>
    </div>
    <div class="settings-card">
      <h3>Theme</h3>
      <label class="checkbox-label">
        <input type="checkbox" id="auto-theme" />
        <span>Follow system theme</span>
      </label>
    </div>
    <div class="settings-card">
      <h3>Bookmarks</h3>
      <div id="bookmarks-list" class="bookmarks-list"></div>
    </div>
    <div class="settings-card">
      <h3>Slack Integration</h3>
      <div class="form-group">
        <label>Webhook URL</label>
        <input type="url" id="slack-webhook" placeholder="https://hooks.slack.com/..." />
      </div>
      <button class="btn btn-secondary btn-sm" id="save-slack-btn">Save</button>
    </div>
    <div class="settings-card">
      <h3>Data Management</h3>
      <button class="btn btn-secondary btn-sm" id="backup-data-btn">📥 Backup Data</button>
      <button class="btn btn-secondary btn-sm" id="export-data-btn">📤 Export All</button>
    </div>
  </div>
</section>
```

- [ ] **Step 8: Add API Rate Info to Footer** (in main-content, after all sections)

Add before closing </main>:
```html
<div id="api-rate-info" class="api-rate-info">API: --/--</div>
```

- [ ] **Step 9: Add Command Palette Modal** (before closing body)

```html
<!-- Command Palette Modal -->
<div id="command-palette" class="modal-overlay hidden">
  <div class="modal" style="max-width: 500px;">
    <div class="modal-body">
      <input type="text" id="command-input" placeholder="Type a command..." />
      <div id="command-results" class="command-results"></div>
    </div>
  </div>
</div>
```

---

### Task 3: Add All New CSS Styles

**Files:**
- Modify: `/home/ptelgm/Documents/github-manager/style.css`

- [ ] **Step 1: Add Organization styles**

```css
/* === Organization === */
.org-info-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
}
.org-avatar {
  width: 80px;
  height: 80px;
  border-radius: var(--radius);
  border: 3px solid var(--border);
}
.org-info { flex: 1; }
.org-name { font-size: 22px; font-weight: 600; margin-bottom: 8px; }
.org-desc { color: var(--text-secondary); margin-bottom: 12px; }
.org-stats { display: flex; gap: 20px; }
.org-stat { display: flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: 13px; }

.org-tabs, .actions-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 20px;
}

/* === Notifications === */
.notifications-list { display: flex; flex-direction: column; gap: 8px; }
.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
}
.notification-item:hover { border-color: var(--accent-blue); }
.notification-item.unread { border-left: 3px solid var(--accent-blue); }
.notification-icon { font-size: 20px; flex-shrink: 0; }
.notification-content { flex: 1; }
.notification-title { font-weight: 500; margin-bottom: 4px; }
.notification-repo { font-size: 12px; color: var(--text-muted); }
.notification-time { font-size: 11px; color: var(--text-muted); }

/* === Actions === */
.workflow-list, .runs-list { display: flex; flex-direction: column; gap: 8px; }
.workflow-item, .run-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.workflow-name, .run-name { font-weight: 600; flex: 1; }
.run-status { padding: 4px 8px; border-radius: 12px; font-size: 12px; }
.run-status.success { background: rgba(35,134,54,.15); color: #3fb950; }
.run-status.failure { background: rgba(218,54,51,.15); color: #f85149; }
.run-status.in_progress { background: rgba(31,111,235,.15); color: var(--accent-blue); }

/* === Labels === */
.labels-list { display: flex; flex-direction: column; gap: 8px; }
.label-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.label-color { width: 24px; height: 24px; border-radius: 50%; border: 1px solid var(--border); }
.label-name { font-weight: 500; flex: 1; }
.label-actions { display: flex; gap: 8px; }

/* === Milestones === */
.milestones-list { display: flex; flex-direction: column; gap: 8px; }
.milestone-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.milestone-title { font-weight: 600; flex: 1; }
.milestone-progress { flex: 1; max-width: 200px; }
.progress-bar { height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--accent-purple); }
.milestone-due { font-size: 12px; color: var(--text-muted); }

/* === Packages === */
.packages-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.package-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
}
.package-name { font-weight: 600; margin-bottom: 8px; }
.package-desc { font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; }
.package-stats { display: flex; gap: 16px; font-size: 12px; color: var(--text-muted); }

/* === Settings === */
.settings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.settings-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
}
.settings-card h3 { font-size: 15px; font-weight: 600; margin-bottom: 16px; }
.shortcuts-hint { margin-top: 12px; font-size: 13px; }
.shortcuts-hint p { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: var(--text-secondary); }
kbd { background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 4px; padding: 2px 6px; font-size: 12px; }
.bookmarks-list { display: flex; flex-direction: column; gap: 8px; }
.bookmark-item { display: flex; align-items: center; gap: 8px; padding: 8px; background: var(--bg-tertiary); border-radius: var(--radius-sm); }
.bookmark-name { flex: 1; font-size: 13px; }

/* === API Rate Info === */
.api-rate-info {
  position: fixed;
  bottom: 8px;
  right: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  font-size: 11px;
  color: var(--text-muted);
  z-index: 50;
}

/* === Command Palette === */
#command-palette .modal-body { padding: 0; }
#command-input {
  width: 100%;
  border: none;
  border-bottom: 1px solid var(--border);
  border-radius: 0;
  padding: 16px;
  font-size: 16px;
}
.command-results { max-height: 300px; overflow-y: auto; }
.command-item {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-light);
}
.command-item:hover { background: var(--bg-tertiary); }
.command-item-title { font-weight: 500; }
.command-item-desc { font-size: 12px; color: var(--text-muted); }
```

---

### Task 4: Add State and Navigation Cases to app.js

**Files:**
- Modify: `/home/ptelgm/Documents/github-manager/app.js`

- [ ] **Step 1: Add new state properties** (around line 41)

```javascript
// Category 12: User Experience
favorites: [],
keyboardShortcutsEnabled: true,
autoTheme: false,

// Category 13: Developer Experience
apiRateLimit: { limit: 5000, remaining: 5000, reset: null },
requestLog: [],
```

- [ ] **Step 2: Add navigateTo cases** (in switch statement, around line 227)

```javascript
case 'orgs': loadOrgs(); break;
case 'notifications': loadNotifications(); break;
case 'actions': loadActionsRepoSelect(); break;
case 'labels': loadLabelsRepoSelect(); break;
case 'milestones': loadMilestonesRepoSelect(); break;
case 'packages': loadPackages(); break;
case 'settings': loadSettings(); break;
```

- [ ] **Step 3: Add all feature functions** (at end of app.js)

Add all these functions:
- loadOrgs(), loadOrgMembers(), loadOrgTeams()
- loadNotifications(), markNotificationRead(), markAllNotificationsRead()
- loadActionsRepoSelect(), loadWorkflows(), loadRuns(), rerunWorkflow()
- loadLabelsRepoSelect(), loadLabels(), createLabel(), deleteLabel()
- loadMilestonesRepoSelect(), loadMilestones(), createMilestone(), updateMilestone()
- loadPackages(), loadPackageDetails()
- loadSettings(), saveSettings(), toggleFavorite(), loadBookmarks()
- updateApiRate(), checkRateLimit()
- handleKeyboardShortcuts(), openCommandPalette()
- backupData(), exportData()
- initKeyboardShortcuts()

---

### Task 5: Verify and Test

**Files:**
- Verify all files exist and are valid

- [ ] **Step 1: Check HTML validity**

- [ ] **Step 2: Test navigation**

- [ ] **Step 3: Verify all new sections render**

---

### Execution Notes

This plan implements all 11 categories with inline execution. Each category builds on the previous task - start with Task 1 and proceed sequentially.
