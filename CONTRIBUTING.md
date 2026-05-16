# 🤝 Contributing to VeriWorkly

First off, thank you for considering contributing to **VeriWorkly**! We are building a professional, privacy-first career ecosystem, and we value your help.

## 🏗️ Getting Started

### 📦 Development Prerequisites

- **Node.js 20+**
- **npm v10+**
- **Docker** (Optional, for full stack testing)

### 🛠️ Local Setup

1. **Fork** the repository.
2. **Clone** your fork:
   ```bash
   git clone https://github.com/VeriWorkly/veriworkly.git
   cd veriworkly-resume
   ```
3. **Install** dependencies:
   ```bash
   npm install
   ```
4. **Environment**:
   ```bash
   cp .env.example .env
   cp apps/server/.env.example apps/server/.env
   ```
5. **Start Dev**:
   ```bash
   npm run dev:all
   ```

---

## 🌿 Branching Policy

- `main`: Production-ready code.
- `dev`: Active development and integration branch. **Base your PRs here.**

### Branch Naming Convention

- `feat/feature-name`
- `fix/bug-name`
- `docs/doc-update`
- `refactor/scope-of-work`

---

## 🛠️ Development Guidelines

### 🎨 Architecture

We use a **Monorepo** structure.

- **apps/resume-builder**: Core Next.js application.
- **apps/server**: Express API.
- **apps/docs-platform**: Documentation (Fumadocs).
- **packages/ui**: Shared Design System.

### 📝 Coding Standards

- **TypeScript**: Mandatory for all new code.
- **Linting**: Run `npm run lint` before committing.
- **Formatting**: We use Prettier. Run `npm run format:write`.

---

## 📝 Pull Request Process

1. **Create an Issue**: Discuss large changes before starting work.
2. **Submit PR**: Open a PR against the `dev` branch.
3. **Checklist**:
   - [ ] Code builds successfully (`npm run build`)
   - [ ] Lint passes (`npm run lint`)
   - [ ] Tests pass (`npm test`)
   - [ ] Documentation updated (if applicable)

---

## 🤝 Code of Conduct

We expect all contributors to follow our [Code of Conduct](CODE_OF_CONDUCT.md). Be respectful, inclusive, and collaborative.

---

Built with ❤️ by [VeriWorkly Team](https://veriworkly.com)
