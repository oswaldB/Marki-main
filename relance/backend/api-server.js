/**
 * Serveur API minimal pour Marki
 * Routes pour les workflows backend
 */

const http = require('http');
const url = require('url');
const path = require('path');

// Initialiser la DB
const FlatFileDB = require('./lib/flat-file-db');
const db = new FlatFileDB(path.join(__dirname, 'data'));

// Importer les workflows
const authLogin = require('./auth-login');

const PORT = 5000;

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

  // Auth Login - POST /api/auth/login
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const result = await authLogin.login(body, db);
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(result.status);
      res.end(JSON.stringify(result.status === 200 ? result.data : { error: result.error }));
    } catch (err) {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Invalid request' }));
    }
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
  console.log(`🔐 Auth login: POST http://localhost:${PORT}/api/auth/login`);
});

module.exports = server;
