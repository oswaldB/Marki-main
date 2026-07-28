/*
INSTRUCTIONS IA - À APPLIQUER:
=============================

PRIORITÉ ABSOLUE: LIT EN PREMIER .specs/page-specs.md

1. NOM DU WORKFLOW: initial-load

2. SPECS: Implémenter selon:
   - .specs/wf-frontend/initial-load.md
   - /home/ubuntu/marki/relance3/app/site/login/.specs/wf-frontend/initial-load.md

3. FONCTION: Export nommé execute(context, params) qui:
   - Prend context (avec localDB, remoteDB, etc.)
   - Prend params (paramètres du workflow)
   - Retourne { success: true/false, data: {}, error: string }

4. CONSOLE: Logger 'initial-load.js loaded' au chargement
*/

console.log('initial-load.js loaded');

/**
 * Décode un JWT payload (base64)
 * @param {string} token - JWT token
 * @returns {Object|null} Payload décodé
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
        return null;
    }
}

/**
 * Vérifie si un token JWT est expiré
 * @param {Object} payload - JWT payload
 * @returns {boolean}
 */
function isTokenExpired(payload) {
    if (!payload || !payload.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
}

/**
 * Workflow initial-load
 * Vérifie si l'utilisateur possède une session active
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('initial-load: démarrage vérification session');
    
    try {
        // Lire localStorage
        const authToken = localStorage.getItem('auth_token');
        const authUser = localStorage.getItem('auth_user');
        const savedEmail = localStorage.getItem('saved_email');
        const rememberMe = localStorage.getItem('remember_me') === 'true';

        // Aucun token trouvé
        if (!authToken) {
            console.log('initial-load: aucun token trouvé');
            return {
                success: true,
                data: {
                    hasSession: false,
                    savedEmail: savedEmail || null
                },
                error: null
            };
        }

        // Vérifier expiration JWT
        const payload = decodeJWT(authToken);
        
        if (!payload) {
            console.log('initial-load: token invalide');
            // Nettoyer localStorage
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            return {
                success: true,
                data: {
                    hasSession: false,
                    reason: 'token_invalid',
                    savedEmail: savedEmail || null
                },
                error: null
            };
        }

        if (isTokenExpired(payload)) {
            console.log('initial-load: token expiré');
            // Nettoyer localStorage
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            return {
                success: true,
                data: {
                    hasSession: false,
                    reason: 'token_expired',
                    savedEmail: savedEmail || null
                },
                error: null
            };
        }

        // Token valide - session active
        let user = null;
        try {
            user = authUser ? JSON.parse(authUser) : null;
        } catch (e) {
            user = null;
        }

        if (user) {
            console.log('initial-load: utilisateur récupéré:', user.email);
        }
        console.log('initial-load: session active trouvée');

        return {
            success: true,
            data: {
                hasSession: true,
                token: authToken,
                user: user,
                rememberMe: rememberMe,
                savedEmail: savedEmail || null
            },
            error: null
        };
        
    } catch (err) {
        console.error('initial-load error:', err);
        return { 
            success: false, 
            data: null,
            error: `Erreur lors de la vérification de session: ${err.message}` 
        };
    }
}
