/**
 * Workflow: auth-login
 * Authentification utilisateur avec JWT
 * POST /api/auth/login
 */

const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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
    // Étape 2: Recherche utilisateur
    const users = db.collections.users.find({
      email: normalizedEmail
    });

    const user = users[0];

    if (!user || !user.is_active) {
      await log('warn', 'Authentication failed', { 
        email: normalizedEmail, 
        reason: 'invalid_credentials' 
      });
      return {
        status: 401,
        error: 'Identifiants invalides'
      };
    }

    // Étape 3: Vérification mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      await log('warn', 'Authentication failed', { 
        email: normalizedEmail, 
        userId: user.id,
        reason: 'invalid_password' 
      });
      return {
        status: 401,
        error: 'Identifiants invalides'
      };
    }

    // Étape 4: Génération JWT
    const JWT_SECRET = process.env.JWT_SECRET || 'marki-dev-secret-change-in-production';
    
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await log('info', 'Login successful', { 
      userId: user.id, 
      role: user.role 
    });

    // Étape 5: Mise à jour last_login
    user.last_login = new Date().toISOString();
    user.login_count = (user.login_count || 0) + 1;
    
    // Sauvegarder dans la collection (pas besoin de persister en YAML pour ce champ)
    db.collections.users.update(user);

    // Retourner succès
    return {
      status: 200,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
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
