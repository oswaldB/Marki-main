/**
 * Workflow: auth-submit
 * 
 * Authentifie l'utilisateur avec email/password et crée une session.
 * Validation, mock auth (DEV) ou API call (PROD), stockage localStorage.
 */

console.log('auth-submit.js loaded');

// ============================================
// CONFIGURATION
// ============================================

/** Credentials de test pour le développement */
const TEST_CREDENTIALS = [
    { email: 'test@marki.fr', password: 'password123', name: 'Test User', role: 'user', id: 'user_test001' },
    { email: 'admin@marki.fr', password: 'admin123', name: 'Admin User', role: 'admin', id: 'user_admin001' },
    { email: 'demo@example.com', password: 'demo123', name: 'Demo User', role: 'user', id: 'user_demo001' }
];

// ============================================
// UTILITAIRES
// ============================================

/**
 * Génère un mock JWT token
 * @param {Object} user 
 * @returns {string}
 */
function generateMockJWT(user) {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        sub: user.email,
        name: user.name,
        role: user.role,
        iat: now,
        exp: now + 24 * 60 * 60 // +24h
    };
    
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    const signature = btoa('mock-signature');
    
    return `${header}.${body}.${signature}`;
}

/**
 * Simule un délai réseau
 * @returns {Promise<void>}
 */
function simulateAuthDelay() {
    return new Promise(resolve => setTimeout(resolve, 800));
}

// ============================================
// WORKFLOW
// ============================================

/**
 * Exécute le workflow auth-submit
 * @param {Object} context - Contexte partagé (PouchDB, config)
 * @param {Object} params - Paramètres d'authentification
 * @param {string} params.email - Email de l'utilisateur
 * @param {string} params.password - Mot de passe
 * @param {boolean} params.rememberMe - Option "Se souvenir de moi"
 * @returns {Promise<Object>} Résultat au format {success, data, error}
 */
export async function execute(context = {}, params = {}) {
    console.log('auth-submit: démarrage authentification');
    
    const { email, password, rememberMe = false } = params;
    
    try {
        // === 1. Validation des entrées ===
        if (!email) {
            console.log('auth-submit: validation échouée - email requis');
            return {
                success: false,
                data: null,
                error: "L'adresse email est requise"
            };
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('auth-submit: validation échouée - email invalide');
            return {
                success: false,
                data: null,
                error: "Veuillez entrer une adresse email valide"
            };
        }
        
        if (!password) {
            console.log('auth-submit: validation échouée - password requis');
            return {
                success: false,
                data: null,
                error: "Le mot de passe est requis"
            };
        }
        
        if (password.length < 6) {
            console.log('auth-submit: validation échouée - password trop court');
            return {
                success: false,
                data: null,
                error: "Le mot de passe doit contenir au moins 6 caractères"
            };
        }
        
        console.log('auth-submit: tentative connexion pour:', email);
        
        // === 2. Authentification (Mode DEV: credentials de test) ===
        await simulateAuthDelay();
        
        // Chercher dans les credentials de test
        const userMatch = TEST_CREDENTIALS.find(
            u => u.email === email && u.password === password
        );
        
        if (!userMatch) {
            console.log('auth-submit: identifiants invalides');
            return {
                success: false,
                data: null,
                error: "Adresse email ou mot de passe incorrect"
            };
        }
        
        // Créer l'objet user (sans le password)
        const user = {
            id: userMatch.id,
            email: userMatch.email,
            name: userMatch.name,
            role: userMatch.role
        };
        
        // Générer token JWT mock
        const token = generateMockJWT(user);
        
        console.log('auth-submit: authentification réussie pour:', email);
        
        // === 3. Stockage session ===
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
        localStorage.setItem('auth_remember_me', String(rememberMe));
        localStorage.setItem('auth_last_login', new Date().toISOString());
        
        // Gérer saved_email
        if (rememberMe) {
            localStorage.setItem('saved_email', email);
        } else {
            localStorage.removeItem('saved_email');
        }
        
        return {
            success: true,
            data: {
                user: user,
                token: token,
                rememberMe: rememberMe
            },
            error: null
        };
        
    } catch (error) {
        console.error('auth-submit: erreur technique', error);
        
        return {
            success: false,
            data: null,
            error: "Erreur technique lors de la connexion. Veuillez réessayer."
        };
    }
}

export default { execute };
