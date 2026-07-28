/**
 * Workflow: initial-load
 * 
 * Vérifie si l'utilisateur possède une session active au chargement.
 * Lit localStorage, vérifie expiration JWT, nettoie si expiré.
 */

console.log('initial-load.js loaded');

// ============================================
// UTILITAIRES JWT
// ============================================

/**
 * Décode un JWT payload (base64)
 * @param {string} token 
 * @returns {Object|null}
 */
function decodeJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (err) {
        console.error('JWT decode error:', err);
        return null;
    }
}

/**
 * Vérifie si le token est expiré
 * @param {Object} payload 
 * @returns {boolean}
 */
function isTokenExpired(payload) {
    if (!payload || !payload.exp) return true;
    return Date.now() >= payload.exp * 1000;
}

// ============================================
// WORKFLOW
// ============================================

/**
 * Exécute le workflow initial-load
 * @param {Object} context - Contexte partagé (PouchDB, config)
 * @param {Object} params - Aucun paramètre requis
 * @returns {Promise<Object>} Résultat au format {success, data, error}
 */
export async function execute(context = {}, params = {}) {
    console.log('initial-load: démarrage vérification session');
    
    try {
        // Lire localStorage
        const token = localStorage.getItem('auth_token');
        const userStr = localStorage.getItem('auth_user');
        
        // Aucun token trouvé
        if (!token) {
            console.log('initial-load: aucun token trouvé');
            return {
                success: true,
                data: { hasSession: false },
                error: null
            };
        }
        
        // Vérifier expiration JWT
        const payload = decodeJWT(token);
        if (!payload || isTokenExpired(payload)) {
            console.log('initial-load: token expiré');
            // Nettoyer si expiré
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            localStorage.removeItem('auth_remember_me');
            
            return {
                success: true,
                data: { hasSession: false, reason: 'token_expired' },
                error: null
            };
        }
        
        // Token valide, parser l'utilisateur
        let user = null;
        try {
            user = userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            console.error('User parse error:', e);
        }
        
        if (!user) {
            console.log('initial-load: user data invalide');
            return {
                success: true,
                data: { hasSession: false },
                error: null
            };
        }
        
        // Récupérer rememberMe
        const rememberMe = localStorage.getItem('auth_remember_me') === 'true';
        
        console.log('initial-load: session active trouvée, user:', user.email);
        
        return {
            success: true,
            data: {
                hasSession: true,
                token: token,
                user: user,
                rememberMe: rememberMe
            },
            error: null
        };
        
    } catch (error) {
        console.error('initial-load: erreur', error);
        
        return {
            success: false,
            data: null,
            error: 'Erreur lors de la vérification de session: ' + error.message
        };
    }
}

export default { execute };
