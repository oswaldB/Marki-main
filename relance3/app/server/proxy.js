/**
 * 🔐 Proxy API Sécurisé - CouchDB
 * 
 * Ce serveur fait le pont entre le frontend et CouchDB :
 * - Authentification JWT (login/logout)
 * - Vérification bcrypt des mots de passe
 * - Proxy sécurisé vers CouchDB (localhost:5984)
 * - Permissions (admin vs user)
 * 
 * Le frontend N'A PLUS les credentials CouchDB !
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import nano from 'nano';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'changez-cette-cle-en-production-32-caracteres-min';
const COUCHDB_URL = process.env.COUCHDB_URL || 'http://localhost:5984/marki';
const COUCHDB_USER = process.env.COUCHDB_USER || 'oswald';
const COUCHDB_PASSWORD = process.env.COUCHDB_PASSWORD || 'Citron6-Mustang8';

// Construction URL avec auth pour CouchDB
const COUCHDB_URL_WITH_AUTH = `http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@localhost:5984`;

// Connexion CouchDB - connexion au serveur, puis use de la base
const nanoConnection = nano(COUCHDB_URL_WITH_AUTH);
const db = nanoConnection.use('marki');

// Express app
const app = express();
app.use(express.json());

// CORS headers
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
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// ═══════════════════════════════════════════════════════════════
// 🔐 MIDDLEWARE D'AUTHENTIFICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Vérifie le token JWT
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            error: 'Token manquent',
            code: 'NO_TOKEN'
        });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                error: 'Token invalide ou expiré',
                code: 'INVALID_TOKEN'
            });
        }
        req.user = user;
        next();
    });
}

/**
 * Vérifie si l'utilisateur est admin
 */
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            error: 'Accès interdit - Admin requis',
            code: 'FORBIDDEN'
        });
    }
    next();
}

// ═══════════════════════════════════════════════════════════════
// 🔓 ROUTES PUBLIQUES
// ═══════════════════════════════════════════════════════════════

/**
 * Health check
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
 * 🔑 Login
 * POST /api/auth/login
 */
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            error: 'Username et password requis' 
        });
    }
    
    try {
        // Chercher l'utilisateur dans CouchDB
        const result = await db.find({
            selector: { 
                table: 'users', 
                username: username 
            },
            limit: 1
        });
        
        const user = result.docs[0];
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Utilisateur non trouvé',
                code: 'USER_NOT_FOUND'
            });
        }
        
        // Vérifier le mot de passe (bcrypt)
        const valid = await bcrypt.compare(password, user.password_hash);
        
        if (!valid) {
            return res.status(401).json({ 
                success: false, 
                error: 'Mot de passe incorrect',
                code: 'INVALID_PASSWORD'
            });
        }
        
        // Générer JWT
        const token = jwt.sign(
            { 
                userId: user._id, 
                username: user.username, 
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        // Créer une session
        const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const session = {
            _id: `sessions:${sessionId}`,
            table: 'sessions',
            user_id: user._id,
            token: token,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            ip_address: req.ip,
            user_agent: req.headers['user-agent'] || 'unknown',
            created_at: new Date().toISOString()
        };
        
        await db.insert(session);
        
        console.log(`✅ Login réussi: ${username} (${user.role})`);
        
        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                is_active: user.is_active
            }
        });
        
    } catch (err) {
        console.error('❌ Erreur login:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur serveur',
            details: err.message 
        });
    }
});

/**
 * 🔓 Logout
 * POST /api/auth/logout
 */
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
    try {
        // Supprimer la session
        const sessions = await db.find({
            selector: { 
                table: 'sessions',
                user_id: req.user.userId
            }
        });
        
        for (const session of sessions.docs) {
            await db.destroy(session._id, session._rev);
        }
        
        res.json({ success: true, message: 'Déconnecté' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// 🔒 ROUTES PROTÉGÉES (nécessitent JWT)
// ═══════════════════════════════════════════════════════════════

/**
 * 👤 Profil utilisateur connecté
 * GET /api/me
 */
app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const user = await db.get(req.user.userId);
        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                last_login: user.last_login
            }
        });
    } catch (err) {
        res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }
});

/**
 * 👥 Liste des utilisateurs (Admin uniquement)
 * GET /api/users
 */
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await db.find({
            selector: { table: 'users' }
        });
        
        // Ne pas renvoyer les password_hash
        const users = result.docs.map(u => ({
            id: u._id,
            username: u.username,
            email: u.email,
            role: u.role,
            is_active: u.is_active,
            last_login: u.last_login,
            created_at: u.created_at
        }));
        
        res.json({ success: true, users });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 📄 Requête Mango sécurisée vers CouchDB
 * POST /api/db/find
 */
app.post('/api/db/find', authenticateToken, async (req, res) => {
    try {
        const { selector, limit = 50 } = req.body;
        
        // Sécurité : filtrer selon le rôle
        const securedSelector = { ...selector };
        
        // Un user normal ne voit que ses propres documents
        if (req.user.role === 'user' && selector.table !== 'users') {
            securedSelector.owner = req.user.username;
        }
        
        const result = await db.find({ 
            selector: securedSelector, 
            limit 
        });
        
        res.json({ 
            success: true, 
            docs: result.docs,
            count: result.docs.length 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 📄 Récupérer un document par ID
 * GET /api/db/:docId
 */
app.get('/api/db/:docId', authenticateToken, async (req, res) => {
    try {
        const doc = await db.get(req.params.docId);
        
        // Vérifier permissions
        if (req.user.role === 'user' && doc.owner !== req.user.username) {
            return res.status(403).json({ 
                success: false, 
                error: 'Accès interdit à ce document' 
            });
        }
        
        res.json({ success: true, doc });
    } catch (err) {
        if (err.statusCode === 404) {
            return res.status(404).json({ success: false, error: 'Document non trouvé' });
        }
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 📝 Créer un document
 * POST /api/db
 */
app.post('/api/db', authenticateToken, async (req, res) => {
    try {
        const doc = {
            ...req.body,
            created_by: req.user.username,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const result = await db.insert(doc);
        res.json({ success: true, result, doc });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 📝 Mettre à jour un document
 * PUT /api/db/:docId
 */
app.put('/api/db/:docId', authenticateToken, async (req, res) => {
    try {
        const existing = await db.get(req.params.docId);
        
        // Vérifier permissions
        if (req.user.role === 'user' && existing.owner !== req.user.username) {
            return res.status(403).json({ 
                success: false, 
                error: 'Modification non autorisée' 
            });
        }
        
        const doc = {
            ...existing,
            ...req.body,
            _id: existing._id,
            _rev: existing._rev,
            updated_at: new Date().toISOString(),
            updated_by: req.user.username
        };
        
        const result = await db.insert(doc);
        res.json({ success: true, result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 🗑️ Supprimer un document
 * DELETE /api/db/:docId
 */
app.delete('/api/db/:docId', authenticateToken, async (req, res) => {
    try {
        const existing = await db.get(req.params.docId);
        
        // Vérifier permissions
        if (req.user.role === 'user' && existing.owner !== req.user.username) {
            return res.status(403).json({ 
                success: false, 
                error: 'Suppression non autorisée' 
            });
        }
        
        await db.destroy(existing._id, existing._rev);
        res.json({ success: true, message: 'Document supprimé' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// GESTION DES ERREURS
// ═══════════════════════════════════════════════════════════════

app.use((err, req, res, next) => {
    console.error('❌ Erreur non gérée:', err);
    res.status(500).json({
        success: false,
        error: 'Erreur serveur interne',
        code: 'INTERNAL_ERROR'
    });
});

// ═══════════════════════════════════════════════════════════════
// DÉMARRAGE
// ═══════════════════════════════════════════════════════════════

app.listen(PORT, () => {
    console.log('═══════════════════════════════════════════');
    console.log('🔐 Proxy API Sécurisé démarré');
    console.log(`📍 Port: ${PORT}`);
    console.log(`🗄️  CouchDB: ${COUCHDB_URL}`);
    console.log(`🔑 Auth: JWT (24h expiry)`);
    console.log('═══════════════════════════════════════════');
    console.log('');
    console.log('Endpoints:');
    console.log('  🔓 POST /api/auth/login    - Login');
    console.log('  🔓 POST /api/auth/logout   - Logout');
    console.log('  🔒 GET  /api/me            - Profil');
    console.log('  🔒 GET  /api/users          - Liste users (admin)');
    console.log('  🔒 POST /api/db/find        - Requête Mango');
    console.log('');
});
