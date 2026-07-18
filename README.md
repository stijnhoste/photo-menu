# menu.pictures / menu.photos

A PWA that photographs restaurant menus, extracts dish information using AI, and displays appetizing dish images.

**Live:** https://menu.pictures

## Features

- **Menu Scanning** - Capture or upload menu photos (supports multiple images)
- **Review & Correct** - Fix extracted names, descriptions, prices, categories, ingredients, and indicators before publishing
- **AI Extraction** - Claude Opus 4.8 extracts dish names, prices, and categories
- **Visual Display** - Pexels API provides appetizing images for each dish
- **Smart Search** - Filter by text, source category, dietary indicator, and maximum price
- **Saved Menus** - Corrected menus are automatically named and saved locally on the device
- **Permanent Sharing** - Create validated permanent links and table-ready QR codes
- **Menu Assistant** - Translate a menu and ask questions by text or voice
- **Offline Ready** - PWA with service worker support

## Tech Stack

- **Client:** React 19, Vite, TypeScript
- **Server:** Express 5, TypeScript
- **Database:** SQLite (better-sqlite3)
- **AI:** Anthropic Claude Opus 4.8
- **Images:** Pexels API

## Getting Started

### Prerequisites

- Node.js 18+
- [Anthropic API key](https://console.anthropic.com/)
- [Pexels API key](https://www.pexels.com/api/)

### Installation

```bash
# Clone the repository
git clone https://github.com/stijnhoste/photo-menu.git
cd photo-menu

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys and canonical domain settings
```

### Environment Variables

Create `server/.env`:

```env
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_VISION_API_KEY=your_google_cloud_vision_key
PEXELS_API_KEY=your_pexels_key
DATABASE_PATH=./data/menus.sqlite
RATE_LIMIT_MAX=10
APP_NAME=menu.pictures
ALLOWED_ORIGINS=https://menu.pictures,https://menu.photos
VITE_APP_NAME=menu.pictures
VITE_CANONICAL_URL=https://menu.pictures
```

### Development

```bash
# Run both client and server
npm run dev

# Or run separately
npm run dev:client    # Vite on :5177
npm run dev:server    # Express on :3005
```

### Production Build

```bash
npm run build
npm test
npm run test:e2e
npm run start
```

## How It Works

1. User captures or uploads menu photo(s)
2. Images use 2048px when Google Vision OCR is configured, otherwise 1024px
3. Google Vision extracts document text and Haiku structures it; without an OCR key, parallel Haiku vision is used
4. The editable review appears before representative photos finish loading
5. Each dish is progressively matched with a Pexels image (cached in SQLite)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scan` | POST | Scan menu images (SSE streaming) |
| `/api/scan/status` | GET | Check rate limit status |
| `/api/scan/image` | POST | Retry or replace a representative dish image |
| `/api/share` | POST | Create a permanent validated menu link |
| `/api/share/:id` | GET | Retrieve a shared menu |

## Privacy and trust

Menu photos are sent to the configured AI provider for analysis but are not persisted by this application. Extracted descriptions, ingredients, allergens, and dietary indicators are AI-derived and must be confirmed with restaurant staff. Stock food photography is explicitly labeled as representative.

## Domain cutover

The app currently runs at `menu.pictures`. It is ready to run as `menu.photos` by changing `APP_NAME`, `ALLOWED_ORIGINS`, `VITE_APP_NAME`, and `VITE_CANONICAL_URL` during deployment. DNS, nginx virtual-host, and TLS changes remain external infrastructure operations.

## License

MIT
