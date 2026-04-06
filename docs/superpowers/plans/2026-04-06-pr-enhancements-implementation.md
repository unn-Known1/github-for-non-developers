# Pull Request Enhancements Implementation Plan

> **For agentic workers:** Execute this plan using subagent-driven-development or executing-plans.

**Goal:** Enhance Pull Requests section with review management dashboard, PR detail modal, comments, labels, assignees, draft PRs, and auto-merge.

**Tech Stack:** Vanilla JavaScript, HTML5, CSS3, GitHub REST API v3

---

## File Structure

| File | Changes |
|------|---------|
| `index.html` | Add Reviews tab, PR detail modal, enhanced create PR modal |
| `style.css` | Add review dashboard, PR modal styles |
| `app.js` | Add state, reviews tab, PR detail functions |
| `bundle.html` | Sync all changes |

---

## Phase 1: Reviews Tab Dashboard

### Task 1.1: Add Reviews Tab to HTML

Find the pull requests section in index.html and update the filter tabs:

```html
<div class="filter-tabs">
  <button class="filter-tab active" data-filter="open">Open</button>
  <button class="filter-tab" data-filter="closed">Closed</button>
  <button class="filter-tab" data-filter="reviews">Reviews</button>
</div>
```

### Task 1.2: Add Reviews Tab Content

Add a reviews dashboard container in the pulls section:

```html
<div id="reviews-dashboard" class="reviews-dashboard hidden">
  <div class="reviews-stats">
    <div class="review-stat-card">
      <div class="review-stat-icon">⏳</div>
      <div class="review-stat-value" id="pending-count">0</div>
      <div class="review-stat-label">Pending Your Review</div>
    </div>
    <div class="review-stat-card">
      <div class="review-stat-icon">✅</div>
      <div class="review-stat-value" id="completed-count">0</div>
      <div class="review-stat-label">You Approved</div>
    </div>
    <div class="review-stat-card">
      <div class="review-stat-icon">📋</div>
      <div class="review-stat-value" id="requested-count">0</div>
      <div class="review-stat-label">Review Requested</div>
    </div>
  </div>
  <div id="reviews-list" class="reviews-list"></div>
</div>
```

### Task 1.3: Add Reviews CSS

```css
/* === Reviews Dashboard === */
.reviews-dashboard {
  display: block;
}

.reviews-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.review-stat-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  text-align: center;
}

.review-stat-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.review-stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
}

.review-stat-label {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 4px;
}

.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.review-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: border-color var(--transition);
}

.review-item:hover {
  border-color: var(--accent-blue);
}

.review-item-header {
  flex: 1;
  min-width: 0;
}

.review-item-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--accent-blue-hover);
  margin-bottom: 4px;
}

.review-item-meta {
  font-size: 13px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
}

.review-item-actions {
  display: flex;
  gap: 8px;
}
```

### Task 1.4: Add Reviews Tab Logic

```javascript
// Add state
pullFilter: 'open',
pendingReviews: [],
completedReviews: [],
requestedReviews: [],

// Add reviews tab rendering
function renderReviewsDashboard() {
  const container = $('reviews-list');
  const allReviews = [...state.pendingReviews, ...state.requestedReviews];
  
  if (allReviews.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No pending reviews.</p></div>';
    return;
  }
  
  container.innerHTML = allReviews.map(pr => `
    <div class="review-item" onclick="showPRDetail('${pr.base.repo.full_name}', ${pr.number})">
      <div class="review-item-header">
        <div class="review-item-title">${escHtml(pr.title)}</div>
        <div class="review-item-meta">
          <span>${escHtml(pr.base.repo.full_name)} #${pr.number}</span>
          <span>•</span>
          <span>by ${escHtml(pr.user.login)}</span>
          ${pr.requested_reviewers?.some(r => r.login === state.user.login) 
            ? '<span class="badge badge-open">Review Requested</span>' 
            : '<span class="badge">Pending</span>'}
        </div>
      </div>
      <div class="review-item-actions">
        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); approvePR('${pr.base.repo.full_name}', ${pr.number})">Approve</button>
        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); showPRDetail('${pr.base.repo.full_name}', ${pr.number})">View</button>
      </div>
    </div>
  `).join('');
}

function loadReviewsTab() {
  // Fetch PRs for all repos and filter for reviews
  // Update state.pendingReviews, completedReviews, requestedReviews
  renderReviewsDashboard();
}
```

---

## Phase 2: PR Detail Modal

### Task 2.1: Add PR Detail Modal HTML

```html
<!-- PR Detail Modal -->
<div id="pr-detail-modal" class="modal-overlay hidden">
  <div class="modal" style="max-width: 800px;">
    <div class="modal-header">
      <h3 id="pr-detail-title">PR Title</h3>
      <button class="modal-close" data-close="pr-detail-modal">✕</button>
    </div>
    <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
      <!-- PR Info -->
      <div class="pr-detail-meta">
        <span id="pr-detail-repo"></span>
        <span id="pr-detail-status"></span>
        <span id="pr-detail-author"></span>
      </div>
      
      <!-- Tabs -->
      <div class="pr-detail-tabs">
        <button class="pr-tab-btn active" data-prtab="overview">Overview</button>
        <button class="pr-tab-btn" data-prtab="reviews">Reviews</button>
        <button class="pr-tab-btn" data-prtab="comments">Comments</button>
      </div>
      
      <!-- Tab Contents -->
      <div id="pr-tab-overview" class="pr-tab-content active">
        <!-- Labels -->
        <div class="pr-detail-section">
          <h4>Labels</h4>
          <div id="pr-detail-labels" class="pr-labels"></div>
        </div>
        
        <!-- Assignees -->
        <div class="pr-detail-section">
          <h4>Assignees</h4>
          <div id="pr-detail-assignees" class="pr-assignees"></div>
        </div>
        
        <!-- Description -->
        <div class="pr-detail-section">
          <h4>Description</h4>
          <div id="pr-detail-description" class="pr-description"></div>
        </div>
      </div>
      
      <div id="pr-tab-reviews" class="pr-tab-content">
        <div id="pr-reviews-list"></div>
        <div class="pr-review-form">
          <h4>Submit Review</h4>
          <textarea id="pr-review-body" placeholder="Leave a comment (optional)"></textarea>
          <div class="review-actions">
            <button class="btn btn-sm" id="pr-review-comment">Comment</button>
            <button class="btn btn-sm btn-primary" id="pr-review-approve">Approve</button>
            <button class="btn btn-sm btn-danger" id="pr-review-request-changes">Request Changes</button>
          </div>
        </div>
      </div>
      
      <div id="pr-tab-comments" class="pr-tab-content">
        <div id="pr-comments-list"></div>
        <div class="pr-comment-form">
          <textarea id="pr-comment-body" placeholder="Write a comment..."></textarea>
          <button class="btn btn-sm btn-primary" id="pr-comment-submit">Comment</button>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="pr-auto-merge-toggle">☐ Auto-merge</button>
      <button class="btn btn-primary" id="pr-merge-btn">Merge</button>
    </div>
  </div>
</div>
```

### Task 2.2: Add PR Modal CSS

```css
/* === PR Detail Modal === */
.pr-detail-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  font-size: 14px;
  color: var(--text-secondary);
}

.pr-detail-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  margin-bottom: 16px;
}

.pr-tab-btn {
  padding: 10px 16px;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all var(--transition);
}

.pr-tab-btn:hover {
  color: var(--text-primary);
}

.pr-tab-btn.active {
  color: var(--accent-blue-hover);
  border-bottom-color: var(--accent-blue);
}

.pr-tab-content {
  display: none;
}

.pr-tab-content.active {
  display: block;
}

.pr-detail-section {
  margin-bottom: 20px;
}

.pr-detail-section h4 {
  font-size: 13px;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-bottom: 8px;
}

.pr-labels, .pr-assignees {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pr-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.pr-assignee {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  font-size: 13px;
}

.pr-assignee img {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.pr-review-item {
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  margin-bottom: 12px;
}

.pr-review-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.pr-review-author {
  font-weight: 600;
}

.pr-review-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
}

.pr-review-status.approved {
  background: rgba(35, 134, 54, 0.2);
  color: #3fb950;
}

.pr-review-status.changes {
  background: rgba(218, 54, 51, 0.2);
  color: #f85149;
}

.pr-review-body {
  font-size: 14px;
  color: var(--text-secondary);
  white-space: pre-wrap;
}

.pr-review-form, .pr-comment-form {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.pr-review-form textarea, .pr-comment-form textarea {
  width: 100%;
  min-height: 80px;
  margin-bottom: 12px;
}

.review-actions {
  display: flex;
  gap: 8px;
}
```

### Task 2.3: Add PR Modal Functions

```javascript
let currentPRRepo = '';
let currentPRNumber = '';

async function showPRDetail(repoFullName, prNumber) {
  currentPRRepo = repoFullName;
  currentPRNumber = prNumber;
  
  $('pr-detail-title').textContent = 'Loading...';
  showModal('pr-detail-modal');
  
  try {
    // Fetch PR details, reviews, and comments in parallel
    const [prRes, reviewsRes, commentsRes] = await Promise.all([
      gh(`/repos/${repoFullName}/pulls/${prNumber}`),
      gh(`/repos/${repoFullName}/pulls/${prNumber}/reviews`),
      gh(`/repos/${repoFullName}/pulls/${prNumber}/comments`)
    ]);
    
    const pr = await prRes.json();
    const reviews = reviewsRes.ok ? await reviewsRes.json() : [];
    const comments = commentsRes.ok ? await commentsRes.json() : [];
    
    renderPRDetail(pr, reviews, comments);
  } catch (e) {
    $('pr-detail-title').textContent = 'Error loading PR';
    toast('Failed to load PR details', 'error');
  }
}

function renderPRDetail(pr, reviews, comments) {
  $('pr-detail-title').textContent = pr.title;
  $('pr-detail-repo').textContent = pr.base.repo.full_name;
  $('pr-detail-status').innerHTML = pr.draft 
    ? '<span class="badge">Draft</span>' 
    : pr.merged 
      ? '<span class="badge badge-merged">Merged</span>' 
      : '<span class="badge badge-open">Open</span>';
  $('pr-detail-author').textContent = `by ${pr.user.login}`;
  
  // Labels
  $('pr-detail-labels').innerHTML = pr.labels.map(l => 
    `<span class="badge" style="background:#${l.color}20;color:#${l.color}">${escHtml(l.name)}</span>`
  ).join('') || '<span style="color:var(--text-muted)">No labels</span>';
  
  // Assignees
  $('pr-detail-assignees').innerHTML = pr.assignees.map(a => 
    `<span class="pr-assignee"><img src="${a.avatar_url}" />${escHtml(a.login)}</span>`
  ).join('') || '<span style="color:var(--text-muted)">No assignees</span>';
  
  // Description
  $('pr-detail-description').innerHTML = pr.body 
    ? escHtml(pr.body).replace(/\n/g, '<br>') 
    : '<span style="color:var(--text-muted)">No description</span>';
  
  // Render reviews
  renderPRReviews(reviews);
  
  // Render comments
  renderPRComments(comments);
  
  // Update merge button
  updateMergeButton(pr);
}

function renderPRReviews(reviews) {
  if (reviews.length === 0) {
    $('pr-reviews-list').innerHTML = '<div class="empty-state"><p>No reviews yet.</p></div>';
    return;
  }
  
  $('pr-reviews-list').innerHTML = reviews.map(r => `
    <div class="pr-review-item">
      <div class="pr-review-header">
        <img src="${r.user.avatar_url}" style="width:24px;height:24px;border-radius:50%" />
        <span class="pr-review-author">${escHtml(r.user.login)}</span>
        <span class="pr-review-status ${r.state === 'APPROVED' ? 'approved' : r.state === 'CHANGES_REQUESTED' ? 'changes' : ''}">${escHtml(r.state)}</span>
        <span style="color:var(--text-muted);font-size:12px">${timeAgo(r.submitted_at)}</span>
      </div>
      ${r.body ? `<div class="pr-review-body">${escHtml(r.body)}</div>` : ''}
    </div>
  `).join('');
}

function renderPRComments(comments) {
  if (comments.length === 0) {
    $('pr-comments-list').innerHTML = '<div class="empty-state"><p>No comments yet.</p></div>';
    return;
  }
  
  $('pr-comments-list').innerHTML = comments.map(c => `
    <div class="pr-review-item">
      <div class="pr-review-header">
        <img src="${c.user.avatar_url}" style="width:24px;height:24px;border-radius:50%" />
        <span class="pr-review-author">${escHtml(c.user.login)}</span>
        <span style="color:var(--text-muted);font-size:12px">${timeAgo(c.created_at)}</span>
      </div>
      <div class="pr-review-body">${escHtml(c.body)}</div>
    </div>
  `).join('');
}

function updateMergeButton(pr) {
  const mergeBtn = $('pr-merge-btn');
  if (pr.merged) {
    mergeBtn.textContent = 'Merged';
    mergeBtn.disabled = true;
  } else if (pr.draft) {
    mergeBtn.textContent = 'Cannot Merge (Draft)';
    mergeBtn.disabled = true;
  } else {
    mergeBtn.textContent = 'Merge';
    mergeBtn.disabled = false;
  }
}

// Review submission
$('pr-review-approve').addEventListener('click', () => submitReview('APPROVE'));
$('pr-review-comment').addEventListener('click', () => submitReview('COMMENT'));
$('pr-review-request-changes').addEventListener('click', () => submitReview('REQUEST_CHANGES'));

async function submitReview(event) {
  const body = $('pr-review-body').value;
  
  try {
    const res = await gh(`/repos/${currentPRRepo}/pulls/${currentPRNumber}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ body, event })
    });
    
    if (res.ok) {
      toast('Review submitted', 'success');
      showPRDetail(currentPRRepo, currentPRNumber); // Refresh
    } else {
      toast('Failed to submit review', 'error');
    }
  } catch (e) {
    toast('Error submitting review', 'error');
  }
}

// Comment submission
$('pr-comment-submit').addEventListener('click', async () => {
  const body = $('pr-comment-body').value;
  if (!body.trim()) {
    toast('Please enter a comment', 'error');
    return;
  }
  
  try {
    const res = await gh(`/repos/${currentPRRepo}/pulls/${currentPRNumber}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body })
    });
    
    if (res.ok) {
      toast('Comment posted', 'success');
      $('pr-comment-body').value = '';
      showPRDetail(currentPRRepo, currentPRNumber); // Refresh
    } else {
      toast('Failed to post comment', 'error');
    }
  } catch (e) {
    toast('Error posting comment', 'error');
  }
});

// Merge PR
$('pr-merge-btn').addEventListener('click', async () => {
  const method = 'merge'; // Could add dropdown for squash/rebase
  
  try {
    const res = await gh(`/repos/${currentPRRepo}/pulls/${currentPRNumber}/merge`, {
      method: 'PUT',
      body: JSON.stringify({ merge_method: method })
    });
    
    if (res.ok) {
      toast('PR merged successfully', 'success');
      closeModal('pr-detail-modal');
      loadPulls(); // Refresh list
    } else {
      const err = await res.json();
      toast(err.message || 'Failed to merge PR', 'error');
    }
  } catch (e) {
    toast('Error merging PR', 'error');
  }
});
```

---

## Phase 3: Labels & Assignees

### Task 3.1: Add Labels/Assignees to PR Modal

Update the PR detail modal to include add buttons for labels and assignees:

```javascript
// In renderPRDetail, update labels section:
$('pr-detail-labels').innerHTML = pr.labels.map(l => 
  `<span class="badge pr-label" style="background:#${l.color}20;color:#${l.color}">${escHtml(l.name)}</span>`
).join('') + '<button class="btn btn-sm btn-outline" onclick="showAddLabelModal()">+ Add</button>';

// Update assignees section:
$('pr-detail-assignees').innerHTML = pr.assignees.map(a => 
  `<span class="pr-assignee"><img src="${a.avatar_url}" />${escHtml(a.login)}</span>`
).join('') + '<button class="btn btn-sm btn-outline" onclick="showAddAssigneeModal()">+ Assign</button>';
```

### Task 3.2: Add/Remove Label Functions

```javascript
async function showAddLabelModal() {
  // Fetch available labels
  const res = await gh(`/repos/${currentPRRepo}/labels?per_page=100`);
  const labels = res.ok ? await res.json() : [];
  const currentLabels = state.currentPR?.labels?.map(l => l.name) || [];
  const available = labels.filter(l => !currentLabels.includes(l.name));
  
  if (available.length === 0) {
    toast('No more labels available', 'info');
    return;
  }
  
  // Simple prompt for demo (in production, use a modal)
  const labelName = prompt(`Available labels:\n${available.map(l => l.name).join('\n')}\n\nEnter label name to add:`);
  
  if (labelName && available.some(l => l.name === labelName)) {
    await addPRLabel(labelName);
  }
}

async function addPRLabel(labelName) {
  try {
    const res = await gh(`/repos/${currentPRRepo}/issues/${currentPRNumber}/labels`, {
      method: 'POST',
      body: JSON.stringify({ labels: [labelName] })
    });
    
    if (res.ok) {
      toast('Label added', 'success');
      showPRDetail(currentPRRepo, currentPRNumber);
    } else {
      toast('Failed to add label', 'error');
    }
  } catch (e) {
    toast('Error adding label', 'error');
  }
}

async function removePRLabel(labelName) {
  try {
    const res = await gh(`/repos/${currentPRRepo}/issues/${currentPRNumber}/labels/${encodeURIComponent(labelName)}`, { 
      method: 'DELETE' 
    });
    
    if (res.ok || res.status === 200) {
      toast('Label removed', 'success');
      showPRDetail(currentPRRepo, currentPRNumber);
    } else {
      toast('Failed to remove label', 'error');
    }
  } catch (e) {
    toast('Error removing label', 'error');
  }
}
```

### Task 3.3: Add/Remove Assignee Functions

```javascript
async function showAddAssigneeModal() {
  const username = prompt('Enter GitHub username to assign:');
  if (username) {
    await addPRAssignee(username.trim());
  }
}

async function addPRAssignee(username) {
  try {
    const res = await gh(`/repos/${currentPRRepo}/issues/${currentPRNumber}/assignees`, {
      method: 'POST',
      body: JSON.stringify({ assignees: [username] })
    });
    
    if (res.ok) {
      toast(`${username} assigned`, 'success');
      showPRDetail(currentPRRepo, currentPRNumber);
    } else {
      toast('Failed to assign user', 'error');
    }
  } catch (e) {
    toast('Error assigning user', 'error');
  }
}

async function removePRAssignee(username) {
  try {
    const res = await gh(`/repos/${currentPRRepo}/issues/${currentPRNumber}/assignees/${username}`, { 
      method: 'DELETE' 
    });
    
    if (res.ok || res.status === 200) {
      toast(`${username} removed`, 'success');
      showPRDetail(currentPRRepo, currentPRNumber);
    } else {
      toast('Failed to remove assignee', 'error');
    }
  } catch (e) {
    toast('Error removing assignee', 'error');
  }
}
```

---

## Phase 4: Draft PRs & Auto-merge

### Task 4.1: Update Create PR Modal

Find the create PR modal in index.html and add:

```html
<div class="form-group">
  <label class="checkbox-label">
    <input type="checkbox" id="pr-draft" />
    <span>Create as draft pull request</span>
  </label>
</div>
<div class="form-group">
  <label class="checkbox-label">
    <input type="checkbox" id="pr-auto-merge" />
    <span>Enable auto-merge when ready</span>
  </label>
</div>
```

### Task 4.2: Update Create PR Function

```javascript
// In the create PR function, update the body:
const isDraft = $('pr-draft').checked;

const prData = {
  title: $('new-pr-title').value,
  head: $('new-pr-head').value,
  base: $('new-pr-base').value,
  body: $('new-pr-body').value,
  draft: isDraft
};

const res = await gh(`/repos/${$('pr-repo-select').value}/pulls`, {
  method: 'POST',
  body: JSON.stringify(prData)
});

// If auto-merge is enabled and PR is created
if (res.ok && $('pr-auto-merge').checked) {
  const pr = await res.json();
  // Enable auto-merge
  await gh(`/repos/${$('pr-repo-select').value}/pulls/${pr.number}/merge`, {
    method: 'PUT',
    body: JSON.stringify({ merge_method: 'merge', auto_delete_source_branch: true })
  });
}
```

---

## Phase 5: Sync Bundle.html

Apply all changes from Tasks 1-4 to bundle.html.

---

## Verification Checklist

| Feature | Status |
|---------|--------|
| Reviews tab appears | ⬜ |
| Reviews dashboard shows stats | ⬜ |
| PR detail modal opens | ⬜ |
| Reviews list in modal | ⬜ |
| Submit review (approve/comment/request changes) | ⬜ |
| Comments list in modal | ⬜ |
| Post comment | ⬜ |
| Labels displayed | ⬜ |
| Add/remove label | ⬜ |
| Assignees displayed | ⬜ |
| Add/remove assignee | ⬜ |
| Merge PR | ⬜ |
| Draft PR creation | ⬜ |
| Auto-merge toggle | ⬜ |
| Bundle.html updated | ⬜ |
