# Issue Enhancements Implementation Plan

> **For agentic workers:** Execute this plan.

**Goal:** Enhance Issues section with inline expand, detail modal, comments, labels, assignees, milestones, bulk operations, and linked PRs.

**Tech Stack:** Vanilla JavaScript, HTML5, CSS3, GitHub REST API v3

---

## File Structure

| File | Changes |
|------|---------|
| `index.html` | Add issue detail modal, select mode UI |
| `style.css` | Add expanded issue, modal, bulk ops styles |
| `app.js` | Add state, expand logic, modal functions, bulk ops |
| `bundle.html` | Sync all changes |

---

## Phase 1: Issue Expand/Collapse + Inline View

### Task 1.1: Update Issue List Item Template

Update the issue list item to include expand capability and inline quick view.

### Task 1.2: Add Issue Expanded View

```css
/* Issue Expand */
.issue-item.expanded {
  flex-direction: column;
  cursor: default;
}

.issue-item.expanded .issue-summary {
  width: 100%;
}

.issue-expanded-content {
  width: 100%;
  padding: 16px 0 0 32px;
  border-top: 1px solid var(--border);
  margin-top: 12px;
}

.issue-description {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 16px;
  white-space: pre-wrap;
}

.issue-quick-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
```

### Task 1.3: Add Expand Logic

```javascript
function toggleIssueExpand(issueNum) {
  const wasExpanded = state.expandedIssue === issueNum;
  
  // Collapse all
  qa('.issue-item.expanded').forEach(el => el.classList.remove('expanded'));
  qa('.issue-expanded-content').forEach(el => el.remove());
  
  if (wasExpanded) {
    state.expandedIssue = null;
    return;
  }
  
  // Expand clicked
  state.expandedIssue = issueNum;
  const issueEl = $(`issue-${issueNum}`);
  issueEl.classList.add('expanded');
  
  // Add expanded content
  const issue = state.issues.find(i => i.number === issueNum);
  if (issue) {
    const content = document.createElement('div');
    content.className = 'issue-expanded-content';
    content.innerHTML = `
      <div class="issue-description">${escHtml(issue.body || 'No description')}</div>
      <div class="issue-meta-row">
        <span>${issue.assignees.map(a => `<img src="${a.avatar_url}" title="${a.login}" style="width:20px;height:20px;border-radius:50%;margin-right:4px">`).join('')}</span>
        ${issue.milestone ? `<span>📅 ${escHtml(issue.milestone.title)}</span>` : ''}
      </div>
      <div class="issue-quick-actions">
        <button class="btn btn-sm" onclick="showIssueDetail(${issue.number})">View Full Details</button>
      </div>
    `;
    issueEl.appendChild(content);
  }
}
```

---

## Phase 2: Issue Detail Modal

### Task 2.1: Add Issue Detail Modal HTML

```html
<!-- Issue Detail Modal -->
<div id="issue-detail-modal" class="modal-overlay hidden">
  <div class="modal" style="max-width: 800px;">
    <div class="modal-header">
      <h3 id="issue-detail-title">Issue Title</h3>
      <button class="modal-close" data-close="issue-detail-modal">✕</button>
    </div>
    <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
      <div class="issue-detail-layout">
        <!-- Main Content -->
        <div class="issue-detail-main">
          <div id="issue-detail-body" class="issue-detail-body"></div>
          
          <!-- Comments Section -->
          <div class="issue-comments-section">
            <h4>Comments</h4>
            <div id="issue-comments-list"></div>
            <div class="issue-comment-form">
              <textarea id="issue-comment-input" placeholder="Leave a comment..."></textarea>
              <button class="btn btn-sm btn-primary" id="issue-comment-submit">Comment</button>
            </div>
          </div>
        </div>
        
        <!-- Sidebar -->
        <div class="issue-detail-sidebar">
          <!-- Labels -->
          <div class="issue-sidebar-section">
            <h4>Labels</h4>
            <div id="issue-detail-labels" class="issue-labels-list"></div>
            <button class="btn btn-sm btn-outline" id="issue-add-label-btn">+ Add</button>
          </div>
          
          <!-- Assignees -->
          <div class="issue-sidebar-section">
            <h4>Assignees</h4>
            <div id="issue-detail-assignees" class="issue-assignees-list"></div>
            <button class="btn btn-sm btn-outline" id="issue-add-assignee-btn">+ Assign</button>
          </div>
          
          <!-- Milestone -->
          <div class="issue-sidebar-section">
            <h4>Milestone</h4>
            <div id="issue-detail-milestone"></div>
          </div>
          
          <!-- Linked PRs -->
          <div class="issue-sidebar-section">
            <h4>Linked Pull Requests</h4>
            <div id="issue-linked-prs"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="issue-close-btn">Close Issue</button>
    </div>
  </div>
</div>
```

### Task 2.2: Add Issue Modal CSS

```css
/* Issue Detail Modal */
.issue-detail-layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 24px;
}

@media (max-width: 768px) {
  .issue-detail-layout {
    grid-template-columns: 1fr;
  }
}

.issue-detail-main {
  min-width: 0;
}

.issue-detail-body {
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre-wrap;
  margin-bottom: 24px;
}

.issue-comments-section {
  border-top: 1px solid var(--border);
  padding-top: 20px;
}

.issue-comments-section h4 {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.issue-comment-item {
  display: flex;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid var(--border-light);
}

.issue-comment-item img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.issue-comment-content {
  flex: 1;
}

.issue-comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.issue-comment-author {
  font-weight: 600;
}

.issue-comment-date {
  font-size: 12px;
  color: var(--text-muted);
}

.issue-comment-body {
  font-size: 14px;
  color: var(--text-secondary);
  white-space: pre-wrap;
}

.issue-comment-form {
  margin-top: 20px;
}

.issue-comment-form textarea {
  width: 100%;
  min-height: 100px;
  margin-bottom: 12px;
}

/* Sidebar */
.issue-detail-sidebar {
  border-left: 1px solid var(--border);
  padding-left: 24px;
}

@media (max-width: 768px) {
  .issue-detail-sidebar {
    border-left: none;
    border-top: 1px solid var(--border);
    padding-left: 0;
    padding-top: 20px;
  }
}

.issue-sidebar-section {
  margin-bottom: 24px;
}

.issue-sidebar-section h4 {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-bottom: 8px;
}

.issue-labels-list, .issue-assignees-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.issue-milestone {
  font-size: 14px;
  color: var(--text-secondary);
}

.issue-linked-pr {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
}
```

### Task 2.3: Add Issue Modal Functions

```javascript
let currentIssueNum = '';
let currentIssueRepo = '';

async function showIssueDetail(issueNum) {
  currentIssueRepo = $('issue-repo-select').value;
  currentIssueNum = issueNum;
  
  showModal('issue-detail-modal');
  
  try {
    const [issueRes, commentsRes, labelsRes, collabsRes] = await Promise.all([
      gh(`/repos/${currentIssueRepo}/issues/${issueNum}`),
      gh(`/repos/${currentIssueRepo}/issues/${issueNum}/comments`),
      gh(`/repos/${currentIssueRepo}/labels?per_page=100`),
      gh(`/repos/${currentIssueRepo}/collaborators?per_page=100`)
    ]);
    
    const issue = await issueRes.json();
    const comments = commentsRes.ok ? await commentsRes.json() : [];
    const allLabels = labelsRes.ok ? await labelsRes.json() : [];
    const collaborators = collabsRes.ok ? await collabsRes.json() : [];
    
    renderIssueDetail(issue, comments, allLabels, collaborators);
  } catch (e) {
    toast('Failed to load issue', 'error');
  }
}

function renderIssueDetail(issue, comments, allLabels, collaborators) {
  $('issue-detail-title').textContent = `#${issue.number} ${issue.title}`;
  
  // Body
  $('issue-detail-body').innerHTML = issue.body 
    ? escHtml(issue.body).replace(/\n/g, '<br>')
    : '<span style="color:var(--text-muted)">No description provided.</span>';
  
  // Labels
  $('issue-detail-labels').innerHTML = issue.labels.map(l => 
    `<span class="badge" style="background:#${l.color}20;color:#${l.color}">${escHtml(l.name)}</span>`
  ).join('') || '<span style="color:var(--text-muted);font-size:13px">None yet</span>';
  
  // Assignees
  $('issue-detail-assignees').innerHTML = issue.assignees.map(a => 
    `<img src="${a.avatar_url}" title="${escHtml(a.login)}" style="width:28px;height:28px;border-radius:50%;border:2px solid var(--border)">`
  ).join('') || '<span style="color:var(--text-muted);font-size:13px">No one</span>';
  
  // Milestone
  $('issue-detail-milestone').innerHTML = issue.milestone 
    ? `<span>📅 ${escHtml(issue.milestone.title)}</span>`
    : '<span style="color:var(--text-muted)">No milestone</span>';
  
  // Comments
  renderIssueComments(comments);
  
  // Linked PRs (placeholder)
  $('issue-linked-prs').innerHTML = issue.pull_request 
    ? `<div class="issue-linked-pr">🍴 PR #${issue.pull_request.number}: ${escHtml(issue.pull_request.title || 'View')}</div>`
    : '<span style="color:var(--text-muted);font-size:13px">No linked PR</span>';
  
  // Close button
  $('issue-close-btn').textContent = issue.state === 'open' ? 'Close Issue' : 'Reopen Issue';
}

function renderIssueComments(comments) {
  if (comments.length === 0) {
    $('issue-comments-list').innerHTML = '<p style="color:var(--text-muted)">No comments yet.</p>';
    return;
  }
  
  $('issue-comments-list').innerHTML = comments.map(c => `
    <div class="issue-comment-item">
      <img src="${c.user.avatar_url}" alt="${escHtml(c.user.login)}" />
      <div class="issue-comment-content">
        <div class="issue-comment-header">
          <span class="issue-comment-author">${escHtml(c.user.login)}</span>
          <span class="issue-comment-date">${timeAgo(c.created_at)}</span>
        </div>
        <div class="issue-comment-body">${escHtml(c.body).replace(/\n/g, '<br>')}</div>
      </div>
    </div>
  `).join('');
}

// Comment submission
$('issue-comment-submit').addEventListener('click', async () => {
  const body = $('issue-comment-input').value.trim();
  if (!body) {
    toast('Please enter a comment', 'error');
    return;
  }
  
  try {
    const res = await gh(`/repos/${currentIssueRepo}/issues/${currentIssueNum}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body })
    });
    
    if (res.ok) {
      toast('Comment posted', 'success');
      $('issue-comment-input').value = '';
      showIssueDetail(currentIssueNum); // Refresh
    } else {
      toast('Failed to post comment', 'error');
    }
  } catch (e) {
    toast('Error posting comment', 'error');
  }
});

// Close/Reopen
$('issue-close-btn').addEventListener('click', async () => {
  const newState = state === 'open' ? 'closed' : 'open';
  try {
    const res = await gh(`/repos/${currentIssueRepo}/issues/${currentIssueNum}`, {
      method: 'PATCH',
      body: JSON.stringify({ state: newState })
    });
    
    if (res.ok) {
      toast(newState === 'closed' ? 'Issue closed' : 'Issue reopened', 'success');
      closeModal('issue-detail-modal');
      loadIssues();
    } else {
      toast('Failed to update issue', 'error');
    }
  } catch (e) {
    toast('Error updating issue', 'error');
  }
});
```

---

## Phase 3: Labels & Assignees

### Task 3.1: Add/Remove Label Functions

```javascript
$('issue-add-label-btn').addEventListener('click', async () => {
  const labelName = prompt('Enter label name to add:');
  if (labelName) await addIssueLabel(labelName.trim());
});

async function addIssueLabel(labelName) {
  try {
    const res = await gh(`/repos/${currentIssueRepo}/issues/${currentIssueNum}/labels`, {
      method: 'POST',
      body: JSON.stringify({ labels: [labelName] })
    });
    
    if (res.ok) {
      toast('Label added', 'success');
      showIssueDetail(currentIssueNum);
    } else {
      toast('Failed to add label', 'error');
    }
  } catch (e) {
    toast('Error adding label', 'error');
  }
}

async function removeIssueLabel(labelName) {
  try {
    const res = await gh(`/repos/${currentIssueRepo}/issues/${currentIssueNum}/labels/${encodeURIComponent(labelName)}`, {
      method: 'DELETE'
    });
    
    if (res.ok) {
      toast('Label removed', 'success');
      showIssueDetail(currentIssueNum);
    } else {
      toast('Failed to remove label', 'error');
    }
  } catch (e) {
    toast('Error removing label', 'error');
  }
}
```

### Task 3.2: Add/Remove Assignee Functions

```javascript
$('issue-add-assignee-btn').addEventListener('click', async () => {
  const username = prompt('Enter GitHub username to assign:');
  if (username) await addIssueAssignee(username.trim());
});

async function addIssueAssignee(username) {
  try {
    const res = await gh(`/repos/${currentIssueRepo}/issues/${currentIssueNum}/assignees`, {
      method: 'POST',
      body: JSON.stringify({ assignees: [username] })
    });
    
    if (res.ok) {
      toast(`${username} assigned`, 'success');
      showIssueDetail(currentIssueNum);
    } else {
      toast('Failed to assign user', 'error');
    }
  } catch (e) {
    toast('Error assigning user', 'error');
  }
}

async function removeIssueAssignee(username) {
  try {
    const res = await gh(`/repos/${currentIssueRepo}/issues/${currentIssueNum}/assignees/${username}`, {
      method: 'DELETE'
    });
    
    if (res.ok) {
      toast(`${username} removed`, 'success');
      showIssueDetail(currentIssueNum);
    } else {
      toast('Failed to remove assignee', 'error');
    }
  } catch (e) {
    toast('Error removing assignee', 'error');
  }
}
```

---

## Phase 4: Bulk Operations

### Task 4.1: Add Select Mode UI

Add to section header:
```html
<button class="btn btn-sm btn-outline" id="issue-select-btn">☐ Select</button>
```

Add batch action bar:
```html
<div id="issue-batch-bar" class="batch-action-bar hidden">
  <span id="issue-batch-count">0 selected</span>
  <button class="btn btn-sm" id="issue-batch-close">Close</button>
  <button class="btn btn-sm" id="issue-batch-open">Reopen</button>
  <button class="btn btn-sm btn-secondary" id="issue-batch-clear">✕</button>
</div>
```

### Task 4.2: Add Bulk Operations Logic

```javascript
function toggleIssueSelectMode() {
  state.issueSelectMode = !state.issueSelectMode;
  state.selectedIssues.clear();
  
  // Toggle checkboxes visibility
  qa('.issue-item').forEach(el => {
    el.classList.toggle('select-mode', state.issueSelectMode);
  });
  
  // Toggle batch bar
  $('issue-batch-bar').classList.toggle('hidden', !state.issueSelectMode);
  
  // Update button
  $('issue-select-btn').textContent = state.issueSelectMode ? '✓ Done Selecting' : '☐ Select';
  
  updateIssueBatchCount();
}

function updateIssueBatchCount() {
  $('issue-batch-count').textContent = `${state.selectedIssues.size} selected`;
  $('issue-batch-bar').classList.toggle('hidden', state.selectedIssues.size === 0);
}

async function batchCloseIssues() {
  const issues = Array.from(state.selectedIssues);
  if (issues.length === 0) return;
  
  let success = 0, failed = 0;
  for (const num of issues) {
    try {
      const res = await gh(`/repos/${currentIssueRepo}/issues/${num}`, {
        method: 'PATCH',
        body: JSON.stringify({ state: 'closed' })
      });
      if (res.ok) success++;
      else failed++;
    } catch { failed++; }
  }
  
  toast(`Closed ${success} issue(s)${failed ? `, ${failed} failed` : ''}`, success > 0 ? 'success' : 'error');
  state.selectedIssues.clear();
  toggleIssueSelectMode();
  loadIssues();
}

async function batchOpenIssues() {
  const issues = Array.from(state.selectedIssues);
  if (issues.length === 0) return;
  
  let success = 0, failed = 0;
  for (const num of issues) {
    try {
      const res = await gh(`/repos/${currentIssueRepo}/issues/${num}`, {
        method: 'PATCH',
        body: JSON.stringify({ state: 'open' })
      });
      if (res.ok) success++;
      else failed++;
    } catch { failed++; }
  }
  
  toast(`Reopened ${success} issue(s)${failed ? `, ${failed} failed` : ''}`, success > 0 ? 'success' : 'error');
  state.selectedIssues.clear();
  toggleIssueSelectMode();
  loadIssues();
}

// Event listeners
$('issue-select-btn').addEventListener('click', toggleIssueSelectMode);
$('issue-batch-close').addEventListener('click', batchCloseIssues);
$('issue-batch-open').addEventListener('click', batchOpenIssues);
$('issue-batch-clear').addEventListener('click', () => {
  state.selectedIssues.clear();
  updateIssueBatchCount();
});
```

---

## Phase 5: Sync Bundle.html

Apply all changes to bundle.html.

---

## Verification Checklist

| Feature | Status |
|---------|--------|
| Issue expand/collapse | ⬜ |
| Issue detail modal opens | ⬜ |
| Comments displayed | ⬜ |
| Post comment | ⬜ |
| Labels displayed | ⬜ |
| Add/remove label | ⬜ |
| Assignees displayed | ⬜ |
| Add/remove assignee | ⬜ |
| Milestone displayed | ⬜ |
| Linked PR shown | ⬜ |
| Close/reopen issue | ⬜ |
| Select mode toggle | ⬜ |
| Bulk close issues | ⬜ |
| Bulk reopen issues | ⬜ |
| Bundle.html updated | ⬜ |
