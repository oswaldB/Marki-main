console.log('initial-load.js loaded');

/**
 * Décode un JWT sans vérification de signature
 * @param {string} token - JWT token
 * @returns {Object|null} Payload décodé ou null
 */
function decodeJWT(token) {
    try {
        const [, payload] = token.split('.');
        if (!payload) return null;
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    } catch {
        return null;
    }
}

/**
 * Workflow initial-load
 * Vérifie si l'utilisateur possède une session active au chargement de la page.
 * 
 * @param {Object} context - Contexte avec localDB, remoteDB, etc.
 * @param {Object} params - Paramètres du workflow (aucun requis)
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
        const now = Math.floor(Date.now() / 1000);
        
        // Token invalide ou expiré
        if (!payload || !payload.exp || payload.exp <= now) {
            console.log('initial-load: token expiré');
            
            // 3. Nettoyer si expiré
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
        
        // 4. Session active - parser les données utilisateur
        let user = null;
        try {
            user = userJson ? JSON.parse(userJson) : null;
        } catch {
            user = null;
        }
        
        if (user && user.email) {
            console.log('initial-load: utilisateur récupéré:', user.email);
        }
        console.log('initial-load: session active trouvée');
        
        // 5. Détecter rememberMe (email sauvegardé)
        const rememberMe = !!savedEmail;
        
        return { 
            success: true, 
            data: { 
                hasSession: true, 
                token,
                user: user || { id: payload.sub, email: payload.email },
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
