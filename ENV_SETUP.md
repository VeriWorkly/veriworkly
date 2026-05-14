# Environment Variables Configuration

VeriWorkly requires specific environment variables to function correctly across the frontend and backend.

## 🔑 Critical Variables

### Backend (`apps/server/.env`)

- `DATABASE_URL`: PostgreSQL connection string.
- `AUTH_SECRET`: Random secure string for authentication.
- `AUTH_SMTP_HOST`, `AUTH_SMTP_PORT`, `AUTH_SMTP_USER`, `AUTH_SMTP_PASS`: For sending OTP emails.
- `REDIS_URL`: (Optional) For rate limiting and API caching.

### Frontend Studio (`apps/studio/.env`)

- `NEXT_PUBLIC_BACKEND_URL`: URL of the backend server (default: `http://localhost:8080/api/v1`).
- `NEXT_PUBLIC_APP_URL`: URL of the studio app (default: `http://localhost:3001`).
- `AUTH_SECRET`: Same secret as backend.

### Marketing Site (`apps/site/.env`)

- `NEXT_PUBLIC_BACKEND_URL`: URL of the backend server.
- `NEXT_PUBLIC_APP_URL`: URL of the marketing site (default: `http://localhost:3000`).

## 📚 Detailed Variable Reference

For a full list of all available configuration options and their defaults, visit:
[Environment Variables Guide - VeriWorkly Docs](https://docs.veriworkly.com/docs/operations/environment-variables)
