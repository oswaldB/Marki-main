# login/store/store.js - Store connexion

**Fichier** : `app/static/pages/login/store/store.js`

## Description

Store Alpine.js pour la page de connexion. Gère l'état du formulaire et les erreurs.

## Code

```javascript
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
     */
    init() {
      // Vérifie si déjà un token
      const token = localStorage.getItem('token');
      if (token) {
        // Redirection vers dashboard
        window.location.href = '/dashboard';
      }
    },
    
    /**
     * Valide le formulaire
     * @returns {boolean}
     */
    validate() {
      this.errors = { username: null, password: null };
      let valid = true;
      
      if (!this.form.username) {
        this.errors.username = 'Email requis';
        valid = false;
      }
      
      if (!this.form.password) {
        this.errors.password = 'Mot de passe requis';
        valid = false;
      }
      
      return valid;
    },
    
    /**
     * Définit l'état de chargement
     */
    setLoading(value) {
      this.loading = value;
    },
    
    /**
     * Définit l'erreur globale
     */
    setError(message) {
      this.error = message;
    },
    
    /**
     * Réinitialise les erreurs
     */
    clearErrors() {
      this.errors = { username: null, password: null };
      this.error = null;
    },
    
    /**
     * Sauvegarde le token et redirige
     */
    loginSuccess(token) {
      localStorage.setItem('token', token);
      window.location.href = '/dashboard';
    }
  }
}
```

## Méthodes exposées

| Méthode | Description |
|---------|-------------|
| `init()` | Vérifie auth existante |
| `validate()` | Valide les champs |
| `setLoading(bool)` | Active/désactive loading |
| `setError(msg)` | Affiche erreur globale |
| `clearErrors()` | Reset erreurs |
| `loginSuccess(token)` | Connexion OK, redirect |
