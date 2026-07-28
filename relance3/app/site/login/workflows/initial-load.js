console.log('initial-load.js loaded');

/**
 * Décode un payload JWT base64
 * @param {string} token - Token JWT
 * @returns {Object|null} Payload décodé ou null
 */
function decodeJWT(token) {
    try {
        const payload = token.split('.')[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    } catch {
        return null;
    }
}

/**
 * Vérifie si un token JWT est expiré
 * @param {string} token - Token JWT
 * @returns {boolean} true si expiré
 */
function isTokenExpired(token) {
    const payload = decodeJWT(token);
    if (!payload || !payload.exp) return true;
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
        if (isTokenExpired(token)) {
            console.log('initial-load: token expiré');
            // Nettoyer localStorage
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            
            return { 
                success: true, 
                data: { 
                    hasSession: false,
                    reason: 'token_expired'
                },
                error: null
            };
        }
        
        // Token valide - récupérer l'utilisateur
        let user = null;
        try {
            user = JSON.parse(userJson);
        } catch {
            // Si userJson est invalide, continuer avec user null
        }
        
        if (user && user.email) {
            console.log('initial-load: utilisateur récupéré:', user.email);
        }
        console.log('initial-load: session active trouvée');
        
        // Récupérer saved_email pour rememberMe
        const savedEmail = localStorage.getItem('saved_email');
        
        return { 
            success: true, 
            data: { 
                hasSession: true,
                token,
                user: user || {},
                rememberMe: !!savedEmail,
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
