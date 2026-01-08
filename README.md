# menu.pictures

A PWA that photographs restaurant menus, extracts dish information using AI, and displays appetizing dish images.

**Live:** https://menu.pictures

## Features

- **Menu Scanning** - Capture or upload menu photos (supports multiple images)
- **AI Extraction** - Claude Haiku 4.5 extracts dish names, prices, and categories
- **Visual Display** - Pexels API provides appetizing images for each dish
- **Smart Search** - Filter dishes by name or category
- **Shareable Links** - Create links to share scanned menus (30-day expiry)
- **Offline Ready** - PWA with service worker support

## Tech Stack

- **Client:** React 19, Vite, TypeScript
- **Server:** Express 5, TypeScript
- **Database:** SQLite (better-sqlite3)
- **AI:** Anthropic Claude Haiku 4.5
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
cp server/.env.example server/.env
# Edit server/.env with your API keys
```

### Environment Variables

Create `server/.env`:

```env
ANTHROPIC_API_KEY=your_anthropic_key
PEXELS_API_KEY=your_pexels_key
DATABASE_PATH=./data/menus.sqlite
RATE_LIMIT_MAX=10
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
npm run start
```

## How It Works

1. User captures or uploads menu photo(s)
2. Images are compressed client-side (max 1024px)
3. Server sends images to Claude Haiku 4.5 for extraction
4. Each dish gets matched with a Pexels image (cached in SQLite)
5. Results stream back via SSE for progressive display

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scan` | POST | Scan menu images (SSE streaming) |
| `/api/scan/status` | GET | Check rate limit status |
| `/api/share` | POST | Create shareable menu link |
| `/api/share/:id` | GET | Retrieve shared menu |

## License

MIT
