# Local Development Setup

This guide covers setting up VeriWorkly for local development.

## Prerequisites

- **Node.js >= 20.19.0** (Node.js 22 supported)
- **npm v11+** (`npm@11.16.0`)
- **PostgreSQL** (We recommend [Neon](https://neon.tech))
- **Redis** (Local or via Docker; required for sessions and locks)

## Step-by-Step Setup

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Environment Configuration**:
   - Copy `.env.example` to `.env` in root and across `apps/` (see `ENV_SETUP.md`).

3. **Database Setup**:

   ```bash
   npm run db:push
   npm run db:generate
   ```

4. **Start Development Servers**:
   ```bash
   # Start all workspaces simultaneously
   npm run dev:all

   # Or start marketing site only
   npm run dev:site
   ```

## 📚 Detailed Guide

For a comprehensive step-by-step walkthrough, troubleshooting, and template development guides, please refer to our official documentation:
[Local Setup Guide - VeriWorkly Docs](https://docs.veriworkly.com/docs/getting-started/local-setup)
