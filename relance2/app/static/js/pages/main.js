/* Main.js - Point d'entrée JS pour toutes les pages */

// Charger Alpine.js depuis CDN
const alpineScript = document.createElement('script');
alpineScript.src = 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js';
alpineScript.defer = true;
alpineScript.onload = function() {
    console.log('[main.js] ✓ Alpine.js chargé');
    
    // Initialiser les workflows après chargement d'Alpine
    if (window.WorkflowManager) {
        console.log('[main.js] ✓ WorkflowManager disponible');
    }
};
document.head.appendChild(alpineScript);

console.log('[main.js] ✓ main.js chargé');

// Fonction utilitaire pour récupérer les paramètres URL
function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Exposer globalement
window.getUrlParam = getUrlParam;
