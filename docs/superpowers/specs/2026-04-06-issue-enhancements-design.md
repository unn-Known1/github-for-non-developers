# Issue Enhancements Design

**Date:** 2026-04-06  
**Status:** Draft  
**Category:** 4 - Issue Enhancements

---

## Overview

Enhance the Issues section with comments, assignees, labels, milestones, bulk operations, linked PRs, and optional project boards view.

---

## Architecture

### Integration Approach
- **Quick View (Expand):** Click issue to expand inline showing description, assignees, labels
- **Full Details (Modal):** Click "View Full" to open modal with all features
- **Bulk Operations:** Select mode toggle with floating action bar

---

## Feature Specifications

### 1. Issue Comments

#### 1.1 View Comments (Inline + Modal)
**Endpoint:** `GET /repos/{owner}/{repo}/issues/{issue_number}/comments`

#### 1.2 View Comments (Modal)
Full comment thread in modal with author, date, body

#### 1.3 Post Comment
**Endpoint:** `POST /repos/{owner}/{repo}/issues/{issue_number}/comments`

---

### 2. Issue Assignees

#### 2.1 Quick Assign (Inline)
Show current assignees with click-to-remove

#### 2.2 Full Assign (Modal)
Search and add assignees from collaborators

**Endpoint:** `GET /repos/{owner}/{repo}/collaborators`  
**Endpoints:**
- `POST /repos/{owner}/{repo}/issues/{issue_number}/assignees`
- `DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees/{user}`

---

### 3. Issue Labels

#### 3.1 Quick Labels (Inline)
Show labels with color badges

#### 3.2 Full Labels (Modal)
Add/remove labels from available repo labels

**Endpoint:** `GET /repos/{owner}/{repo}/labels`  
**Endpoints:**
- `POST /repos/{owner}/{repo}/issues/{issue_number}/labels`
- `DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}`

---

### 4. Issue Milestones

#### 4.1 View Milestone (Inline)
Show milestone progress bar

#### 4.2 Edit Milestone (Modal)
Change milestone from dropdown

**Endpoint:** `GET /repos/{owner}/{repo}/milestones`  
**Endpoint:** `PATCH /repos/{owner}/{repo}/issues/{issue_number}`

---

### 5. Bulk Operations

#### 5.1 Select Mode
- Toggle button to enter/exit select mode
- Checkboxes appear next to each issue
- Header checkbox for select all

#### 5.2 Bulk Actions Bar
```
┌─────────────────────────────────────────────────────────────┐
│  ✓ 5 issues selected     [Close] [Open] [Add Label] [✕]      │
└─────────────────────────────────────────────────────────────┘
```

**Endpoints:**
- `PATCH /repos/{owner}/{repo}/issues/{issue_number}` (state: closed/open)
- `POST /repos/{owner}/{repo}/issues/{issue_number}/labels`

---

### 6. Linked PRs

Show PRs that reference/close this issue

**Endpoint:** `GET /repos/{owner}/{repo}/issues/{issue_number}/timeline` (filtered)

Alternative: Parse `fixes #n`, `closes #n` from PR titles

---

### 7. Project Boards (Optional)

Show GitHub Projects for the repository

**Endpoint:** `GET /repos/{owner}/{repo}/projects`

Note: This feature requires additional API calls and may hit rate limits

---

## UI Components

### Issue Expanded Row (Inline View)

```
┌─────────────────────────────────────────────────────────────┐
│ ☐ Issue Title Here                                   🔵 bug │
├─────────────────────────────────────────────────────────────┤
│ Description text here...                                    │
│                                                             │
│ 👤 user1, user2    📅 milestone    🔗 PR #123               │
│                                                             │
│ [+ Comment] [Assign] [Label] [📋 View Full →]               │
└─────────────────────────────────────────────────────────────┘
```

### Issue Detail Modal

| Section | Content |
|---------|---------|
| Header | Issue title, number, state, author, date |
| Body | Description |
| Comments | Full comment thread |
| Sidebar | Labels, Assignees, Milestone, Linked PRs |
| Actions | Close/Reopen, Add Comment |

### Bulk Select Mode

```
┌─────────────────────────────────────────────────────────────┐
│ Issues                          [Select] [🔍 Search...]      │
├─────────────────────────────────────────────────────────────┤
│ [Exit Select]                              [Select All]    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☐ Issue title 1                          🔵 bug     │ │
│ │ ☐ Issue title 2                          🟢 enhance   │ │
│ │ ☐ Issue title 3                          🔴 critical  │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│        [Close (3)] [Add Label] [✕ Clear]                  │
└─────────────────────────────────────────────────────────────┘
```

---

## State Changes

```javascript
state = {
  // ... existing state ...
  
  // Issue Enhancements
  issueSelectMode: false,
  selectedIssues: new Set(),
  expandedIssue: null,
  issueComments: [],
  availableLabels: [],
  availableMilestones: [],
}
```

---

## API Endpoints Used

| Feature | Endpoint | Method |
|---------|----------|--------|
| List Comments | `/repos/{owner}/{repo}/issues/{num}/comments` | GET |
| Post Comment | `/repos/{owner}/{repo}/issues/{num}/comments` | POST |
| Get Labels | `/repos/{owner}/{repo}/labels` | GET |
| Add Label | `/repos/{owner}/{repo}/issues/{num}/labels` | POST |
| Remove Label | `/repos/{owner}/{repo}/issues/{num}/labels/{name}` | DELETE |
| Get Collaborators | `/repos/{owner}/{repo}/collaborators` | GET |
| Add Assignee | `/repos/{owner}/{repo}/issues/{num}/assignees` | POST |
| Remove Assignee | `/repos/{owner}/{repo}/issues/{num}/assignees/{user}` | DELETE |
| Get Milestones | `/repos/{owner}/{repo}/milestones` | GET |
| Update Issue | `/repos/{owner}/{repo}/issues/{num}` | PATCH |
| Bulk Close | Per issue, state: closed | PATCH |
| Get Projects | `/repos/{owner}/{repo}/projects` | GET |

---

## Implementation Phases

1. **Phase 1:** Issue Expand/Collapse + Inline View
2. **Phase 2:** Issue Detail Modal
3. **Phase 3:** Comments
4. **Phase 4:** Labels & Assignees
5. **Phase 5:** Milestones
6. **Phase 6:** Bulk Operations
7. **Phase 7:** Linked PRs (Optional)
8. **Phase 8:** Sync Bundle.html

---

## Files to Modify

| File | Changes |
|------|---------|
| `index.html` | Add issue modal, select mode UI |
| `style.css` | Add expanded issue, modal, bulk ops styles |
| `app.js` | Add state, expand logic, modal functions, bulk ops |
| `bundle.html` | Sync all changes |
