# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**menu.pictures** - A PWA that photographs restaurant menus, extracts dish information using Claude Opus 4.8, and displays dish images from Pexels API.

**Tech Stack:** React 19 + Vite (client), Express 5 + TypeScript (server), SQLite via better-sqlite3, Anthropic Claude Opus 4.8, Pexels API

**Live URL:** https://menu.pictures

## Commands

```bash
# Development (runs client + server concurrently)
npm run dev

# Individual dev servers
npm run dev:client    # Vite on :5177
npm run dev:server    # Express on :3005 with tsx watch

# Build
npm run build         # Builds server then client

# Production
npm run start         # Runs built server (serves client in production mode)

# Clean
npm run clean         # Removes dist folders
```

## Architecture

### Data Flow
1. User captures/uploads menu image(s) → client compresses to max 1024px
2. `POST /api/scan` sends base64 images → server rate-limits by IP
3. Server sends images to Claude Opus 4.8 → extracts `{name, price, category}[]`
4. For each dish: check image cache → query Pexels if miss → cache result
5. Results stream back via SSE (`status`, `dish`, `done` events)
6. Client displays cards progressively, then requires a correction/review step before automatically saving the menu

### Key Files

**Server Services (`server/src/services/`):**
- `claude.ts` - Menu extraction with Claude Opus 4.8, returns `ExtractedDish[]`
- `pexels.ts` - Smart image search with category-aware queries (drinks vs food detection)
- `imageCache.ts` - SQLite cache for dish name → image URL mappings
- `rateLimiter.ts` - IP-based rate limiting (default 10 scans/hour)
- `database.ts` - SQLite setup with WAL mode

**Server Routes:**
- `POST /api/scan` - SSE streaming menu extraction (rate limited)
- `GET /api/scan/status` - Rate limit info for current IP
- `POST /api/share` - Create a permanent validated menu link and QR-ready URL
- `GET /api/share/:id` - Retrieve shared menu
- `POST /api/chat` - SSE streaming menu assistant chat (in-memory rate limited)
- `POST /api/translate` - Translate the extracted menu into any language (in-memory rate limited)

**Client Components (`client/src/components/`):**
- `CameraCapture.tsx` - Image capture/upload with compression
- `MenuGrid.tsx` - Dish grid with search and category filtering
- `DishCard.tsx` - Individual dish display (shows original name when translated)
- `SharePage.tsx` - Shared menu viewer (`/menu/:id`)
- `LanguagePicker.tsx` - Translate the menu into any language (quick picks + free text)
- `ChatWidget.tsx` - Voice-enabled menu assistant (Web Speech API mic input + spoken replies)
- `MenuReview.tsx` - Correct extracted menu identity, dishes, ingredients, allergen and dietary indicators
- `SavedMenuPage.tsx` - Reopen locally persisted menus without requiring a server share

### Pexels Image Search Logic

The `pexels.ts` service builds smart search queries based on item type:
- Coffee items → `"espresso coffee cup"`, `"latte coffee cup"`
- Cocktails/boozy → `"mimosa cocktail champagne orange"`, `"bloody mary cocktail tomato"`
- Smoothies with fruit → `"mango smoothie drink"`
- Generic food → `"[name] food plated"`

When images don't match, check `extractSearchableTerms()` and the keyword arrays (`COCKTAIL_TYPES`, `COFFEE_TYPES`, `FRUIT_KEYWORDS`).

## Database

SQLite tables in `data/menus.sqlite`:
- `shared_menus` - Permanent shareable links with validated versioned menu JSON
- `image_cache` - Dish name → Pexels URL cache (normalized names)
- `rate_limits` - IP-based scan counts with hourly window

## Environment Variables

Copy `.env.example` to `.env` in server directory:
- `ANTHROPIC_API_KEY` - Required for Claude API
- `PEXELS_API_KEY` - Required for image search
- `DATABASE_PATH` - SQLite location (default: `./data/menus.sqlite`)
- `RATE_LIMIT_MAX` - Scans per hour per IP (default: 10)
- `CHAT_RATE_LIMIT_MAX` - Chat messages per hour per IP (default: 60)
- `TRANSLATE_RATE_LIMIT_MAX` - Translations per hour per IP (default: 20)

## CI/CD

**GitHub Repository:** https://github.com/stijnhoste/photo-menu

**Workflows (`.github/workflows/`):**
- `ci.yml` - Runs on push/PR: TypeScript type checking + build verification
- `deploy.yml` - Runs on push to main: Auto-deploys to VPS via rsync + PM2 restart

**Required Secret:** `SSH_PRIVATE_KEY` - Ed25519 key for `stijn@97.74.93.177`

## Deployment

Deployed to VPS at 97.74.93.177 with PM2 + nginx + certbot SSL.

**Auto-deploy:** Push to `main` triggers GitHub Actions deployment.

```bash
# Manual deploy (if needed)
npm run build
rsync -avz --delete server/dist/ stijn@97.74.93.177:/var/www/menu-pictures/server/dist/
rsync -avz --delete client/dist/ stijn@97.74.93.177:/var/www/menu-pictures/client/dist/
ssh stijn@97.74.93.177 "pm2 restart menu-pictures"

# Clear image cache (forces fresh Pexels lookups)
ssh stijn@97.74.93.177 "rm -f /var/www/menu-pictures/server/data/menus.sqlite*"
```

Production `.env` is at `/var/www/menu-pictures/.env` (PM2 runs from project root).
