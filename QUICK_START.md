# Quick Start Guide

VeriWorkly is a monorepo consisting of a Next.js frontend and an Express backend. Follow these steps to get up and running quickly.

## 📦 Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/VeriWorkly/veriworkly.git
   cd veriworkly-resume
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up environment variables**:

   ```bash
   cp .env.example .env
   cp apps/server/.env.example apps/server/.env
   ```

4. **Initialize the database**:
   ```bash
   npm run db:push -w @veriworkly/server
   ```

## 🚀 Running the App

To start all services (Frontend, Backend, Docs, Blog) in development mode:

```bash
npm run dev
```

To start specific apps:

- **Resume Builder**: `npm run dev:resume`
- **Server**: `npm run dev:server`
- **Docs**: `npm run dev:docs`
- **Blog**: `npm run dev:blog`

## 📖 Full Documentation

For detailed guides on deployment, contribution, and architecture, visit:
[https://docs.veriworkly.com](https://docs.veriworkly.com)
