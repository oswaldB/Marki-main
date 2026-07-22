/**
 * Workflow: Login - Soumission authentification
 * Page Function: loginPage()
 * Stores: $store.auth, $store.ui
 */

// Store global auth
document.addEventListener('alpine:init', () => {
    Alpine.store('auth', {
        token: null,
        user: null,
        isAuthenticated: false,
        
        init() {
            this.token = localStorage.getItem('token');
            const userJson = localStorage.getItem('user');
            if (userJson) {
                this.user = JSON.parse(userJson);
                this.isAuthenticated = true;
            }
        },
        
        setAuth(token, user) {
            this.token = token;
            this.user = user;
            this.isAuthenticated = true;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
        },
        
        clearAuth() {
            this.token = null;
            this.user = null;
            this.isAuthenticated = false;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    });
    
    Alpine.store('ui', {
        loading: false,
        error: null,
        
        setLoading(value) {
            this.loading = value;
        },
        
        setError(message) {
            this.error = message;
        },
        
        clearError() {
            this.error = null;
        }
    });
});

/**
 * Page function principale pour la page login
 * Gère le workflow initial-load et auth-submit
 */
function loginPage() {
    return {
        // Data Model
        form: {
            email: '',
            password: ''
        },
        loading: false,
        error: null,
        
        /**
         * @action Initialiser le DOM de la page login
         * @checkpoint dom-ready, body avec x-data="loginPage()" présent
         */
        async initPage() {
            console.log('[login-initial-load] Initialisation page login');
            
            /**
             * @action Vérifier la présence d'un token dans localStorage
             * @checkpoint token-checked, token présent ou absent déterminé
             */
            const token = localStorage.getItem('token');
            console.log('[login-initial-load] Token présent:', !!token);
            
            if (token) {
                /**
                 * @action Si token présent, valider via POST /api/wf/auth-check
                 * @checkpoint session-verified, réponse API reçue
                 * Backend: Utilise AuthModel.verifyToken(token) pour valider le JWT
                 */
                try {
                    const response = await fetch('/api/wf/auth-check', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ token })
                    });
                    
                    const data = await response.json();
                    
                    if (data.valid && data.user) {
                        /**
                         * @action Si session valide, rediriger vers /dashboard
                         * @checkpoint redirect-executed, navigation vers dashboard
                         */
                        console.log('[login-initial-load] Session valide, redirection...');
                        Alpine.store('auth').setAuth(token, data.user);
                        window.location.href = '/dashboard';
                        return;
                    } else {
                        // Token invalide, le supprimer
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                    }
                } catch (err) {
                    console.error('[login-initial-load] Erreur vérification token:', err);
                }
            }
            
            /**
             * @action Afficher le formulaire de login prêt à l'emploi
             * @checkpoint form-ready, champs username/password focusables
             */
            console.log('[login-initial-load] Formulaire prêt');
        },
        
        /**
         * Workflow: Soumission authentification
         * Élément déclencheur: Formulaire de connexion (submit)
         */
        async handleLogin() {
            console.log('[auth-submit] Tentative connexion...');
            
            // 1. Validate form
            if (!this.form.email || !this.form.password) {
                this.error = 'Veuillez remplir tous les champs';
                return;
            }
            
            // Validation email basique
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(this.form.email)) {
                this.error = 'Format d\'email invalide';
                return;
            }
            
            // 2. Set loading
            this.loading = true;
            this.error = null;
            Alpine.store('ui').setLoading(true);
            Alpine.store('ui').clearError();
            
            try {
                // 3. Call auth API
                const data = await authSubmit(this.form.email, this.form.password);
                
                // 4. Store auth data
                Alpine.store('auth').setAuth(data.token, data.user);
                
                // 5. Persist token (déjà fait dans le store)
                console.log('[auth-submit] Auth réussie, token stocké');
                
                // 6. Redirect
                window.location.href = '/dashboard';
                
            } catch (error) {
                this.error = error.message;
                Alpine.store('ui').setError(error.message);
            } finally {
                this.loading = false;
                Alpine.store('ui').setLoading(false);
            }
        }
    };
}

/**
 * Fonction utilitaire: Soumettre les identifiants à l'API
 * @param {string} email - Email utilisateur
 * @param {string} password - Mot de passe
 * @returns {Promise<Object>} - { token, user }
 */
async function authSubmit(email, password) {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Échec de connexion');
    }
    
    return await response.json();
}