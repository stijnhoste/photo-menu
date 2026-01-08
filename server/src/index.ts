import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDatabase } from './services/database.js';
import scanRouter from './routes/scan.js';
import shareRouter from './routes/share.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3005;

// Security headers
app.use(helmet());

// CORS - restrict to known origins in production
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://menu.pictures', 'https://www.menu.pictures']
    : true,
  credentials: false
}));

// Reduced JSON limit to prevent DoS (5MB supports ~10 compressed menu images)
app.use(express.json({ limit: '5mb' }));

// Trust proxy for rate limiting (when behind nginx)
app.set('trust proxy', 1);

// Initialize database
initDatabase();

// API routes
app.use('/api/scan', scanRouter);
app.use('/api/share', shareRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));

  // SPA fallback - use {*splat} syntax for Express 5
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Global error handler - must be last middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err.message);
  // Don't leak error details to client
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
