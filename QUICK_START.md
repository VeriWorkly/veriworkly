# Quick Start Guide

VeriWorkly is a monorepo consisting of 5 Next.js applications (Marketing Site, Studio, Portfolio Builder, Docs, Blog), an Express backend API, and a shared UI library. Follow these steps to get up and running quickly.

## 📦 Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/VeriWorkly/veriworkly.git
   cd veriworkly
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up environment variables**:

   ```bash
   cp .env.example .env
   cp apps/server/.env.example apps/server/.env
   cp apps/studio/.env.example apps/studio/.env
   cp apps/site/.env.example apps/site/.env
   cp apps/portfolio/.env.example apps/portfolio/.env
   cp apps/docs-platform/.env.example apps/docs-platform/.env
   cp apps/blog-platform/.env.example apps/blog-platform/.env
   ```

4. **Initialize the database**:

   ```bash
   npm run db:push
   npm run db:generate
   ```

## 🚀 Running the Apps

To start **all workspaces simultaneously** in development mode:

```bash
npm run dev:all
```

To run individual workspaces:

- **Marketing Site** (`http://localhost:3000`): `npm run dev:site` (or `npm run dev`)
- **Builder Studio** (`http://localhost:3001`): `npm run dev:studio`
- **Documentation** (`http://localhost:3002`): `npm run dev:docs`
- **Blog** (`http://localhost:3003`): `npm run dev:blog`
- **Portfolio Builder** (`http://localhost:3004`): `npm run dev:portfolio`
- **Backend API Server** (`http://localhost:8080`): `npm run dev:server`

## 📚 Detailed Documentation

For detailed guides on deployment, contribution, and architecture, visit:
[https://docs.veriworkly.com](https://docs.veriworkly.com)
