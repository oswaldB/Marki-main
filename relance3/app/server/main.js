/**
 * Serveur Node.js pour dev.markidiags.com/api
 * Port: 5001
 */

import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Logger middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

/**
 * Health check endpoint
 * GET /health
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'api-server',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

/**
 * Test endpoint
 * GET /hello
 */
app.get('/hello', (req, res) => {
    res.json({
        message: 'Hello from Node.js API!',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Endpoint not found',
        path: req.path
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        status: 'error',
        message: 'Internal server error'
    });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log('═══════════════════════════════════════');
    console.log('🚀 Serveur API démarré');
    console.log(`📍 Port: ${PORT}`);
    console.log(`🔗 Health: http://localhost:${PORT}/health`);
    console.log('═══════════════════════════════════════');
});

export default app;
