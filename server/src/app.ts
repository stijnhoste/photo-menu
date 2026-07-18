import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { initDatabase } from './services/database.js';
import scanRouter from './routes/scan.js';
import shareRouter from './routes/share.js';
import chatRouter from './routes/chat.js';
import translateRouter from './routes/translate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://menu.pictures,https://www.menu.pictures,https://menu.photos,https://www.menu.photos')
    .split(',').map(origin => origin.trim()).filter(Boolean);

  app.use(helmet());
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? allowedOrigins : true,
    credentials: false
  }));
  app.use(express.json({ limit: '5mb' }));
  app.set('trust proxy', 1);
  initDatabase();

  app.use('/api', (req, res, next) => {
    const requestId = req.get('x-request-id')?.slice(0, 80) || randomUUID();
    const startedAt = performance.now();
    res.setHeader('x-request-id', requestId);
    res.on('finish', () => {
      console.log(JSON.stringify({
        type: 'http_request', requestId, method: req.method, path: req.originalUrl,
        status: res.statusCode, durationMs: Math.round(performance.now() - startedAt)
      }));
    });
    next();
  });

  app.use('/api/scan', scanRouter);
  app.use('/api/share', shareRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/translate', translateRouter);

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok', app: process.env.APP_NAME || 'menu.pictures',
      version: process.env.APP_VERSION || '1.0.0', timestamp: new Date().toISOString()
    });
  });

  if (process.env.NODE_ENV === 'production') {
    const clientDist = path.join(__dirname, '../../client/dist');
    app.use(express.static(clientDist));
    app.get('/{*splat}', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(JSON.stringify({ type: 'unhandled_error', message: err.message, stack: err.stack }));
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
