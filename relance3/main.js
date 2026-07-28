// Imports des workflows
import { execute as initialLoadExecute } from './workflows/initial-load.js';
import { execute as authSubmitExecute } from './workflows/auth-submit.js';

/**
 * Composant Alpine.js pour la page de connexion
 * Gère l'état du formulaire, la validation, et l'appel aux workflows
 */
function loginPage() {
    return {
        // État du formulaire (aligné avec le mockup)
        form: {
            username: '',
            password: ''
        },
        
        // État UI (aligné avec le mockup)
        loading: false,
        error: '',
        success: '',
        showPassword: false,
        
        /**
         * Initialisation du composant
         * Appelle le workflow initial-load
         */
        async init() {
            console.log('LoginPage: Initialisation');
            
            try {
                // Chargement des données sauvegardées
                await this.loadSavedCredentials();
                
                // Exécution du workflow initial-load
                await initialLoadExecute();
                
            } catch (err) {
                console.error('Erreur lors de l\'initialisation:', err);
            }
        },
        
        /**
         * Charge les identifiants sauvegardés
         */
        async loadSavedCredentials() {
            try {
                const savedUsername = localStorage.getItem('marki_username');
                if (savedUsername) {
                    this.form.username = savedUsername;
                    console.log('Identifiant chargé depuis localStorage');
                }
            } catch (err) {
                console.warn('Impossible de charger les identifiants:', err);
            }
        },
        
        /**
         * Soumet le formulaire de connexion
         * Appelle le workflow auth-submit
         */
        async submitForm() {
            console.log('LoginPage: Soumission du formulaire');
            
            // Reset des messages
            this.error = '';
            this.success = '';
            
            // Validation
            if (!this.form.username || !this.form.password) {
                this.error = 'Veuillez remplir tous les champs';
                return;
            }
            
            // Activation du loader
            this.loading = true;
            
            try {
                // Préparation des données pour le workflow
                const credentials = {
                    username: this.form.username,
                    email: this.form.username, // Compatibilité si l'API attend email
                    password: this.form.password
                };
                
                // Appel du workflow auth-submit
                const result = await authSubmitExecute(credentials);
                
                if (result.success) {
                    // Sauvegarde de l'identifiant
                    localStorage.setItem('marki_username', this.form.username);
                    
                    // Message de succès
                    this.success = 'Connexion réussie ! Redirection...';
                    
                    // Stockage du token/utilisateur si fourni
                    if (result.token) {
                        sessionStorage.setItem('marki_token', result.token);
                    }
                    if (result.user) {
                        sessionStorage.setItem('marki_user', JSON.stringify(result.user));
                    }
                    
                    // Redirection après succès
                    setTimeout(() => {
                        window.location.href = result.redirectUrl || '/dashboard.html';
                    }, 1000);
                    
                } else {
                    this.error = result.message || 'Identifiants incorrects';
                }
                
            } catch (err) {
                console.error('Erreur lors de la connexion:', err);
                this.error = err.message || 'Une erreur est survenue lors de la connexion';
            } finally {
                this.loading = false;
            }
        },
        
        /**
         * Vérifie si le formulaire est valide
         */
        get isFormValid() {
            return (
                this.form.username && 
                this.form.username.length > 0 && 
                this.form.password && 
                this.form.password.length > 0
            );
        }
    };
}

// Enregistrement du composant pour Alpine.js
document.addEventListener('alpine:init', () => {
    Alpine.data('loginPage', loginPage);
});

// Fallback si Alpine.js est déjà initialisé
if (window.Alpine) {
    Alpine.data('loginPage', loginPage);
}

console.log('main.js loaded');
