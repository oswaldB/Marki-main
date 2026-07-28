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
 * Décode un token JWT et retourne le payload
 * @param {string} token - Token JWT
 * @returns {Object|null} Payload décodé ou null
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
        console.error('initial-load: erreur décodage JWT:', err);
        return null;
    }
}

/**
 * Vérifie si un token JWT est expiré
 * @param {Object} payload - Payload du token JWT
 * @returns {boolean} True si expiré
 */
function isTokenExpired(payload) {
    if (!payload || !payload.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
}

/**
 * Workflow initial-load
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('initial-load: démarrage vérification session');
    
    try {
        // Lire localStorage
        const token = localStorage.getItem('auth_token');
        const userJson = localStorage.getItem('auth_user');
        const savedEmail = localStorage.getItem('saved_email');
        
        // Aucun token trouvé
        if (!token) {
            console.log('initial-load: aucun token trouvé');
            return { 
                success: true, 
                data: { 
                    hasSession: false,
                    savedEmail: savedEmail || null
                } 
            };
        }
        
        // Décoder et vérifier expiration
        const payload = decodeJWT(token);
        
        if (!payload) {
            console.log('initial-load: token invalide');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            return { 
                success: true, 
                data: { 
                    hasSession: false,
                    reason: 'invalid_token',
                    savedEmail: savedEmail || null
                } 
            };
        }
        
        // Vérifier expiration
        if (isTokenExpired(payload)) {
            console.log('initial-load: token expiré');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            return { 
                success: true, 
                data: { 
                    hasSession: false,
                    reason: 'token_expired',
                    savedEmail: savedEmail || null
                } 
            };
        }
        
        // Token valide - récupérer les données utilisateur
        let user = null;
        try {
            user = userJson ? JSON.parse(userJson) : null;
        } catch (err) {
            console.error('initial-load: erreur parsing user:', err);
        }
        
        if (user) {
            console.log('initial-load: utilisateur récupéré:', user.email);
        }
        console.log('initial-load: session active trouvée');
        
        return { 
            success: true, 
            data: { 
                hasSession: true,
                token: token,
                user: user,
                rememberMe: !!savedEmail,
                savedEmail: savedEmail || null
            } 
        };
        
    } catch (err) {
        console.error('initial-load error:', err);
        return { 
            success: false, 
            data: null,
            error: 'Erreur lors de la vérification de session: ' + err.message 
        };
    }
}
