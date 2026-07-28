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
 * @param {string} token - Le token JWT
 * @returns {Object|null} Le payload décodé ou null
 */
function decodeJWT(token) {
    try {
        const base64Payload = token.split('.')[1];
        const payload = JSON.parse(atob(base64Payload));
        return payload;
    } catch (err) {
        console.error('initial-load: erreur décodage JWT:', err);
        return null;
    }
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
        
        // Préparer la réponse avec savedEmail pour pré-remplissage
        const response = {
            success: true,
            data: {},
            error: null
        };
        
        if (savedEmail) {
            response.data.savedEmail = savedEmail;
        }
        
        // Pas de token trouvé
        if (!token) {
            console.log('initial-load: aucun token trouvé');
            response.data.hasSession = false;
            return response;
        }
        
        // Vérifier expiration JWT
        const payload = decodeJWT(token);
        if (!payload) {
            console.log('initial-load: token invalide');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            response.data.hasSession = false;
            response.data.reason = 'token_invalid';
            return response;
        }
        
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            console.log('initial-load: token expiré');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            response.data.hasSession = false;
            response.data.reason = 'token_expired';
            return response;
        }
        
        // Session active valide
        const user = userJson ? JSON.parse(userJson) : null;
        console.log('initial-load: utilisateur récupéré:', user?.email || 'inconnu');
        console.log('initial-load: session active trouvée');
        
        response.data.hasSession = true;
        response.data.token = token;
        response.data.user = user;
        response.data.rememberMe = !!savedEmail;
        
        return response;
        
    } catch (err) {
        console.error('initial-load error:', err);
        return { 
            success: false, 
            data: null,
            error: `Erreur lors de la vérification de session: ${err.message}` 
        };
    }
}
