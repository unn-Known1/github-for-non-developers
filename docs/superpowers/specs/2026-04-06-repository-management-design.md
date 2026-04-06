# Repository Management Enhancement Design

**Date:** 2026-04-06  
**Status:** Draft  
**Category:** 2 - Repository Management

---

## Overview

Enhance the existing Repositories section with comprehensive management capabilities including batch operations, advanced search, webhook management, collaborator management, branch protection rules, export functionality, and archived repo filtering.

---

## Architecture

### Integration Approach
Expand the existing Repositories page with new controls and modals, avoiding navigation changes.

### Data Flow
```
User Action → UI Update → API Call → State Update → UI Refresh
```

---

## Feature Specifications

### 1. Batch Operations

#### 1.1 Checkbox Selection
- Add checkbox column to repo list
- Header checkbox for select all (visible only in batch mode)
- Visual indicator when items are selected

#### 1.2 Floating Action Bar
- Appears when ≥1 repo selected
- Shows count of selected items
- Actions: Archive, Unarchive, Delete
- Dismiss button to clear selection

**UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  ✓ 3 repositories selected                    [Archive] [Delete] [✕]  │
└─────────────────────────────────────────────────────────────┘
```

#### 1.3 Batch Delete
- Requires typing repo name for confirmation
- Shows warning about permanent deletion

---

### 2. Advanced Search & Filters

#### 2.1 Enhanced Search Bar
- Full-text search across repo name and description
- Debounced input (300ms)

#### 2.2 Filter Controls
| Filter | Values | Description |
|--------|--------|-------------|
| Sort | updated, stars, forks, name, created | Sort order |
| Language | All languages from user's repos | Filter by language |
| Visibility | All, Public, Private | Filter by visibility |
| Has Issues | All, Yes, No | Filter by has open issues |
| Has PRs | All, Yes, No | Filter by has open PRs |
| Archived | Show All, Hide Archived | Toggle archived repos |

---

### 3. Webhook Management

#### 3.1 List Webhooks Modal
**Endpoint:** `GET /repos/{owner}/{repo}/hooks`

**UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  Webhooks for {repo-name}                                    │
├─────────────────────────────────────────────────────────────┤
│  ✓ github.com/webhook1  [Events: push, pull_request]  [Test] [✕] │
│  ✓ github.com/webhook2  [Events: issues, releases]      [Test] [✕] │
├─────────────────────────────────────────────────────────────┤
│  [+ Add Webhook]                                           │
└─────────────────────────────────────────────────────────────┘
```

#### 3.2 Add/Edit Webhook Modal
**Endpoint:** `POST /repos/{owner}/{repo}/hooks` / `PATCH /repos/{owner}/{repo}/hooks/{hook_id}`

**Fields:**
- Payload URL (required) - URL validation
- Content Type - application/json / application/x-www-form-urlencoded
- Secret (optional)
- Events - push, pull_request, issues, releases, etc.
- SSL Verification - enabled/disabled

#### 3.3 Test Webhook
**Endpoint:** `POST /repos/{owner}/{repo}/hooks/{hook_id}/tests`

- Shows success/error toast
- Displays response details

---

### 4. Collaborator Management

#### 4.1 List Collaborators Modal
**Endpoint:** `GET /repos/{owner}/{repo}/collaborators`

**UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  Collaborators for {repo-name}                               │
├─────────────────────────────────────────────────────────────┤
│  👤 username1  [Admin ▼]     [✕ Remove]                      │
│  👤 username2  [Write ▼]     [✕ Remove]                      │
│  👤 username3  [Read ▼]      [✕ Remove]                      │
├─────────────────────────────────────────────────────────────┤
│  [+ Add Collaborator]                                       │
└─────────────────────────────────────────────────────────────┘
```

#### 4.2 Add Collaborator Modal
**Endpoint:** `PUT /repos/{owner}/{repo}/collaborators/{username}`

**Fields:**
- Username (required) - autocomplete from GitHub users
- Permission - Pull, Triage, Push, Maintain, Admin

#### 4.3 Change Permission
**Endpoint:** `PUT /repos/{owner}/{repo}/collaborators/{username}`

- Dropdown to change permission level
- Confirmation before changing

---

### 5. Branch Protection Rules

#### 5.1 List Rules Modal
**Endpoint:** `GET /repos/{owner}/{repo}/branches/{branch}/protection`

**UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  Branch Protection: main                                   │
├─────────────────────────────────────────────────────────────┤
│  ✓ Require pull request reviews before merging              │
│  ✓ Require status checks to pass before merging             │
│    └─ Required: CI/CD, security-scan                        │
│  ✓ Require branches to be up to date before merging        │
│  ✓ Require linear history                                  │
│  ✓ Include administrators                                  │
├─────────────────────────────────────────────────────────────┤
│  [Edit Rules]  [Delete Rules]                              │
└─────────────────────────────────────────────────────────────┘
```

#### 5.2 Edit Rules Modal
**Endpoint:** `PUT /repos/{owner}/{repo}/branches/{branch}/protection`

**Fields:**
- Required Review Count (0-6)
- Dismiss Stale Reviews (on/off)
- Require Status Checks (multi-select)
- Require Branches Up-to-date (on/off)
- Require Linear History (on/off)
- Include Administrators (on/off)
- Restrict Who Can Push (user/team selection)

#### 5.3 Create/Delete Rules
**Endpoints:**
- `POST /repos/{owner}/{repo}/branches/{branch}/protection`
- `DELETE /repos/{owner}/{repo}/branches/{branch}/protection`

---

### 6. Export Repositories

#### 6.1 Export Options
- Export All - All repos
- Export Selected - Only checked repos
- Format: CSV or JSON

#### 6.2 Export Fields
```
name, full_name, description, language, private, fork, 
stargazers_count, forks_count, open_issues_count, 
updated_at, created_at, homepage, html_url
```

---

### 7. Archived Toggle

#### 7.1 Toggle Control
- Toggle button in filter bar
- Default: Hide archived (current behavior)
- When enabled: Shows archived repos with "(archived)" badge

---

## UI Components

### Three-Dot Menu
```
┌────────────────┐
│ View Details   │
│ ────────────── │
│ 📡 Webhooks    │
│ 👥 Collaborators│
│ 🔒 Branches    │
│ ────────────── │
│ ⚠️ Delete      │
└────────────────┘
```

### Modals

| Modal | Purpose | Size |
|-------|---------|------|
| Webhooks | List/Add/Edit/Remove webhooks | 600px |
| Collaborators | List/Add/Remove collaborators | 500px |
| Branch Protection | Edit protection rules | 550px |
| Batch Delete | Confirm batch delete | 400px |
| Add Webhook | Create new webhook | 450px |
| Add Collaborator | Invite user | 400px |

---

## State Changes

```javascript
// New state properties
state = {
  // ... existing state ...
  
  // Batch selection
  batchMode: false,
  selectedRepos: new Set(),
  
  // Filters
  repoSearchQuery: '',
  repoHasIssues: 'all',
  repoHasPRs: 'all',
  repoShowArchived: false,
  
  // Modal state
  activeModal: null, // 'webhooks' | 'collaborators' | 'protection' | etc.
  modalRepo: null,   // Current repo for modal
}
```

---

## API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/repos/{owner}/{repo}/hooks` | GET, POST | List/Create webhooks |
| `/repos/{owner}/{repo}/hooks/{id}` | PATCH, DELETE | Edit/Delete webhook |
| `/repos/{owner}/{repo}/hooks/{id}/tests` | POST | Test webhook |
| `/repos/{owner}/{repo}/collaborators` | GET | List collaborators |
| `/repos/{owner}/{repo}/collaborators/{username}` | PUT, DELETE | Add/Remove collaborator |
| `/repos/{owner}/{repo}/branches/{branch}/protection` | GET, POST, PUT, DELETE | Branch protection |
| `/repos/{owner}/{repo}` | DELETE | Delete repository |
| `/repos/{owner}/{repo}` | PATCH | Update repository (archive) |

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| API rate limit | Show "API rate limit reached" with retry button |
| Permission denied | Show "Admin access required" message |
| Not found | Show "Resource not found" error |
| Network error | Show "Network error" with retry option |
| Validation error | Show field-level error messages |

---

## Testing Strategy

### Manual Testing
1. Enable batch mode, select repos, perform batch operations
2. Add webhook, test webhook, delete webhook
3. Add collaborator, change permission, remove collaborator
4. Edit branch protection rules, verify on GitHub
5. Export repos as CSV/JSON, verify data
6. Toggle archived repos visibility

### Edge Cases
- Empty repository list
- No write access to repo
- Rate limit during batch operations
- Webhook URL validation
- Collaborator not found

---

## Implementation Order

1. **Phase 1:** Batch Operations UI (checkbox, action bar)
2. **Phase 2:** Enhanced Filters (search, has-issues, archived toggle)
3. **Phase 3:** Export Functionality
4. **Phase 4:** Three-Dot Menu + Modal Framework
5. **Phase 5:** Webhook Management (CRUD + Test)
6. **Phase 6:** Collaborator Management (CRUD)
7. **Phase 7:** Branch Protection Rules (CRUD)
8. **Phase 8:** Testing & Polish

---

## Backward Compatibility

- All existing functionality preserved
- New features are additive
- Default filter behavior matches current (no archived)
- Existing keyboard shortcuts work

---

## Files to Modify

| File | Changes |
|------|---------|
| `index.html` | Add modals, batch action bar, filter toggles |
| `style.css` | Add modal styles, batch UI styles, menu styles |
| `app.js` | Add state, filters, batch logic, modal functions, API functions |
