console.log('auth-submit.js loaded');

// Credentials de test (DEV mode)
const TEST_CREDENTIALS = [
    { username: 'test@marki.fr', password: 'password123', name: 'Test User', role: 'user' },
    { username: 'admin@marki.fr', password: 'admin123', name: 'Admin User', role: 'admin' },
    { username: 'demo@example.com', password: 'demo123', name: 'Demo User', role: 'user' },
    { username: 'john_doe', password: 'password123', name: 'John Doe', role: 'user' }
];

/**
 * Génère un mock JWT token
 * @param {Object} payload - Données à encoder
 * @returns {string} Token JWT mock
 */
function generateMockJWT(payload) {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    const signature = btoa('mock-signature');
    return `${header}.${body}.${signature}`;
}

/**
 * Workflow auth-submit
 * @param {Object} context - Contexte avec localDB, remoteDB
 * @param {Object} params - Paramètres du workflow
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('auth-submit: démarrage authentification');
    
    try {
        const { username, password, rememberMe = false } = params;
        
        // 1. Validation des entrées
        if (!username || username.trim() === '') {
            console.log('auth-submit: validation échouée: L\'identifiant est requis');
            return { 
                success: false, 
                data: null,
                error: 'L\'identifiant est requis' 
            };
        }
        
        if (!password || password.trim() === '') {
            console.log('auth-submit: validation échouée: Le mot de passe est requis');
            return { 
                success: false, 
                data: null,
                error: 'Le mot de passe est requis' 
            };
        }
        
        console.log('auth-submit: tentative connexion pour:', username);
        
        // 2. Authentification (DEV mode - credentials en dur)
        const user = TEST_CREDENTIALS.find(
            cred => cred.username === username && cred.password === password
        );
        
        if (!user) {
            console.log('auth-submit: identifiants invalides');
            return { 
                success: false, 
                data: null,
                error: 'Identifiant ou mot de passe incorrect' 
            };
        }
        
        // 3. Génération du token JWT mock
        const now = Math.floor(Date.now() / 1000);
        const tokenPayload = {
            sub: user.username,
            name: user.name,
            role: user.role,
            iat: now,
            exp: now + 24 * 60 * 60 // +24h
        };
        const token = generateMockJWT(tokenPayload);
        
        // 4. Stockage session dans localStorage
        const userData = {
            id: `user_${btoa(user.username).slice(0, 8)}`,
            username: user.username,
            name: user.name,
            role: user.role
        };
        
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(userData));
        localStorage.setItem('auth_remember_me', rememberMe.toString());
        localStorage.setItem('auth_last_login', new Date().toISOString());
        
        if (rememberMe) {
            localStorage.setItem('saved_username', username);
        } else {
            localStorage.removeItem('saved_username');
        }
        
        console.log('auth-submit: authentification réussie pour:', username);
        
        return { 
            success: true, 
            data: {
                user: userData,
                token: token,
                rememberMe: rememberMe
            },
            error: null
        };
        
    } catch (err) {
        console.error('auth-submit error:', err);
        return { 
            success: false, 
            data: null,
            error: 'Erreur technique lors de la connexion. Veuillez réessayer.' 
        };
    }
}
