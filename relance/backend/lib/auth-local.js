/**
 * Système d'authentification local sans Express
 * Flat-files YAML - JWT + bcrypt
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

// Configuration
const JWT_SECRET = 'Unlivable1-Subsector8-Stinging5-Truffle8-Composer4-Repeater8';
const JWT_EXPIRES = '15m';
const REFRESH_EXPIRES_DAYS = 7;

// Contexte d'exécution courant (simule req.user d'Express)
let currentContext = null;

class AuthLocal {
  /**
   * Génère un hash bcrypt à partir d'un mot de passe
   */
  static async hashPassword(password) {
    return bcrypt.hash(password, 12);
  }

  /**
   * Vérifie un mot de passe contre un hash
   */
  static async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Authentification : vérifie email/password et retourne un token JWT
   * @param {FlatFileDB} db - Instance de la base
   * @param {string} email - Email de l'utilisateur
   * @param {string} password - Mot de passe en clair
   * @returns {object|null} - { token, user } ou null si échec
   */
  static async login(db, email, password) {
    // Cherche par email
    let users;
    if (typeof db.getUserByEmail === 'function') {
      // SQLiteDB - méthode directe
      const user = db.getUserByEmail(email.toLowerCase().trim());
      users = user ? [user] : [];
    } else {
      // Ancien FlatFileDB
      const result = await db.search('users', { email: email.toLowerCase().trim() });
      users = Array.isArray(result) ? result : (result.data || []);
    }
    const user = users[0];

    if (!user || !user.is_active) {
      return null;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return null;
    }

    // Générer le JWT
    const token = jwt.sign(
      { 
        sub: user.id, 
        username: user.username,
        email: user.email || null,
        role: user.role,
        iat: Math.floor(Date.now() / 1000)
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    // Sauvegarder la session (pour audit)
    await this._saveSession(db, user.id, token);

    // Mettre à jour last_login
    await db.update('users', user.id, { 
      last_login: new Date().toISOString(),
      login_count: (user.login_count || 0) + 1
    });

    return { 
      token, 
      user: { 
        id: user.id, 
        username: user.username,
        email: user.email || null,
        role: user.role 
      } 
    };
  }

  /**
   * Vérifie un token JWT et retourne le payload
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return null;
    }
  }

  /**
   * Décode un token sans vérifier la signature (pour debug)
   */
  static decodeToken(token) {
    return jwt.decode(token);
  }

  /**
   * Exécute une fonction avec un contexte utilisateur
   * Équivalent de req.user en Express
   * @param {string} token - JWT token
   * @param {function} callback - Fonction à exécuter avec le contexte
   */
  static async asUser(token, callback) {
    const payload = this.verifyToken(token);
    if (!payload) {
      throw new Error('Token invalide ou expiré');
    }

    currentContext = payload;
    try {
      const result = await callback();
      return result;
    } finally {
      currentContext = null;
    }
  }

  /**
   * Exécute une fonction avec un contexte admin (sans token, usage CLI uniquement)
   * @param {FlatFileDB} db - Instance de la base
   * @param {function} callback - Fonction à exécuter
   */
  static async asAdmin(db, callback) {
    let admins;
    if (typeof db.search === 'function' && db.search.toString().includes('return { data')) {
      // SQLiteDB format
      const result = db.search('users', { where: { role: 'admin', is_active: 1 } });
      admins = result.data || [];
    } else {
      // Ancien format
      admins = await db.search('users', { role: 'admin', is_active: true });
    }
    if (admins.length === 0) {
      throw new Error('Aucun admin trouvé dans la base');
    }

    currentContext = {
      sub: admin[0].id,
      username: admin[0].username,
      email: admin[0].email || null,
      role: 'admin'
    };

    try {
      const result = await callback();
      return result;
    } finally {
      currentContext = null;
    }
  }

  /**
   * Récupère le contexte utilisateur courant
   * @returns {object|null} - Payload JWT ou null
   */
  static getCurrentUser() {
    return currentContext;
  }

  /**
   * Vérifie si un utilisateur est authentifié
   */
  static isAuthenticated() {
    return currentContext !== null;
  }

  /**
   * Vérifie si l'utilisateur courant a un rôle spécifique
   */
  static hasRole(role) {
    return currentContext && currentContext.role === role;
  }

  /**
   * Vérifie si l'utilisateur courant est admin
   */
  static isAdmin() {
    return this.hasRole('admin');
  }

  /**
   * Crée un décorateur qui protège une fonction
   * @param {function} fn - Fonction à protéger
   * @param {string} requiredRole - Rôle requis (optionnel)
   */
  static requireAuth(fn, requiredRole = null) {
    return async function(...args) {
      if (!currentContext) {
        throw new Error('Authentification requise');
      }
      if (requiredRole && currentContext.role !== requiredRole) {
        throw new Error(`Permission refusée : rôle '${requiredRole}' requis`);
      }
      return fn.apply(this, args);
    };
  }

  /**
   * Change le mot de passe d'un utilisateur
   */
  static async changePassword(db, userId, oldPassword, newPassword) {
    const user = await db.read('users', userId);
    
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Vérifier l'ancien mot de passe (sauf si admin qui change pour un autre)
    const currentUser = this.getCurrentUser();
    if (!currentUser || (currentUser.sub !== userId && !this.isAdmin())) {
      throw new Error('Permission refusée');
    }

    if (currentUser.sub === userId) {
      const valid = await bcrypt.compare(oldPassword, user.password_hash);
      if (!valid) {
        throw new Error('Ancien mot de passe incorrect');
      }
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.update('users', userId, { 
      password_hash: newHash,
      password_changed_at: new Date().toISOString()
    });

    return true;
  }

  /**
   * Sauvegarde une session (pour audit)
   * @private
   */
  static async _saveSession(db, userId, token) {
    const sessionData = {
      id: `session_${Date.now()}`,
      user_id: userId,
      token: token,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    };

    try {
      await db.create('sessions', sessionData);
    } catch (err) {
      // Ignorer si la collection sessions n'existe pas encore
      console.warn('Impossible de sauvegarder la session:', err.message);
    }
  }

  /**
   * Nettoie les sessions expirées
   */
  static async cleanupSessions(db) {
    if (typeof db.deleteExpiredSessions === 'function') {
      // SQLiteDB
      db.deleteExpiredSessions();
    } else {
      // Ancien format
      const now = new Date().toISOString();
      const sessions = await db.search('sessions', {});
      const sessionsArray = Array.isArray(sessions) ? sessions : (sessions.data || []);
      
      for (const session of sessionsArray) {
        if (session.expires_at < now) {
          await db.delete('sessions', session.id);
        }
      }
    }
  }
}

module.exports = AuthLocal;
