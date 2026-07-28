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
 * Décode un JWT payload (sans vérifier la signature)
 * @param {string} token - JWT token
 * @returns {Object|null} Payload décodé ou null
 */
function decodeJWT(token) {
    try {
        const base64Payload = token.split('.')[1];
        const payload = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(payload);
    } catch (err) {
        return null;
    }
}

/**
 * Workflow initial-load
 * Vérifie si l'utilisateur possède une session active au chargement de la page login.
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('initial-load: démarrage vérification session');
    
    try {
        // 1. Lire localStorage
        const token = localStorage.getItem('auth_token');
        const userData = localStorage.getItem('auth_user');
        const savedEmail = localStorage.getItem('saved_email');
        
        // 2. Vérifier si un token existe
        if (!token) {
            console.log('initial-load: aucun token trouvé');
            return { 
                success: true, 
                data: { 
                    hasSession: false 
                } 
            };
        }
        
        // 3. Vérifier expiration JWT
        const payload = decodeJWT(token);
        
        if (!payload || !payload.exp) {
            console.log('initial-load: token invalide');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            return { 
                success: true, 
                data: { 
                    hasSession: false,
                    reason: "invalid_token"
                } 
            };
        }
        
        const now = Math.floor(Date.now() / 1000);
        
        if (payload.exp < now) {
            console.log('initial-load: token expiré');
            // Nettoyer si expiré
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            
            return { 
                success: true, 
                data: { 
                    hasSession: false,
                    reason: "token_expired"
                } 
            };
        }
        
        // 4. Token valide - Récupérer les données utilisateur
        let user = null;
        if (userData) {
            try {
                user = JSON.parse(userData);
                console.log('initial-load: utilisateur récupéré:', user.email || user.id);
            } catch (err) {
                console.warn('initial-load: erreur parsing user data', err);
            }
        }
        
        // Déterminer rememberMe (présence de saved_email)
        const rememberMe = !!savedEmail;
        
        console.log('initial-load: session active trouvée');
        
        return { 
            success: true, 
            data: { 
                hasSession: true,
                token: token,
                user: user,
                rememberMe: rememberMe,
                savedEmail: savedEmail || null
            } 
        };
        
    } catch (err) {
        console.error('initial-load error:', err);
        return { 
            success: false, 
            error: `Erreur lors de la vérification de session: ${err.message}` 
        };
    }
}
