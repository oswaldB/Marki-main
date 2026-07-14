/**
 * Configuration Frontend
 * Modifiez ces valeurs selon votre environnement
 */

const CONFIG = {
  // URL de l'API backend
  API_BASE_URL: 'http://localhost:3001',
  
  // Durée de validité du token (jours)
  TOKEN_EXPIRY_DAYS: 7,
  
  // Debug mode
  DEBUG: false
};

// Exposer globalement
window.CONFIG = CONFIG;
