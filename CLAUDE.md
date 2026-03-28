# Figi Studio

AI-powered full-stack app builder. Chat interface + live preview + instant deployment.

## Stack
- Frontend: React 18 + Vite + Tailwind CSS → Cloudflare Pages (figi-studio.pages.dev)
- Backend: Cloudflare Workers + TypeScript → figi-studio-api.jjreliant.workers.dev
- Database: D1 (SQLite) — figi-studio-db

## Design
- Match Figi Code: bg #0b1120, orange #FF8C42, font Outfit
- Dark theme throughout, rounded-xl/2xl cards

## Conventions
- All API responses: { success: boolean, data?: any, error?: string }
- All DB queries use parameterized statements
- TypeScript strict mode on backend
- Tailwind only, no inline styles on frontend

## Key Features
- Users create projects → chat with AI → files generated → preview shown
- AI (Claude) generates complete working files
- Files stored in D1, served in preview panel
- Each project gets a subdomain (project-xyz.figistudio.dev future)
