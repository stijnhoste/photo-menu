# Continuity Ledger: menu.pictures

## Project Identity

**Name:** menu.pictures
**Type:** PWA (Progressive Web App)
**Purpose:** Photograph restaurant menus, extract dish information using Claude Haiku 4.5, display dish images from Pexels API
**Live URL:** https://menu.pictures
**Repository:** https://github.com/stijnhoste/photo-menu

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite |
| Backend | Express 5 + TypeScript |
| Database | SQLite via better-sqlite3 |
| AI | Anthropic Claude Haiku 4.5 |
| Images | Pexels API |
| Hosting | VPS (97.74.93.177) with PM2 + nginx + certbot SSL |

## Architecture Overview

```
User → captures menu image(s)
       ↓
Client → compresses to max 1024px, sends base64 to /api/scan
       ↓
Server → rate-limits by IP, sends to Claude Haiku 4.5
       ↓
Claude → extracts {name, price, category}[] for each dish
       ↓
Server → for each dish: check image cache → query Pexels if miss → cache result
       ↓
SSE Stream → sends dish events progressively to client
       ↓
Client → displays cards as they arrive, allows sharing
```

## Key Directory Structure

```
photo-menu/
├── client/                    # React frontend
│   └── src/
│       ├── App.tsx           # Main app with routes
│       ├── components/
│       │   ├── CameraCapture.tsx  # Image capture/upload
│       │   ├── MenuGrid.tsx       # Dish grid with filtering
│       │   ├── DishCard.tsx       # Individual dish display
│       │   ├── ShareButton.tsx    # Share functionality
│       │   ├── SharePage.tsx      # Shared menu viewer (/menu/:id)
│       │   └── SavedMenus.tsx     # Saved menus page
│       ├── utils/
│       │   └── imageCompression.ts
│       └── types.ts
├── server/                    # Express backend
│   └── src/
│       ├── index.ts          # Express setup, routes
│       ├── routes/
│       │   ├── scan.ts       # POST /api/scan (SSE streaming)
│       │   └── share.ts      # Share endpoints
│       └── services/
│           ├── claude.ts     # Menu extraction with Claude
│           ├── pexels.ts     # Smart image search
│           ├── imageCache.ts # SQLite image cache
│           ├── rateLimiter.ts # IP-based rate limiting
│           └── database.ts   # SQLite setup
├── .github/workflows/
│   ├── ci.yml               # Type checking + build verification
│   └── deploy.yml           # Auto-deploy to VPS
└── CLAUDE.md                # Project instructions
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/scan` | POST | SSE streaming menu extraction (rate limited) |
| `/api/scan/status` | GET | Rate limit info for current IP |
| `/api/share` | POST | Create shareable menu link (30-day expiry) |
| `/api/share/:id` | GET | Retrieve shared menu |
| `/api/health` | GET | Health check |

## Database Tables

SQLite at `data/menus.sqlite`:
- `shared_menus` - Shareable links with JSON dish data, 30-day expiry
- `image_cache` - Dish name → Pexels URL cache (normalized names)
- `rate_limits` - IP-based scan counts with hourly window

## Development Commands

```bash
npm run dev          # Run client + server concurrently
npm run dev:client   # Vite on :5177
npm run dev:server   # Express on :3005 with tsx watch
npm run build        # Build server then client
npm run start        # Run production server
```

## Environment Variables

Required in `.env`:
- `ANTHROPIC_API_KEY` - Claude API
- `PEXELS_API_KEY` - Image search
- `DATABASE_PATH` - SQLite location (default: `./data/menus.sqlite`)
- `RATE_LIMIT_MAX` - Scans per hour per IP (default: 10)

## Current Goals

- **Primary:** Fix bugs/issues
- Address known issues and improve reliability

## Known Patterns

### Pexels Image Search Logic
The `pexels.ts` service builds smart search queries:
- Coffee items → `"espresso coffee cup"`, `"latte coffee cup"`
- Cocktails → `"mimosa cocktail champagne orange"`
- Smoothies with fruit → `"mango smoothie drink"`
- Generic food → `"[name] food plated"`

When images don't match, check `extractSearchableTerms()` and keyword arrays.

### SSE Streaming
Client receives events: `status`, `dish`, `done`
Dishes display progressively as they stream in.

## Deployment

**Auto-deploy:** Push to `main` triggers GitHub Actions deployment.

```bash
# Manual deploy (if needed)
npm run build
rsync -avz --delete server/dist/ stijn@97.74.93.177:/var/www/menu-pictures/server/dist/
rsync -avz --delete client/dist/ stijn@97.74.93.177:/var/www/menu-pictures/client/dist/
ssh stijn@97.74.93.177 "pm2 restart menu-pictures"
```

---

*Last updated: 2026-01-11*
*Session: onboarding*
