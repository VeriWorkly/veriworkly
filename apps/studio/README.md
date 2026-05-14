# VeriWorkly Resume Studio

The primary user-facing application for building, editing, and exporting resumes. Built with Next.js 16, Zustand, and Tailwind CSS 4.

## 🚀 Quick Start

1. **Install dependencies** (from monorepo root):

   ```bash
   npm install
   ```

2. **Setup environment variables**:
   Create a `.env` file in the root of the project:

   ```env
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8080/api/v1
   AUTH_SECRET=your-secure-secret
   ```

3. **Start development server**:
   ```bash
   npm run dev:studio
   ```

The app will be available at `http://localhost:3001`.

## 🏗️ Architecture

- **Next.js 16 (App Router)**: Utilizing Server Components for initial load and Client Components for the heavy editor.
- **Zustand**: Manages the local-first state of the resume being edited.
- **react-pdf**: Powers the client-side, high-fidelity PDF rendering engine.
- **Dual-Engine Templates**: Each template contains separate logic for Web (`web.tsx`) and PDF (`pdf.tsx`) to ensure perfect visual parity.
- **Better-Auth Client**: Handles the passwordless OTP login flow.

## 📁 Folder Structure

- `app/`: Next.js routes and layouts.
- `components/`: UI components (Editor panels, Previewer, etc.).
- `features/`: Domain-specific logic (Resume store, documents).
- `templates/`: Dual-engine resume templates (`pdf.tsx`, `web.tsx`).
- `public/`: Static assets and template previews.

## 📖 Full Documentation

For a deep dive into the builder's architecture and template system, visit [docs.veriworkly.com/docs/architecture/monorepo](https://docs.veriworkly.com/docs/architecture/monorepo).
