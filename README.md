# 🚀 GitHub Manager

<p align="center">
  <img src="https://img.shields.io/badge/GitHub-API%20v3-blue?style=for-the-badge&logo=github" alt="GitHub API">
  <img src="https://img.shields.io/badge/JavaScript-ES6+-yellow?style=for-the-badge&logo=javascript" alt="JavaScript">
  <img src="https://img.shields.io/badge/CSS3-Custom%20Properties-orange?style=for-the-badge&logo=css3" alt="CSS3">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
</p>

<p align="center">
  <strong>A powerful web application for managing your GitHub repositories, issues, pull requests, and more.</strong>
</p>

---

## ✨ Features Overview

<p align="center">
  <strong>15 Feature Categories</strong> • <strong>One Single-Page App</strong> • <strong>No Installation Required</strong>
</p>

---

## 🎯 Feature Categories

### 📊 1. Enhanced Dashboard
- **Overview Tab** - Quick stats at a glance
- **Health Tab** - Repository health metrics
- **Contributors Tab** - Contributor statistics
- **Trends Tab** - Activity trends visualization
- **Alerts Tab** - Important notifications

### 📦 2. Repository Management
- Batch archive/delete operations
- Webhook management
- Collaborator management
- Branch protection rules
- Repository export

### 🔀 3. Pull Request Enhancements
- Reviews dashboard
- PR detail modal with comments
- Label management
- Assignee management
- Draft PR support
- Auto-merge configuration

### 🐛 4. Issue Enhancements
- Expand/collapse issue cards
- Issue detail modal
- Comment threads
- Label & assignee management
- Milestone tracking
- Bulk operations (close/reopen)

### 🏢 5. Organization Features
- Organization info display
- Member management
- Team management

### 🔔 6. Notifications & Automation
- GitHub inbox view
- Mark notifications as read
- Mark all as read

### 📈 7. Analytics & Reports
- Star history charts
- Language breakdown analysis
- Repository statistics

### 🔒 8. Security Features
- Dependabot alerts
- Security advisories
- Vulnerability monitoring

### ⚡ 9. GitHub Actions
- Workflow management
- Run history
- Re-run workflows

### 📦 10. Package Registry
- Package listing
- Version management

### 🏷️ 11. Labels, Milestones & Projects
- Full CRUD for labels
- Milestone management
- Project board integration

### ⌨️ 12. User Experience
- Keyboard shortcuts
- Repository bookmarks
- Command palette

### 🛠️ 13. Developer Experience
- API rate limit monitor
- Quick action buttons

### 💾 14. Data Management
- Full data backup
- Export to JSON/CSV

### 🔗 15. External Integrations
- Slack webhook configuration
- Settings panel

---

## 🚀 Quick Start

### Option 1: Run Locally
```bash
# Clone the repository
git clone https://github.com/unn-Known1/github-for-non-developers.git

# Open in browser
open index.html
# or
xdg-open index.html
```

### Option 2: Use the Bundle
```bash
# Open the self-contained version
open bundle.html
```

### Option 3: Run with a Local Server
```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx serve .

# Then open http://localhost:8000
```

---

## 🔐 Authentication

1. Generate a Personal Access Token (PAT) from GitHub:
   - Go to **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
   - Click **Generate new token (classic)**
   - Select these scopes:
     - `repo` (Full control of private repositories)
     - `read:org` (Read org membership)
     - `notifications` (Access notifications)
     - `gist` (Create gists)

2. Enter your PAT in the login screen
3. Click **Connect to GitHub**

> ⚠️ **Your token is stored only in your browser session and is never sent to any server other than api.github.com**

---

## 📁 Project Structure

```
github-for-non-developers/
├── index.html          # Main application
├── style.css           # Styling
├── app.js              # Application logic
├── bundle.html         # Self-contained version
├── docs/               # Documentation
│   ├── specs/          # Design specifications
│   └── plans/          # Implementation plans
└── screenshots/       # App screenshots
```

---

## 📚 Documentation

| Category | Spec | Implementation Plan |
|----------|:----:|:-------------------:|
| Enhanced Dashboard | [📄](docs/superpowers/specs/2026-04-06-enhanced-dashboard-design.md) | [📋](docs/superpowers/plans/2026-04-06-enhanced-dashboard-implementation.md) |
| Repository Management | [📄](docs/superpowers/specs/2026-04-06-repository-management-design.md) | [📋](docs/superpowers/plans/2026-04-06-repository-management-implementation.md) |
| PR Enhancements | [📄](docs/superpowers/specs/2026-04-06-pr-enhancements-design.md) | [📋](docs/superpowers/plans/2026-04-06-pr-enhancements-implementation.md) |
| Issue Enhancements | [📄](docs/superpowers/specs/2026-04-06-issue-enhancements-design.md) | [📋](docs/superpowers/plans/2026-04-06-issue-enhancements-implementation.md) |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Vanilla JavaScript (ES6+) |
| **Styling** | CSS3 with Custom Properties |
| **API** | GitHub REST API v3 |
| **Auth** | Personal Access Token (PAT) |
| **Storage** | LocalStorage (preferences) |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👤 Author

**GitHub Manager**  
🔗 [github.com/unn-Known1](https://github.com/unn-Known1)

---

<p align="center">
  <strong>Made with ❤️ for GitHub users</strong>
</p>
