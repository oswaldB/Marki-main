/**
 * Store Alpine.js pour la page de connexion
 * Gère l'état du formulaire et les erreurs
 */
function loginStore() {
  return {
    // État formulaire
    form: {
      username: '',
      password: ''
    },
    
    // Validation
    errors: {
      username: null,
      password: null
    },
    
    // UI state
    loading: false,
    error: null,
    
    /**
     * Initialisation
     * Vérifie si déjà un token, sinon reste sur la page
     */
    init() {
      console.log('[WORKFLOW LOGIN] init() - Démarrage initialisation');
      const token = localStorage.getItem('token');
      console.log(`[WORKFLOW LOGIN] init() - Token stocké: ${token ? 'OUI' : 'NON'}`);
      if (token) {
        console.log('[WORKFLOW LOGIN] init() - Token existant, redirection vers /dashboard');
        window.location.href = '/dashboard';
      } else {
        console.log('[WORKFLOW LOGIN] init() - Pas de token, affichage formulaire login');
      }
      console.log('[WORKFLOW LOGIN] init() - Initialisation terminée');
    },
    
    /**
     * Valide le formulaire
     * @returns {boolean}
     */
    validate() {
      console.log('[WORKFLOW LOGIN] validate() - Début validation formulaire');
      console.log(`[WORKFLOW LOGIN] validate() - Username présent: ${!!this.form.username}, Password présent: ${!!this.form.password}`);
      this.errors = { username: null, password: null };
      let valid = true;
      
      if (!this.form.username) {
        this.errors.username = 'Identifiant requis';
        valid = false;
        console.log('[WORKFLOW LOGIN] validate() - ❌ Username manquant');
      }
      
      if (!this.form.password) {
        this.errors.password = 'Mot de passe requis';
        valid = false;
        console.log('[WORKFLOW LOGIN] validate() - ❌ Password manquant');
      }
      
      console.log(`[WORKFLOW LOGIN] validate() - Résultat validation: ${valid ? '✅ VALIDE' : '❌ INVALIDE'}`);
      return valid;
    },
    
    /**
     * Définit l'état de chargement
     */
    setLoading(value) {
      console.log(`[WORKFLOW LOGIN] setLoading() - Loading = ${value}`);
      this.loading = value;
    },
    
    /**
     * Définit l'erreur globale
     */
    setError(message) {
      console.log(`[WORKFLOW LOGIN] setError() - Erreur: ${message}`);
      this.error = message;
    },
    
    /**
     * Réinitialise les erreurs
     */
    clearErrors() {
      console.log('[WORKFLOW LOGIN] clearErrors() - Réinitialisation des erreurs');
      this.errors = { username: null, password: null };
      this.error = null;
    },
    
    /**
     * Sauvegarde le token et redirige
     */
    loginSuccess(token) {
      console.log('[WORKFLOW LOGIN] loginSuccess() - Token sauvegardé, redirection');
      localStorage.setItem('token', token);
      window.location.href = '/dashboard';
    },
    
    /**
     * Soumet le formulaire de connexion
     * Appelle l'API et gère les réponses
     */
    async submitLogin() {
      console.log('[WORKFLOW LOGIN] submitLogin() - Début soumission formulaire');
      
      // 1. Reset
      this.clearErrors();
      
      // 2. Validation client
      if (!this.validate()) {
        console.log('[WORKFLOW LOGIN] submitLogin() - Validation échouée');
        return;
      }
      
      // 3. Loading
      this.setLoading(true);
      console.log(`[WORKFLOW LOGIN] submitLogin() - Appel API /api/auth/login avec username: ${this.form.username}`);
      
      try {
        // 4. Appel API
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.form)
        });
        
        const data = await response.json();
        
        // 5. Gestion réponse
        if (!response.ok) {
          console.error(`[WORKFLOW LOGIN] submitLogin() - Erreur HTTP ${response.status}: ${data.error}`);
          this.setError(data.error || 'Erreur de connexion');
          return;
        }
        
        // 6. Success
        console.log('[WORKFLOW LOGIN] submitLogin() - Connexion réussie, token reçu');
        this.loginSuccess(data.token);
        
      } catch (err) {
        console.error('[WORKFLOW LOGIN] submitLogin() - Erreur réseau:', err);
        this.setError('Erreur réseau');
      } finally {
        this.setLoading(false);
        console.log('[WORKFLOW LOGIN] submitLogin() - Fin soumission (loading=false)');
      }
    }
  };
}
