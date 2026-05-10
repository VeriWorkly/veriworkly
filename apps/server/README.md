# VeriWorkly API Server

The backend engine for VeriWorkly, providing authentication, resume CRUD, sync, and public share functionality.

## 🚀 Quick Start

1. **Install dependencies** (from monorepo root):

   ```bash
   npm install
   ```

2. **Setup environment variables**:
   Create a `.env` file in `apps/server/`:

   ```env
   DATABASE_URL=postgresql://...
   REDIS_URL=redis://localhost:6379
   AUTH_SECRET=your-secure-secret
   ```

3. **Initialize the Database**:

   ```bash
   npm run db:push -w @veriworkly/server
   ```

4. **Start development server**:
   ```bash
   npm run dev:server
   ```

The API will be available at `http://localhost:8080`.

## 🏗️ Architecture

- **Express.js**: Core API framework.
- **Prisma ORM**: Type-safe database access for PostgreSQL.
- **Redis**: Session cache and rate-limiting store.
- **Better-Auth**: Complete authentication solution (OTP, sessions).

> **PDF Export**: PDF generation runs entirely client-side in the studio app using React PDF (`@react-pdf/renderer`). The server no longer handles rendering or artifact storage.

## 📁 Folder Structure

- `src/`: TypeScript source code.
  - `auth/`: Better-Auth configuration and mailers.
  - `jobs/`: Scheduled background tasks (GitHub sync, usage metrics).
  - `routes/`: Express route definitions.
  - `services/`: Business logic layer.
- `prisma/`: Database schema and migrations.

## 📖 Full Documentation

For API reference and database details, visit [docs.veriworkly.com/api-reference](https://docs.veriworkly.com/api-reference).
