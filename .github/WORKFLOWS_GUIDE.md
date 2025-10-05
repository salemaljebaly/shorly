# GitHub Configuration

This directory contains all GitHub-specific configuration for Shorly.

## 📁 Structure

```
.github/
├── ISSUE_TEMPLATE/          # Issue templates
│   ├── bug_report.yml       # Bug report template
│   ├── feature_request.yml  # Feature request template
│   └── config.yml           # Issue template config
├── workflows/               # GitHub Actions workflows
│   ├── ci.yml              # Main CI pipeline
│   ├── auto-assign.yml     # Auto-assign PRs
│   ├── dependabot-automerge.yml  # Auto-merge Dependabot PRs
│   ├── labeler.yml         # Auto-label PRs
│   ├── label-sync.yml      # Sync labels from config
│   └── release-please.yml  # Automated releases
├── CODEOWNERS              # Code ownership rules
├── dependabot.yml          # Dependabot configuration
├── labeler.yml             # Auto-labeling rules
├── labels.yml              # Repository labels
└── pull_request_template.md  # PR template
```

## 🔄 Workflows

### CI (`ci.yml`)

Runs on every PR and push to main:

- ✅ Linting
- ✅ Type checking
- ✅ Unit tests with coverage
- ✅ Build verification

### Auto-assign (`auto-assign.yml`)

Automatically assigns PRs to @salemaljebaly

### Dependabot Auto-merge (`dependabot-automerge.yml`)

Automatically approves and merges Dependabot PRs after CI passes

### Labeler (`labeler.yml`)

Automatically labels PRs based on changed files

### Label Sync (`label-sync.yml`)

Syncs repository labels from `.github/labels.yml`

### Release Please (`release-please.yml`)

Automates releases using conventional commits

## 🏷️ Labels

All labels are defined in `labels.yml`:

- `api` - Backend changes
- `frontend` - Frontend changes
- `worker` - Cloudflare Worker changes
- `tests` - Test updates
- `docs` - Documentation
- `dependencies` - Dependency updates
- `bug` - Bug reports
- `enhancement` - New features

## 📝 Templates

### Pull Request Template

Ensures all PRs include:

- Summary of changes
- Type of change
- Testing checklist
- Documentation updates

### Issue Templates

- **Bug Report**: Structured bug reporting
- **Feature Request**: Proposal for new features

## 🤖 Automation

### Dependabot

- Updates dependencies weekly
- Separate configs for root, API, web, and worker
- Auto-merges patch and minor updates

### CODEOWNERS

Automatically requests review from @salemaljebaly for all changes
