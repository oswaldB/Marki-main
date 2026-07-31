/** 
 * main.js - Point d'entrée pour le screen Healthy
 * Charge Alpine.js et initialise les workflows
 */

console.log('[main.js] ✓ main.js chargé');

// Charger Alpine.js depuis CDN
const alpineScript = document.createElement('script');
alpineScript.src = 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js';
alpineScript.defer = true;
alpineScript.onload = function() {
    console.log('[main.js] ✓ Alpine.js chargé et prêt');
};
alpineScript.onerror = function() {
    console.error('[main.js] ✗ Erreur chargement Alpine.js');
};
document.head.appendChild(alpineScript);

// Fonction utilitaire pour récupérer les paramètres URL
window.getUrlParam = function(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
};

console.log('[main.js] ✓ Utilitaires chargés');
