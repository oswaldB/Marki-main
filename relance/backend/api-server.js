/**
 * Serveur API Marki - Routes SQLite
 * Serveur HTTP minimal avec routes CRUD complètes
 */

const http = require('http');
const url = require('url');
const { handleRequest } = require('./routes/api-routes');

const PORT = process.env.PORT || 5000;

// Parser le body JSON
const parseBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
  });
};

const server = http.createServer(async (req, res) => {
  // CORS - DOIT être défini AVANT toute réponse
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Preflight OPTIONS - répondre immédiatement
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Health check
  if (pathname === '/health' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // Déléguer toutes les routes API
  if (pathname.startsWith('/api/')) {
    await handleRequest(req, res);
    return;
  }

  // Route non trouvée
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`✅ API Server running on http://localhost:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 Routes API disponibles sous /api/*`);
});

module.exports = server;
