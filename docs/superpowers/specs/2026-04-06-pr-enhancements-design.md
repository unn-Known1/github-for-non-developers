# Pull Request Enhancements Design

**Date:** 2026-04-06  
**Status:** Draft  
**Category:** 3 - Pull Request Enhancements

---

## Overview

Enhance the Pull Requests section with review management, comments, labels, assignees, draft PR support, and auto-merge functionality.

---

## Architecture

### Integration Approach
Expand the existing Pull Requests page with:
- **Reviews Tab** - Dedicated tab for review management dashboard
- **PR Detail Modal** - Enhanced modal with reviews, comments, labels, assignees
- **Create PR Modal** - Updated with draft option and auto-merge toggle

---

## Feature Specifications

### 1. PR Reviews (Tab + Modal)

#### 1.1 Reviews Tab
**Endpoint:** `GET /repos/{owner}/{repo}/pulls?state=open`

**UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  Pull Requests                    [New PR]                  │
├─────────────────────────────────────────────────────────────┤
│  [Open] [Closed] [Reviews]                                  │
├─────────────────────────────────────────────────────────────┤
│  Reviews Dashboard                                           │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│  │ ⏳ Pending      │ │ ✅ Completed    │ │ 📋 Review Req  │ │
│  │ Your Review     │ │ Recently        │ │ Requested      │ │
│  │ 3 PRs           │ │ Approved        │ │ From You       │ │
│  │                 │ │ 5 PRs           │ │ 2 PRs          │ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ │
│                                                              │
│  Pending Your Review:                                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ pr-title                              user/repo         │ │
│  │ Requested: 2 days ago                 [Approve] [View] │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### 1.2 PR Review Modal
**Endpoint:** 
- `GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews`
- `POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews`

**Features:**
- View all reviews with status (APPROVED, CHANGES_REQUESTED, COMMENTED)
- Submit new review: Approve, Request Changes, Comment
- Review body comment

---

### 2. PR Comments

#### 2.1 View Comments
**Endpoint:** `GET /repos/{owner}/{repo}/pulls/{pull_number}/comments`

**UI in PR Modal:**
```
┌─────────────────────────────────────────────────────────────┐
│  PR Title                                    [Approve] [Merge]│
├─────────────────────────────────────────────────────────────┤
│  Description: PR description here...                        │
├─────────────────────────────────────────────────────────────┤
│  Reviews                                                     │
│  ├─ @user1 approved  2 hours ago                           │
│  │   "LGTM!"                                              │
│  ├─ @user2 requested changes  1 day ago                   │
│  │   "Please fix the typo in line 42"                     │
├─────────────────────────────────────────────────────────────┤
│  General Comments                                            │
│  ├─ @user3 commented  3 days ago                            │
│  │   "Nice work!"                                         │
├─────────────────────────────────────────────────────────────┤
│  [Add a comment...]                                         │
└─────────────────────────────────────────────────────────────┘
```

#### 2.2 Post Comment
**Endpoint:** `POST /repos/{owner}/{repo}/pulls/{pull_number}/comments`

---

### 3. PR Labels

#### 3.1 Available Labels
**Endpoint:** `GET /repos/{owner}/{repo}/labels`

#### 3.2 Add/Remove Labels
**Endpoints:**
- `POST /repos/{owner}/{repo}/issues/{issue_number}/labels`
- `DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}`

**UI in PR Modal:**
```
Labels: [bug] [enhancement] [+ Add]
```

---

### 4. PR Assignees

#### 4.1 Available Assignees
**Endpoint:** `GET /repos/{owner}/{repo}/collaborators`

#### 4.2 Assign/Unassign
**Endpoints:**
- `POST /repos/{owner}/{repo}/issues/{issue_number}/assignees`
- `DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees/{user}`

**UI in PR Modal:**
```
Assignees: @user1 @user2 [+ Assign]
```

---

### 5. Draft Pull Requests

#### 5.1 Create Draft PR
**Endpoint:** `POST /repos/{owner}/{repo}/pulls`

**Add to form:**
- Checkbox: "Create as draft pull request"
- Draft PRs show "(Draft)" badge

#### 5.2 Convert to PR
**Endpoint:** `PATCH /repos/{owner}/{repo}/pulls/{pull_number}`

---

### 6. Auto-merge

#### 6.1 Enable Auto-merge
**Endpoint:** `PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge`

**Body:**
```json
{
  "merge_method": "merge|squash|rebase",
  "auto_delete_source_branch": true
}
```

#### 6.2 UI
Add toggle in PR detail modal:
```
☐ Enable auto-merge when all checks pass
   Merge method: [Merge ▼] [Squash ▼] [Rebase ▼]
```

---

## UI Components

### PR Detail Modal

| Section | Content |
|---------|----------|
| Header | PR title, status badge, author, date |
| Tabs | Overview, Reviews, Files Changed (future) |
| Actions | Approve, Request Changes, Comment, Merge |
| Meta | Labels, Assignees, Reviewers, Milestone |
| Description | PR body |
| Reviews | List of reviews with status |
| Comments | Threaded comments |

### New PR Modal Enhancement

- Title field
- Description (markdown editor)
- Base branch dropdown
- Head branch dropdown
- ☐ Draft PR checkbox
- ☐ Enable auto-merge checkbox
- [Create Pull Request] button

---

## State Changes

```javascript
state = {
  // ... existing state ...
  
  // Pull Requests
  pullFilter: 'open', // 'open' | 'closed' | 'reviews'
  
  // Reviews Tab
  pendingReviews: [],      // PRs pending your review
  completedReviews: [],      // PRs you've reviewed
  requestedReviews: [],     // PRs you've been requested to review
  
  // PR Detail
  currentPR: null,
  prReviews: [],
  prComments: [],
  prLabels: [],
  prAssignees: [],
  availableLabels: [],
  availableUsers: [],
}
```

---

## API Endpoints Used

| Feature | Endpoint | Method |
|---------|----------|--------|
| List PRs | `/repos/{owner}/{repo}/pulls` | GET |
| Get PR Reviews | `/repos/{owner}/{repo}/pulls/{num}/reviews` | GET |
| Submit Review | `/repos/{owner}/{repo}/pulls/{num}/reviews` | POST |
| List Comments | `/repos/{owner}/{repo}/pulls/{num}/comments` | GET |
| Post Comment | `/repos/{owner}/{repo}/pulls/{num}/comments` | POST |
| Add Label | `/repos/{repo}/issues/{num}/labels` | POST |
| Remove Label | `/repos/{repo}/issues/{num}/labels/{name}` | DELETE |
| Add Assignee | `/repos/{repo}/issues/{num}/assignees` | POST |
| Remove Assignee | `/repos/{repo}/issues/{num}/assignees/{user}` | DELETE |
| Create PR | `/repos/{owner}/{repo}/pulls` | POST |
| Update PR | `/repos/{owner}/{repo}/pulls/{num}` | PATCH |
| Auto-merge | `/repos/{owner}/{repo}/pulls/{num}/merge` | PUT |
| Get Labels | `/repos/{owner}/{repo}/labels` | GET |
| Get Collaborators | `/repos/{owner}/{repo}/collaborators` | GET |

---

## Implementation Phases

1. **Phase 1:** Reviews Tab Dashboard
2. **Phase 2:** PR Detail Modal with Reviews
3. **Phase 3:** PR Comments
4. **Phase 4:** PR Labels & Assignees
5. **Phase 5:** Draft PRs
6. **Phase 6:** Auto-merge
7. **Phase 7:** Sync Bundle.html

---

## Files to Modify

| File | Changes |
|------|---------|
| `index.html` | Add Reviews tab, PR detail modal, enhanced create PR modal |
| `style.css` | Add review dashboard, PR modal styles, labels/assignees UI |
| `app.js` | Add state, reviews tab, PR detail functions, API calls |
| `bundle.html` | Sync all changes |
