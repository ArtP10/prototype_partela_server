/**
 * ═══════════════════════════════════════════════════════════════
 * PARTELA SERVER - Entry Point
 * Backend para el prototipo de pago digital de restaurantes
 * ═══════════════════════════════════════════════════════════════
 */

import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { config } from './config/environment';
import { initializeSocket } from './sockets';

// ─────────────────────────────────────────────────────────────
// EXPRESS SETUP
// ─────────────────────────────────────────────────────────────

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors({
    origin: config.corsOrigins,
    credentials: false
}));

app.use(express.json());

// ─────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv
    });
});

// API Info
app.get('/api', (req: Request, res: Response) => {
    res.json({
        name: 'Partela API',
        version: '1.0.0',
        description: 'Backend para el prototipo de pago digital de restaurantes',
        endpoints: {
            health: 'GET /health',
            api: 'GET /api'
        },
        websocket: {
            path: '/socket.io',
            events: {
                client: [
                    'table:join',
                    'table:leave',
                    'vote:cast',
                    'vote:change',
                    'split:toggle_item',
                    'split:confirm',
                    'payment:submit'
                ],
                server: [
                    'table:state',
                    'table:guest_joined',
                    'table:guest_left',
                    'vote:updated',
                    'vote:completed',
                    'split:updated',
                    'split:validated',
                    'payment:received',
                    'table:completed',
                    'error'
                ]
            }
        }
    });
});

// Create/Get Table (for demo purposes - generates table ID)
app.post('/api/tables', (req: Request, res: Response) => {
    const tableId = `MESA-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    res.json({
        tableId,
        joinUrl: `/mesa/${tableId}`,
        message: 'Mesa creada. Escanea el QR o usa el link para unirte.'
    });
});

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.path}`
    });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('[Server] Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: config.isProduction ? 'Something went wrong' : err.message
    });
});

// ─────────────────────────────────────────────────────────────
// SOCKET.IO SETUP
// ─────────────────────────────────────────────────────────────

initializeSocket(httpServer);

// ─────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────

httpServer.listen(config.port, '0.0.0.0', () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  🍽️  PARTELA SERVER');
    console.log('  Backend para pago digital de restaurantes');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log(`  🚀 Server running on port ${config.port}`);
    console.log(`  📍 Environment: ${config.nodeEnv}`);
    console.log(`  🔗 Health check: http://localhost:${config.port}/health`);
    console.log(`  📡 WebSocket ready`);
    console.log('');
    console.log('  CORS Origins:');
    config.corsOrigins.forEach(origin => {
        console.log(`    - ${origin}`);
    });
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
});

// ─────────────────────────────────────────────────────────────
// GRACEFUL SHUTDOWN
// ─────────────────────────────────────────────────────────────

process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM received. Shutting down gracefully...');
    httpServer.close(() => {
        console.log('[Server] Server closed.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n[Server] SIGINT received. Shutting down gracefully...');
    httpServer.close(() => {
        console.log('[Server] Server closed.');
        process.exit(0);
    });
});
