/**
 * Routes API CRUD pour Marki
 * Toutes les routes RESTful pour les entités principales
 */

const SQLiteDB = require('../lib/sqlite-db');
const AuthLocal = require('../lib/auth-local');

// Initialiser la base de données
const db = new SQLiteDB();

/**
 * Middleware d'authentification JWT
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Token manquant' }));
    return;
  }

  const token = authHeader.substring(7);
  const session = db.getSessionByToken(token);
  
  if (!session) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Token invalide ou expiré' }));
    return;
  }

  const user = db.read('users', session.user_id);
  if (!user || !user.is_active) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Utilisateur invalide' }));
    return;
  }

  req.user = user;
  next();
}

/**
 * Middleware optionnel d'authentification (pour routes publiques avec auth optionnelle)
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = db.getSessionByToken(token);
    if (session) {
      const user = db.read('users', session.user_id);
      if (user && user.is_active) {
        req.user = user;
      }
    }
  }
  
  next();
}

/**
 * Vérifie si l'utilisateur est admin
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Accès réservé aux administrateurs' }));
    return;
  }
  next();
}

/**
 * Parse le body JSON de la requête
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('JSON invalide'));
      }
    });
  });
}

/**
 * Génère une réponse JSON standardisée
 */
function jsonResponse(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/**
 * Extrait les paramètres de pagination des query string
 */
function getPaginationOptions(url) {
  const limit = parseInt(url.query.limit) || 50;
  const offset = parseInt(url.query.offset) || 0;
  return { limit: Math.min(limit, 500), offset: Math.max(offset, 0) };
}

// =============================================================================
// ROUTES API
// =============================================================================

const routes = [];

/**
 * Enregistre une route
 */
function register(method, path, handler, options = {}) {
  routes.push({ method: method.toUpperCase(), path, handler, ...options });
}

/**
 * Trouve la route correspondante
 */
function findRoute(method, pathname) {
  for (const route of routes) {
    if (route.method !== method) continue;
    
    // Route exacte
    if (route.path === pathname) {
      return { route, params: {} };
    }
    
    // Route avec paramètres (ex: /api/contacts/:id)
    const routeParts = route.path.split('/');
    const pathParts = pathname.split('/');
    
    if (routeParts.length === pathParts.length) {
      const params = {};
      let match = true;
      
      for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i].startsWith(':')) {
          params[routeParts[i].substring(1)] = pathParts[i];
        } else if (routeParts[i] !== pathParts[i]) {
          match = false;
          break;
        }
      }
      
      if (match) {
        return { route, params };
      }
    }
  }
  
  return null;
}

// =============================================================================
// AUTHENTIFICATION
// =============================================================================

// POST /api/auth/login
register('POST', '/api/auth/login', async (req, res, url) => {
  try {
    const body = await parseBody(req);
    const { username, email, password } = body;
    
    const loginField = username || email;
    
    if (!loginField || !password) {
      return jsonResponse(res, 400, { error: 'Identifiant et mot de passe requis' });
    }
    
    // Chercher par username d'abord, puis par email
    let user = db.getUserByUsername(loginField.trim());
    if (!user) {
      user = db.getUserByEmail(loginField.toLowerCase().trim());
    }
    
    if (!user || !user.is_active) {
      return jsonResponse(res, 401, { error: 'Identifiants invalides' });
    }
    
    const bcrypt = require('bcrypt');
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return jsonResponse(res, 401, { error: 'Identifiants invalides' });
    }
    
    // Générer JWT
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = 'Unlivable1-Subsector8-Stinging5-Truffle8-Composer4-Repeater8';
    const token = jwt.sign(
      { sub: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    // Sauvegarder session
    try {
      db.create('sessions', {
        id: `session_${Date.now()}`,
        user_id: user.id,
        token: token,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      });
    } catch (e) { /* ignore */ }
    
    // Mettre à jour stats
    db.update('users', user.id, {
      last_login: new Date().toISOString(),
      login_count: (user.login_count || 0) + 1
    });
    
    jsonResponse(res, 200, {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    jsonResponse(res, 500, { error: err.message });
  }
});

// POST /api/auth/logout
register('POST', '/api/auth/logout', async (req, res, url) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Supprimer la session
    const session = db.getSessionByToken(token);
    if (session) {
      db.delete('sessions', session.id);
    }
  }
  jsonResponse(res, 200, { message: 'Déconnexion réussie' });
}, { auth: true });

// GET /api/auth/me
register('GET', '/api/auth/me', async (req, res, url) => {
  const user = db.read('users', req.user.id);
  if (!user) {
    return jsonResponse(res, 404, { error: 'Utilisateur non trouvé' });
  }
  // Ne pas renvoyer le hash du mot de passe
  const { password_hash, ...userWithoutPassword } = user;
  jsonResponse(res, 200, { user: userWithoutPassword });
}, { auth: true });

// =============================================================================
// UTILISATEURS
// =============================================================================

// GET /api/users
register('GET', '/api/users', async (req, res, url) => {
  const { limit, offset } = getPaginationOptions(url);
  const { data, total } = db.search('users', { limit, offset });
  
  // Masquer les passwords
  const users = data.map(u => {
    const { password_hash, ...userWithoutPassword } = u;
    return userWithoutPassword;
  });
  
  jsonResponse(res, 200, { users, total, limit, offset });
}, { auth: true, admin: true });

// GET /api/users/:id
register('GET', '/api/users/:id', async (req, res, url, params) => {
  const user = db.read('users', params.id);
  if (!user) {
    return jsonResponse(res, 404, { error: 'Utilisateur non trouvé' });
  }
  
  const { password_hash, ...userWithoutPassword } = user;
  jsonResponse(res, 200, { user: userWithoutPassword });
}, { auth: true });

// POST /api/users
register('POST', '/api/users', async (req, res, url) => {
  try {
    const body = await parseBody(req);
    const { username, email, password, role = 'user' } = body;
    
    if (!username || !email || !password) {
      return jsonResponse(res, 400, { error: 'Username, email et password requis' });
    }
    
    // Vérifier si username ou email existe déjà
    if (db.getUserByUsername(username)) {
      return jsonResponse(res, 409, { error: 'Username déjà utilisé' });
    }
    if (db.getUserByEmail(email)) {
      return jsonResponse(res, 409, { error: 'Email déjà utilisé' });
    }
    
    const bcrypt = require('bcrypt');
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const password_hash = await bcrypt.hash(password, 10);
    
    const user = db.create('users', {
      id,
      username,
      email: email.toLowerCase().trim(),
      password_hash,
      role,
      is_active: 1,
      login_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    const { password_hash: _, ...userWithoutPassword } = user;
    jsonResponse(res, 201, { user: userWithoutPassword });
  } catch (err) {
    jsonResponse(res, 500, { error: err.message });
  }
}, { auth: true, admin: true });

// PUT /api/users/:id
register('PUT', '/api/users/:id', async (req, res, url, params) => {
  try {
    const body = await parseBody(req);
    const existing = db.read('users', params.id);
    
    if (!existing) {
      return jsonResponse(res, 404, { error: 'Utilisateur non trouvé' });
    }
    
    // Seul un admin ou l'utilisateur lui-même peut modifier
    if (req.user.role !== 'admin' && req.user.id !== params.id) {
      return jsonResponse(res, 403, { error: 'Permission refusée' });
    }
    
    // Un non-admin ne peut pas changer son rôle
    const updates = { ...body };
    if (req.user.role !== 'admin' && body.role) {
      delete updates.role;
    }
    
    // Empêcher la suppression du dernier admin
    if (updates.role && updates.role !== 'admin' && existing.role === 'admin') {
      const admins = db.search('users', { where: { role: 'admin', is_active: 1 } });
      if (admins.data.length <= 1) {
        return jsonResponse(res, 400, { error: 'Impossible de rétrograder le dernier admin' });
      }
    }
    
    delete updates.id;
    delete updates.password_hash;
    delete updates.created_at;
    
    db.update('users', params.id, updates);
    const user = db.read('users', params.id);
    const { password_hash, ...userWithoutPassword } = user;
    
    jsonResponse(res, 200, { user: userWithoutPassword });
  } catch (err) {
    jsonResponse(res, 500, { error: err.message });
  }
}, { auth: true });

// DELETE /api/users/:id
register('DELETE', '/api/users/:id', async (req, res, url, params) => {
  const existing = db.read('users', params.id);
  
  if (!existing) {
    return jsonResponse(res, 404, { error: 'Utilisateur non trouvé' });
  }
  
  // Empêcher la suppression du dernier admin
  if (existing.role === 'admin') {
    const admins = db.search('users', { where: { role: 'admin', is_active: 1 } });
    if (admins.data.length <= 1) {
      return jsonResponse(res, 400, { error: 'Impossible de supprimer le dernier admin' });
    }
  }
  
  // Soft delete
  db.update('users', params.id, { is_active: 0 });
  jsonResponse(res, 200, { message: 'Utilisateur désactivé' });
}, { auth: true, admin: true });

// POST /api/users/:id/reset-password
register('POST', '/api/users/:id/reset-password', async (req, res, url, params) => {
  try {
    const body = await parseBody(req);
    const { password } = body;
    
    if (!password || password.length < 6) {
      return jsonResponse(res, 400, { error: 'Mot de passe requis (min 6 caractères)' });
    }
    
    const bcrypt = require('bcrypt');
    const password_hash = await bcrypt.hash(password, 10);
    
    db.update('users', params.id, { password_hash });
    jsonResponse(res, 200, { message: 'Mot de passe réinitialisé' });
  } catch (err) {
    jsonResponse(res, 500, { error: err.message });
  }
}, { auth: true, admin: true });

// =============================================================================
// CONTACTS
// =============================================================================

// GET /api/contacts
register('GET', '/api/contacts', async (req, res, url) => {
  const { limit, offset } = getPaginationOptions(url);
  const where = {};
  
  if (url.query.statut) where.statut = url.query.statut;
  if (url.query.is_blacklisted !== undefined) {
    where.is_blacklisted = url.query.is_blacklisted === 'true' || url.query.is_blacklisted === '1' ? 1 : 0;
  }
  if (url.query.type_personne) where.type_personne = url.query.type_personne;
  
  const { data, total } = db.search('contacts', { where, limit, offset, orderBy: 'nom' });
  jsonResponse(res, 200, { contacts: data, total, limit, offset });
}, { auth: true });

// GET /api/contacts/:id
register('GET', '/api/contacts/:id', async (req, res, url, params) => {
  const contact = db.getContactFull(params.id);
  
  if (!contact) {
    return jsonResponse(res, 404, { error: 'Contact non trouvé' });
  }
  
  jsonResponse(res, 200, { contact });
}, { auth: true });

// GET /api/contacts/:id/impayes
register('GET', '/api/contacts/:id/impayes', async (req, res, url, params) => {
  const impayes = db.getImpayesByContact(params.id, { 
    factureSoldee: url.query.solde === 'true' ? null : 0 
  });
  jsonResponse(res, 200, { impayes });
}, { auth: true });

// POST /api/contacts
register('POST', '/api/contacts', async (req, res, url) => {
  try {
    const body = await parseBody(req);
    const id = `cont_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const contact = db.create('contacts', {
      id,
      nom: body.nom,
      prenom: body.prenom || null,
      email: body.email || null,
      telephone: body.telephone || null,
      type: body.type || null,
      type_personne: body.type_personne || 'P',
      statut: body.statut || 'actif',
      is_blacklisted: 0,
      civilite: body.civilite || null,
      code: body.code || null,
      societe: body.societe || null,
      activite_societe: body.activite_societe || null,
      adresse_rue: body.adresse_rue || null,
      adresse_ville: body.adresse_ville || null,
      adresse_code_postal: body.adresse_code_postal || null,
      adresse_pays: body.adresse_pays || 'France',
      notes: body.notes ? JSON.stringify(body.notes) : '[]',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    jsonResponse(res, 201, { contact });
  } catch (err) {
    jsonResponse(res, 500, { error: err.message });
  }
}, { auth: true });

// PUT /api/contacts/:id
register('PUT', '/api/contacts/:id', async (req, res, url, params) => {
  try {
    const body = await parseBody(req);
    const existing = db.read('contacts', params.id);
    
    if (!existing) {
      return jsonResponse(res, 404, { error: 'Contact non trouvé' });
    }
    
    const updates = { ...body };
    delete updates.id;
    delete updates.created_at;
    
    if (updates.notes) {
      updates.notes = JSON.stringify(updates.notes);
    }
    
    db.update('contacts', params.id, updates);
    const contact = db.getContactFull(params.id);
    
    jsonResponse(res, 200, { contact });
  } catch (err) {
    jsonResponse(res, 500, { error: err.message });
  }
}, { auth: true });

// DELETE /api/contacts/:id
register('DELETE', '/api/contacts/:id', async (req, res, url, params) => {
  // Vérifier s'il y a des impayés liés
  const impayes = db.getImpayesByContact(params.id);
  if (impayes.length > 0) {
    return jsonResponse(res, 400, { 
      error: 'Impossible de supprimer: des impayés sont liés à ce contact',
      impayes_count: impayes.length
    });
  }
  
  db.delete('contacts', params.id);
  jsonResponse(res, 200, { message: 'Contact supprimé' });
}, { auth: true });

// POST /api/contacts/:id/blacklist
register('POST', '/api/contacts/:id/blacklist', async (req, res, url, params) => {
  try {
    const body = await parseBody(req);
    const contact = db.read('contacts', params.id);
    
    if (!contact) {
      return jsonResponse(res, 404, { error: 'Contact non trouvé' });
    }
    
    const isBlacklisted = !contact.is_blacklisted;
    const updates = { is_blacklisted: isBlacklisted ? 1 : 0 };
    
    if (isBlacklisted) {
      updates.blacklist_date = new Date().toISOString();
      updates.blacklist_motif = body.motif || null;
    } else {
      updates.blacklist_date = null;
      updates.blacklist_motif = null;
    }
    
    db.update('contacts', params.id, updates);
    const updated = db.read('contacts', params.id);
    
    jsonResponse(res, 200, { 
      contact: updated,
      action: isBlacklisted ? 'blacklisté' : 'retiré de la blacklist'
    });
  } catch (err) {
    jsonResponse(res, 500, { error: err.message });
  }
}, { auth: true });

// POST /api/contacts/:id/notes
register('POST', '/api/contacts/:id/notes', async (req, res, url, params) => {
  try {
    const body = await parseBody(req);
    const { content } = body;
    
    if (!content) {
      return jsonResponse(res, 400, { error: 'Contenu de la note requis' });
    }
    
    const contact = db.read('contacts', params.id);
    if (!contact) {
      return jsonResponse(res, 404, { error: 'Contact non trouvé' });
    }
    
    const notes = JSON.parse(contact.notes || '[]');
    const newNote = {
      id: `note_${Date.now()}`,
      content,
      created_by: req.user.id,
      created_by_name: req.user.username,
      created_at: new Date().toISOString()
    };
    
    notes.push(newNote);
    db.update('contacts', params.id, { notes: JSON.stringify(notes) });
    
    jsonResponse(res, 201, { note: newNote });
  } catch (err) {
    jsonResponse(res, 500, { error: err.message });
  }
}, { auth: true });

// =============================================================================
// IMPAYES
// =============================================================================

// GET /api/impayes
register('GET', '/api/impayes', async (req, res, url) => {
  const { limit, offset } = getPaginationOptions(url);
  const options = { limit, offset };
  
  if (url.query.statut) options.statut = url.query.statut;
  if (url.query.facture_soldee !== undefined) {
    options.factureSoldee = url.query.facture_soldee === 'true' || url.query.facture_soldee === '1' ? 1 : 0;
  }
  if (url.query.order_by) options.orderBy = url.query.order_by;
  if (url.query.order) options.order = url.query.order.toUpperCase();
  
  const impayes = db.getImpayesWithContacts(options);
  jsonResponse(res, 200, { impayes });
}, { auth: true });

// GET /api/impayes/:id
register('GET', '/api/impayes/:id', async (req, res, url, params) => {
  const impaye = db.read('impayes', params.id);
  
  if (!impaye) {
    return jsonResponse(res, 404, { error: 'Impayé non trouvé' });
  }
  
  // Charger les infos du contact
  const contact = db.read('contacts', impaye.contact_relance_id);
  jsonResponse(res, 200, { impaye: { ...impaye, contact } });
}, { auth: true });

// POST /api/impayes
register('POST', '/api/impayes', async (req, res, url) => {
  try {
    const body = await parseBody(req);
    const id = `imp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const impaye = db.create('impayes', {
      id,
      payer_id: body.payer_id || null,
      contact_relance_id: body.contact_relance_id || null,
      proprietaire_id: body.proprietaire_id || null,
      apporteur_id: body.apporteur_id || null,
      sequence_id: body.sequence_id || null,
      nfacture: body.nfacture,
      date_facture: body.date_facture || null,
      date_echeance: body.date_echeance,
      date_piece: body.date_piece || null,
      date_import: new Date().toISOString(),
      montant_ttc: body.montant_ttc || 0,
      solde_du: body.solde_du || 0,
      reste_a_payer: body.reste_a_payer || body.montant_ttc || 0,
      statut: body.statut || 'impaye',
      facture_soldee: 0,
      id_dossier: body.id_dossier || null,
      numero_dossier: body.numero_dossier || null,
      adresse_bien: body.adresse_bien || null,
      code_postal: body.code_postal || null,
      ville: body.ville || null,
      payeur_nom: body.payeur_nom || null,
      payeur_prenom: body.payeur_prenom || null,
      payeur_email: body.payeur_email || null,
      payeur_telephone: body.payeur_telephone || null,
      url_pdf: body.url_pdf || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    jsonResponse(res, 201, { impaye });
  } catch (err) {
    jsonResponse(res, 500, { error: err.message });
  }
}, { auth: true });

// PUT /api/impayes/:id
register('PUT', '/api/impayes/:id', async (req, res, url, params) => {
  try {
    const body = await parseBody(req);
    const existing = db.read('impayes', params.id);
    
    if (!existing) {
      return jsonResponse(res, 404, { error: 'Impayé non trouvé' });
    }
    
    const updates = { ...body };
    delete updates.id;
    delete updates.created_at;
    
    db.update('impayes', params.id, updates);
    const impaye = db.read('impayes', params.id);
    
    jsonResponse(res, 200, { impaye });
  } catch (err) {
    jsonResponse(res, 500, { error: err.message });
  }
}, { auth: true });

// POST /api/impayes/:id/suspend
register('POST', '/api/impayes/:id/suspend', async (req, res, url, params) => {
  try {
    const body = await parseBody(req);
    const existing = db.read('impayes', params.id);
    
    if (!existing) {
      return jsonResponse(res, 404, { error: 'Impayé non trouvé' });
    }
    
    db.update('impayes', params.id, {
      is_blacklisted: 1,
      blacklist_date: new Date().toISOString(),
      blacklist_motif: body.motif || 'Suspension manuelle'
    });
    
    // Annuler les relances associées
    db.run(`
      UPDATE relances 
      SET statut = 'suspendue', updated_at = CURRENT_TIMESTAMP
      WHERE contact_id = ? AND statut IN ('brouillon', 'pret pour envoi', 'planifiee')
    `, [existing.contact_relance_id]);
    
    jsonResponse(res, 200, { message: 'Impayé suspendu et relances annulées' });
  } catch (err) {
    jsonResponse(res, 500, { error: err.message });
  }
}, { auth: true });

// POST /api/impayes/:id/unsuspend
register('POST', '/api/impayes/:id/unsuspend', async (req, res, url, params) => {
  try {
    const existing = db.read('impayes', params.id);
    
    if (!existing) {
      return jsonResponse(res, 404, { error: 'Impayé non trouvé' });
    }
    
    db.update('impayes', params.id, {
      is_blacklisted: 0,
      blacklist_date: null,
      blacklist_motif: null
    });
    
    jsonResponse(res, 200, { message: 'Impayé réactivé' });
  } catch (err) {
    jsonResponse(res, 500, { error: err.message });
  }
}, { auth: true });

// =============================================================================
// RELANCES
// =============================================================================

// GET /api/relances
register('GET', '/api/relances', async (req, res, url) => {
  const { limit, offset } = getPaginationOptions(url);
  const options = { limit, offset };
  
  if (url.query.statut) options.statut = url.query.statut;
  if (url.query.valide !== undefined) {
    options.valide = url.query.valide === 'true' || url.query.valide === '1' ? 1 : 0;
  }
  
  const relances = db.getRelancesWithDetails(options);
  jsonResponse(res, 200, { relances });
}, { auth: true });

// GET /api/relances/a-valider
register('GET', '/api/relances/a-valider', async (req, res, url) => {
  const relances = db.getRelancesAValider();
  jsonResponse(res, 200, { relances });
}, { auth: true });

// GET /api/relances/a-envoyer
register('GET', '/api/relances/a-envoyer', async (req, res, url) => {
  const relances = db.getRelancesAEnvoyer();
  jsonResponse(res, 200, { relances });
}, { auth: true });

// GET /api/relances/:id
register('GET', '/api/relances/:id', async (req, res, url, params) => {
  const relance = db.read('relances', params.id);
  
  if (!relance) {
    return jsonResponse(res, 404, { error: 'Relance non trouvée' });
  }
  
  const contact = db.read('contacts', relance.contact_id);
  const sequence = db.read('sequences', relance.sequence_id);
  
  jsonResponse(res, 200, { relance: { ...relance, contact, sequence } });
}, { auth: true });

// POST /api/relances
register('POST', '/api/relances', async (req, res, url) => {
  try {
    const body = await parseBody(req);
    const id = `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const relance = db.create('relances', {
      id,
      contact_id: body.contact_id,
      sequence_id: body.sequence_id,
      statut: body.statut || 'brouillon',
      date_envoi: body.date_envoi || null,
      date_programmation: body.date_programmation || null,
      sujet: body.sujet,
      corps: body.corps,
      email_envoye_a: body.email_envoye_a || null,
      valide: 0,
      manuelle: body.manuelle || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    jsonResponse(res, 201, { relance });
  } catch (err) {
    jsonResponse(res, 500, { error: err.message });
  }
}, { auth: true });

// PUT /api/relances/:id
register('PUT', '/api/relances/:id', async (req, res, url, params) => {
  try {
    const body = await parseBody(req);
    const existing = db.read('relances', params.id);
    
    if (!existing) {
      return jsonResponse(res, 404, { error: 'Relance non trouvée' });
    }
    
    const updates = { ...body };
    delete updates.id;
    delete updates.created_at;
    
    db.update('relances', params.id, updates);
    const relance = db.read('relances', params.id);
    
    jsonResponse(res, 200, { relance });
  } catch (err) {
    jsonResponse(res, 500, { error: err.message });
  }
}, { auth: true });

// POST /api/relances/:id/validate
register('POST', '/api/relances/:id/validate', async (req, res, url, params) => {
  try {
    const existing = db.read('relances', params.id);
    
    if (!existing) {
      return jsonResponse(res, 404, { error: 'Relance non trouvée' });
    }
    
    db.update('relances', params.id, {
      valide: 1,
      statut: 'pret pour envoi'
    });
    
    jsonResponse(res, 200, { message: 'Relance validée' });
  } catch (err) {
    jsonResponse(res, 500, { error: err.message });
  }
}, { auth: true });

// DELETE /api/relances/:id
register('DELETE', '/api/relances/:id', async (req, res, url, params) => {
  db.delete('relances', params.id);
  jsonResponse(res, 200, { message: 'Relance supprimée' });
}, { auth: true });

// =============================================================================
// SEQUENCES
// =============================================================================

// GET /api/sequences
register('GET', '/api/sequences', async (req, res, url) => {
  const typeSequence = url.query.type || null;
  const sequences = db.getSequencesActives(typeSequence);
  jsonResponse(res, 200, { sequences });
}, { auth: true });

// GET /api/sequences/:id
register('GET', '/api/sequences/:id', async (req, res, url, params) => {
  const sequence = db.getSequenceWithEmails(params.id);
  
  if (!sequence) {
    return jsonResponse(res, 404, { error: 'Séquence non trouvée' });
  }
  
  jsonResponse(res, 200, { sequence });
}, { auth: true });

// POST /api/sequences
register('POST', '/api/sequences', async (req, res, url) => {
  try {
    const body = await parseBody(req);
    const id = `seq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const sequence = db.create('sequences', {
      id,
      nom: body.nom,
      type_sequence: body.type_sequence,
      niveau: body.niveau || 0,
      actif: 1,
      validation_obligatoire: body.validation_obligatoire || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    jsonResponse(res, 201, { sequence });
  } catch (err) {
    jsonResponse(res, 500, { error: err.message });
  }
}, { auth: true, admin: true });

// PUT /api/sequences/:id
register('PUT', '/api/sequences/:id', async (req, res, url, params) => {
  try {
    const body = await parseBody(req);
    const existing = db.read('sequences', params.id);
    
    if (!existing) {
      return jsonResponse(res, 404, { error: 'Séquence non trouvée' });
    }
    
    const updates = { ...body };
    delete updates.id;
    delete updates.created_at;
    
    db.update('sequences', params.id, updates);
    const sequence = db.getSequenceWithEmails(params.id);
    
    jsonResponse(res, 200, { sequence });
  } catch (err) {
    jsonResponse(res, 500, { error: err.message });
  }
}, { auth: true, admin: true });

// DELETE /api/sequences/:id
register('DELETE', '/api/sequences/:id', async (req, res, url, params) => {
  // Soft delete
  db.update('sequences', params.id, { actif: 0 });
  jsonResponse(res, 200, { message: 'Séquence désactivée' });
}, { auth: true, admin: true });

// =============================================================================
// SMTP PROFILES
// =============================================================================

// GET /api/smtp-profiles
register('GET', '/api/smtp-profiles', async (req, res, url) => {
  const profiles = db.getSmtpProfilesActifs();
  // Masquer les mots de passe
  const safeProfiles = profiles.map(p => ({ ...p, password: '***' }));
  jsonResponse(res, 200, { profiles: safeProfiles });
}, { auth: true });

// GET /api/smtp-profiles/:id
register('GET', '/api/smtp-profiles/:id', async (req, res, url, params) => {
  const profile = db.read('smtp_profiles', params.id);
  
  if (!profile) {
    return jsonResponse(res, 404, { error: 'Profil SMTP non trouvé' });
  }
  
  jsonResponse(res, 200, { profile: { ...profile, password: '***' } });
}, { auth: true });

// POST /api/smtp-profiles
register('POST', '/api/smtp-profiles', async (req, res, url) => {
  try {
    const body = await parseBody(req);
    const id = `smtp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const profile = db.create('smtp_profiles', {
      id,
      nom: body.nom,
      host: body.host,
      port: body.port || 587,
      secure: body.secure || 0,
      username: body.username,
      password: body.password,
      from_email: body.from_email,
      from_name: body.from_name,
      actif: 1,
      is_default: body.is_default || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    jsonResponse(res, 201, { profile: { ...profile, password: '***' } });
  } catch (err) {
    jsonResponse(res, 500, { error: err.message });
  }
}, { auth: true, admin: true });

// PUT /api/smtp-profiles/:id
register('PUT', '/api/smtp-profiles/:id', async (req, res, url, params) => {
  try {
    const body = await parseBody(req);
    const existing = db.read('smtp_profiles', params.id);
    
    if (!existing) {
      return jsonResponse(res, 404, { error: 'Profil SMTP non trouvé' });
    }
    
    const updates = { ...body };
    delete updates.id;
    delete updates.created_at;
    
    db.update('smtp_profiles', params.id, updates);
    const profile = db.read('smtp_profiles', params.id);
    
    jsonResponse(res, 200, { profile: { ...profile, password: '***' } });
  } catch (err) {
    jsonResponse(res, 500, { error: err.message });
  }
}, { auth: true, admin: true });

// DELETE /api/smtp-profiles/:id
register('DELETE', '/api/smtp-profiles/:id', async (req, res, url, params) => {
  db.update('smtp_profiles', params.id, { actif: 0 });
  jsonResponse(res, 200, { message: 'Profil SMTP désactivé' });
}, { auth: true, admin: true });

// =============================================================================
// EVENTS
// =============================================================================

// GET /api/events
register('GET', '/api/events', async (req, res, url) => {
  const { limit, offset } = getPaginationOptions(url);
  const where = {};
  
  if (url.query.read !== undefined) {
    where.read = url.query.read === 'true' || url.query.read === '1' ? 1 : 0;
  }
  if (url.query.type) where.type = url.query.type;
  
  const { data, total } = db.search('events', { where, limit, offset, orderBy: 'created_at', order: 'DESC' });
  jsonResponse(res, 200, { events: data, total, limit, offset });
}, { auth: true });

// GET /api/events/non-lus
register('GET', '/api/events/non-lus', async (req, res, url) => {
  const limit = parseInt(url.query.limit) || 50;
  const events = db.getEventsNonLus(limit);
  jsonResponse(res, 200, { events });
}, { auth: true });

// POST /api/events
register('POST', '/api/events', async (req, res, url) => {
  try {
    const body = await parseBody(req);
    const id = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const event = db.create('events', {
      id,
      type: body.type,
      titre: body.titre,
      description: body.description || null,
      entity_type: body.entity_type || null,
      entity_id: body.entity_id || null,
      read: 0,
      created_at: new Date().toISOString()
    });
    
    jsonResponse(res, 201, { event });
  } catch (err) {
    jsonResponse(res, 500, { error: err.message });
  }
}, { auth: true });

// POST /api/events/:id/lu
register('POST', '/api/events/:id/lu', async (req, res, url, params) => {
  db.update('events', params.id, { read: 1 });
  jsonResponse(res, 200, { message: 'Événement marqué comme lu' });
}, { auth: true });

// POST /api/events/marquer-lus
register('POST', '/api/events/marquer-lus', async (req, res, url) => {
  try {
    const body = await parseBody(req);
    const { ids } = body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return jsonResponse(res, 400, { error: 'Liste d\'IDs requise' });
    }
    
    db.marquerEventsLus(ids);
    jsonResponse(res, 200, { message: `${ids.length} événements marqués comme lus` });
  } catch (err) {
    jsonResponse(res, 500, { error: err.message });
  }
}, { auth: true });

// =============================================================================
// DASHBOARD
// =============================================================================

// GET /api/dashboard/stats
register('GET', '/api/dashboard/stats', async (req, res, url) => {
  const stats = db.getDashboardStats();
  jsonResponse(res, 200, stats);
}, { auth: true });

// =============================================================================
// EXPORT ET GESTION DES ROUTES
// =============================================================================

/**
 * Gestionnaire principal de requêtes
 */
async function handleRequest(req, res) {
  const url = require('url').parse(req.url, true);
  const pathname = url.pathname;
  
  // Trouver la route
  const routeMatch = findRoute(req.method, pathname);
  
  if (!routeMatch) {
    return jsonResponse(res, 404, { error: 'Route non trouvée' });
  }
  
  const { route, params } = routeMatch;
  
  // Vérifier l'authentification
  if (route.auth) {
    const authResult = await new Promise((resolve) => {
      requireAuth(req, res, () => resolve({ success: true }));
      // Si requireAuth envoie une réponse, la promesse ne se résout pas
      // Donc on vérifie si res.headersSent
      if (res.headersSent) {
        resolve({ success: false });
      }
    });
    
    if (!authResult.success) return;
    
    // Vérifier si admin requis
    if (route.admin && req.user.role !== 'admin') {
      return jsonResponse(res, 403, { error: 'Accès réservé aux administrateurs' });
    }
  }
  
  // Exécuter le handler
  try {
    await route.handler(req, res, url, params);
  } catch (err) {
    console.error('Erreur route:', err);
    jsonResponse(res, 500, { error: 'Erreur serveur', message: err.message });
  }
}

module.exports = {
  handleRequest,
  db,
  requireAuth,
  requireAdmin
};
