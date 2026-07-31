/**
 * Workflow Hello - Exemple de workflow frontend
 * Prend un paramètre name et retourne "hello name"
 * 
 * Usage: ?name=toto dans l'URL ou appel direct
 */

async function helloWorkflow(name) {
    const targetName = name || 'toto';
    console.log('[helloWorkflow] ✓ Exécution avec name:', targetName);
    
    return new Promise((resolve) => {
        setTimeout(() => {
            const message = `hello ${targetName}`;
            console.log('[helloWorkflow] ✓ Résultat:', message);
            resolve(message);
        }, 100); // Simulation async
    });
}

// Exposer globalement
window.helloWorkflow = helloWorkflow;
console.log('[helloWorkflow] ✓ Workflow chargé');
