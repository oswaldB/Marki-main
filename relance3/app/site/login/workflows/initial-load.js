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
 * Décode le payload JWT (base64)
 * @param {string} token - JWT token
 * @returns {Object|null} Payload décodé
 */
function decodeJWT(token) {
    try {
        const base64Payload = token.split('.')[1];
        const payload = atob(base64Payload);
        return JSON.parse(payload);
    } catch (err) {
        console.error('initial-load: erreur décodage JWT:', err);
        return null;
    }
}

/**
 * Vérifie si le token JWT est expiré
 * @param {Object} payload - Payload JWT décodé
 * @returns {boolean} true si expiré
 */
function isTokenExpired(payload) {
    if (!payload || !payload.exp) return true;
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
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
        // 1. Lire localStorage
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
        
        // 2. Vérifier expiration JWT
        const payload = decodeJWT(token);
        
        if (!payload || isTokenExpired(payload)) {
            console.log('initial-load: token expiré');
            
            // 3. Nettoyer si expiré
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            
            return { 
                success: true, 
                data: { 
                    hasSession: false,
                    reason: "token_expired",
                    ...(savedEmail && { savedEmail })
                },
                error: null
            };
        }
        
        // Token valide - vérifier si user existe
        let user = null;
        let rememberMe = false;
        
        if (userJson) {
            try {
                user = JSON.parse(userJson);
                rememberMe = !!savedEmail;
                console.log('initial-load: utilisateur récupéré:', user.email || user.id);
            } catch (err) {
                console.error('initial-load: erreur parsing user:', err);
            }
        }
        
        console.log('initial-load: session active trouvée');
        
        return { 
            success: true, 
            data: { 
                hasSession: true,
                token: token,
                user: user,
                rememberMe: rememberMe,
                ...(savedEmail && { savedEmail })
            },
            error: null
        };
        
    } catch (err) {
        console.error('initial-load error:', err);
        return { 
            success: false, 
            data: null,
            error: err.message 
        };
    }
}
