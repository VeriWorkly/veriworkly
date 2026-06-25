# 🤝 Contributing to VeriWorkly

First off, thank you for considering contributing to **VeriWorkly**! We are building a professional, privacy-first career ecosystem, and we value your help.

> [!IMPORTANT]
> **Detailed guides, developer workflows, and coding standards** live in our official documentation:
>
> - 📖 **[Full Contributing Guidelines](https://docs.veriworkly.com/docs/contributing/index)**
> - 🛠️ **[Detailed Local Setup Guide](https://docs.veriworkly.com/docs/getting-started/local-setup)**

---

## ⚡ Contribution Workflow

Follow these steps to contribute code or documentation to VeriWorkly:

### 1. Star the Repository 🌟

Before getting started, please **star our repository** to show your support for the project!

### 2. Claim an Issue 📋

- Browse our open issues.
- If you find an issue you want to work on, comment on it expressing your interest and wait to be officially assigned by a maintainer.
- ⚠️ **Do not start coding or open a Pull Request before being assigned to the issue.**
- **Strict Issue Claiming & Pull Request Rules:**
  - **Claim Before Coding:** You must officially claim and be assigned an issue before you start working on it or submit a Pull Request.
  - **Priority for Rule Followers:** If a contributor submits a PR without being assigned to the issue, and another contributor subsequently requests to claim/work on that issue following the correct procedure (commenting on the issue to request assignment), priority will be given to the contributor who requested the claim.
  - **Unassigned PR Procedure:** If a PR is opened without an associated claim/assignment, maintainers will post a comment on the corresponding issue directing the author to claim it.
  - **7-Day Grace Period:** Maintainers will wait for up to **7 days** for the PR author to claim the issue. If the author fails to comment on the issue and claim it within 7 days, the PR may not be merged (even if the code is correct) and may be closed.
  - **Claim Priority:** If another contributor claims the issue during this grace period, the contributor who officially requested the claim will be considered first.

### 3. Fork & Clone 🍴

1. Fork the [original repository](https://github.com/VeriWorkly/veriworkly).
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/veriworkly.git
   cd veriworkly-resume
   ```
3. Set up the upstream remote:
   ```bash
   git remote add upstream https://github.com/VeriWorkly/veriworkly.git
   ```

### 4. Branching Policy 🌿

- PRs must be based on and target the **`master`** branch.
- Keep your fork in sync and create a descriptive feature branch:
  ```bash
  git checkout master
  git pull upstream master
  git checkout -b feat/your-feature-name
  ```
- **Branch Naming Convention**:
  - `feat/feature-name` (new features/enhancements)
  - `fix/bug-name` (bug fixes)
  - `docs/doc-update` (documentation changes)
  - `refactor/scope-of-work` (restructuring/refactoring code)

### 5. Local Setup & Verification 🛠️

- Install dependencies: `npm install`
- Copy environment variables: `cp .env.example .env` and `cp apps/server/.env.example apps/server/.env`
- Run the app locally to test your changes:
  - **Frontend-only (Site/Templates at port 3000)**: `npm run dev`
  - **Full-stack (All apps/databases)**: `npm run dev:all` _(Requires running `npm run db:push -w @veriworkly/server`)_

---

## 📝 Pull Request Guidelines

To ensure smooth reviews and fast merges, please adhere to these PR guidelines:

### 1. PR Title Naming Convention

PR titles **must** follow the format:

```
[Type] [App/Component]: <lowercase description>
```

- **Type**: `[Fix]`, `[Feature]`, `[Refactor]`, `[Docs]`, `[Chore]`
- **App/Component**: `[Studio]`, `[Server]`, `[Site]`, `[UI]`, etc.
- **Example**: `[Fix] [Studio]: hide auth-only actions in account menu for anonymous users`

### 2. Linking Issues

- You **must link the issue** your PR addresses in the PR description using the hashtag format (e.g., `Fixes #123` or `Closes #123`). This allows GitHub to automatically associate and close the issue upon merge.

### 3. Complete the PR Template & Checklist

- When opening a PR, fill out the template fully.
- Complete the checkbox checklist in the PR body by replacing `[ ]` with `[x]` for items you have done (e.g., linting, formatting, tests).
- ⚠️ **PRs with empty, uncompleted checklists will not be reviewed.**

---

## 🤝 Code of Conduct

We expect all contributors to follow our [Code of Conduct](CODE_OF_CONDUCT.md). Be respectful, inclusive, and collaborative.

---

Built with ❤️ by [VeriWorkly Team](https://veriworkly.com)
