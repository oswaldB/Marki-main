/**
 * Workflow: auth-login
 * Authentification utilisateur avec JWT
 * POST /api/auth/login
 */

const fs = require('fs').promises;
const path = require('path');
const AuthLocal = require('../lib/auth-local.js');

// Répertoire des logs
const LOG_DIR = path.join(__dirname, 'logs');

/**
 * Logger une entrée
 */
async function log(level, message, data = {}) {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      workflow: 'auth-login'
    };
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(LOG_DIR, `${date}.log`);
    await fs.appendFile(logFile, JSON.stringify(entry) + '\n');
  } catch (err) {
    console.error('Erreur logging:', err);
  }
}

/**
 * Fonction principale de login
 * @param {Object} input - { email, password }
 * @param {Object} db - Instance de FlatFileDB
 * @returns {Object} - { status, data|error }
 */
async function login(input, db) {
  const { email, password } = input || {};

  // Étape 1: Validation
  if (!email || !password) {
    await log('warn', 'Validation failed', { reason: 'missing_credentials' });
    return {
      status: 400,
      error: 'Email et mot de passe requis'
    };
  }

  // Normaliser l'email
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Étape 2-5: Authentification via AuthLocal
    const result = await AuthLocal.login(db, normalizedEmail, password);

    if (!result) {
      await log('warn', 'Authentication failed', { 
        email: normalizedEmail, 
        reason: 'invalid_credentials' 
      });
      return {
        status: 401,
        error: 'Identifiants invalides'
      };
    }

    await log('info', 'Login successful', { 
      userId: result.user.id, 
      role: result.user.role 
    });

    // Retourner succès
    return {
      status: 200,
      data: result
    };

  } catch (err) {
    await log('error', 'Server error during login', { 
      error: err.message,
      stack: err.stack 
    });
    return {
      status: 500,
      error: 'Erreur serveur lors de l\'authentification'
    };
  }
}

module.exports = { login };
