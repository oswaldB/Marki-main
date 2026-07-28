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
        const base64Payload = token.split('.')[1];
        const jsonPayload = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

/**
 * Vérifie si un token JWT est expiré
 * @param {Object} payload - Payload décodé du JWT
 * @returns {boolean} true si expiré
 */
function isTokenExpired(payload) {
    if (!payload?.exp) return true;
    return payload.exp * 1000 < Date.now();
}

/**
 * Workflow initial-load
 * Vérifie si l'utilisateur possède une session active au chargement de la page
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
                    ...(savedEmail && { savedEmail })
                },
                error: null
            };
        }
        
        // Décoder et vérifier expiration
        const payload = decodeJWT(token);
        
        if (!payload || isTokenExpired(payload)) {
            console.log('initial-load: token expiré');
            // Nettoyer le localStorage
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            
            return { 
                success: true, 
                data: { 
                    hasSession: false,
                    reason: 'token_expired',
                    ...(savedEmail && { savedEmail })
                },
                error: null
            };
        }
        
        // Token valide - récupérer les données utilisateur
        let user = null;
        if (userJson) {
            try {
                user = JSON.parse(userJson);
                console.log('initial-load: utilisateur récupéré:', user.email || 'unknown');
            } catch {
                // Ignorer erreur parsing
            }
        }
        
        // Vérifier rememberMe (stocké dans le token ou localStorage)
        const rememberMe = localStorage.getItem('remember_me') === 'true';
        
        console.log('initial-load: session active trouvée');
        
        return { 
            success: true, 
            data: { 
                hasSession: true,
                token,
                user: user || {
                    id: payload.sub || payload.userId || 'unknown',
                    email: payload.email || user?.email || '',
                    name: payload.name || user?.name || '',
                    role: payload.role || user?.role || 'user'
                },
                rememberMe,
                ...(savedEmail && { savedEmail })
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
